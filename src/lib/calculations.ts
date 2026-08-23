// Funções puras de cálculo do livro-razão. Nada aqui acede à base de dados —
// recebem arrays simples (vindos de src/lib/data.ts) e devolvem números.
//
// Filosofia: as transações (Transaction) formam o livro-razão, append-only.
// Os snapshots de valorização (ValuationSnapshot) são marcações manuais e
// independentes do valor de mercado. Não há totais derivados guardados na
// base de dados — está tudo calculado aqui, num único sítio testável.

import type { TransactionType } from "@/core/types";

export type TxLite = {
  type: TransactionType;
  date: Date;
  amount: number;
  /** Opcional: omitido nos testes/chamadas que não mexem em netQuantity — tratado como null. */
  quantity?: number | null;
};

export type SnapshotLite = {
  date: Date;
  value: number;
};

type TxMeta = { costBasis: 1 | -1 | 0; isIncome: boolean };

/**
 * Efeito de cada tipo de transação no cost basis (capital investido) e se
 * conta como rendimento. BUY/DEPOSIT/FEE aumentam o cost basis (dinheiro que
 * "entrou" no ativo); SELL/WITHDRAWAL reduzem-no; DIVIDEND/INTEREST são
 * rendimento puro e não alteram o cost basis.
 */
export const TX_META: Record<TransactionType, TxMeta> = {
  BUY: { costBasis: 1, isIncome: false },
  DEPOSIT: { costBasis: 1, isIncome: false },
  FEE: { costBasis: 1, isIncome: false },
  SELL: { costBasis: -1, isIncome: false },
  WITHDRAWAL: { costBasis: -1, isIncome: false },
  DIVIDEND: { costBasis: 0, isIncome: true },
  INTEREST: { costBasis: 0, isIncome: true },
};

function upTo<T extends { date: Date }>(items: T[], asOf: Date): T[] {
  return items.filter((item) => item.date.getTime() <= asOf.getTime());
}

/** Soma de amount × sinal do tipo, até (inclusive) `asOf`. */
export function netInvested(transactions: TxLite[], asOf: Date = new Date()): number {
  return upTo(transactions, asOf).reduce(
    (sum, tx) => sum + tx.amount * TX_META[tx.type].costBasis,
    0
  );
}

/**
 * Unidades detidas (BUY soma, SELL subtrai), até (inclusive) `asOf`.
 * Transações sem quantidade (depósitos, comissões, dividendos... — ver
 * NewTransaction, quantity é null para ativos "sem unidades") são ignoradas.
 * Usado só para cruzar com a cotação ao vivo (ver src/lib/data.ts,
 * obterPrecoAoVivo) — sem cotação configurada, nunca é chamada.
 */
export function netQuantity(transactions: TxLite[], asOf: Date = new Date()): number {
  return upTo(transactions, asOf).reduce((sum, tx) => {
    if (tx.quantity == null) return sum;
    if (tx.type === "BUY") return sum + tx.quantity;
    if (tx.type === "SELL") return sum - tx.quantity;
    return sum;
  }, 0);
}

/** Soma de DIVIDEND + INTEREST, até (inclusive) `asOf`. */
export function incomeReceived(transactions: TxLite[], asOf: Date = new Date()): number {
  return upTo(transactions, asOf).reduce(
    (sum, tx) => sum + (TX_META[tx.type].isIncome ? tx.amount : 0),
    0
  );
}

/** Fluxo líquido de capital (só cost-basis-affecting) entre duas datas (inclusive). */
export function netFlowBetween(transactions: TxLite[], start: Date, end: Date): number {
  return transactions
    .filter((tx) => tx.date.getTime() >= start.getTime() && tx.date.getTime() <= end.getTime())
    .reduce((sum, tx) => sum + tx.amount * TX_META[tx.type].costBasis, 0);
}

/** Rendimento entre duas datas (inclusive). */
export function incomeBetween(transactions: TxLite[], start: Date, end: Date): number {
  return transactions
    .filter((tx) => tx.date.getTime() >= start.getTime() && tx.date.getTime() <= end.getTime())
    .reduce((sum, tx) => sum + (TX_META[tx.type].isIncome ? tx.amount : 0), 0);
}

/** Último snapshot com data ≤ asOf, ou null se não existir nenhum. */
export function latestValue(snapshots: SnapshotLite[], asOf: Date = new Date()): number | null {
  const candidates = upTo(snapshots, asOf);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, s) => (s.date.getTime() > latest.date.getTime() ? s : latest))
    .value;
}

export type AssetFinancials = {
  netInvested: number;
  currentValue: number | null;
  /** De onde veio `currentValue`: cotação ao vivo (API), última valorização manual, ou null (nenhuma das duas). */
  currentValueSource: "live" | "manual" | null;
  unrealizedPL: number | null;
  unrealizedPLPercent: number | null;
  incomeReceived: number;
  totalReturn: number | null;
  totalReturnPercent: number | null;
};

/**
 * Métricas "desde sempre" de um ativo, a uma data de referência (por
 * omissão, hoje). `currentValue` vem, por ordem de preferência, da cotação
 * ao vivo (`liveValue`, preço de mercado × unidades detidas — ver
 * src/lib/data.ts) ou, na sua ausência, da última valorização manual
 * (snapshot). Fica null se não houver nenhuma das duas — nesse caso P/L e
 * retorno total também ficam null (não se pode concluir nada sobre
 * desempenho sem um valor atual).
 */
export function computeAssetFinancials(
  transactions: TxLite[],
  snapshots: SnapshotLite[],
  asOf: Date = new Date(),
  liveValue: number | null = null
): AssetFinancials {
  const invested = netInvested(transactions, asOf);
  const manualValue = latestValue(snapshots, asOf);
  const currentValue = liveValue ?? manualValue;
  const currentValueSource: AssetFinancials["currentValueSource"] =
    liveValue !== null ? "live" : manualValue !== null ? "manual" : null;
  const income = incomeReceived(transactions, asOf);

  const unrealizedPL = currentValue === null ? null : currentValue - invested;
  const unrealizedPLPercent =
    unrealizedPL === null || invested === 0 ? null : unrealizedPL / invested;
  const totalReturn = unrealizedPL === null ? null : unrealizedPL + income;
  const totalReturnPercent =
    totalReturn === null || invested === 0 ? null : totalReturn / invested;

  return {
    netInvested: invested,
    currentValue,
    currentValueSource,
    unrealizedPL,
    unrealizedPLPercent,
    incomeReceived: income,
    totalReturn,
    totalReturnPercent,
  };
}

export type AssetLedger = {
  id: string;
  name: string;
  category: string;
  currency: string;
  transactions: TxLite[];
  snapshots: SnapshotLite[];
  /** Preço unitário ao vivo (ver src/lib/data.ts, obterPrecoAoVivo) — omitido/null quando o ativo não tem cotação configurada ou a API falhou. */
  livePrice?: number | null;
};

export type YtdResult = {
  year: number;
  startValue: number;
  endValue: number;
  netFlow: number;
  income: number;
  gainAmount: number;
  gainPercent: number | null;
};

/**
 * Ganho YTD do portefólio (soma de todos os ativos):
 *   Ganho € = (V_end − V_start − netFlowYTD) + incomeYTD
 *   Ganho % = Ganho € ÷ V_start
 *
 * V_start de cada ativo, individualmente, é o último snapshot antes do
 * início do ano — ou, na ausência de um (ex.: ativo novo este ano, ou só
 * começou a ser valorizado depois), o cost basis nessa mesma data como
 * aproximação. O fallback é calculado por ativo, não a nível do portefólio:
 * somar primeiro e só depois decidir "portefólio inteiro sem snapshot vs.
 * com" esconderia o caso comum de uma carteira mista (alguns ativos com
 * snapshot de fecho de ano, outros sem) — sem isto, o capital investido
 * antes do ano nos ativos "sem" ficaria de fora tanto de V_start como do
 * netFlowYTD (que só conta fluxos DENTRO do ano), inflacionando
 * artificialmente o ganho em euros exibido (ver src/lib/calculations.test.ts,
 * "gainAmount inclui o cost basis pré-ano quando falta snapshot de arranque").
 *
 * É uma aproximação money-weighted simples (não XIRR/TWR), deliberadamente
 * simples dado o requisito de "stack o mais simples possível".
 */
export function computeYtd(assets: AssetLedger[], asOf: Date = new Date()): YtdResult {
  const year = asOf.getFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const dayBeforeYearStart = new Date(yearStart.getTime() - 1);

  let startValue = 0;
  let endValue = 0;
  let netFlow = 0;
  let income = 0;

  for (const asset of assets) {
    const vStart = latestValue(asset.snapshots, dayBeforeYearStart);
    const vEnd = latestValue(asset.snapshots, asOf);
    startValue += vStart ?? netInvested(asset.transactions, dayBeforeYearStart);
    endValue += vEnd ?? 0;
    netFlow += netFlowBetween(asset.transactions, yearStart, asOf);
    income += incomeBetween(asset.transactions, yearStart, asOf);
  }

  const gainAmount = endValue - startValue - netFlow + income;
  const gainPercent = startValue > 0 ? gainAmount / startValue : null;

  return { year, startValue, endValue, netFlow, income, gainAmount, gainPercent };
}

export type AllocationSlice = { category: string; value: number; pct: number };

/** Alocação por categoria, a partir do valor atual de cada ativo. */
export function computeAllocation(
  assets: { category: string; currentValue: number | null }[]
): AllocationSlice[] {
  const totals = new Map<string, number>();
  let total = 0;

  for (const asset of assets) {
    const value = asset.currentValue ?? 0;
    if (value <= 0) continue;
    totals.set(asset.category, (totals.get(asset.category) ?? 0) + value);
    total += value;
  }

  return Array.from(totals.entries())
    .map(([category, value]) => ({ category, value, pct: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export type TrendContext = {
  direction: "up" | "down" | "flat";
  /** Fração (0.05 = 5%) do valor mais recente vs. a média da janela — não percentagem já formatada. */
  percentVsAverage: number;
  windowMonths: number;
};

/**
 * Compara o último ponto de uma série temporal com a média dos últimos
 * "windowMonths" — dá o "cruzamento" que aparece nos KpiCard do dashboard
 * (ex: "3.2% acima da média dos últimos 6 meses"). Devolve null quando não
 * há histórico suficiente para a janela ter significado (menos de 2 pontos,
 * ou média zero — evita dividir por zero).
 */
export function computeTrendContext(
  series: { date: string; value: number }[],
  windowMonths = 6
): TrendContext | null {
  if (series.length < 2) return null;

  const last = series[series.length - 1]!;
  const asOf = new Date(last.date);
  const windowStart = new Date(asOf);
  windowStart.setMonth(windowStart.getMonth() - windowMonths);

  const windowPoints = series.filter((p) => new Date(p.date) >= windowStart);
  if (windowPoints.length < 2) return null;

  const average = windowPoints.reduce((sum, p) => sum + p.value, 0) / windowPoints.length;
  if (average === 0) return null;

  const percentVsAverage = (last.value - average) / average;
  const direction = percentVsAverage > 0.001 ? "up" : percentVsAverage < -0.001 ? "down" : "flat";

  return { direction, percentVsAverage, windowMonths };
}

export type TimeSeriesPoint = { date: string; value: number; invested: number };

/**
 * Série temporal do valor do portefólio: para cada data em que pelo menos
 * um ativo tem um snapshot, soma-se o último valor conhecido (forward-fill)
 * de cada ativo nessa data, e o capital investido acumulado até essa data
 * (linha de referência). A diferença entre as duas mostra a P/L não
 * realizada ao longo do tempo.
 */
export function computePortfolioTimeSeries(assets: AssetLedger[]): TimeSeriesPoint[] {
  const allDates = new Set<number>();
  for (const asset of assets) {
    for (const snapshot of asset.snapshots) {
      allDates.add(snapshot.date.getTime());
    }
  }

  const sortedDates = Array.from(allDates)
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  return sortedDates.map((date) => {
    let value = 0;
    let invested = 0;
    for (const asset of assets) {
      value += latestValue(asset.snapshots, date) ?? 0;
      invested += netInvested(asset.transactions, date);
    }
    return { date: date.toISOString().slice(0, 10), value, invested };
  });
}

export type AssetPerformanceRow = AssetFinancials & {
  id: string;
  name: string;
  category: string;
  currency: string;
};

/** Uma linha por ativo, ordenada por P/L % (melhor primeiro; sem valorização fica no fim). */
export function computeAssetPerformance(
  assets: AssetLedger[],
  asOf: Date = new Date()
): AssetPerformanceRow[] {
  return assets
    .map((asset) => {
      const liveValue =
        asset.livePrice != null ? asset.livePrice * netQuantity(asset.transactions, asOf) : null;
      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        currency: asset.currency,
        ...computeAssetFinancials(asset.transactions, asset.snapshots, asOf, liveValue),
      };
    })
    .sort((a, b) => {
      if (a.unrealizedPLPercent === null) return 1;
      if (b.unrealizedPLPercent === null) return -1;
      return b.unrealizedPLPercent - a.unrealizedPLPercent;
    });
}
