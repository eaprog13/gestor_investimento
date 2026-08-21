import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const temConfiguracaoUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limitadorLogin = temConfiguracaoUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 tentativas/minuto por email+IP
      analytics: true,
      prefix: "gestor-investimento:login",
    })
  : null;

/**
 * Limita tentativas de login (força bruta/credential stuffing) por
 * identidade (ex: `${email}:${ip}`). Sem Upstash configurado (ex.:
 * desenvolvimento local), fica inativo — nunca bloqueia, mas também nunca
 * finge proteger: configura UPSTASH_REDIS_REST_URL/TOKEN em produção (ver
 * .env.example e README).
 */
export async function verificarLimiteLogin(identificador: string) {
  if (!limitadorLogin) {
    return { sucesso: true, limitado: false as const };
  }

  const { success: sucesso, reset } = await limitadorLogin.limit(identificador);
  return { sucesso, limitado: true as const, reset };
}
