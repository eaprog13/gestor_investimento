// Tipos de domínio. Independentes de Prisma/Supabase — os adapters é que
// convertem as linhas da base de dados (snake_case) para estas formas.

export type Profile = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export type Asset = {
  id: string;
  name: string;
  category: string;
  currency: string;
  notes: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "DEPOSIT",
  "WITHDRAWAL",
  "DIVIDEND",
  "INTEREST",
  "FEE",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionWithAsset = Transaction & {
  asset: { id: string; name: string; category: string; currency: string };
};

export type ValuationSnapshot = {
  id: string;
  assetId: string;
  date: Date;
  value: number;
  notes: string | null;
  createdAt: Date;
};
