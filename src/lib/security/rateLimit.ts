import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const temConfiguracaoUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = temConfiguracaoUpstash
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const limitadorLoginPorIp = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 tentativas/minuto por email+IP
      analytics: true,
      prefix: "gestor-investimento:login",
    })
  : null;

// Limitador SEGUNDO, mais largo, só por email (sem IP) — apanha o caso que
// o limitador por email+IP acima não apanha: um ataque distribuído, a
// rodar IPs diferentes a cada tentativa contra a MESMA conta, nunca bate
// no limite por-IP (cada combinação email+IP fica sempre abaixo de 10),
// mas ainda assim é força bruta contra a mesma conta. Janela mais larga e
// limite mais alto do que o de cima, de propósito — só existe para apanhar
// o caso distribuído, não para substituir o limite mais apertado.
const limitadorLoginPorEmail = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 m"),
      analytics: true,
      prefix: "gestor-investimento:login-email",
    })
  : null;

/**
 * Limita tentativas de login (força bruta/credential stuffing) — dois
 * limitadores independentes, um por identidade (`${email}:${ip}`, mais
 * apertado) e outro só por email (mais largo, apanha ataques distribuídos
 * por vários IPs contra a mesma conta — ver comentário acima). Falha se
 * QUALQUER um dos dois for excedido. Sem Upstash configurado (ex.:
 * desenvolvimento local), fica inativo — nunca bloqueia, mas também nunca
 * finge proteger: configura UPSTASH_REDIS_REST_URL/TOKEN em produção (ver
 * .env.example e README).
 */
export async function verificarLimiteLogin(email: string, identificador: string) {
  if (!limitadorLoginPorIp || !limitadorLoginPorEmail) {
    return { sucesso: true, limitado: false as const };
  }

  const [porIdentidade, porEmail] = await Promise.all([
    limitadorLoginPorIp.limit(identificador),
    limitadorLoginPorEmail.limit(email),
  ]);

  return { sucesso: porIdentidade.success && porEmail.success, limitado: true as const };
}
