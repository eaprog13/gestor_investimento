"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { assetSchema, transactionSchema, valuationSchema } from "@/lib/validation";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

export async function createAsset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    currency: formData.get("currency"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const asset = await prisma.asset.create({ data: parsed.data });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  redirect(`/assets/${asset.id}`);
}

export async function updateAsset(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    currency: formData.get("currency"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.asset.update({ where: { id }, data: parsed.data });
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
  redirect(`/assets/${id}`);
}

export async function toggleArchiveAsset(id: string, currentlyArchived: boolean) {
  await requireSession();
  await prisma.asset.update({ where: { id }, data: { isArchived: !currentlyArchived } });
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteAsset(id: string) {
  await requireSession();
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  redirect("/assets");
}

export async function createTransaction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const parsed = transactionSchema.safeParse({
    assetId: formData.get("assetId"),
    type: formData.get("type"),
    date: formData.get("date"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice") || undefined,
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { assetId, ...data } = parsed.data;
  await prisma.transaction.create({ data: { ...data, date: new Date(data.date), assetId } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { status: "success" };
}

export async function updateTransaction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const parsed = transactionSchema.safeParse({
    assetId: formData.get("assetId"),
    type: formData.get("type"),
    date: formData.get("date"),
    quantity: formData.get("quantity") || undefined,
    unitPrice: formData.get("unitPrice") || undefined,
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { assetId, ...data } = parsed.data;
  await prisma.transaction.update({
    where: { id },
    data: { ...data, date: new Date(data.date), assetId },
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect(`/assets/${assetId}`);
}

export async function deleteTransaction(id: string, assetId: string) {
  await requireSession();
  await prisma.transaction.delete({ where: { id } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function createValuation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const parsed = valuationSchema.safeParse({
    assetId: formData.get("assetId"),
    date: formData.get("date"),
    value: formData.get("value"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { assetId, date, ...data } = parsed.data;
  // Uma marcação por ativo/dia: reintroduzir "hoje" atualiza em vez de duplicar.
  await prisma.valuationSnapshot.upsert({
    where: { assetId_date: { assetId, date: new Date(date) } },
    update: { value: data.value, notes: data.notes },
    create: { assetId, date: new Date(date), value: data.value, notes: data.notes },
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  return { status: "success" };
}

export async function deleteValuation(id: string, assetId: string) {
  await requireSession();
  await prisma.valuationSnapshot.delete({ where: { id } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

