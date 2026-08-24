import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Dependencias } from "@/core/deps";
import { RepositorioPerfilSupabase } from "@/adapters/supabase/profileRepository";
import { RepositorioAtivoSupabase } from "@/adapters/supabase/assetRepository";
import { RepositorioTransacaoSupabase } from "@/adapters/supabase/transactionRepository";
import { RepositorioValorizacaoSupabase } from "@/adapters/supabase/valuationRepository";
import { FornecedorGestaoIdentidadeSupabase } from "@/adapters/supabase/identityAdminProvider";
import { RepositorioCotacoesHttp } from "@/adapters/quotes/httpQuoteProvider";
import { RepositorioInflacaoBPstat } from "@/adapters/bpstat/bpstatInflationProvider";

/**
 * Raiz de composição: único ficheiro que escolhe qual implementação
 * concreta (Supabase hoje) satisfaz cada contrato de src/core/ports. Para
 * trocar de base de dados/fornecedor de identidade, criar novos adapters
 * em src/adapters/<novo/> e substituir as linhas abaixo — core/services e
 * as rotas não mudam.
 */

let dependenciasEmCache: Dependencias | null = null;

export function obterContentor(): Dependencias {
  if (dependenciasEmCache) return dependenciasEmCache;

  const bd = criarClienteAdmin();

  dependenciasEmCache = {
    perfis: new RepositorioPerfilSupabase(bd),
    ativos: new RepositorioAtivoSupabase(bd),
    transacoes: new RepositorioTransacaoSupabase(bd),
    valorizacoes: new RepositorioValorizacaoSupabase(bd),
    cotacoes: new RepositorioCotacoesHttp(),
    inflacao: new RepositorioInflacaoBPstat(),
    identidade: new FornecedorGestaoIdentidadeSupabase(bd.auth.admin),
  };

  return dependenciasEmCache;
}
