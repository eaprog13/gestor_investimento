import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LIMITES_TENTATIVAS } from "@/core/services/authService";
import type { LimitadorTentativas } from "@/core/ports/auth";

/** Limite de tentativas no Upstash Redis: partilhado por todas as instâncias do servidor. */
export class LimitadorTentativasUpstash implements LimitadorTentativas {
  private readonly porIdentidade: Ratelimit;
  private readonly porEmail: Ratelimit;

  constructor(url: string, token: string, prefixo: string, limites = LIMITES_TENTATIVAS) {
    const redis = new Redis({ url, token });
    this.porIdentidade = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limites.porIdentidade.maximo, `${limites.porIdentidade.janelaSegundos} s`),
      analytics: true,
      prefix: `${prefixo}:login`,
    });
    this.porEmail = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limites.porEmail.maximo, `${limites.porEmail.janelaSegundos} s`),
      analytics: true,
      prefix: `${prefixo}:login-email`,
    });
  }

  async permitir(email: string, ip: string) {
    const [identidade, soEmail] = await Promise.all([
      this.porIdentidade.limit(`${email}:${ip}`),
      this.porEmail.limit(email),
    ]);
    return identidade.success && soEmail.success;
  }
}
