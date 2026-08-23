import "server-only";

import { obterContentor } from "@/composition/container";
import type { PriceProvider, TransactionType } from "@/core/types";
import {
  computeAssetFinancials,
  computeAssetPerformance,
  computeAllocation,
  computePortfolioTimeSeries,
  computeTrendContext,
  computeYtd,
  incomeReceived,
  netInvested,
  netQuantity,
  type AssetLedger,
  type TimeSeriesPoint,
  type TxLite,
} from "@/lib/calculations";
import { formatTrendContext } from "@/lib/format";

function toLedger(
  asset: {
    id: string;
    name: string;
    category: string;
    currency: string;
    transactions: { type: TransactionType; date: Date; amount: number; quantity: number | null }[];
    valuations: { date: Date; value: number }[];
  },
  livePrice: number | null = null
): AssetLedger {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    currency: asset.currency,
    transactions: asset.transactions,
    snapshots: asset.valuations,
    livePrice,
  };
}

/**
 * Cotação ao vivo de um ativo, se tiver fornecedor configurado (ver
 * src/adapters/quotes/httpQuoteProvider.ts) — null para ativos sem
 * price_provider/price_symbol (Certificados de Aforro, depósitos,
 * imóveis... não têm cotação de mercado nenhuma para obter) ou quando a
 * API falha/está sem chave. Nunca lança.
 */
async function obterPrecoAoVivo(asset: {
  priceProvider: PriceProvider | null;
  priceSymbol: string | null;
  currency: string;
}): Promise<number | null> {
  if (!asset.priceProvider || !asset.priceSymbol) return null;
  return obterContentor().cotacoes.obterPreco(asset.priceProvider, asset.priceSymbol, asset.currency);
}

/** Preço × unidades detidas até `asOf` — null se não houver cotação. */
function valorAoVivo(price: number | null, transactions: TxLite[], asOf: Date): number | null {
  if (price === null) return null;
  return price * netQuantity(transactions, asOf);
}

/** Chave de dia (yyyy-mm-dd, em UTC) — usada para comparar/gravar "hoje" de forma determinística, sem depender do fuso horário do servidor. */
function chaveDia(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Guarda automaticamente a valorização de hoje a partir da cotação ao vivo
 * — sem isto, "Evolução do valor" (que só lê valuation_snapshots, nunca a
 * cotação ao vivo) ficava sempre vazio para um ativo só com cotação
 * automática e nenhuma valorização manual. Upsert por (asset_id, date): só
 * a primeira chamada do dia grava de facto, as seguintes (outros renders
 * no mesmo dia) veem "hoje" já presente em asset.valuations e saem sem
 * tocar na base de dados. Nunca lança — uma falha aqui não pode partir a
 * página que só queria mostrar o valor atual.
 */
async function sincronizarValorizacaoAutomatica(
  asset: { id: string; valuations: { date: Date }[] },
  liveValue: number | null
): Promise<void> {
  if (liveValue === null) return;
  const hoje = chaveDia(new Date());
  if (asset.valuations.some((v) => chaveDia(v.date) === hoje)) return;

  try {
    await obterContentor().valorizacoes.criarOuAtualizar({
      assetId: asset.id,
      date: new Date(hoje),
      value: liveValue,
      notes: "Cotação automática",
    });
  } catch (erro) {
    console.error(`[quotes] falha a guardar valorização automática (ativo ${asset.id}):`, erro);
  }
}

type AtivoComCotacao = {
  id: string;
  priceProvider: PriceProvider | null;
  priceSymbol: string | null;
  currency: string;
  transactions: TxLite[];
  valuations: { date: Date }[];
};

/** Cotação ao vivo + valor (preço × unidades) de um ativo, sincronizando também a valorização automática de hoje quando aplicável. */
async function precoEValorAoVivo(
  asset: AtivoComCotacao,
  asOf: Date
): Promise<{ livePrice: number | null; liveValue: number | null }> {
  const livePrice = await obterPrecoAoVivo(asset);
  const liveValue = valorAoVivo(livePrice, asset.transactions, asOf);
  await sincronizarValorizacaoAutomatica(asset, liveValue);
  return { livePrice, liveValue };
}

export async function getAssets(options: { includeArchived?: boolean } = {}) {
  const assets = await obterContentor().ativos.listar({ incluirArquivados: options.includeArchived });
  const asOf = new Date();

  return Promise.all(
    assets.map(async (asset) => {
      const { liveValue } = await precoEValorAoVivo(asset, asOf);
      return {
        ...asset,
        financials: computeAssetFinancials(asset.transactions, asset.valuations, asOf, liveValue),
        transactionCount: asset.transactions.length,
      };
    })
  );
}

export async function getAsset(id: string) {
  const asset = await obterContentor().ativos.obterPorId(id);
  if (!asset) return null;

  const asOf = new Date();
  const { livePrice, liveValue } = await precoEValorAoVivo(asset, asOf);

  return {
    ...asset,
    financials: computeAssetFinancials(asset.transactions, asset.valuations, asOf, liveValue),
    livePrice,
  };
}

export async function getAssetOptions() {
  return obterContentor().ativos.listarOpcoes();
}

export type TransactionFilters = {
  assetId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  q?: string;
};

export async function getTransactions(filters: TransactionFilters = {}) {
  return obterContentor().transacoes.listar(filters);
}

export async function getTransaction(id: string) {
  return obterContentor().transacoes.obterPorId(id);
}

export async function getRecentTransactions(limit = 8) {
  return obterContentor().transacoes.recentes(limit);
}

export async function getDashboardData() {
  const dependencias = obterContentor();
  const assets = await dependencias.ativos.listar({ incluirArquivados: false });
  const asOf = new Date();

  const ledgers = await Promise.all(
    assets.map(async (asset) => {
      const { livePrice } = await precoEValorAoVivo(asset, asOf);
      return toLedger(asset, livePrice);
    })
  );

  const totalInvested = ledgers.reduce((sum, a) => sum + netInvested(a.transactions, asOf), 0);
  const performance = computeAssetPerformance(ledgers, asOf);
  const totalValue = performance.reduce((sum, row) => sum + (row.currentValue ?? 0), 0);
  const totalIncome = ledgers.reduce((sum, a) => sum + incomeReceived(a.transactions, asOf), 0);

  const sinceInceptionGain = totalValue - totalInvested + totalIncome;
  const sinceInceptionGainPercent = totalInvested > 0 ? sinceInceptionGain / totalInvested : null;

  const ytd = computeYtd(ledgers, asOf);
  const allocation = computeAllocation(
    performance.map((row) => ({ category: row.category, currentValue: row.currentValue }))
  );
  const timeSeries = computePortfolioTimeSeries(ledgers);
  const recentTransactions = await getRecentTransactions(8);

  // Sparklines dos KpiCard: só a forma da tendência, por isso os valores de
  // "ganho" aqui ignoram o rendimento (dividendos/juros) que só entra no
  // sinceInceptionGain exato — suficiente para o traço, não substitui o
  // valor apresentado no cartão.
  const ytdSeries = timeSeries.filter((p) => new Date(p.date).getFullYear() === asOf.getFullYear());
  const asGainSeries = (series: TimeSeriesPoint[]) => series.map((p) => ({ date: p.date, value: p.value - p.invested }));

  const topPerformers = performance.filter((r) => r.unrealizedPLPercent !== null).slice(0, 3);
  const bestPerformer = topPerformers[0] ?? null;
  const bestPerformerAsset = bestPerformer ? assets.find((a) => a.id === bestPerformer.id) : undefined;
  const bestPerformerSparkline = bestPerformerAsset
    ? [...bestPerformerAsset.valuations].sort((a, b) => a.date.getTime() - b.date.getTime()).map((v) => v.value)
    : undefined;

  return {
    kpis: {
      totalValue,
      totalInvested,
      sinceInceptionGain,
      sinceInceptionGainPercent,
      ytdGainAmount: ytd.gainAmount,
      ytdGainPercent: ytd.gainPercent,
      ytdIncome: ytd.income,
      totalIncome,
    },
    trends: {
      totalValue: timeSeries.map((p) => p.value),
      totalInvested: timeSeries.map((p) => p.invested),
      sinceInceptionGain: timeSeries.map((p) => p.value - p.invested),
      ytdGain: ytdSeries.map((p) => p.value - p.invested),
      bestPerformer: bestPerformerSparkline,
    },
    context: {
      totalValue: formatTrendContext(computeTrendContext(timeSeries)),
      sinceInceptionGain: formatTrendContext(computeTrendContext(asGainSeries(timeSeries))),
      ytdGain: formatTrendContext(computeTrendContext(asGainSeries(ytdSeries), 2)),
    },
    bestPerformer,
    allocation,
    timeSeries,
    performance,
    topPerformers,
    bottomPerformers: performance
      .filter((r) => r.unrealizedPLPercent !== null)
      .slice(-3)
      .reverse(),
    recentTransactions,
    hasAssets: assets.length > 0,
  };
}

export async function getUsers() {
  return obterContentor().perfis.listar();
}
