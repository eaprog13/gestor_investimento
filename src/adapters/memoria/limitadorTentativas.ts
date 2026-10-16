import { LIMITES_TENTATIVAS } from "@/core/services/authService";
import type { LimitadorTentativas } from "@/core/ports/auth";

/**
 * Limite de tentativas em memória. Cada instância do servidor conta à parte
 * (em serverless há várias, e reiniciam), por isso em produção usa-se o
 * Upstash — este é a reserva para nunca ficar sem limite nenhum.
 */
export class LimitadorTentativasMemoria implements LimitadorTentativas {
  private readonly tentativas = new Map<string, number[]>();

  constructor(
    private readonly limites = LIMITES_TENTATIVAS,
    private readonly agora: () => number = Date.now,
  ) {}

  private dentroDoLimite(chave: string, maximo: number, janelaSegundos: number) {
    const agora = this.agora();
    const recentes = (this.tentativas.get(chave) ?? []).filter((t) => agora - t < janelaSegundos * 1000);
    recentes.push(agora);
    // não deixa o mapa crescer sem fim (muitos emails/IPs diferentes)
    if (this.tentativas.size > 10_000) this.tentativas.clear();
    this.tentativas.set(chave, recentes);
    return recentes.length <= maximo;
  }

  async permitir(email: string, ip: string) {
    const { porIdentidade, porEmail } = this.limites;
    // os dois contam sempre (sem curto-circuito), como no Upstash
    const identidade = this.dentroDoLimite(`identidade:${email}:${ip}`, porIdentidade.maximo, porIdentidade.janelaSegundos);
    const soEmail = this.dentroDoLimite(`email:${email}`, porEmail.maximo, porEmail.janelaSegundos);
    return identidade && soEmail;
  }
}
