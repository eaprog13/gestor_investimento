import type { ValuationSnapshot } from "@/core/types";

export type LinhaValorizacao = {
  id: string;
  asset_id: string;
  date: string;
  value: number;
  notes: string | null;
  created_at: string;
};

export function paraValorizacao(linha: LinhaValorizacao): ValuationSnapshot {
  return {
    id: linha.id,
    assetId: linha.asset_id,
    date: new Date(linha.date),
    value: Number(linha.value),
    notes: linha.notes,
    createdAt: new Date(linha.created_at),
  };
}
