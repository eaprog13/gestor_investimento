// Ports (contratos) de acesso a dados. O núcleo do negócio (core/services,
// e o resto da app que só usa services/data.ts) depende apenas destas
// interfaces — nunca de um SDK de base de dados concreto. Para trocar de
// base de dados, escreve-se uma nova implementação em src/adapters/ e
// liga-se em src/composition/container.ts — nada mais muda.

import type {
  Asset,
  PriceProvider,
  Profile,
  Transaction,
  TransactionType,
  TransactionWithAsset,
  ValuationSnapshot,
} from "@/core/types";

export type AssetWithLedger = Asset & {
  transactions: Transaction[];
  valuations: ValuationSnapshot[];
};

export type NewAsset = {
  name: string;
  category: string;
  currency: string;
  notes?: string;
  priceProvider?: PriceProvider | null;
  priceSymbol?: string | null;
};

export interface RepositorioAtivo {
  listar(opcoes?: { incluirArquivados?: boolean }): Promise<AssetWithLedger[]>;
  obterPorId(id: string): Promise<AssetWithLedger | null>;
  listarOpcoes(): Promise<{ id: string; name: string; category: string; currency: string }[]>;
  criar(dados: NewAsset): Promise<Asset>;
  atualizar(id: string, dados: NewAsset): Promise<Asset>;
  arquivar(id: string, arquivado: boolean): Promise<void>;
  remover(id: string): Promise<void>;
}

/** Cotação de mercado ao vivo — ver src/lib/quotes.ts. */
export interface RepositorioCotacoes {
  /**
   * Preço unitário atual, na moeda pedida, ou null se não conseguir obter
   * (símbolo inválido, API em baixo, moeda não suportada pelo fornecedor,
   * etc.) — nunca lança, quem chama decide o fallback (valorização
   * manual mais recente).
   */
  obterPreco(provider: PriceProvider, symbol: string, currency: string): Promise<number | null>;
}

export type TransactionFilters = {
  assetId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  q?: string;
};

export type NewTransaction = {
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  notes?: string;
};

export interface RepositorioTransacao {
  listar(filtros?: TransactionFilters): Promise<TransactionWithAsset[]>;
  obterPorId(id: string): Promise<TransactionWithAsset | null>;
  recentes(limit: number): Promise<TransactionWithAsset[]>;
  criar(dados: NewTransaction): Promise<Transaction>;
  atualizar(id: string, dados: NewTransaction): Promise<Transaction>;
  remover(id: string): Promise<void>;
}

export interface RepositorioValorizacao {
  /** Uma marcação por ativo/dia: reintroduzir a mesma data atualiza em vez de duplicar. */
  criarOuAtualizar(dados: { assetId: string; date: Date; value: number; notes?: string }): Promise<ValuationSnapshot>;
  remover(id: string): Promise<void>;
}

export interface RepositorioPerfil {
  listar(): Promise<Profile[]>;
  obterPorId(id: string): Promise<Profile | null>;
  obterPorEmail(email: string): Promise<Profile | null>;
  atualizar(id: string, dados: { name: string }): Promise<Profile>;
}
