import type { FornecedorAutenticacao, LimitadorTentativas, UtilizadorAutenticado } from "@/core/ports/auth";

// Regras de segurança da autenticação. Vivem no core — e não nas Server
// Actions nem no adapter — para sobreviverem a uma troca de framework ou de
// fornecedor: quem implementar um FornecedorAutenticacao novo não tem de se
// lembrar de nenhuma delas, e os testes (authService.test.ts) garantem-nas.

/** Limites de tentativas (login, confirmação da password atual, pedido de recuperação). */
export const LIMITES_TENTATIVAS = {
  /** por email+IP: força bruta a partir de um sítio */
  porIdentidade: { maximo: 10, janelaSegundos: 60 },
  /** só por email: o mesmo ataque a partir de vários IPs */
  porEmail: { maximo: 20, janelaSegundos: 600 },
} as const;

type DependenciasAuth = {
  autenticacao: FornecedorAutenticacao;
  limitador: LimitadorTentativas;
};

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

/** A sessão do pedido, só se for de um membro da família. */
export async function sessaoValida(autenticacao: FornecedorAutenticacao): Promise<UtilizadorAutenticado | null> {
  const utilizador = await autenticacao.utilizadorAtual();
  return utilizador?.membro ? utilizador : null;
}

export type ResultadoEntrada =
  | { ok: true; utilizador: UtilizadorAutenticado }
  | { ok: false; motivo: "limite" | "credenciais" };

/**
 * Login: limite de tentativas ANTES de experimentar a password, e uma conta
 * que não seja de um membro fecha logo a sessão e responde como a uma
 * password errada (não revela que a conta existe).
 */
export async function entrar(
  { autenticacao, limitador }: DependenciasAuth,
  dados: { email: string; password: string; ip: string },
): Promise<ResultadoEntrada> {
  const email = normalizarEmail(dados.email);
  if (!(await limitador.permitir(email, dados.ip))) return { ok: false, motivo: "limite" };

  const utilizador = await autenticacao.entrar(email, dados.password);
  if (!utilizador) return { ok: false, motivo: "credenciais" };
  if (!utilizador.membro) {
    await autenticacao.sair();
    return { ok: false, motivo: "credenciais" };
  }
  return { ok: true, utilizador };
}

export type ResultadoMudarPassword =
  | { ok: true }
  | { ok: false; motivo: "sem-sessao" | "falta-password-atual" | "limite" | "password-atual-errada" | "falhou" };

/**
 * Mudar a password: numa sessão normal pede a atual (com limite de
 * tentativas) — quem apanhasse uma sessão aberta não fica com a conta. Só a
 * sessão aberta pelo link de recuperação a dispensa. No fim, as outras
 * sessões da conta terminam.
 */
export async function mudarPassword(
  { autenticacao, limitador }: DependenciasAuth,
  dados: { novaPassword: string; passwordAtual: string | null; veioDaRecuperacao: boolean; ip: string },
): Promise<ResultadoMudarPassword> {
  const utilizador = await sessaoValida(autenticacao);
  if (!utilizador) return { ok: false, motivo: "sem-sessao" };

  if (!dados.veioDaRecuperacao) {
    if (!dados.passwordAtual) return { ok: false, motivo: "falta-password-atual" };
    if (!(await limitador.permitir(normalizarEmail(utilizador.email), dados.ip))) return { ok: false, motivo: "limite" };
    if (!(await autenticacao.passwordCerta(utilizador.email, dados.passwordAtual))) {
      return { ok: false, motivo: "password-atual-errada" };
    }
  }

  if (!(await autenticacao.alterarPassword(dados.novaPassword))) return { ok: false, motivo: "falhou" };
  await autenticacao.sairDasOutrasSessoes();
  return { ok: true };
}

/**
 * Pedido do link de recuperação. Responde sempre igual (não revela se a
 * conta existe) e tem limite de tentativas próprio, para a app não servir
 * para encher a caixa de correio de alguém.
 */
export async function pedirRecuperacao(
  { autenticacao, limitador }: DependenciasAuth,
  dados: { email: string; ip: string; urlRetorno: string },
): Promise<void> {
  const email = normalizarEmail(dados.email);
  if (!(await limitador.permitir(`recuperacao:${email}`, dados.ip))) return;
  try {
    await autenticacao.enviarLinkRecuperacao(email, dados.urlRetorno);
  } catch (erro) {
    console.error("[recuperar password] o fornecedor recusou o pedido:", erro);
  }
}

/** Link de recuperação: só abre sessão a um membro da família. */
export async function abrirRecuperacao(
  autenticacao: FornecedorAutenticacao,
  codigo: string,
): Promise<UtilizadorAutenticado | null> {
  const utilizador = await autenticacao.abrirSessaoRecuperacao(codigo);
  if (!utilizador) return null;
  if (!utilizador.membro) {
    await autenticacao.sair();
    return null;
  }
  return utilizador;
}
