"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { newPasswordSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "error"; message?: string };

export async function changePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Exige sessão — normal (já tinhas sessão) ou temporária, estabelecida
  // pelo link de recuperação em /auth/callback (troca de código PKCE).
  await requireSession();

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "Não foi possível alterar a password. Tenta pedir um novo link." };
  }

  redirect("/dashboard");
}
