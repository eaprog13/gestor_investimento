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

// Política reforçada (era só min(8), sem exigir nenhuma variedade de
// caracteres) — alinhada com a mesma regra já usada no helpdesk_smartcreative
// (ver src/app/api/auth/change-password/route.ts desse projeto): esta app
// guarda dados financeiros da família toda, não faz sentido ter uma
// política de password mais fraca do que um projeto B2B com dados menos
// sensíveis.
export const passwordSchema = z
  .string()
  .min(10, "A password tem de ter pelo menos 10 caracteres.")
  .max(128)
  .regex(/[A-Z]/, "Deve incluir pelo menos uma letra maiúscula.")
  .regex(/[a-z]/, "Deve incluir pelo menos uma letra minúscula.")
  .regex(/[0-9]/, "Deve incluir pelo menos um número.");

export const userSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto.").max(80),
  email: z.string().trim().min(1, "Indica o email.").email("Email inválido."),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: userSchema.shape.name,
});

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
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
  })
  // Letras/números/ponto/hífen chega para ids da CoinGecko ("bitcoin") e
  // tickers da Alpha Vantage, incluindo sufixo de bolsa ("IWDA.LON") — só
  // para apanhar erros de digitação cedo (espaços, símbolos estranhos);
  // vai para o URL do fetch sempre com encodeURIComponent (ver
  // src/adapters/quotes/httpQuoteProvider.ts), por isso não é uma questão
  // de injeção, é higiene de dados.
  .refine((data) => data.priceSymbol === null || /^[a-zA-Z0-9._-]+$/.test(data.priceSymbol), {
    error: "Símbolo inválido — usa só letras, números, ponto ou hífen (ex: bitcoin, AAPL, IWDA.LON).",
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
