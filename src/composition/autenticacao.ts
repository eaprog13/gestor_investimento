import { FornecedorAutenticacaoSupabase } from "@/adapters/supabase/authProvider";
import type { ArmazemCookies, FornecedorAutenticacao } from "@/core/ports/auth";
import { comSegurancaReforcada } from "@/lib/security/cookies";

/**
 * Raiz de composição da autenticação: o único sítio que escolhe o
 * fornecedor (Supabase Auth hoje). Sem "server-only" porque o proxy
 * (src/proxy.ts) também a usa — para Server Actions e Route Handlers ver
 * autenticacaoDoPedido() em ./autenticacaoPedido.ts.
 *
 * Todos os cookies escritos pelo fornecedor passam por
 * comSegurancaReforcada (HTTP-only, Secure em produção): a regra fica aqui,
 * não depende de quem implementar o adapter se lembrar dela.
 */
export function criarAutenticacao(armazem: ArmazemCookies): FornecedorAutenticacao {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chaveAnon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta nas variáveis de ambiente.");
  }

  return new FornecedorAutenticacaoSupabase(url, chaveAnon, {
    ler: (nome) => armazem.ler(nome),
    escrever: (nome, valor, opcoes) => armazem.escrever(nome, valor, comSegurancaReforcada(opcoes)),
  });
}
