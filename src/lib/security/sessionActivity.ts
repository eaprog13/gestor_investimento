import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Timeout da sessão, decidido no servidor e à prova de adulteração.
 *
 * O Supabase, por si só, não desloga por inatividade — o refresh token
 * renova-se sozinho enquanto o browser continuar a fazer pedidos. O cookie
 * "last_activity" que existia antes tinha dois buracos:
 *  - o maxAge era igual ao próprio timeout (30 min), por isso ao fim de 30
 *    min parado o browser APAGAVA o cookie, e "cookie em falta" era tratado
 *    como "ainda ativo" — o timeout nunca chegava a disparar;
 *  - o valor era só um número: quem tivesse os cookies de sessão podia
 *    simplesmente omiti-lo ou escrever lá a hora atual.
 *
 * Agora o cookie leva o id do utilizador, a hora de início da sessão e a do
 * último pedido, assinados com HMAC (segredo só do servidor). Cookie em
 * falta, adulterado, de outro utilizador, parado há mais de 30 min ou com
 * mais de 12 h de sessão = sessão terminada. Por isso o login (e o link de
 * recuperação) tem de o criar — ver iniciarAtividade() em login/actions.ts
 * e auth/callback/route.ts.
 */

export const COOKIE_ATIVIDADE = "sessao_atividade";
export const COOKIE_RECUPERACAO = "recuperacao_password";

export const INATIVIDADE_MAXIMA_MS = 30 * 60 * 1000; // 30 min sem nenhum pedido
export const DURACAO_MAXIMA_MS = 12 * 60 * 60 * 1000; // 12 h no máximo, mesmo sempre ativo
export const VALIDADE_RECUPERACAO_MS = 15 * 60 * 1000; // 15 min para definir a nova password

// O cookie dura tanto como a sessão máxima: se durasse só 30 min, o browser
// apagava-o e perdia-se a prova de que a sessão esteve parada.
export const MAX_AGE_ATIVIDADE_S = DURACAO_MAXIMA_MS / 1000;
export const MAX_AGE_RECUPERACAO_S = VALIDADE_RECUPERACAO_MS / 1000;

// Segredo próprio (SESSION_ACTIVITY_SECRET) ou, na falta dele, derivado da
// chave service_role — que já só existe no servidor. Derivado (HMAC com um
// rótulo) e não usado tal e qual, para a assinatura nunca revelar nada da chave.
function chave(): Buffer {
  const segredo = process.env.SESSION_ACTIVITY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!segredo) {
    throw new Error("SESSION_ACTIVITY_SECRET / SUPABASE_SERVICE_ROLE_KEY em falta — sem segredo não há sessões seguras.");
  }
  return createHmac("sha256", segredo).update("gestor:sessao").digest();
}

function assinar(conteudo: string): string {
  return createHmac("sha256", chave()).update(conteudo).digest("base64url");
}

function assinaturaCerta(conteudo: string, assinatura: string): boolean {
  const esperada = Buffer.from(assinar(conteudo));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

// ── Atividade da sessão ────────────────────────────────────────────────────

export function criarValorAtividade(userId: string, inicio: number, agora: number): string {
  const conteudo = `${userId}.${inicio}.${agora}`;
  return `${conteudo}.${assinar(conteudo)}`;
}

export type EstadoAtividade =
  | { valida: true; inicio: number }
  | { valida: false; motivo: "em-falta" | "invalida" | "outro-utilizador" | "inativa" | "expirada" };

export function verificarAtividade(valor: string | undefined, userId: string, agora: number): EstadoAtividade {
  if (!valor) return { valida: false, motivo: "em-falta" };

  const partes = valor.split(".");
  if (partes.length !== 4) return { valida: false, motivo: "invalida" };
  const [id, inicioTexto, ultimaTexto, assinatura] = partes as [string, string, string, string];
  if (!assinaturaCerta(`${id}.${inicioTexto}.${ultimaTexto}`, assinatura)) return { valida: false, motivo: "invalida" };
  if (id !== userId) return { valida: false, motivo: "outro-utilizador" };

  const inicio = Number(inicioTexto);
  const ultima = Number(ultimaTexto);
  if (!Number.isFinite(inicio) || !Number.isFinite(ultima)) return { valida: false, motivo: "invalida" };
  if (agora - ultima > INATIVIDADE_MAXIMA_MS) return { valida: false, motivo: "inativa" };
  if (agora - inicio > DURACAO_MAXIMA_MS) return { valida: false, motivo: "expirada" };

  return { valida: true, inicio };
}

// ── Recuperação de password ────────────────────────────────────────────────
// O link do email de recuperação abre uma sessão SEM a password atual (é esse
// o objetivo). Esta marca diz ao /change-password que a sessão veio desse
// link — em qualquer outra sessão, mudar a password exige a atual.

export function criarValorRecuperacao(userId: string, agora: number): string {
  const conteudo = `${userId}.${agora + VALIDADE_RECUPERACAO_MS}`;
  return `${conteudo}.${assinar(`recuperacao:${conteudo}`)}`;
}

export function recuperacaoValida(valor: string | undefined, userId: string, agora: number): boolean {
  if (!valor) return false;
  const partes = valor.split(".");
  if (partes.length !== 3) return false;
  const [id, expiraTexto, assinatura] = partes as [string, string, string];
  return (
    assinaturaCerta(`recuperacao:${id}.${expiraTexto}`, assinatura) &&
    id === userId &&
    Number(expiraTexto) > agora
  );
}
