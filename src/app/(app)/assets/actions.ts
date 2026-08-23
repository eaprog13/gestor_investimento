"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterContentor } from "@/composition/container";
import { requireSession } from "@/lib/auth/session";
import { assetSchema, transactionSchema, valuationSchema } from "@/lib/validation";
import {
  criarAtivo,
  atualizarAtivo,
  arquivarAtivo,
  removerAtivo,
} from "@/core/services/assetService";
import {
  criarTransacao,
  atualizarTransacao,
  removerTransacao,
} from "@/core/services/transactionService";
import {
  criarOuAtualizarValorizacao,
  removerValorizacao,
} from "@/core/services/valuationService";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

export async function createAsset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    currency: formData.get("currency"),
    notes: formData.get("notes"),
    priceProvider: formData.get("priceProvider"),
    priceSymbol: formData.get("priceSymbol"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const asset = await criarAtivo(obterContentor(), parsed.data);
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
    priceProvider: formData.get("priceProvider"),
    priceSymbol: formData.get("priceSymbol"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await atualizarAtivo(obterContentor(), id, parsed.data);
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
  redirect(`/assets/${id}`);
}

export async function toggleArchiveAsset(id: string, currentlyArchived: boolean) {
  await requireSession();
  await arquivarAtivo(obterContentor(), id, currentlyArchived);
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteAsset(id: string) {
  await requireSession();
  await removerAtivo(obterContentor(), id);
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

  const { assetId, date, ...data } = parsed.data;
  await criarTransacao(obterContentor(), { ...data, assetId, date: new Date(date) });
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

  const { assetId, date, ...data } = parsed.data;
  await atualizarTransacao(obterContentor(), id, { ...data, assetId, date: new Date(date) });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect(`/assets/${assetId}`);
}

export async function deleteTransaction(id: string, assetId: string) {
  await requireSession();
  await removerTransacao(obterContentor(), id);
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
  await criarOuAtualizarValorizacao(obterContentor(), { ...data, assetId, date: new Date(date) });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  return { status: "success" };
}

export async function deleteValuation(id: string, assetId: string) {
  await requireSession();
  await removerValorizacao(obterContentor(), id);
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}
