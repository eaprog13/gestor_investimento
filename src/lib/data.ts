import "server-only";

import { prisma } from "@/lib/prisma";
import type { TransactionType } from "@/generated/prisma/client";
import {
  computeAssetFinancials,
  computeAssetPerformance,
  computeAllocation,
  computePortfolioTimeSeries,
  computeYtd,
  incomeReceived,
  netInvested,
  type AssetLedger,
} from "@/lib/calculations";

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
  const assets = await prisma.asset.findMany({
    where: options.includeArchived ? undefined : { isArchived: false },
    include: { transactions: true, valuations: true },
    orderBy: { name: "asc" },
  });

  return assets.map((asset) => ({
    ...asset,
    financials: computeAssetFinancials(asset.transactions, asset.valuations),
    transactionCount: asset.transactions.length,
  }));
}

export async function getAsset(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      valuations: { orderBy: { date: "desc" } },
    },
  });
  if (!asset) return null;

  return {
    ...asset,
    financials: computeAssetFinancials(asset.transactions, asset.valuations),
  };
}

export async function getAssetOptions() {
  return prisma.asset.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, category: true, currency: true },
    orderBy: { name: "asc" },
  });
}

export type TransactionFilters = {
  assetId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  q?: string;
};

export async function getTransactions(filters: TransactionFilters = {}) {
  return prisma.transaction.findMany({
    where: {
      assetId: filters.assetId || undefined,
      type: filters.type || undefined,
      date: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
      notes: filters.q ? { contains: filters.q, mode: "insensitive" } : undefined,
    },
    include: { asset: { select: { id: true, name: true, category: true, currency: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getTransaction(id: string) {
  return prisma.transaction.findUnique({
    where: { id },
    include: { asset: { select: { id: true, name: true, currency: true } } },
  });
}

export async function getRecentTransactions(limit = 8) {
  return prisma.transaction.findMany({
    include: { asset: { select: { id: true, name: true, currency: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function getDashboardData() {
  const assets = await prisma.asset.findMany({
    where: { isArchived: false },
    include: { transactions: true, valuations: true },
  });

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

  return {
    kpis: {
      totalValue,
      totalInvested,
      sinceInceptionGain,
      sinceInceptionGainPercent,
      ytdGainAmount: ytd.gainAmount,
      ytdGainPercent: ytd.gainPercent,
      ytdIncome: ytd.income,
    },
    allocation,
    timeSeries,
    performance,
    topPerformers: performance.filter((r) => r.unrealizedPLPercent !== null).slice(0, 3),
    bottomPerformers: performance
      .filter((r) => r.unrealizedPLPercent !== null)
      .slice(-3)
      .reverse(),
    recentTransactions,
    hasAssets: assets.length > 0,
  };
}

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}
