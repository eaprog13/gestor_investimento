"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";

export type ActionState = {
  status: "idle" | "error";
  message?: string;
};

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  } catch {
    return {
      status: "error",
      message: "Não foi possível ligar à base de dados. Confirma o DATABASE_URL no .env.",
    };
  }

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { status: "error", message: "Credenciais inválidas." };
  }

  await createSession({ sub: user.id, email: user.email, name: user.name });

  const redirectTo = formData.get("from");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}
