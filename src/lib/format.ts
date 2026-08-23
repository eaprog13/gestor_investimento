import type { TrendContext } from "@/lib/calculations";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string) {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-PT", { style: "currency", currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

export function formatCurrency(value: number, currency = "EUR") {
  return getCurrencyFormatter(currency).format(value);
}

const percentFormatter = new Intl.NumberFormat("pt-PT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Recebe uma fração (0.138 -> "13,8%"), não já multiplicada por 100. */
export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return percentFormatter.format(value);
}

/** Frase de cruzamento com o histórico para os KpiCard do dashboard — ver computeTrendContext. */
export function formatTrendContext(ctx: TrendContext | null): string | undefined {
  if (!ctx) return undefined;
  if (ctx.direction === "flat") return `Estável nos últimos ${ctx.windowMonths} meses`;
  const rotulo = ctx.direction === "up" ? "acima" : "abaixo";
  return `${formatPercent(Math.abs(ctx.percentVsAverage))} ${rotulo} da média dos últimos ${ctx.windowMonths} meses`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

/** yyyy-MM-dd, para o valor por omissão de <input type="date">. */
export function toDateInputValue(value: Date = new Date()) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  BUY: "Compra",
  SELL: "Venda",
  DEPOSIT: "Depósito",
  WITHDRAWAL: "Levantamento",
  DIVIDEND: "Dividendo",
  INTEREST: "Juros",
  FEE: "Comissão/Taxa",
};

export function formatTransactionType(type: string) {
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

const PRICE_PROVIDER_LABELS: Record<string, string> = {
  coingecko: "CoinGecko",
  alphavantage: "Alpha Vantage",
};

export function formatPriceProvider(provider: string) {
  return PRICE_PROVIDER_LABELS[provider] ?? provider;
}
