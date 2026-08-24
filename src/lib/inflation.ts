// Funções puras de "poder de compra" — nada aqui acede à API, recebem a
// série do índice (já obtida, ver src/lib/data.ts) e devolvem números.
// Mesma filosofia de src/lib/calculations.ts: cálculo isolado e testável,
// separado por ser um domínio genuinamente diferente (economia externa,
// não o livro-razão do portefólio).

import type { PontoIndiceInflacao } from "@/core/ports/inflation";
import type { AssetPurpose } from "@/core/types";

export type PeriodoInflacao = "day" | "week" | "month" | "year";

// Comparação por categoria normalizada (trim + minúsculas) — texto livre
// no formulário (ver AssetForm.tsx), não um enum, por isso "Poupanças " ou
// "poupanças" também tem de contar. Alargar esta lista (ou passar a
// incluir todas as categorias) é como se estende o mesmo KPI aos
// restantes ativos, sem mexer no resto da lógica.
const CATEGORIAS_PODER_DE_COMPRA = ["poupanças", "fundo de emergência"];

/**
 * Um ativo entra no KPI de poder de compra por DUAS vias independentes:
 * a categoria bater com uma das de cima, OU o campo "purpose" (ver
 * core/types.ts, AssetPurpose) estar marcado — o segundo caso é para
 * quando o dinheiro do fundo de emergência/poupança está, na prática,
 * aplicado noutra coisa (ex.: um Certificado de Aforro, categoria
 * própria) e não faz sentido nenhum recategorizar o ativo nem duplicá-lo
 * só para aparecer aqui. Pedido explícito: "enquanto é aplicado ter uma
 * nota de leitura que é fundo de emergência ou poupança, sem adicionar o
 * valor a mais, caso contrário ir ter valores duplicados".
 */
export function ehRelevanteParaPoderDeCompra(asset: { category: string; purpose: AssetPurpose | null }): boolean {
  if (asset.purpose === "emergency_fund" || asset.purpose === "savings") return true;
  return CATEGORIAS_PODER_DE_COMPRA.includes(asset.category.trim().toLowerCase());
}

// Meses usam a média de dias do ano (365/12), não "30" — evita que um mês
// mais curto (fevereiro) pareça ter inflação equivalente mais alta só por
// ter menos dias, quando a taxa anual usada de base é a mesma.
const DIAS_POR_PERIODO: Record<PeriodoInflacao, number> = {
  day: 1,
  week: 7,
  month: 365 / 12,
  year: 365,
};

/** Valor do índice no (ou no mês mais próximo antes do) dia pedido — null se a série não tiver nenhum ponto até essa data. */
export function indiceNaData(serie: PontoIndiceInflacao[], data: Date): number | null {
  const candidatos = serie.filter((p) => p.date.getTime() <= data.getTime());
  if (candidatos.length === 0) return null;
  return candidatos.reduce((maisRecente, p) => (p.date.getTime() > maisRecente.date.getTime() ? p : maisRecente))
    .index;
}

/**
 * Taxa de inflação homóloga atual (variação do índice nos últimos ~12
 * meses) — não é uma série à parte pedida à API, é o próprio índice
 * desfasado de um ano (confirmado bater certo com a taxa oficial
 * publicada pelo INE/BPstat, ver bpstatInflationProvider.ts). Fração
 * (0.03 = 3%), não percentagem. null se a série não tiver pelo menos ~1
 * ano de histórico.
 */
export function taxaAnualAtual(serie: PontoIndiceInflacao[]): number | null {
  if (serie.length === 0) return null;
  const ultimo = serie.reduce((mais, p) => (p.date.getTime() > mais.date.getTime() ? p : mais));

  const umAnoAntes = new Date(ultimo.date);
  umAnoAntes.setUTCFullYear(umAnoAntes.getUTCFullYear() - 1);

  const indiceAnoAntes = indiceNaData(serie, umAnoAntes);
  if (indiceAnoAntes === null || indiceAnoAntes === 0) return null;

  return ultimo.index / indiceAnoAntes - 1;
}

/**
 * Converte uma taxa ANUAL na taxa equivalente para um período mais curto,
 * por juro composto — não existe "inflação diária/semanal" publicada em
 * lado nenhum (só a mensal/anual, ver README) — isto é uma projeção
 * matemática a partir da taxa anual real, nunca dados diários genuínos.
 * Deixar isto claro na UI é importante, não é a mesma coisa que uma
 * medição.
 */
export function taxaEquivalentePeriodo(taxaAnual: number, periodo: PeriodoInflacao): number {
  if (periodo === "year") return taxaAnual;
  const dias = DIAS_POR_PERIODO[periodo];
  return Math.pow(1 + taxaAnual, dias / 365) - 1;
}

export type PoderDeCompra = {
  /** Crescimento nominal do valor desde o investimento — sem ajustar à inflação. */
  taxaNominal: number;
  /** Inflação acumulada no mesmo período (não anualizada — o total entre as duas datas). */
  taxaInflacaoAcumulada: number;
  /**
   * Equação de Fisher: (1+nominal)/(1+inflação) − 1. Positiva = o valor
   * cresceu mais do que a inflação (ganhaste poder de compra); negativa =
   * cresceu menos (perdeste), mesmo que o valor nominal tenha subido.
   */
  taxaReal: number;
  /** O que o valor investido precisaria de valer hoje só para acompanhar a inflação (nem ganhar nem perder poder de compra). */
  valorNecessarioParaAcompanhar: number;
};

/**
 * Compara o valor investido com o valor atual, ajustado à inflação
 * acumulada entre as duas datas (índice do IPC em cada uma — ver
 * indiceNaData). null se faltar histórico do índice suficiente para
 * alguma das duas datas, ou se não houver nada investido.
 */
export function calcularPoderDeCompra(dados: {
  valorInvestido: number;
  valorAtual: number;
  indiceNoInvestimento: number | null;
  indiceAtual: number | null;
}): PoderDeCompra | null {
  const { valorInvestido, valorAtual, indiceNoInvestimento, indiceAtual } = dados;
  if (valorInvestido <= 0 || indiceNoInvestimento === null || indiceAtual === null || indiceNoInvestimento === 0) {
    return null;
  }

  const taxaNominal = valorAtual / valorInvestido - 1;
  const taxaInflacaoAcumulada = indiceAtual / indiceNoInvestimento - 1;
  const taxaReal = (1 + taxaNominal) / (1 + taxaInflacaoAcumulada) - 1;
  const valorNecessarioParaAcompanhar = valorInvestido * (1 + taxaInflacaoAcumulada);

  return { taxaNominal, taxaInflacaoAcumulada, taxaReal, valorNecessarioParaAcompanhar };
}

/**
 * Estimativa ilustrativa de quanto a inflação corrói do valor atual por
 * dia/semana/mês/ano, SE o valor nominal ficar parado — não é medido (a
 * generalidade destes ativos não tem histórico de valor diário nenhum),
 * é a taxa periódica equivalente (ver taxaEquivalentePeriodo) aplicada ao
 * valor de agora. Serve para dar sentido de escala ("perdes ~2€/dia só
 * de inflação"), não como um valor exato.
 */
export function estimarErosaoPeriodica(valorAtual: number, taxaAnual: number, periodo: PeriodoInflacao): number {
  return valorAtual * taxaEquivalentePeriodo(taxaAnual, periodo);
}
