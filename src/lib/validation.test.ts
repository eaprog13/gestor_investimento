import { describe, expect, it } from "vitest";
import { assetSchema, loginSchema, transactionSchema, userSchema, valuationSchema } from "@/lib/validation";

describe("assetSchema", () => {
  it("aceita um ativo válido e maiusculiza a moeda", () => {
    const result = assetSchema.safeParse({ name: "ETF MSCI World", category: "Ações", currency: "eur" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("EUR");
  });

  it("rejeita código de moeda com tamanho errado", () => {
    expect(assetSchema.safeParse({ name: "X", category: "Y", currency: "EU" }).success).toBe(false);
    expect(assetSchema.safeParse({ name: "X", category: "Y", currency: "EURO" }).success).toBe(false);
  });

  it("rejeita nome/categoria vazios", () => {
    expect(assetSchema.safeParse({ name: "", category: "Y", currency: "EUR" }).success).toBe(false);
    expect(assetSchema.safeParse({ name: "X", category: "", currency: "EUR" }).success).toBe(false);
  });

  it("cotação automática é opcional — sem fornecedor, sem símbolo, é válido", () => {
    const result = assetSchema.safeParse({ name: "Depósito", category: "Poupanças", currency: "EUR" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceProvider).toBeNull();
      expect(result.data.priceSymbol).toBeNull();
    }
  });

  it("aceita fornecedor + símbolo válidos (id CoinGecko e ticker com sufixo de bolsa)", () => {
    const cripto = assetSchema.safeParse({ name: "BTC", category: "Cripto", currency: "EUR", priceProvider: "coingecko", priceSymbol: "bitcoin" });
    expect(cripto.success).toBe(true);

    const etf = assetSchema.safeParse({ name: "ETF", category: "ETFs", currency: "EUR", priceProvider: "alphavantage", priceSymbol: "IWDA.LON" });
    expect(etf.success).toBe(true);
  });

  it("rejeita fornecedor sem símbolo", () => {
    const result = assetSchema.safeParse({ name: "BTC", category: "Cripto", currency: "EUR", priceProvider: "coingecko" });
    expect(result.success).toBe(false);
  });

  it("rejeita símbolo com caracteres inválidos (ex: espaços)", () => {
    const result = assetSchema.safeParse({
      name: "BTC",
      category: "Cripto",
      currency: "EUR",
      priceProvider: "coingecko",
      priceSymbol: "bit coin!",
    });
    expect(result.success).toBe(false);
  });
});

describe("transactionSchema", () => {
  it("aceita uma transação válida sem quantidade/preço (ex: DEPOSIT)", () => {
    const result = transactionSchema.safeParse({
      assetId: "a1",
      type: "DEPOSIT",
      date: "2026-08-15",
      amount: "500",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBeNull();
      expect(result.data.unitPrice).toBeNull();
    }
  });

  it("rejeita amount não positivo", () => {
    expect(
      transactionSchema.safeParse({ assetId: "a1", type: "BUY", date: "2026-08-15", amount: "0" }).success
    ).toBe(false);
  });

  it("rejeita tipo de transação desconhecido", () => {
    expect(
      transactionSchema.safeParse({ assetId: "a1", type: "TRANSFER", date: "2026-08-15", amount: "10" }).success
    ).toBe(false);
  });
});

describe("valuationSchema", () => {
  it("aceita valor zero (liquidação total) mas rejeita negativo", () => {
    expect(valuationSchema.safeParse({ assetId: "a1", date: "2026-08-15", value: "0" }).success).toBe(true);
    expect(valuationSchema.safeParse({ assetId: "a1", date: "2026-08-15", value: "-1" }).success).toBe(false);
  });
});

describe("userSchema", () => {
  it("rejeita password curta", () => {
    const result = userSchema.safeParse({ name: "Ana", email: "ana@x.com", password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("aceita dados válidos", () => {
    const result = userSchema.safeParse({ name: "Ana", email: "ana@x.com", password: "12345678" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("rejeita email inválido", () => {
    expect(loginSchema.safeParse({ email: "não-é-email", password: "x" }).success).toBe(false);
  });
});
