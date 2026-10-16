"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { verificarLimiteLogin } from "@/lib/security/rateLimit";
import { COOKIE_RECUPERACAO } from "@/lib/security/sessionActivity";
import { obterIp, veioDaRecuperacao } from "@/lib/security/sessionCookies";
import { newPasswordSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "error"; message?: string };

const DESTINO = "/dashboard";

// Confirma a password atual com um cliente à parte, sem cookies: não mexe na
// sessão do pedido. A sessão de verificação que o Supabase cria fecha-se logo
// (scope "local": só essa, não as outras do utilizador).
async function passwordAtualCerta(email: string, password: string): Promise<boolean> {
  const verificador = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await verificador.auth.signInWithPassword({ email, password });
  if (error) return false;
  await verificador.auth.signOut({ scope: "local" });
  return true;
}

export async function changePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Exige sessão — normal (já tinhas sessão) ou temporária, estabelecida
  // pelo link de recuperação em /auth/callback (troca de código PKCE).
  const session = await requireSession();

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Numa sessão normal, mudar a password pede a atual: quem apanhasse uma
  // sessão aberta (computador partilhado, cookie roubado) não fica com a
  // conta. Só a sessão do link de recuperação (15 min) dispensa a atual.
  if (!(await veioDaRecuperacao(session.sub))) {
    const atual = formData.get("currentPassword");
    if (typeof atual !== "string" || atual === "") {
      return { status: "error", message: "Indica a password atual." };
    }
    const { sucesso } = await verificarLimiteLogin(session.email.toLowerCase(), await obterIp());
    if (!sucesso) {
      return { status: "error", message: "Demasiadas tentativas. Tenta de novo daqui a alguns minutos." };
    }
    if (!(await passwordAtualCerta(session.email, atual))) {
      return { status: "error", message: "A password atual está errada." };
    }
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "Não foi possível alterar a password. Tenta pedir um novo link." };
  }

  // As outras sessões abertas desta conta (outros browsers, ou quem tivesse
  // a password antiga) terminam; esta continua.
  await supabase.auth.signOut({ scope: "others" });
  (await cookies()).delete(COOKIE_RECUPERACAO);

  redirect(DESTINO);
}
