import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FornecedorGestaoIdentidade } from "@/core/ports/identity";

/**
 * Gestão de identidade sobre o Supabase Auth (Admin API): só o nome da conta.
 * A app NÃO cria contas — criam-se no painel do Supabase (Authentication →
 * Users) e marcam-se como membros (app_metadata.membro, ver
 * supabase/membros.sql e paraUtilizadorAutenticado() em ./authProvider.ts).
 */
export class FornecedorGestaoIdentidadeSupabase implements FornecedorGestaoIdentidade {
  constructor(private readonly authAdmin: SupabaseClient["auth"]["admin"]) {}

  async atualizarNome(id: string, name: string): Promise<void> {
    const { error } = await this.authAdmin.updateUserById(id, { user_metadata: { name } });
    if (error) throw new Error(error.message);
  }
}
