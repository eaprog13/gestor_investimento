import Link from "next/link";
import { Plus } from "lucide-react";
import { getAssets } from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await getAssets({ includeArchived: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Ativos</h1>
        <Link
          href="/assets/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--series-1)] px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} aria-hidden />
          Novo ativo
        </Link>
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Ainda não tens ativos registados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="px-4 py-2.5 font-normal">Nome</th>
                <th className="px-4 py-2.5 font-normal">Categoria</th>
                <th className="px-4 py-2.5 text-right font-normal">Investido</th>
                <th className="px-4 py-2.5 text-right font-normal">Valor atual</th>
                <th className="px-4 py-2.5 text-right font-normal">P/L</th>
                <th className="px-4 py-2.5 text-right font-normal"></th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className={`border-b border-[var(--border)] last:border-0 ${asset.isArchived ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/assets/${asset.id}`} className="font-medium text-[var(--text-primary)] hover:underline">
                      {asset.name}
                    </Link>
                    {asset.isArchived ? (
                      <span className="ml-2 rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                        arquivado
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{asset.category}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {formatCurrency(asset.financials.netInvested, asset.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">
                    {asset.financials.currentValue === null
                      ? "—"
                      : formatCurrency(asset.financials.currentValue, asset.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {asset.financials.unrealizedPL === null ? (
                      <span className="text-[var(--text-muted)]">sem avaliação</span>
                    ) : (
                      <span
                        className="font-medium"
                        style={{
                          color: asset.financials.unrealizedPL >= 0 ? "var(--delta-good)" : "var(--delta-bad)",
                        }}
                      >
                        {asset.financials.unrealizedPL >= 0 ? "+" : ""}
                        {formatCurrency(asset.financials.unrealizedPL, asset.currency)}
                        {asset.financials.unrealizedPLPercent !== null
                          ? ` (${formatPercent(asset.financials.unrealizedPLPercent)})`
                          : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/assets/${asset.id}/edit`} className="text-sm text-[var(--series-1)] hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
