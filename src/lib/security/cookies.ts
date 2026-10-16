import type { OpcoesCookie } from "@/core/ports/auth";

/**
 * Todos os cookies de sessão são HTTP-only (o JavaScript do browser não os
 * lê — mitiga roubo de sessão via XSS) e, em produção, Secure (só por
 * HTTPS). O @supabase/ssr, por omissão, criava-os com "httpOnly: false";
 * esta app nunca precisa de os ler no browser. Aplicado a qualquer
 * fornecedor em src/composition/autenticacao.ts.
 */
export function comSegurancaReforcada(opcoes: OpcoesCookie): OpcoesCookie {
  return {
    ...opcoes,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
