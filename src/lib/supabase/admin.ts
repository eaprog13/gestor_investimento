import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave "service_role" — contorna Row Level
 * Security. Usado para todo o acesso a dados de negócio (ativos,
 * transações, valorizações, perfis) e para a Admin API de autenticação
 * (criar utilizadores) — ver src/composition/container.ts, o único sítio
 * que instancia isto.
 *
 * USO EXCLUSIVO NO SERVIDOR. O import "server-only" faz falhar o build
 * caso este ficheiro seja importado, ainda que indiretamente, a partir de
 * código de browser.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chaveServico) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL em falta nas variáveis de ambiente."
    );
  }

  return createClient(url, chaveServico, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
