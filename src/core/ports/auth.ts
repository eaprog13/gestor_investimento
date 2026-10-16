// Ports de autenticação e de limite de tentativas. Tal como os repositórios
// (ver repositories.ts), o core só conhece estas interfaces — nunca o SDK do
// fornecedor (Supabase Auth e Upstash hoje). Para trocar de fornecedor:
// novos adapters em src/adapters/<novo>/ e mudar src/composition/; as regras
// de segurança (core/services/authService.ts) não mudam.

/** Quem está autenticado, já sem nada do fornecedor. */
export type UtilizadorAutenticado = {
  id: string;
  email: string;
  name: string;
  /**
   * Membro da família: marca que só um administrador consegue pôr (no
   * Supabase, app_metadata.membro). Contas sem ela nunca entram — é o que
   * impede uma conta criada por fora (ex.: signup público) de usar a app.
   */
  membro: boolean;
};

/** Opções de um cookie, no formato comum (independente da framework). */
export type OpcoesCookie = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
};

/** Onde o fornecedor lê e escreve a sessão: os cookies do pedido/resposta atual. */
export type ArmazemCookies = {
  ler(nome: string): string | undefined;
  escrever(nome: string, valor: string, opcoes: OpcoesCookie): void;
};

/**
 * Autenticação no contexto de UM pedido (a sessão vive nos cookies desse
 * pedido) — criada por src/composition/autenticacao.ts.
 */
export interface FornecedorAutenticacao {
  /** A sessão do pedido, validada no fornecedor (não só lida do cookie). */
  utilizadorAtual(): Promise<UtilizadorAutenticado | null>;
  /** Abre sessão com email e password; null se as credenciais estiverem erradas. */
  entrar(email: string, password: string): Promise<UtilizadorAutenticado | null>;
  /** Fecha a sessão deste pedido. */
  sair(): Promise<void>;
  /** Fecha todas as outras sessões desta conta (outros browsers); esta continua. */
  sairDasOutrasSessoes(): Promise<void>;
  /** Confirma uma password SEM mexer na sessão do pedido. */
  passwordCerta(email: string, password: string): Promise<boolean>;
  /** Muda a password da conta da sessão atual. */
  alterarPassword(novaPassword: string): Promise<boolean>;
  /** Envia o email com o link de recuperação, que volta a urlRetorno. */
  enviarLinkRecuperacao(email: string, urlRetorno: string): Promise<void>;
  /** Troca o código do link de recuperação por uma sessão. */
  abrirSessaoRecuperacao(codigo: string): Promise<UtilizadorAutenticado | null>;
}

/** Limite de tentativas (força bruta): true = ainda pode tentar. Cada chamada conta uma tentativa. */
export interface LimitadorTentativas {
  permitir(email: string, ip: string): Promise<boolean>;
}
