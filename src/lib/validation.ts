import { z } from "zod";

export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "DEPOSIT",
  "WITHDRAWAL",
  "DIVIDEND",
  "INTEREST",
  "FEE",
] as const;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Indica o email.").email("Email inválido."),
  password: z.string().min(1, "Indica a password."),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto.").max(80),
  email: z.string().trim().min(1, "Indica o email.").email("Email inválido."),
  password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres."),
});

export const updateUserSchema = z.object({
  name: userSchema.shape.name,
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As passwords não coincidem.",
    path: ["confirmPassword"],
  });

/** Ver src/adapters/quotes/httpQuoteProvider.ts — fornecedores de cotação ao vivo suportados. */
export const PRICE_PROVIDERS = ["coingecko", "alphavantage"] as const;

export const assetSchema = z
  .object({
    name: z.string().trim().min(1, "Indica um nome.").max(120),
    category: z.string().trim().min(1, "Indica uma categoria.").max(60),
    currency: z
      .string()
      .trim()
      .min(3, "Código de moeda inválido (ex: EUR).")
      .max(3, "Código de moeda inválido (ex: EUR).")
      .transform((v) => v.toUpperCase()),
    notes: z
      .string()
      .max(500)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    priceProvider: z
      .string()
      .optional()
      .transform((v) => (v === "coingecko" || v === "alphavantage" ? v : null)),
    priceSymbol: z
      .string()
      .max(30)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  })
  .refine((data) => !data.priceProvider || !!data.priceSymbol, {
    error: "Indica o símbolo para a cotação automática (ex: bitcoin, ou AAPL).",
    path: ["priceSymbol"],
  });

export const transactionSchema = z
  .object({
    assetId: z.string().min(1, "Escolhe um ativo."),
    type: z.enum(TRANSACTION_TYPES, { error: "Tipo de movimento inválido." }),
    date: z.string().min(1, "Indica uma data."),
    quantity: z.coerce
      .number({ error: "Quantidade inválida." })
      .optional()
      .nullable(),
    unitPrice: z.coerce
      .number({ error: "Preço unitário inválido." })
      .optional()
      .nullable(),
    amount: z.coerce
      .number({ error: "Indica um valor válido." })
      .positive("O valor tem de ser maior que zero."),
    notes: z
      .string()
      .max(300)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  })
  .transform((data) => ({
    ...data,
    quantity: data.quantity ?? null,
    unitPrice: data.unitPrice ?? null,
  }));

export const valuationSchema = z.object({
  assetId: z.string().min(1, "Escolhe um ativo."),
  date: z.string().min(1, "Indica uma data."),
  value: z.coerce.number({ error: "Indica um valor válido." }).min(0, "O valor não pode ser negativo."),
  notes: z
    .string()
    .max(300)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});
