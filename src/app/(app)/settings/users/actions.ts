"use server";

import { revalidatePath } from "next/cache";
import { obterContentor } from "@/composition/container";
import { criarUtilizador, atualizarUtilizador } from "@/core/services/userService";
import { requireSession } from "@/lib/auth/session";
import { userSchema, updateUserSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const resultado = await criarUtilizador(obterContentor(), parsed.data);
  if (!resultado.ok) {
    return { status: "error", message: resultado.message };
  }

  revalidatePath("/settings/users");
  return { status: "success", message: "Utilizador criado." };
}

export async function updateUser(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const parsed = updateUserSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await atualizarUtilizador(obterContentor(), id, parsed.data);

  revalidatePath("/settings/users");
  return { status: "success", message: "Nome atualizado." };
}
