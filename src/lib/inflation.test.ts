import { describe, expect, it } from "vitest";
import {
  calcularPoderDeCompra,
  estimarErosaoPeriodica,
  indiceNaData,
  taxaAnualAtual,
  taxaEquivalentePeriodo,
} from "@/lib/inflation";
import type { PontoIndiceInflacao } from "@/core/ports/inflation";

function ponto(date: string, index: number): PontoIndiceInflacao {
  return { date: new Date(date), index };
}

// Série minimalista, 13 meses, com uma subida de índice de 100 -> 103
// entre o primeiro e o último ponto (3% de inflação homóloga).
const SERIE: PontoIndiceInflacao[] = [
  ponto("2025-07-31", 100),
  ponto("2025-08-31", 100.2),
  ponto("2025-09-30", 100.4),
  ponto("2025-10-31", 100.6),
  ponto("2025-11-30", 100.8),
  ponto("2025-12-31", 101.0),
  ponto("2026-01-31", 101.2),
  ponto("2026-02-28", 101.5),
  ponto("2026-03-31", 101.8),
  ponto("2026-04-30", 102.1),
  ponto("2026-05-31", 102.4),
  ponto("2026-06-30", 102.7),
  ponto("2026-07-31", 103.0),
];

describe("indiceNaData", () => {
  it("devolve o índice do mês mais recente até (inclusive) a data pedida", () => {
    expect(indiceNaData(SERIE, new Date("2026-03-31"))).toBe(101.8);
  });

  it("cai para o último ponto anterior quando a data pedida não bate certo com nenhum", () => {
    expect(indiceNaData(SERIE, new Date("2026-03-15"))).toBe(101.5); // fevereiro, não março
  });

  it("null quando a série não tem nenhum ponto até essa data", () => {
    expect(indiceNaData(SERIE, new Date("2020-01-01"))).toBeNull();
  });
});

describe("taxaAnualAtual", () => {
  it("calcula a taxa homóloga a partir do próprio índice desfasado de um ano", () => {
    // 103.0 / 100.0 - 1 = 3%
    expect(taxaAnualAtual(SERIE)).toBeCloseTo(0.03);
  });

  it("null com série vazia", () => {
    expect(taxaAnualAtual([])).toBeNull();
  });
});

describe("taxaEquivalentePeriodo", () => {
  it("devolve a própria taxa para 'year'", () => {
    expect(taxaEquivalentePeriodo(0.03, "year")).toBeCloseTo(0.03);
  });

  it("uma taxa anual positiva dá taxas diárias/semanais/mensais positivas, mas cada vez menores", () => {
    const dia = taxaEquivalentePeriodo(0.03, "day");
    const semana = taxaEquivalentePeriodo(0.03, "week");
    const mes = taxaEquivalentePeriodo(0.03, "month");
    expect(dia).toBeGreaterThan(0);
    expect(dia).toBeLessThan(semana);
    expect(semana).toBeLessThan(mes);
    expect(mes).toBeLessThan(0.03);
  });

  it("composto (não simples): 12 meses seguidos aproxima a taxa anual", () => {
    const mensal = taxaEquivalentePeriodo(0.03, "month");
    const composto12Meses = Math.pow(1 + mensal, 12) - 1;
    expect(composto12Meses).toBeCloseTo(0.03, 5);
  });
});

describe("calcularPoderDeCompra", () => {
  it("taxa real positiva quando o crescimento nominal supera a inflação", () => {
    const resultado = calcularPoderDeCompra({
      valorInvestido: 1000,
      valorAtual: 1100, // +10% nominal
      indiceNoInvestimento: 100,
      indiceAtual: 103, // +3% inflação
    });
    expect(resultado?.taxaNominal).toBeCloseTo(0.1);
    expect(resultado?.taxaInflacaoAcumulada).toBeCloseTo(0.03);
    expect(resultado?.taxaReal).toBeGreaterThan(0);
    expect(resultado?.valorNecessarioParaAcompanhar).toBeCloseTo(1030);
  });

  it("taxa real negativa quando o valor nominal não acompanha a inflação (mesmo crescendo)", () => {
    // Regressão do que este KPI existe para apanhar: um "Fundo de
    // Emergência" parado (sem juro nenhum) claramente perde poder de
    // compra, mas também um que cresce um pouco (+1%) enquanto a
    // inflação foi maior (+3%) — os dois têm de dar taxaReal negativa.
    const parado = calcularPoderDeCompra({
      valorInvestido: 1000,
      valorAtual: 1000,
      indiceNoInvestimento: 100,
      indiceAtual: 103,
    });
    expect(parado?.taxaReal).toBeLessThan(0);

    const cresceMenosQueAInflacao = calcularPoderDeCompra({
      valorInvestido: 1000,
      valorAtual: 1010,
      indiceNoInvestimento: 100,
      indiceAtual: 103,
    });
    expect(cresceMenosQueAInflacao?.taxaReal).toBeLessThan(0);
  });

  it("taxa real ~0 quando o valor acompanha exatamente a inflação", () => {
    const resultado = calcularPoderDeCompra({
      valorInvestido: 1000,
      valorAtual: 1030,
      indiceNoInvestimento: 100,
      indiceAtual: 103,
    });
    expect(resultado?.taxaReal).toBeCloseTo(0, 5);
  });

  it("null sem valor investido ou sem índice de referência", () => {
    expect(calcularPoderDeCompra({ valorInvestido: 0, valorAtual: 100, indiceNoInvestimento: 100, indiceAtual: 103 })).toBeNull();
    expect(calcularPoderDeCompra({ valorInvestido: 100, valorAtual: 100, indiceNoInvestimento: null, indiceAtual: 103 })).toBeNull();
    expect(calcularPoderDeCompra({ valorInvestido: 100, valorAtual: 100, indiceNoInvestimento: 100, indiceAtual: null })).toBeNull();
  });
});

describe("estimarErosaoPeriodica", () => {
  it("é positiva com inflação positiva, e escala com o valor atual", () => {
    const erosaoDia = estimarErosaoPeriodica(1000, 0.03, "day");
    const erosaoDiaValorDobrado = estimarErosaoPeriodica(2000, 0.03, "day");
    expect(erosaoDia).toBeGreaterThan(0);
    expect(erosaoDiaValorDobrado).toBeCloseTo(erosaoDia * 2);
  });
});
