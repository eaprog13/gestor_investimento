"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";
import { verificarLimiteLogin } from "@/lib/security/rateLimit";
import { loginSchema } from "@/lib/validation";

export type ActionState = {
  status: "idle" | "error";
  message?: string;
};

async function obterIp() {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const ip = await obterIp();
  const { sucesso } = await verificarLimiteLogin(parsed.data.email, `${parsed.data.email}:${ip}`);
  if (!sucesso) {
    return { status: "error", message: "Demasiadas tentativas. Tenta de novo daqui a um minuto." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "Credenciais inválidas." };
  }

  // "//evil.com" também começa por "/" mas os browsers tratam-no como URL
  // absoluto (protocol-relative) — sem este segundo teste, um link
  // "/login?from=//evil.com" seria um open redirect após o login.
  const redirectTo = formData.get("from");
  const destinoSeguro =
    typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//");
  redirect(destinoSeguro ? redirectTo : "/dashboard");
}
