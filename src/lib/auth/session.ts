import "server-only";
import { autenticacaoDoPedido } from "@/composition/autenticacaoPedido";
import { sessaoValida } from "@/core/services/authService";
import { limparCookiesSessao } from "@/lib/security/sessionCookies";

/**
 * Camada web: quem está autenticado no pedido atual. A sessão vem do
 * fornecedor de autenticação (src/composition/autenticacao.ts) e só conta
 * se for de um membro da família (sessaoValida, em core/services/authService.ts)
 * — segunda linha de defesa, o proxy (src/proxy.ts) já fecha as outras.
 */

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function getSession(): Promise<SessionPayload | null> {
  const utilizador = await sessaoValida(await autenticacaoDoPedido());
  if (!utilizador) return null;
  return { sub: utilizador.id, email: utilizador.email, name: utilizador.name };
}

/** Usado nas Server Actions: lança se não houver sessão válida. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

export async function destroySession() {
  await (await autenticacaoDoPedido()).sair();
  await limparCookiesSessao();
}
