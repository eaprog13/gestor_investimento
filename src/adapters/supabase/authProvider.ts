import { createServerClient } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
import type { ArmazemCookies, FornecedorAutenticacao, UtilizadorAutenticado } from "@/core/ports/auth";

// Sem "server-only": também corre no proxy (src/proxy.ts). Só é criado em
// src/composition/autenticacao.ts — o resto da app não sabe que é Supabase.

/** Converte o utilizador do Supabase Auth no tipo do domínio. */
export function paraUtilizadorAutenticado(user: User | null | undefined): UtilizadorAutenticado | null {
  if (!user?.email) return null;
  const nome = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email;
  return {
    id: user.id,
    email: user.email,
    name: nome,
    // app_metadata só se escreve com privilégios de administrador (painel,
    // SQL Editor, chave service_role) — nunca pelo próprio utilizador nem
    // pelo signup público. Ver supabase/membros.sql.
    membro: user.app_metadata?.membro === true,
  };
}

/**
 * Supabase Auth, com a sessão nos cookies HTTP-only do pedido (fluxo PKCE).
 * O JWT nunca chega ao JavaScript do browser.
 */
export class FornecedorAutenticacaoSupabase implements FornecedorAutenticacao {
  private readonly cliente;

  constructor(
    private readonly url: string,
    private readonly chaveAnon: string,
    cookies: ArmazemCookies,
  ) {
    this.cliente = createServerClient(url, chaveAnon, {
      cookies: {
        get: (nome) => cookies.ler(nome),
        set: (nome, valor, opcoes) => cookies.escrever(nome, valor, opcoes),
        remove: (nome, opcoes) => cookies.escrever(nome, "", opcoes),
      },
    });
  }

  async utilizadorAtual() {
    // getUser() valida o token no Supabase (não confia só no cookie)
    const { data, error } = await this.cliente.auth.getUser();
    return error ? null : paraUtilizadorAutenticado(data.user);
  }

  async entrar(email: string, password: string) {
    const { data, error } = await this.cliente.auth.signInWithPassword({ email, password });
    return error ? null : paraUtilizadorAutenticado(data.user);
  }

  async sair() {
    await this.cliente.auth.signOut();
  }

  async sairDasOutrasSessoes() {
    await this.cliente.auth.signOut({ scope: "others" });
  }

  async passwordCerta(email: string, password: string) {
    // Cliente à parte, sem cookies: não mexe na sessão do pedido. A sessão de
    // verificação que o Supabase cria fecha-se logo (scope "local": só essa).
    const verificador = createClient(this.url, this.chaveAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await verificador.auth.signInWithPassword({ email, password });
    if (error) return false;
    await verificador.auth.signOut({ scope: "local" });
    return true;
  }

  async alterarPassword(novaPassword: string) {
    const { error } = await this.cliente.auth.updateUser({ password: novaPassword });
    return !error;
  }

  async enviarLinkRecuperacao(email: string, urlRetorno: string) {
    // O code_verifier (PKCE) fica num cookie deste browser: o link só abre
    // sessão no browser que o pediu. O Supabase só aceita urlRetorno que
    // esteja na lista "Redirect URLs" do projeto.
    const { error } = await this.cliente.auth.resetPasswordForEmail(email, { redirectTo: urlRetorno });
    if (error) throw new Error(`${error.status ?? ""} ${error.message}`.trim());
  }

  async abrirSessaoRecuperacao(codigo: string) {
    const { data, error } = await this.cliente.auth.exchangeCodeForSession(codigo);
    if (error) {
      console.error("[recuperação] falha ao trocar o código por sessão:", error.message);
      return null;
    }
    return paraUtilizadorAutenticado(data.user);
  }
}
