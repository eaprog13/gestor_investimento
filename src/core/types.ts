// Tipos de domínio. Independentes de Prisma/Supabase — os adapters é que
// convertem as linhas da base de dados (snake_case) para estas formas.

export type Profile = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

/** "coingecko" (cripto) ou "alphavantage" (ETF/ações) — ver src/lib/quotes.ts. */
export type PriceProvider = "coingecko" | "alphavantage";

/**
 * Rótulo independente da categoria — "aqui mora o fundo de emergência/a
 * poupança", mesmo que o ativo esteja categorizado como outra coisa (ex.:
 * um Certificado de Aforro que na prática É o fundo de emergência). Só
 * afeta leitura (ver getPoderDeCompra em src/lib/data.ts) — nunca cria
 * valor novo nem duplica o que já lá estava.
 */
export type AssetPurpose = "emergency_fund" | "savings";

export type Asset = {
  id: string;
  name: string;
  category: string;
  currency: string;
  notes: string | null;
  isArchived: boolean;
  /** Cotação automática diária — null para ativos sem mercado (Certificados de Aforro, depósitos, imóveis...), que ficam por valorização manual. */
  priceProvider: PriceProvider | null;
  /** Símbolo no fornecedor: id da CoinGecko (ex. "bitcoin") ou ticker da Alpha Vantage (ex. "VWCE.DEX", "AAPL"). */
  priceSymbol: string | null;
  purpose: AssetPurpose | null;
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
