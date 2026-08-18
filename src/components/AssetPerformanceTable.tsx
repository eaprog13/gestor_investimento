import Link from "next/link";
import type { AssetPerformanceRow } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";

export function AssetPerformanceTable({ rows }: { rows: AssetPerformanceRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Ainda não há ativos.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
            <th className="py-2 pr-4 font-normal">Ativo</th>
            <th className="py-2 pr-4 font-normal">Categoria</th>
            <th className="py-2 pr-4 text-right font-normal">Investido</th>
            <th className="py-2 pr-4 text-right font-normal">Valor atual</th>
            <th className="py-2 pr-0 text-right font-normal">P/L não realizada</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2.5 pr-4">
                <Link href={`/assets/${row.id}`} className="font-medium text-[var(--text-primary)] hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{row.category}</td>
              <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">
                {formatCurrency(row.netInvested, row.currency)}
              </td>
              <td className="py-2.5 pr-4 text-right text-[var(--text-primary)]">
                {row.currentValue === null ? "—" : formatCurrency(row.currentValue, row.currency)}
              </td>
              <td className="py-2.5 pr-0 text-right">
                {row.unrealizedPL === null ? (
                  <span className="text-[var(--text-muted)]">sem avaliação</span>
                ) : (
                  <span
                    className="font-medium"
                    style={{ color: row.unrealizedPL >= 0 ? "var(--delta-good)" : "var(--delta-bad)" }}
                  >
                    {row.unrealizedPL >= 0 ? "+" : ""}
                    {formatCurrency(row.unrealizedPL, row.currency)}
                    {row.unrealizedPLPercent !== null ? (
                      <span className="ml-1 font-normal">({formatPercent(row.unrealizedPLPercent)})</span>
                    ) : null}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
