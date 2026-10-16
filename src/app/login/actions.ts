"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { verificarLimiteLogin } from "@/lib/security/rateLimit";
import { ehMembro } from "@/lib/security/sessionActivity";
import { iniciarAtividade, obterIp } from "@/lib/security/sessionCookies";
import { loginSchema } from "@/lib/validation";

export type ActionState = {
  status: "idle" | "error";
  message?: string;
};

const DESTINO_POR_DEFEITO = "/dashboard";

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const email = parsed.data.email.toLowerCase();
  const { sucesso } = await verificarLimiteLogin(email, await obterIp());
  if (!sucesso) {
    return { status: "error", message: "Demasiadas tentativas. Tenta de novo daqui a alguns minutos." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { status: "error", message: "Credenciais inválidas." };
  }

  // Conta que não foi criada pela app (ex.: signup público do Supabase com a
  // chave anon): fecha logo a sessão e responde como a uma password errada —
  // ver ehMembro() em src/lib/security/sessionActivity.ts.
  if (!ehMembro(data.user)) {
    await supabase.auth.signOut();
    return { status: "error", message: "Credenciais inválidas." };
  }

  await iniciarAtividade(data.user.id);

  // "//evil.com" e "/\evil.com" também começam por "/" mas os browsers
  // tratam-nos como URL absoluto — sem este teste, um link
  // "/login?from=//evil.com" seria um open redirect após o login.
  const redirectTo = formData.get("from");
  const destinoSeguro = typeof redirectTo === "string" && /^\/(?![/\\])/.test(redirectTo);
  redirect(destinoSeguro ? redirectTo : DESTINO_POR_DEFEITO);
}
