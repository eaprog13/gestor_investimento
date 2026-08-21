import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioValorizacao } from "@/core/ports/repositories";
import type { ValuationSnapshot } from "@/core/types";
import { paraValorizacao } from "@/adapters/supabase/valuationRow";

export class RepositorioValorizacaoSupabase implements RepositorioValorizacao {
  constructor(private readonly bd: SupabaseClient) {}

  async criarOuAtualizar(dados: {
    assetId: string;
    date: Date;
    value: number;
    notes?: string;
  }): Promise<ValuationSnapshot> {
    const { data, error } = await this.bd
      .from("valuation_snapshots")
      .upsert(
        { asset_id: dados.assetId, date: dados.date.toISOString(), value: dados.value, notes: dados.notes ?? null },
        { onConflict: "asset_id,date" }
      )
      .select("*")
      .single();
    if (error || !data) throw new Error(`[valuation_snapshots.criarOuAtualizar] ${error?.message}`);
    return paraValorizacao(data);
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.bd.from("valuation_snapshots").delete().eq("id", id);
    if (error) throw new Error(`[valuation_snapshots.remover] ${error.message}`);
  }
}
