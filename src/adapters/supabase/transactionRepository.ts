import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioTransacao, TransactionFilters, NewTransaction } from "@/core/ports/repositories";
import type { Transaction, TransactionWithAsset } from "@/core/types";
import { paraTransacao, type LinhaTransacao } from "@/adapters/supabase/transactionRow";

type LinhaAssetResumo = { id: string; name: string; category: string; currency: string };
type LinhaTransacaoComAtivo = LinhaTransacao & { asset: LinhaAssetResumo };

function paraTransacaoComAtivo(linha: LinhaTransacaoComAtivo): TransactionWithAsset {
  return { ...paraTransacao(linha), asset: linha.asset };
}

const SELECT_COM_ATIVO = "*, asset:assets(id, name, category, currency)";

export class RepositorioTransacaoSupabase implements RepositorioTransacao {
  constructor(private readonly bd: SupabaseClient) {}

  async listar(filtros: TransactionFilters = {}): Promise<TransactionWithAsset[]> {
    let query = this.bd.from("transactions").select(SELECT_COM_ATIVO).order("date", { ascending: false });

    if (filtros.assetId) query = query.eq("asset_id", filtros.assetId);
    if (filtros.type) query = query.eq("type", filtros.type);
    if (filtros.from) query = query.gte("date", new Date(filtros.from).toISOString());
    if (filtros.to) query = query.lte("date", new Date(filtros.to).toISOString());
    if (filtros.q) query = query.ilike("notes", `%${filtros.q}%`);

    const { data, error } = await query;
    if (error) throw new Error(`[transactions.listar] ${error.message}`);
    return (data ?? []).map((linha) => paraTransacaoComAtivo(linha as LinhaTransacaoComAtivo));
  }

  async obterPorId(id: string): Promise<TransactionWithAsset | null> {
    const { data, error } = await this.bd.from("transactions").select(SELECT_COM_ATIVO).eq("id", id).maybeSingle();
    if (error) throw new Error(`[transactions.obterPorId] ${error.message}`);
    return data ? paraTransacaoComAtivo(data as LinhaTransacaoComAtivo) : null;
  }

  async recentes(limit: number): Promise<TransactionWithAsset[]> {
    const { data, error } = await this.bd
      .from("transactions")
      .select(SELECT_COM_ATIVO)
      .order("date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`[transactions.recentes] ${error.message}`);
    return (data ?? []).map((linha) => paraTransacaoComAtivo(linha as LinhaTransacaoComAtivo));
  }

  async criar(dados: NewTransaction): Promise<Transaction> {
    const { data, error } = await this.bd
      .from("transactions")
      .insert({
        asset_id: dados.assetId,
        type: dados.type,
        date: dados.date.toISOString(),
        quantity: dados.quantity,
        unit_price: dados.unitPrice,
        amount: dados.amount,
        notes: dados.notes ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[transactions.criar] ${error?.message}`);
    return paraTransacao(data);
  }

  async atualizar(id: string, dados: NewTransaction): Promise<Transaction> {
    const { data, error } = await this.bd
      .from("transactions")
      .update({
        asset_id: dados.assetId,
        type: dados.type,
        date: dados.date.toISOString(),
        quantity: dados.quantity,
        unit_price: dados.unitPrice,
        amount: dados.amount,
        notes: dados.notes ?? null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(`[transactions.atualizar] ${error?.message}`);
    return paraTransacao(data);
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.bd.from("transactions").delete().eq("id", id);
    if (error) throw new Error(`[transactions.remover] ${error.message}`);
  }
}
