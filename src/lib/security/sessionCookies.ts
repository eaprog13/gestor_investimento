import "server-only";
import { cookies, headers } from "next/headers";
import { comSegurancaReforcada } from "@/lib/security/cookies";
import {
  COOKIE_ATIVIDADE,
  COOKIE_RECUPERACAO,
  MAX_AGE_ATIVIDADE_S,
  MAX_AGE_RECUPERACAO_S,
  criarValorAtividade,
  criarValorRecuperacao,
  recuperacaoValida,
} from "@/lib/security/sessionActivity";

/**
 * Cookies de sessão próprios da app, escritos a partir de Server Actions e
 * Route Handlers (o proxy, src/proxy.ts, renova o de atividade a cada pedido).
 * Ver src/lib/security/sessionActivity.ts para o porquê.
 */

/** Chamado logo a seguir a um login (ou link de recuperação) bem-sucedido. */
export async function iniciarAtividade(userId: string) {
  const agora = Date.now();
  (await cookies()).set({
    name: COOKIE_ATIVIDADE,
    value: criarValorAtividade(userId, agora, agora),
    ...comSegurancaReforcada({ path: "/", sameSite: "lax", maxAge: MAX_AGE_ATIVIDADE_S }),
  });
}

/** A sessão aberta pelo link de recuperação pode mudar a password sem a atual — durante 15 min. */
export async function marcarRecuperacao(userId: string) {
  (await cookies()).set({
    name: COOKIE_RECUPERACAO,
    value: criarValorRecuperacao(userId, Date.now()),
    ...comSegurancaReforcada({ path: "/", sameSite: "lax", maxAge: MAX_AGE_RECUPERACAO_S }),
  });
}

export async function veioDaRecuperacao(userId: string): Promise<boolean> {
  return recuperacaoValida((await cookies()).get(COOKIE_RECUPERACAO)?.value, userId, Date.now());
}

export async function limparCookiesSessao() {
  const armazem = await cookies();
  armazem.delete(COOKIE_ATIVIDADE);
  armazem.delete(COOKIE_RECUPERACAO);
}

/**
 * IP do cliente para o limite de tentativas. Na Vercel, o x-forwarded-for é
 * escrito pela própria plataforma (o valor que o cliente mandar é
 * substituído); fora da Vercel, só é de confiança atrás de um proxy que faça
 * o mesmo — por isso existe também o limite só por email.
 */
export async function obterIp() {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}
