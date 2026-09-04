import Link from "next/link";
import { getDashboardData, getPoderDeCompra } from "@/lib/data";
import { KpiCard } from "@/components/KpiCard";
import { AllocationDonutChart } from "@/components/AllocationDonutChart";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { AssetPerformanceTable } from "@/components/AssetPerformanceTable";
import { RecentTransactionsList } from "@/components/RecentTransactionsList";
import { PoderDeCompraCard } from "@/components/PoderDeCompraCard";

export const dynamic = "force-dynamic";

function Card({
  title,
  action,
  children,
  atraso = 0,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Atraso (ms) da animação de entrada — para as secções aparecerem em cascata, não todas de repente. */
  atraso?: number;
}) {
  return (
    <section
      className="animate-entrada rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-200 hover:border-[var(--series-1)]/30 sm:p-5"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboardData();
  } catch {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">
        <p className="font-medium text-[var(--text-primary)]">Não foi possível ligar à base de dados.</p>
        <p className="mt-1">
          Confirma o <code className="rounded bg-[var(--background)] px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> no ficheiro{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5">.env</code>.
        </p>
      </div>
    );
  }

  if (!data.hasAssets) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">Ainda não tens ativos registados.</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          Começa por criar o primeiro ativo do portefólio — depois adiciona as transações e as valorizações.
        </p>
        <Link
          href="/assets/new"
          className="mt-2 rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Criar o primeiro ativo
        </Link>
      </div>
    );
  }

  const { kpis, trends, context, bestPerformer } = data;

  let poderDeCompra;
  try {
    poderDeCompra = await getPoderDeCompra();
  } catch (erro) {
    // A API do BPstat já nunca lança (ver bpstatInflationProvider.ts) —
    // isto só apanha uma falha genuína a ler os ativos, que não deve
    // derrubar o resto do dashboard por causa de um cartão só.
    console.error("[dashboard] falha a calcular o poder de compra:", erro);
    poderDeCompra = { ativos: [], taxaAnualInflacao: null, dataUltimoIndice: null };
  }

  return (
    <div className="flex flex-col gap-6">
      {data.ativosSemValor > 0 ? (
        <div className="rounded-xl border border-[var(--delta-bad)]/30 bg-[var(--delta-bad)]/10 px-4 py-3 text-sm text-[var(--text-primary)]">
          <span className="font-medium">
            {data.ativosSemValor} ativo{data.ativosSemValor > 1 ? "s" : ""} sem valor atual conhecido
          </span>{" "}
          — totais parciais (Valor total, Ganho) até teres uma cotação ao vivo ou uma valorização manual para{" "}
          {data.ativosSemValor > 1 ? "eles" : "ele"}. Confirma em cada ativo se a cotação automática está a
          funcionar (Editar → Cotação automática), ou adiciona uma valorização manual.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Valor total"
          value={kpis.totalValue}
          sparkline={trends.totalValue}
          context={context.totalValue}
          atraso={0}
        />
        <KpiCard label="Total investido" value={kpis.totalInvested} sparkline={trends.totalInvested} atraso={60} />
        <KpiCard
          label="Ganho desde o início"
          value={kpis.sinceInceptionGain}
          deltaAmount={kpis.sinceInceptionGain}
          deltaPercent={kpis.sinceInceptionGainPercent}
          sparkline={trends.sinceInceptionGain}
          context={context.sinceInceptionGain}
          atraso={120}
        />
        <KpiCard
          label={`Ganho YTD (${new Date().getFullYear()})`}
          value={kpis.ytdGainAmount}
          deltaAmount={kpis.ytdGainAmount}
          deltaPercent={kpis.ytdGainPercent}
          deltaLabel={kpis.ytdIncome > 0 ? `inclui rendimento` : undefined}
          sparkline={trends.ytdGain}
          context={context.ytdGain}
          atraso={180}
        />
        <KpiCard
          label="Rendimento recebido"
          value={kpis.totalIncome}
          deltaLabel={kpis.ytdIncome > 0 ? `${new Date().getFullYear()}: +${kpis.ytdIncome.toFixed(0)}€` : undefined}
          atraso={240}
        />
        {bestPerformer && (
          <KpiCard
            label="Melhor ativo"
            value={bestPerformer.currentValue ?? 0}
            deltaAmount={bestPerformer.unrealizedPL}
            deltaPercent={bestPerformer.unrealizedPLPercent}
            deltaLabel={bestPerformer.name}
            sparkline={trends.bestPerformer}
            atraso={300}
          />
        )}
      </div>

      <Card title="Valor do portefólio ao longo do tempo" atraso={360}>
        <PortfolioValueChart data={data.timeSeries} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Desempenho por ativo" atraso={400}>
            <AssetPerformanceTable rows={data.performance} />
          </Card>
        </div>
        <Card title="Alocação por categoria" atraso={440}>
          <AllocationDonutChart data={data.allocation} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Últimos movimentos" atraso={480} action={
            <Link href="/transactions" className="text-sm text-[var(--series-1)] hover:underline">
              Ver tudo
            </Link>
          }>
            <RecentTransactionsList transactions={data.recentTransactions} />
          </Card>
        </div>
        <Card title="Melhores / piores desempenhos" atraso={520}>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Melhores
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {data.topPerformers.map((row) => (
                  <li key={row.id} className="flex items-center justify-between">
                    <Link href={`/assets/${row.id}`} className="text-[var(--text-primary)] hover:underline">
                      {row.name}
                    </Link>
                    <span style={{ color: "var(--delta-good)" }} className="font-medium">
                      +{row.unrealizedPLPercent !== null ? (row.unrealizedPLPercent * 100).toFixed(1) : "0"}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Piores
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {data.bottomPerformers.map((row) => (
                  <li key={row.id} className="flex items-center justify-between">
                    <Link href={`/assets/${row.id}`} className="text-[var(--text-primary)] hover:underline">
                      {row.name}
                    </Link>
                    <span
                      style={{
                        color:
                          (row.unrealizedPLPercent ?? 0) >= 0 ? "var(--delta-good)" : "var(--delta-bad)",
                      }}
                      className="font-medium"
                    >
                      {row.unrealizedPLPercent !== null ? (row.unrealizedPLPercent * 100).toFixed(1) : "0"}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Poder de compra vs. inflação" atraso={560}>
        <PoderDeCompraCard dados={poderDeCompra} />
      </Card>
    </div>
  );
}
