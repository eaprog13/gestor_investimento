"use server";

import { headers } from "next/headers";
import { autenticacaoDoPedido, limitadorTentativas } from "@/composition/autenticacaoPedido";
import { pedirRecuperacao } from "@/core/services/authService";
import { obterIp } from "@/lib/security/sessionCookies";
import { loginSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "enviado" | "error"; message?: string; email?: string };

/**
 * Pede o link de recuperação no servidor (antes era o browser a falar
 * diretamente com o Supabase, o que obrigava a ter a chave anon no bundle e
 * o domínio do Supabase na CSP). Responde sempre igual, quer a conta exista
 * quer não — ver pedirRecuperacao em core/services/authService.ts.
 */
export async function pedirLinkRecuperacao(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.shape.email.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  // O Next.js já recusou esta Server Action se o Origin não for o próprio
  // site, por isso o Origin é de confiança aqui; e o fornecedor só aceita
  // endereços de retorno da sua lista autorizada.
  const origem = (await headers()).get("origin");
  if (!origem) return { status: "error", message: "Pedido inválido. Recarrega a página." };

  await pedirRecuperacao(
    { autenticacao: await autenticacaoDoPedido(), limitador: limitadorTentativas() },
    { email: parsed.data, ip: await obterIp(), urlRetorno: `${origem}/auth/callback` },
  );
  return { status: "enviado", email: parsed.data };
}
