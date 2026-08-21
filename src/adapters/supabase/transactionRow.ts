import type { Transaction, TransactionType } from "@/core/types";

// Partilhado entre assetRepository.ts (transações embutidas no ativo) e
// transactionRepository.ts, para não duplicar o mapeamento nem criar um
// import circular entre os dois.

export type LinhaTransacao = {
  id: string;
  asset_id: string;
  type: TransactionType;
  date: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function paraTransacao(linha: LinhaTransacao): Transaction {
  return {
    id: linha.id,
    assetId: linha.asset_id,
    type: linha.type,
    date: new Date(linha.date),
    quantity: linha.quantity === null ? null : Number(linha.quantity),
    unitPrice: linha.unit_price === null ? null : Number(linha.unit_price),
    amount: Number(linha.amount),
    notes: linha.notes,
    createdAt: new Date(linha.created_at),
    updatedAt: new Date(linha.updated_at),
  };
}
