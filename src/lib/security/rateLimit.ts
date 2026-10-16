import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const PREFIXO = "gestor-investimento";

const temConfiguracaoUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = temConfiguracaoUpstash
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

// Por email+IP: 10 tentativas/minuto — força bruta a partir de um sítio.
const LIMITE_IDENTIDADE = { maximo: 10, janelaMs: 60_000 };
// Só por email: 20 tentativas/10 min — apanha o ataque distribuído (vários
// IPs contra a MESMA conta), que nunca bate no limite por email+IP.
const LIMITE_EMAIL = { maximo: 20, janelaMs: 10 * 60_000 };

const limitadorIdentidade = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMITE_IDENTIDADE.maximo, "1 m"),
      analytics: true,
      prefix: `${PREFIXO}:login`,
    })
  : null;

const limitadorEmail = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMITE_EMAIL.maximo, "10 m"),
      analytics: true,
      prefix: `${PREFIXO}:login-email`,
    })
  : null;

// ── Sem Upstash: limite em memória ─────────────────────────────────────────
// Antes, sem Upstash, o login ficava SEM limite nenhum. Em memória, cada
// instância do servidor conta à parte (em serverless há várias, e reiniciam),
// por isso não substitui o Upstash em produção — mas nunca fica a zero.
const tentativasEmMemoria = new Map<string, number[]>();
let avisouSemUpstash = false;

function dentroDoLimiteEmMemoria(chave: string, maximo: number, janelaMs: number): boolean {
  const agora = Date.now();
  const recentes = (tentativasEmMemoria.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  recentes.push(agora);
  // não deixa o mapa crescer sem fim (muitos emails/IPs diferentes)
  if (tentativasEmMemoria.size > 10_000) tentativasEmMemoria.clear();
  tentativasEmMemoria.set(chave, recentes);
  return recentes.length <= maximo;
}

/**
 * Limita tentativas de login e de confirmação da password atual (força
 * bruta/credential stuffing). Falha se QUALQUER um dos dois limites for
 * excedido: por `${email}:${ip}` e só por email. Com Upstash
 * (UPSTASH_REDIS_REST_URL/TOKEN — obrigatório em produção, ver .env.example)
 * o limite é partilhado por todas as instâncias; sem ele, fica em memória.
 */
export async function verificarLimiteLogin(email: string, ip: string) {
  const identidade = `${email}:${ip}`;

  if (!limitadorIdentidade || !limitadorEmail) {
    if (!avisouSemUpstash && process.env.NODE_ENV === "production") {
      avisouSemUpstash = true;
      console.warn("[rate-limit] Upstash não configurado: limite de login só em memória (por instância).");
    }
    const porIdentidade = dentroDoLimiteEmMemoria(`identidade:${identidade}`, LIMITE_IDENTIDADE.maximo, LIMITE_IDENTIDADE.janelaMs);
    const porEmail = dentroDoLimiteEmMemoria(`email:${email}`, LIMITE_EMAIL.maximo, LIMITE_EMAIL.janelaMs);
    return { sucesso: porIdentidade && porEmail, limitado: true as const };
  }

  const [porIdentidade, porEmail] = await Promise.all([
    limitadorIdentidade.limit(identidade),
    limitadorEmail.limit(email),
  ]);
  return { sucesso: porIdentidade.success && porEmail.success, limitado: true as const };
}
