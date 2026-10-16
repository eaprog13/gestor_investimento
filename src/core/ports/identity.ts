// Port para gestão de identidade (nome da conta). As contas criam-se só no
// painel do Supabase — a app não cria contas. Separado de
// RepositorioPerfil porque não é dados de negócio — é uma operação sobre o
// serviço de autenticação (Supabase Auth hoje; Auth0/Clerk/Cognito amanhã,
// sem tocar em core/services).

export interface FornecedorGestaoIdentidade {
  /**
   * Atualiza o "name" em user_metadata (auth.users) — a mesma fonte que
   * src/lib/auth/session.ts lê para mostrar o nome na sessão. Sem isto,
   * corrigir o nome só em public.profiles deixava a barra de navegação com
   * o nome antigo até a pessoa voltar a fazer login (o token de sessão
   * embebe o user_metadata de quando foi emitido).
   */
  atualizarNome(id: string, name: string): Promise<void>;
}
