import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DadosCriacaoUtilizador, FornecedorGestaoIdentidade } from "@/core/ports/identity";

/**
 * Implementa a criação de utilizadores sobre o Supabase Auth (Admin API).
 * "email_confirm: true" porque não há fluxo de confirmação por email nesta
 * app fechada — o admin já confirma a identidade da pessoa antes de criar
 * a conta. O perfil em public.profiles é criado automaticamente pelo
 * trigger handle_new_user (ver supabase/schema.sql).
 */
export class FornecedorGestaoIdentidadeSupabase implements FornecedorGestaoIdentidade {
  constructor(private readonly authAdmin: SupabaseClient["auth"]["admin"]) {}

  async criarUtilizador(dados: DadosCriacaoUtilizador): Promise<{ id: string }> {
    const { data, error } = await this.authAdmin.createUser({
      email: dados.email,
      password: dados.password,
      email_confirm: true,
      user_metadata: { name: dados.name },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Não foi possível criar o utilizador.");
    }
    return { id: data.user.id };
  }

  async atualizarNome(id: string, name: string): Promise<void> {
    const { error } = await this.authAdmin.updateUserById(id, { user_metadata: { name } });
    if (error) throw new Error(error.message);
  }
}
