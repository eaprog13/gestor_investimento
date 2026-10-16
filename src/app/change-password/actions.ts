"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { autenticacaoDoPedido, limitadorTentativas } from "@/composition/autenticacaoPedido";
import { mudarPassword, type ResultadoMudarPassword } from "@/core/services/authService";
import { COOKIE_RECUPERACAO } from "@/lib/security/sessionActivity";
import { obterIp, veioDaRecuperacao } from "@/lib/security/sessionCookies";
import { requireSession } from "@/lib/auth/session";
import { newPasswordSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "error"; message?: string };

const DESTINO = "/dashboard";

const MENSAGENS: Record<Exclude<ResultadoMudarPassword, { ok: true }>["motivo"], string> = {
  "sem-sessao": "A sessão terminou. Entra outra vez.",
  "falta-password-atual": "Indica a password atual.",
  limite: "Demasiadas tentativas. Tenta de novo daqui a alguns minutos.",
  "password-atual-errada": "A password atual está errada.",
  falhou: "Não foi possível alterar a password. Tenta pedir um novo link.",
};

// As regras (password atual, limite, terminar as outras sessões) estão em
// core/services/authService.ts.
export async function changePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Exige sessão — normal ou a temporária do link de recuperação (/auth/callback).
  const session = await requireSession();

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const atual = formData.get("currentPassword");
  const resultado = await mudarPassword(
    { autenticacao: await autenticacaoDoPedido(), limitador: limitadorTentativas() },
    {
      novaPassword: parsed.data.password,
      passwordAtual: typeof atual === "string" && atual !== "" ? atual : null,
      veioDaRecuperacao: await veioDaRecuperacao(session.sub),
      ip: await obterIp(),
    },
  );
  if (!resultado.ok) {
    return { status: "error", message: MENSAGENS[resultado.motivo] };
  }

  (await cookies()).delete(COOKIE_RECUPERACAO);
  redirect(DESTINO);
}
