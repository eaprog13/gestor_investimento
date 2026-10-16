import { describe, expect, it } from "vitest";
import type { FornecedorAutenticacao, LimitadorTentativas, UtilizadorAutenticado } from "@/core/ports/auth";
import { abrirRecuperacao, entrar, mudarPassword, pedirRecuperacao, sessaoValida } from "@/core/services/authService";

const MEMBRO: UtilizadorAutenticado = { id: "u1", email: "ana@x.pt", name: "Ana", membro: true };
const ESTRANHO: UtilizadorAutenticado = { id: "u2", email: "intruso@x.pt", name: "Intruso", membro: false };

// Fornecedor falso: uma conta (password "Certa-1234") e um registo do que lhe pediram.
function fornecedorFalso(conta: UtilizadorAutenticado = MEMBRO, sessaoInicial: UtilizadorAutenticado | null = null) {
  const chamadas: string[] = [];
  let sessao = sessaoInicial;
  let password = "Certa-1234";
  const autenticacao: FornecedorAutenticacao = {
    utilizadorAtual: async () => sessao,
    entrar: async (email, tentativa) => {
      chamadas.push(`entrar:${email}`);
      if (email !== conta.email || tentativa !== password) return null;
      sessao = conta;
      return conta;
    },
    sair: async () => {
      chamadas.push("sair");
      sessao = null;
    },
    sairDasOutrasSessoes: async () => {
      chamadas.push("sairDasOutras");
    },
    passwordCerta: async (_email, tentativa) => tentativa === password,
    alterarPassword: async (nova) => {
      chamadas.push("alterarPassword");
      password = nova;
      return true;
    },
    enviarLinkRecuperacao: async (email) => {
      chamadas.push(`recuperacao:${email}`);
    },
    abrirSessaoRecuperacao: async (codigo) => {
      if (codigo !== "codigo-valido") return null;
      sessao = conta;
      return conta;
    },
  };
  return { autenticacao, chamadas, sessaoAtual: () => sessao };
}

function limitador(permite = true): LimitadorTentativas & { chaves: string[] } {
  const chaves: string[] = [];
  return {
    chaves,
    permitir: async (email, ip) => {
      chaves.push(`${email}|${ip}`);
      return permite;
    },
  };
}

describe("entrar", () => {
  it("abre sessão a um membro com a password certa", async () => {
    const { autenticacao } = fornecedorFalso();
    const resultado = await entrar({ autenticacao, limitador: limitador() }, { email: "  Ana@X.pt ", password: "Certa-1234", ip: "1.1.1.1" });
    expect(resultado).toEqual({ ok: true, utilizador: MEMBRO });
  });

  it("verifica o limite ANTES de tentar a password, com o email normalizado", async () => {
    const { autenticacao, chamadas } = fornecedorFalso();
    const lim = limitador(false);
    const resultado = await entrar({ autenticacao, limitador: lim }, { email: "ANA@x.pt", password: "Certa-1234", ip: "1.1.1.1" });
    expect(resultado).toEqual({ ok: false, motivo: "limite" });
    expect(lim.chaves).toEqual(["ana@x.pt|1.1.1.1"]);
    expect(chamadas).toEqual([]); // nem chegou a perguntar ao fornecedor
  });

  it("password errada = credenciais", async () => {
    const { autenticacao } = fornecedorFalso();
    expect(await entrar({ autenticacao, limitador: limitador() }, { email: "ana@x.pt", password: "errada", ip: "1" })).toEqual({
      ok: false,
      motivo: "credenciais",
    });
  });

  it("conta que não é de um membro: fecha a sessão e responde como password errada", async () => {
    const { autenticacao, chamadas, sessaoAtual } = fornecedorFalso(ESTRANHO);
    const resultado = await entrar({ autenticacao, limitador: limitador() }, { email: "intruso@x.pt", password: "Certa-1234", ip: "1" });
    expect(resultado).toEqual({ ok: false, motivo: "credenciais" });
    expect(chamadas).toContain("sair");
    expect(sessaoAtual()).toBeNull();
  });
});

describe("sessaoValida", () => {
  it("só devolve a sessão de um membro", async () => {
    expect(await sessaoValida(fornecedorFalso(MEMBRO, MEMBRO).autenticacao)).toEqual(MEMBRO);
    expect(await sessaoValida(fornecedorFalso(ESTRANHO, ESTRANHO).autenticacao)).toBeNull();
    expect(await sessaoValida(fornecedorFalso().autenticacao)).toBeNull();
  });
});

describe("mudarPassword", () => {
  const base = { novaPassword: "Nova-Password-1", ip: "1" };

  it("sem sessão não muda nada", async () => {
    const { autenticacao, chamadas } = fornecedorFalso();
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: "Certa-1234", veioDaRecuperacao: false });
    expect(r).toEqual({ ok: false, motivo: "sem-sessao" });
    expect(chamadas).not.toContain("alterarPassword");
  });

  it("numa sessão normal pede a password atual", async () => {
    const { autenticacao, chamadas } = fornecedorFalso(MEMBRO, MEMBRO);
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: null, veioDaRecuperacao: false });
    expect(r).toEqual({ ok: false, motivo: "falta-password-atual" });
    expect(chamadas).not.toContain("alterarPassword");
  });

  it("recusa a password atual errada", async () => {
    const { autenticacao, chamadas } = fornecedorFalso(MEMBRO, MEMBRO);
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: "errada", veioDaRecuperacao: false });
    expect(r).toEqual({ ok: false, motivo: "password-atual-errada" });
    expect(chamadas).not.toContain("alterarPassword");
  });

  it("a confirmação da password atual tem limite de tentativas", async () => {
    const { autenticacao } = fornecedorFalso(MEMBRO, MEMBRO);
    const r = await mudarPassword({ autenticacao, limitador: limitador(false) }, { ...base, passwordAtual: "Certa-1234", veioDaRecuperacao: false });
    expect(r).toEqual({ ok: false, motivo: "limite" });
  });

  it("com a password atual certa, muda e termina as outras sessões", async () => {
    const { autenticacao, chamadas } = fornecedorFalso(MEMBRO, MEMBRO);
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: "Certa-1234", veioDaRecuperacao: false });
    expect(r).toEqual({ ok: true });
    expect(chamadas.slice(-2)).toEqual(["alterarPassword", "sairDasOutras"]);
  });

  it("a sessão do link de recuperação dispensa a password atual", async () => {
    const { autenticacao, chamadas } = fornecedorFalso(MEMBRO, MEMBRO);
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: null, veioDaRecuperacao: true });
    expect(r).toEqual({ ok: true });
    expect(chamadas).toContain("sairDasOutras");
  });

  it("uma conta que não é de um membro não muda a password", async () => {
    const { autenticacao } = fornecedorFalso(ESTRANHO, ESTRANHO);
    const r = await mudarPassword({ autenticacao, limitador: limitador() }, { ...base, passwordAtual: null, veioDaRecuperacao: true });
    expect(r).toEqual({ ok: false, motivo: "sem-sessao" });
  });
});

describe("pedirRecuperacao", () => {
  it("envia o link com o email normalizado", async () => {
    const { autenticacao, chamadas } = fornecedorFalso();
    await pedirRecuperacao({ autenticacao, limitador: limitador() }, { email: " Ana@X.pt", ip: "1", urlRetorno: "https://app/auth/callback" });
    expect(chamadas).toEqual(["recuperacao:ana@x.pt"]);
  });

  it("com o limite esgotado não envia nada (e não dá erro)", async () => {
    const { autenticacao, chamadas } = fornecedorFalso();
    await pedirRecuperacao({ autenticacao, limitador: limitador(false) }, { email: "ana@x.pt", ip: "1", urlRetorno: "x" });
    expect(chamadas).toEqual([]);
  });

  it("um erro do fornecedor não chega a quem pediu", async () => {
    const { autenticacao } = fornecedorFalso();
    autenticacao.enviarLinkRecuperacao = async () => {
      throw new Error("fornecedor em baixo");
    };
    const erroOriginal = console.error;
    console.error = () => {};
    try {
      await expect(pedirRecuperacao({ autenticacao, limitador: limitador() }, { email: "ana@x.pt", ip: "1", urlRetorno: "x" })).resolves.toBeUndefined();
    } finally {
      console.error = erroOriginal;
    }
  });
});

describe("abrirRecuperacao", () => {
  it("abre sessão a um membro com um código válido", async () => {
    expect(await abrirRecuperacao(fornecedorFalso().autenticacao, "codigo-valido")).toEqual(MEMBRO);
  });

  it("código inválido não abre sessão", async () => {
    expect(await abrirRecuperacao(fornecedorFalso().autenticacao, "outro")).toBeNull();
  });

  it("conta que não é de um membro: fecha a sessão aberta pelo link", async () => {
    const { autenticacao, sessaoAtual } = fornecedorFalso(ESTRANHO);
    expect(await abrirRecuperacao(autenticacao, "codigo-valido")).toBeNull();
    expect(sessaoAtual()).toBeNull();
  });
});
