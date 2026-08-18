import Link from "next/link";
import { Plus } from "lucide-react";
import { getTransactions, getAssetOptions } from "@/lib/data";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";
import { TRANSACTION_TYPES } from "@/lib/validation";
import type { TransactionType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  assetId?: string;
  type?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [transactions, assetOptions] = await Promise.all([
    getTransactions({
      assetId: params.assetId,
      type: (params.type as TransactionType) || undefined,
      from: params.from,
      to: params.to,
      q: params.q,
    }),
    getAssetOptions(),
  ]);

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Livro-razão</h1>
        <Link
          href="/transactions/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--series-1)] px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} aria-hidden />
          Novo movimento
        </Link>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="f-asset" className="text-xs text-[var(--text-muted)]">
            Ativo
          </label>
          <select
            id="f-asset"
            name="assetId"
            defaultValue={params.assetId ?? ""}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {assetOptions.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-type" className="text-xs text-[var(--text-muted)]">
            Tipo
          </label>
          <select
            id="f-type"
            name="type"
            defaultValue={params.type ?? ""}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatTransactionType(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-from" className="text-xs text-[var(--text-muted)]">
            De
          </label>
          <input
            id="f-from"
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-to" className="text-xs text-[var(--text-muted)]">
            Até
          </label>
          <input
            id="f-to"
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="f-q" className="text-xs text-[var(--text-muted)]">
            Notas contêm
          </label>
          <input
            id="f-q"
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-[var(--border)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          Filtrar
        </button>
        {Object.values(params).some(Boolean) ? (
          <Link href="/transactions" className="text-sm text-[var(--series-1)] hover:underline">
            Limpar
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-2.5 font-normal">Data</th>
              <th className="px-4 py-2.5 font-normal">Ativo</th>
              <th className="px-4 py-2.5 font-normal">Tipo</th>
              <th className="px-4 py-2.5 text-right font-normal">Valor</th>
              <th className="px-4 py-2.5 font-normal">Notas</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{formatDate(tx.date)}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/assets/${tx.asset.id}`} className="text-[var(--text-primary)] hover:underline">
                    {tx.asset.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatTransactionType(tx.type)}</td>
                <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">
                  {formatCurrency(tx.amount, tx.asset.currency)}
                </td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{tx.notes ?? ""}</td>
              </tr>
            ))}
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  Nenhum movimento encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
          {transactions.length > 0 ? (
            <tfoot>
              <tr className="border-t border-[var(--border)] font-medium text-[var(--text-primary)]">
                <td colSpan={3} className="px-4 py-2.5 text-right">
                  Total ({transactions.length})
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
