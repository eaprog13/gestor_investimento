import "server-only";

import { obterContentor } from "@/composition/container";
import type { TransactionType } from "@/core/types";
import {
  computeAssetFinancials,
  computeAssetPerformance,
  computeAllocation,
  computePortfolioTimeSeries,
  computeTrendContext,
  computeYtd,
  incomeReceived,
  netInvested,
  type AssetLedger,
  type TimeSeriesPoint,
} from "@/lib/calculations";
import { formatTrendContext } from "@/lib/format";

function toLedger(asset: {
  id: string;
  name: string;
  category: string;
  currency: string;
  transactions: { type: TransactionType; date: Date; amount: number }[];
  valuations: { date: Date; value: number }[];
}): AssetLedger {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    currency: asset.currency,
    transactions: asset.transactions,
    snapshots: asset.valuations,
  };
}

export async function getAssets(options: { includeArchived?: boolean } = {}) {
  const assets = await obterContentor().ativos.listar({ incluirArquivados: options.includeArchived });

  return assets.map((asset) => ({
    ...asset,
    financials: computeAssetFinancials(asset.transactions, asset.valuations),
    transactionCount: asset.transactions.length,
  }));
}

export async function getAsset(id: string) {
  const asset = await obterContentor().ativos.obterPorId(id);
  if (!asset) return null;

  return {
    ...asset,
    financials: computeAssetFinancials(asset.transactions, asset.valuations),
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

  const ledgers = assets.map(toLedger);
  const asOf = new Date();

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
