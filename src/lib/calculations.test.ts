import { describe, expect, it } from "vitest";
import {
  netInvested,
  netQuantity,
  incomeReceived,
  computeAssetFinancials,
  computeYtd,
  computeAllocation,
  computePortfolioTimeSeries,
  computeAssetPerformance,
  computePortfolioTotals,
  computeTrendContext,
  type AssetLedger,
  type AssetPerformanceRow,
  type TxLite,
} from "@/lib/calculations";

function tx(over: Partial<TxLite>): TxLite {
  return { type: "BUY", date: new Date("2026-01-01"), amount: 100, quantity: null, ...over };
}

describe("netInvested", () => {
  it("soma BUY/DEPOSIT/FEE e subtrai SELL/WITHDRAWAL", () => {
    const txs = [tx({ type: "BUY", amount: 100 }), tx({ type: "FEE", amount: 5 }), tx({ type: "SELL", amount: 30 })];
    expect(netInvested(txs)).toBe(75);
  });

  it("DIVIDEND/INTEREST não afetam o cost basis", () => {
    expect(netInvested([tx({ type: "DIVIDEND", amount: 50 })])).toBe(0);
  });

  it("ignora transações depois de asOf", () => {
    const txs = [tx({ date: new Date("2026-01-01"), amount: 100 }), tx({ date: new Date("2026-06-01"), amount: 200 })];
    expect(netInvested(txs, new Date("2026-03-01"))).toBe(100);
  });
});

describe("incomeReceived", () => {
  it("soma só DIVIDEND + INTEREST", () => {
    const txs = [tx({ type: "DIVIDEND", amount: 10 }), tx({ type: "INTEREST", amount: 5 }), tx({ type: "BUY", amount: 100 })];
    expect(incomeReceived(txs)).toBe(15);
  });
});

describe("netQuantity", () => {
  it("BUY soma, SELL subtrai", () => {
    const txs = [tx({ type: "BUY", quantity: 10 }), tx({ type: "SELL", quantity: 3 }), tx({ type: "BUY", quantity: 2 })];
    expect(netQuantity(txs)).toBe(9);
  });

  it("ignora transações sem quantidade (depósitos, comissões, dividendos...)", () => {
    const txs = [tx({ type: "BUY", quantity: 5 }), tx({ type: "FEE", quantity: null }), tx({ type: "DIVIDEND", quantity: null })];
    expect(netQuantity(txs)).toBe(5);
  });

  it("ignora transações depois de asOf", () => {
    const txs = [
      tx({ type: "BUY", quantity: 5, date: new Date("2026-01-01") }),
      tx({ type: "BUY", quantity: 3, date: new Date("2026-06-01") }),
    ];
    expect(netQuantity(txs, new Date("2026-03-01"))).toBe(5);
  });
});

describe("computeAssetFinancials", () => {
  it("currentValue e P/L ficam null sem nenhum snapshot nem cotação ao vivo", () => {
    const financials = computeAssetFinancials([tx({ amount: 100 })], []);
    expect(financials.currentValue).toBeNull();
    expect(financials.currentValueSource).toBeNull();
    expect(financials.unrealizedPL).toBeNull();
    expect(financials.totalReturn).toBeNull();
    expect(financials.netInvested).toBe(100);
  });

  it("calcula P/L e retorno total com snapshot e rendimento", () => {
    const financials = computeAssetFinancials(
      [tx({ type: "BUY", amount: 1000 }), tx({ type: "DIVIDEND", amount: 50 })],
      [{ date: new Date("2026-01-02"), value: 1200 }]
    );
    expect(financials.currentValue).toBe(1200);
    expect(financials.currentValueSource).toBe("manual");
    expect(financials.unrealizedPL).toBe(200);
    expect(financials.unrealizedPLPercent).toBeCloseTo(0.2);
    expect(financials.totalReturn).toBe(250); // 200 + 50 de dividendos
    expect(financials.totalReturnPercent).toBeCloseTo(0.25);
  });

  it("cotação ao vivo tem prioridade sobre a última valorização manual", () => {
    const financials = computeAssetFinancials(
      [tx({ type: "BUY", amount: 1000 })],
      [{ date: new Date("2026-01-02"), value: 1200 }],
      new Date(),
      1500
    );
    expect(financials.currentValue).toBe(1500);
    expect(financials.currentValueSource).toBe("live");
    expect(financials.unrealizedPL).toBe(500);
  });
});

describe("computeYtd", () => {
  it("ativo novo este ano (comprado e valorizado só dentro do ano): sem baseline, % fica null", () => {
    const asset: AssetLedger = {
      id: "a1",
      name: "ETF",
      category: "Ações",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2026-02-01"), amount: 1000 }],
      snapshots: [{ date: new Date("2026-06-01"), value: 1100 }],
    };
    const ytd = computeYtd([asset], new Date("2026-08-01"));
    // O €1000 investido em fevereiro está dentro do próprio ano, por isso
    // já é capturado pelo netFlowYTD — não há cost basis "antes do ano" (é
    // zero), por isso não há baseline para uma percentagem.
    expect(ytd.gainAmount).toBe(100); // 1100 (valor atual) - 1000 (entrada este ano)
    expect(ytd.gainPercent).toBeNull();
  });

  it("gainAmount inclui o cost basis pré-ano quando falta snapshot de arranque", () => {
    // Ativo comprado em 2025 (antes do ano corrente) mas só passou a ter
    // valorizações registadas já dentro de 2026 — sem o fallback ao cost
    // basis em V_start, os €1000 investidos em 2025 ficariam de fora tanto
    // de V_start (sem snapshot) como do netFlowYTD (fluxo é de 2025, não
    // deste ano), fazendo o ganho aparente ser o valor todo (€1100) em vez
    // do ganho real (€100).
    const asset: AssetLedger = {
      id: "a1",
      name: "ETF antigo",
      category: "Ações",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2025-06-01"), amount: 1000 }],
      snapshots: [{ date: new Date("2026-06-01"), value: 1100 }],
    };
    const ytd = computeYtd([asset], new Date("2026-08-01"));
    expect(ytd.startValue).toBe(1000);
    expect(ytd.gainAmount).toBe(100);
    expect(ytd.gainPercent).toBeCloseTo(0.1);
  });

  it("carteira mista: o fallback de um ativo não é ofuscado pelo snapshot real de outro", () => {
    const comSnapshot: AssetLedger = {
      id: "a1",
      name: "Com snapshot",
      category: "X",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2024-01-01"), amount: 500 }],
      snapshots: [
        { date: new Date("2025-12-31"), value: 500 },
        { date: new Date("2026-08-01"), value: 600 },
      ],
    };
    const semSnapshot: AssetLedger = {
      id: "a2",
      name: "Sem snapshot de arranque",
      category: "X",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2025-06-01"), amount: 300 }],
      snapshots: [{ date: new Date("2026-06-01"), value: 330 }],
    };
    const ytd = computeYtd([comSnapshot, semSnapshot], new Date("2026-08-01"));
    // 500 (snapshot real) + 300 (fallback ao cost basis do outro ativo) — se
    // o fallback só se aplicasse quando NENHUM ativo tivesse snapshot, este
    // total ficaria em 500, perdendo os 300 do segundo ativo.
    expect(ytd.startValue).toBe(800);
    expect(ytd.endValue).toBe(930);
    expect(ytd.gainAmount).toBe(130); // (600-500) + (330-300)
  });

  it("gainAmount = (endValue - startValue - netFlow) + income", () => {
    const asset: AssetLedger = {
      id: "a1",
      name: "Depósito",
      category: "Depósitos",
      currency: "EUR",
      transactions: [
        { type: "DEPOSIT", date: new Date("2025-01-01"), amount: 5000 },
        { type: "INTEREST", date: new Date("2026-03-01"), amount: 100 },
      ],
      snapshots: [
        { date: new Date("2025-12-31"), value: 5000 },
        { date: new Date("2026-08-01"), value: 5100 },
      ],
    };
    const ytd = computeYtd([asset], new Date("2026-08-01"));
    expect(ytd.startValue).toBe(5000);
    expect(ytd.endValue).toBe(5100);
    expect(ytd.netFlow).toBe(0); // nenhum DEPOSIT/WITHDRAWAL dentro do ano
    expect(ytd.income).toBe(100);
    expect(ytd.gainAmount).toBe(200); // (5100-5000-0) + 100
  });

  it("ativo sem valor final conhecido (sem cotação ao vivo nem valorização) fica de fora — não conta como 'vale 0'", () => {
    // Regressão real: um ativo recém-criado (só com a transação de compra,
    // ainda sem cotação ao vivo bem-sucedida nem nenhuma valorização
    // manual) fazia endValue subir 0 mas startValue continuar a cair no
    // fallback do cost basis — o ganho aparecia quase igual a
    // "-investido", como se o ativo tivesse perdido tudo, quando na
    // verdade só ainda não se sabe quanto vale.
    const semValor: AssetLedger = {
      id: "novo",
      name: "ETF recém-criado",
      category: "ETFs",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2026-02-01"), amount: 1000 }],
      snapshots: [],
      livePrice: null,
    };
    const comValor: AssetLedger = {
      id: "antigo",
      name: "Depósito",
      category: "Depósitos",
      currency: "EUR",
      transactions: [{ type: "DEPOSIT", date: new Date("2025-01-01"), amount: 500 }],
      snapshots: [
        { date: new Date("2025-12-31"), value: 500 },
        { date: new Date("2026-08-01"), value: 520 },
      ],
    };
    const ytd = computeYtd([semValor, comValor], new Date("2026-08-01"));
    expect(ytd.ativosSemValorFinal).toBe(1);
    // Só o ativo "comValor" entra — nem o cost basis nem os fluxos do "semValor".
    expect(ytd.startValue).toBe(500);
    expect(ytd.endValue).toBe(520);
    expect(ytd.gainAmount).toBe(20);
    expect(ytd.gainPercent).toBeCloseTo(0.04);
  });

  it("usa a cotação ao vivo (livePrice × unidades) como V_end quando disponível", () => {
    const asset: AssetLedger = {
      id: "a1",
      name: "Bitcoin",
      category: "Cripto",
      currency: "EUR",
      transactions: [{ type: "BUY", date: new Date("2025-06-01"), amount: 1000, quantity: 1 }],
      snapshots: [{ date: new Date("2025-12-31"), value: 1000 }],
      livePrice: 1300,
    };
    const ytd = computeYtd([asset], new Date("2026-08-01"));
    expect(ytd.endValue).toBe(1300); // 1300 × 1 unidade, não o snapshot antigo
    expect(ytd.gainAmount).toBe(300);
    expect(ytd.ativosSemValorFinal).toBe(0);
  });
});

describe("computeAllocation", () => {
  it("agrupa por categoria, ignora valores <= 0 e ordena por valor desc", () => {
    const allocation = computeAllocation([
      { category: "Ações", currentValue: 300 },
      { category: "Cripto", currentValue: 100 },
      { category: "Ações", currentValue: 200 },
      { category: "Sem valor", currentValue: null },
      { category: "Zero", currentValue: 0 },
    ]);
    expect(allocation).toEqual([
      { category: "Ações", value: 500, pct: 500 / 600 },
      { category: "Cripto", value: 100, pct: 100 / 600 },
    ]);
  });
});

describe("computePortfolioTimeSeries", () => {
  it("faz forward-fill do último valor conhecido de cada ativo, por data", () => {
    const assets: AssetLedger[] = [
      {
        id: "a1",
        name: "A",
        category: "X",
        currency: "EUR",
        transactions: [{ type: "BUY", date: new Date("2026-01-01"), amount: 100 }],
        snapshots: [{ date: new Date("2026-01-01"), value: 100 }],
      },
      {
        id: "a2",
        name: "B",
        category: "X",
        currency: "EUR",
        transactions: [{ type: "BUY", date: new Date("2026-02-01"), amount: 50 }],
        snapshots: [{ date: new Date("2026-02-01"), value: 60 }],
      },
    ];
    const series = computePortfolioTimeSeries(assets);
    expect(series).toHaveLength(2);
    // Na segunda data, o valor de "a1" é reportado com forward-fill (100).
    expect(series[1]).toEqual({ date: "2026-02-01", value: 160, invested: 150 });
  });
});

describe("computeTrendContext", () => {
  it("devolve null com menos de 2 pontos", () => {
    expect(computeTrendContext([{ date: "2026-06-01", value: 100 }])).toBeNull();
  });

  it("null quando a janela de meses fica sem pontos suficientes", () => {
    const series = [
      { date: "2020-01-01", value: 50 },
      { date: "2026-06-01", value: 100 },
    ];
    expect(computeTrendContext(series, 6)).toBeNull();
  });

  it("acima da média quando o último ponto é maior que a média da janela", () => {
    const series = [
      { date: "2026-01-01", value: 100 },
      { date: "2026-02-01", value: 100 },
      { date: "2026-03-01", value: 100 },
      { date: "2026-04-01", value: 130 },
    ];
    const resultado = computeTrendContext(series, 6);
    expect(resultado?.direction).toBe("up");
    expect(resultado?.percentVsAverage).toBeCloseTo((130 - 107.5) / 107.5);
  });

  it("abaixo da média quando o último ponto é menor que a média da janela", () => {
    const series = [
      { date: "2026-01-01", value: 100 },
      { date: "2026-02-01", value: 100 },
      { date: "2026-03-01", value: 70 },
    ];
    const resultado = computeTrendContext(series, 6);
    expect(resultado?.direction).toBe("down");
  });
});

describe("computeAssetPerformance", () => {
  it("ordena por P/L % desc, com ativos sem valorização (null) no fim", () => {
    const assets: AssetLedger[] = [
      {
        id: "sem-valorizacao",
        name: "Novo",
        category: "X",
        currency: "EUR",
        transactions: [{ type: "BUY", date: new Date("2026-01-01"), amount: 100 }],
        snapshots: [],
      },
      {
        id: "pior",
        name: "Pior",
        category: "X",
        currency: "EUR",
        transactions: [{ type: "BUY", date: new Date("2026-01-01"), amount: 100 }],
        snapshots: [{ date: new Date("2026-01-02"), value: 90 }],
      },
      {
        id: "melhor",
        name: "Melhor",
        category: "X",
        currency: "EUR",
        transactions: [{ type: "BUY", date: new Date("2026-01-01"), amount: 100 }],
        snapshots: [{ date: new Date("2026-01-02"), value: 150 }],
      },
    ];
    const performance = computeAssetPerformance(assets);
    expect(performance.map((p) => p.id)).toEqual(["melhor", "pior", "sem-valorizacao"]);
  });
});

function performanceRow(over: Partial<AssetPerformanceRow>): AssetPerformanceRow {
  return {
    id: "a",
    name: "Ativo",
    category: "X",
    currency: "EUR",
    netInvested: 100,
    currentValue: 110,
    currentValueSource: "manual",
    unrealizedPL: 10,
    unrealizedPLPercent: 0.1,
    incomeReceived: 0,
    totalReturn: 10,
    totalReturnPercent: 0.1,
    ...over,
  };
}

describe("computePortfolioTotals", () => {
  it("soma normalmente quando todos os ativos têm valor conhecido", () => {
    const totals = computePortfolioTotals([
      performanceRow({ id: "a1", netInvested: 100, currentValue: 120, incomeReceived: 5 }),
      performanceRow({ id: "a2", netInvested: 200, currentValue: 210, incomeReceived: 0 }),
    ]);
    expect(totals.totalValue).toBe(330);
    expect(totals.investedComValorConhecido).toBe(300);
    expect(totals.totalIncome).toBe(5);
    expect(totals.sinceInceptionGain).toBe(35); // (330 - 300) + 5
    expect(totals.ativosSemValor).toBe(0);
  });

  it("ativo sem valor conhecido fica de fora de totalValue/ganho — não conta como 'vale 0'", () => {
    // Regressão real: antes disto, um ativo currentValue=null contribuía 0
    // para totalValue mas o seu netInvested continuava a entrar no total
    // investido usado no ganho — fazia "Ganho desde o início" aparecer
    // quase igual a "-Total investido" assim que um ativo era criado sem
    // ainda ter cotação/valorização nenhuma, como se tivesse perdido tudo.
    const totals = computePortfolioTotals([
      performanceRow({ id: "com-valor", netInvested: 300, currentValue: 330, incomeReceived: 10 }),
      performanceRow({
        id: "sem-valor",
        netInvested: 1000,
        currentValue: null,
        currentValueSource: null,
        unrealizedPL: null,
        unrealizedPLPercent: null,
        totalReturn: null,
        totalReturnPercent: null,
        incomeReceived: 0,
      }),
    ]);
    expect(totals.ativosSemValor).toBe(1);
    expect(totals.totalValue).toBe(330); // só o ativo com valor conhecido
    expect(totals.investedComValorConhecido).toBe(300); // não os 1000 do ativo sem valor
    expect(totals.sinceInceptionGain).toBe(40); // (330-300)+10 — nunca -1000 e picos
    expect(totals.totalIncome).toBe(10); // rendimento é sempre um facto conhecido
  });
});
