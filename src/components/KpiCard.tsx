import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

type KpiCardProps = {
  label: string;
  value: number;
  currency?: string;
  deltaAmount?: number | null;
  deltaPercent?: number | null;
  deltaLabel?: string;
  /** Quando falso (ex: "Comissões pagas"), subir é mau — inverte a cor do delta. */
  upIsGood?: boolean;
  /** Atraso (ms) da animação de entrada — para os cartões aparecerem em cascata, não todos de repente. */
  atraso?: number;
};

export function KpiCard({
  label,
  value,
  currency = "EUR",
  deltaAmount,
  deltaPercent,
  deltaLabel,
  upIsGood = true,
  atraso = 0,
}: KpiCardProps) {
  const hasDelta = deltaAmount !== undefined && deltaAmount !== null;
  const isPositive = hasDelta ? deltaAmount! >= 0 : null;
  const isGood = isPositive === null ? null : isPositive === upIsGood;

  return (
    <div
      className="animate-entrada flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-200 hover:border-[var(--series-1)]/40"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-2xl font-semibold text-[var(--text-primary)]">
        {formatCurrency(value, currency)}
      </span>
      {hasDelta ? (
        <div
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: isGood ? "var(--delta-good)" : "var(--delta-bad)" }}
        >
          {isPositive ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
          <span>
            {isPositive ? "+" : ""}
            {formatCurrency(deltaAmount!, currency)}
          </span>
          {deltaPercent !== undefined && deltaPercent !== null ? (
            <span>({isPositive ? "+" : ""}{formatPercent(deltaPercent)})</span>
          ) : null}
          {deltaLabel ? <span className="font-normal text-[var(--text-muted)]">{deltaLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
