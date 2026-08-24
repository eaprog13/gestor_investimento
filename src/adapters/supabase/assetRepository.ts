import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepositorioAtivo, NewAsset, AssetWithLedger } from "@/core/ports/repositories";
import type { Asset, AssetPurpose, PriceProvider } from "@/core/types";
import { paraTransacao, type LinhaTransacao } from "@/adapters/supabase/transactionRow";
import { paraValorizacao, type LinhaValorizacao } from "@/adapters/supabase/valuationRow";

type LinhaAtivo = {
  id: string;
  name: string;
  category: string;
  currency: string;
  notes: string | null;
  is_archived: boolean;
  price_provider: string | null;
  price_symbol: string | null;
  purpose: string | null;
  created_at: string;
  updated_at: string;
};

type LinhaAtivoComRegistos = LinhaAtivo & {
  transactions: LinhaTransacao[];
  valuations: LinhaValorizacao[];
};

function paraAtivo(linha: LinhaAtivo): Asset {
  return {
    id: linha.id,
    name: linha.name,
    category: linha.category,
    currency: linha.currency,
    notes: linha.notes,
    isArchived: linha.is_archived,
    priceProvider: (linha.price_provider as PriceProvider | null) ?? null,
    priceSymbol: linha.price_symbol,
    purpose: (linha.purpose as AssetPurpose | null) ?? null,
    createdAt: new Date(linha.created_at),
    updatedAt: new Date(linha.updated_at),
  };
}

// PostgREST não garante a ordem dos recursos embutidos (transactions/
// valuations) sem parâmetros extra por tabela referenciada — mais simples e
// robusto ordenar aqui, uma vez, do que confiar nisso em cada query. Os
// consumidores (getAsset, no lib/data.ts) esperam desc por data.
function porDataDesc<T extends { date: Date }>(a: T, b: T) {
  return b.date.getTime() - a.date.getTime();
}

function paraAtivoComRegistos(linha: LinhaAtivoComRegistos): AssetWithLedger {
  return {
    ...paraAtivo(linha),
    transactions: (linha.transactions ?? []).map(paraTransacao).sort(porDataDesc),
    valuations: (linha.valuations ?? []).map(paraValorizacao).sort(porDataDesc),
  };
}

const SELECT_COM_REGISTOS = "*, transactions(*), valuations:valuation_snapshots(*)";

export class RepositorioAtivoSupabase implements RepositorioAtivo {
  constructor(private readonly bd: SupabaseClient) {}

  async listar(opcoes: { incluirArquivados?: boolean } = {}): Promise<AssetWithLedger[]> {
    let query = this.bd.from("assets").select(SELECT_COM_REGISTOS).order("name", { ascending: true });
    if (!opcoes.incluirArquivados) query = query.eq("is_archived", false);

    const { data, error } = await query;
    if (error) throw new Error(`[assets.listar] ${error.message}`);
    return (data ?? []).map((linha) => paraAtivoComRegistos(linha as LinhaAtivoComRegistos));
  }

  async obterPorId(id: string): Promise<AssetWithLedger | null> {
    const { data, error } = await this.bd.from("assets").select(SELECT_COM_REGISTOS).eq("id", id).maybeSingle();
    if (error) throw new Error(`[assets.obterPorId] ${error.message}`);
    return data ? paraAtivoComRegistos(data as LinhaAtivoComRegistos) : null;
  }

  async listarOpcoes(): Promise<{ id: string; name: string; category: string; currency: string }[]> {
    const { data, error } = await this.bd
      .from("assets")
      .select("id, name, category, currency")
      .eq("is_archived", false)
      .order("name", { ascending: true });
    if (error) throw new Error(`[assets.listarOpcoes] ${error.message}`);
    return data ?? [];
  }

  async criar(dados: NewAsset): Promise<Asset> {
    const { data, error } = await this.bd
      .from("assets")
      .insert({
        name: dados.name,
        category: dados.category,
        currency: dados.currency,
        notes: dados.notes ?? null,
        price_provider: dados.priceProvider ?? null,
        price_symbol: dados.priceSymbol ?? null,
        purpose: dados.purpose ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`[assets.criar] ${error?.message}`);
    return paraAtivo(data);
  }

  async atualizar(id: string, dados: NewAsset): Promise<Asset> {
    const { data, error } = await this.bd
      .from("assets")
      .update({
        name: dados.name,
        category: dados.category,
        currency: dados.currency,
        notes: dados.notes ?? null,
        price_provider: dados.priceProvider ?? null,
        price_symbol: dados.priceSymbol ?? null,
        purpose: dados.purpose ?? null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(`[assets.atualizar] ${error?.message}`);
    return paraAtivo(data);
  }

  async arquivar(id: string, arquivado: boolean): Promise<void> {
    const { error } = await this.bd.from("assets").update({ is_archived: arquivado }).eq("id", id);
    if (error) throw new Error(`[assets.arquivar] ${error.message}`);
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.bd.from("assets").delete().eq("id", id);
    if (error) throw new Error(`[assets.remover] ${error.message}`);
  }
}
