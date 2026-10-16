import { beforeAll, describe, expect, it } from "vitest";
import {
  DURACAO_MAXIMA_MS,
  INATIVIDADE_MAXIMA_MS,
  VALIDADE_RECUPERACAO_MS,
  criarValorAtividade,
  criarValorRecuperacao,
  recuperacaoValida,
  verificarAtividade,
} from "./sessionActivity";

const UTILIZADOR = "0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e";
const OUTRO = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const AGORA = 1_800_000_000_000;

beforeAll(() => {
  process.env.SESSION_ACTIVITY_SECRET = "segredo-de-teste-com-tamanho-suficiente";
});

describe("verificarAtividade", () => {
  it("aceita uma sessão ativa e devolve a hora de início", () => {
    const valor = criarValorAtividade(UTILIZADOR, AGORA - 60_000, AGORA - 1_000);
    expect(verificarAtividade(valor, UTILIZADOR, AGORA)).toEqual({ valida: true, inicio: AGORA - 60_000 });
  });

  it("termina a sessão quando o cookie não existe (antes, isto passava como ativa)", () => {
    expect(verificarAtividade(undefined, UTILIZADOR, AGORA)).toEqual({ valida: false, motivo: "em-falta" });
  });

  it("termina a sessão parada há mais de 30 minutos", () => {
    const valor = criarValorAtividade(UTILIZADOR, AGORA - INATIVIDADE_MAXIMA_MS - 5_000, AGORA - INATIVIDADE_MAXIMA_MS - 1);
    expect(verificarAtividade(valor, UTILIZADOR, AGORA)).toEqual({ valida: false, motivo: "inativa" });
  });

  it("termina a sessão com mais de 12 horas, mesmo sempre ativa", () => {
    const valor = criarValorAtividade(UTILIZADOR, AGORA - DURACAO_MAXIMA_MS - 1, AGORA - 1_000);
    expect(verificarAtividade(valor, UTILIZADOR, AGORA)).toEqual({ valida: false, motivo: "expirada" });
  });

  it("recusa um cookie com a hora alterada à mão", () => {
    const valor = criarValorAtividade(UTILIZADOR, AGORA - 60_000, AGORA - INATIVIDADE_MAXIMA_MS - 60_000);
    const [id, inicio, , assinatura] = valor.split(".");
    const adulterado = [id, inicio, String(AGORA), assinatura].join(".");
    expect(verificarAtividade(adulterado, UTILIZADOR, AGORA)).toEqual({ valida: false, motivo: "invalida" });
  });

  it("recusa um cookie sem assinatura ou mal formado", () => {
    expect(verificarAtividade(String(AGORA), UTILIZADOR, AGORA).valida).toBe(false);
    expect(verificarAtividade(`${UTILIZADOR}.${AGORA}.${AGORA}.xxx`, UTILIZADOR, AGORA).valida).toBe(false);
  });

  it("recusa o cookie de outro utilizador", () => {
    const valor = criarValorAtividade(OUTRO, AGORA - 60_000, AGORA - 1_000);
    expect(verificarAtividade(valor, UTILIZADOR, AGORA)).toEqual({ valida: false, motivo: "outro-utilizador" });
  });

  it("um cookie assinado com outro segredo não vale", () => {
    const valor = criarValorAtividade(UTILIZADOR, AGORA - 60_000, AGORA - 1_000);
    process.env.SESSION_ACTIVITY_SECRET = "outro-segredo-qualquer-diferente";
    try {
      expect(verificarAtividade(valor, UTILIZADOR, AGORA).valida).toBe(false);
    } finally {
      process.env.SESSION_ACTIVITY_SECRET = "segredo-de-teste-com-tamanho-suficiente";
    }
  });
});

describe("recuperacaoValida", () => {
  it("vale para o próprio utilizador dentro dos 15 minutos", () => {
    const valor = criarValorRecuperacao(UTILIZADOR, AGORA);
    expect(recuperacaoValida(valor, UTILIZADOR, AGORA + VALIDADE_RECUPERACAO_MS - 1)).toBe(true);
  });

  it("deixa de valer ao fim dos 15 minutos", () => {
    const valor = criarValorRecuperacao(UTILIZADOR, AGORA);
    expect(recuperacaoValida(valor, UTILIZADOR, AGORA + VALIDADE_RECUPERACAO_MS + 1)).toBe(false);
  });

  it("não vale para outro utilizador nem adulterada", () => {
    const valor = criarValorRecuperacao(UTILIZADOR, AGORA);
    expect(recuperacaoValida(valor, OUTRO, AGORA)).toBe(false);
    const [id, , assinatura] = valor.split(".");
    expect(recuperacaoValida([id, String(AGORA + 10 * VALIDADE_RECUPERACAO_MS), assinatura].join("."), UTILIZADOR, AGORA)).toBe(false);
    expect(recuperacaoValida(undefined, UTILIZADOR, AGORA)).toBe(false);
  });

  it("um cookie de atividade não serve como marca de recuperação", () => {
    const atividade = criarValorAtividade(UTILIZADOR, AGORA, AGORA + VALIDADE_RECUPERACAO_MS);
    const [id, , ultima, assinatura] = atividade.split(".");
    expect(recuperacaoValida([id, ultima, assinatura].join("."), UTILIZADOR, AGORA)).toBe(false);
  });
});
