import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getAsset } from "@/lib/data";
import { computePortfolioTimeSeries } from "@/lib/calculations";
import { formatCurrency, formatDate, formatPercent, formatPriceProvider, formatTransactionType } from "@/lib/format";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { KpiCard } from "@/components/KpiCard";
import { TransactionForm } from "@/components/TransactionForm";
import { ValuationForm } from "@/components/ValuationForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createTransaction, createValuation, deleteTransaction, deleteValuation } from "@/app/(app)/assets/actions";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) notFound();

  const timeSeries = computePortfolioTimeSeries([
    {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      currency: asset.currency,
      transactions: asset.transactions,
      snapshots: asset.valuations,
    },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">{asset.category}</p>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{asset.name}</h1>
          {asset.notes ? <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{asset.notes}</p> : null}
        </div>
        <Link
          href={`/assets/${asset.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)]"
        >
          <Pencil size={14} aria-hidden />
          Editar
        </Link>
      </div>

      {asset.priceProvider && asset.livePrice === null ? (
        <div className="rounded-xl border border-[var(--delta-bad)]/30 bg-[var(--delta-bad)]/10 px-4 py-3 text-sm text-[var(--text-primary)]">
          <span className="font-medium">
            Cotação automática ligada ({formatPriceProvider(asset.priceProvider)}) mas sem resposta ainda.
          </span>{" "}
          Causas prováveis: o símbolo (&quot;{asset.priceSymbol}&quot;) está errado ou não existe no fornecedor
          {asset.priceProvider === "alphavantage"
            ? ", a ALPHA_VANTAGE_API_KEY não está configurada no ambiente, ou a quota diária (25 pedidos/dia no plano grátis) esgotou-se"
            : ""}
          . Até resolver, este ativo usa a última valorização manual (se existir) ou fica de fora dos totais do
          dashboard.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Investido" value={asset.financials.netInvested} currency={asset.currency} />
        <KpiCard
          label="Valor atual"
          value={asset.financials.currentValue ?? 0}
          currency={asset.currency}
          context={
            asset.financials.currentValueSource === "live"
              ? `Cotação ao vivo · ${formatPriceProvider(asset.priceProvider ?? "")}${
                  asset.livePrice !== null ? ` · ${formatCurrency(asset.livePrice, asset.currency)}/un.` : ""
                }`
              : asset.financials.currentValueSource === "manual"
                ? "Última valorização manual"
                : undefined
          }
        />
        <KpiCard
          label="P/L não realizada"
          value={asset.financials.unrealizedPL ?? 0}
          currency={asset.currency}
          deltaAmount={asset.financials.unrealizedPL}
          deltaPercent={asset.financials.unrealizedPLPercent}
        />
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Evolução do valor</h2>
        <PortfolioValueChart data={timeSeries} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Nova transação</h2>
          <TransactionForm action={createTransaction} submitLabel="Adicionar transação" fixedAssetId={asset.id} />
        </section>
        {asset.priceProvider ? (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Valorização</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Este ativo tem cotação automática ligada ({formatPriceProvider(asset.priceProvider)}) — o valor atual e
              a evolução ao longo do tempo já são atualizados sozinhos, todos os dias, a partir do preço de mercado.
              Não precisas de preencher nada aqui.
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Nova valorização</h2>
            <ValuationForm action={createValuation} fixedAssetId={asset.id} />
          </section>
        )}
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Transações</h2>
        {asset.transactions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ainda não há transações.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-normal">Data</th>
                  <th className="py-2 pr-4 font-normal">Tipo</th>
                  <th className="py-2 pr-4 text-right font-normal">Quantidade</th>
                  <th className="py-2 pr-4 text-right font-normal">Preço</th>
                  <th className="py-2 pr-4 text-right font-normal">Valor</th>
                  <th className="py-2 pr-4 font-normal">Notas</th>
                  <th className="py-2 pr-0"></th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {asset.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-[var(--text-secondary)]">{formatDate(tx.date)}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-primary)]">{formatTransactionType(tx.type)}</td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">{tx.quantity ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">
                      {tx.unitPrice !== null ? formatCurrency(tx.unitPrice, asset.currency) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text-primary)]">
                      {formatCurrency(tx.amount, asset.currency)}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{tx.notes ?? ""}</td>
                    <td className="py-2.5 pr-0 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/transactions/${tx.id}/edit`}
                          className="text-xs text-[var(--series-1)] hover:underline"
                        >
                          Editar
                        </Link>
                        <ConfirmDeleteButton
                          action={deleteTransaction.bind(null, tx.id, asset.id)}
                          compact
                          label=""
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Histórico de valorizações</h2>
        {asset.valuations.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ainda não há valorizações.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {asset.valuations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-[var(--text-secondary)]">{formatDate(v.date)}</span>
                <span className="tabular-nums font-medium text-[var(--text-primary)]">
                  {formatCurrency(v.value, asset.currency)}
                </span>
                {v.notes ? <span className="flex-1 text-[var(--text-muted)]">{v.notes}</span> : <span className="flex-1" />}
                <ConfirmDeleteButton action={deleteValuation.bind(null, v.id, asset.id)} compact label="" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {asset.financials.totalReturnPercent !== null ? (
        <p className="text-xs text-[var(--text-muted)]">
          Retorno total desde o início: {formatPercent(asset.financials.totalReturnPercent)} (inclui{" "}
          {formatCurrency(asset.financials.incomeReceived, asset.currency)} de rendimento recebido)
        </p>
      ) : null}
    </div>
  );
}
