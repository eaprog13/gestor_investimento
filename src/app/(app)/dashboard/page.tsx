import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { KpiCard } from "@/components/KpiCard";
import { AllocationDonutChart } from "@/components/AllocationDonutChart";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { AssetPerformanceTable } from "@/components/AssetPerformanceTable";
import { RecentTransactionsList } from "@/components/RecentTransactionsList";

export const dynamic = "force-dynamic";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
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
          Confirma o <code className="rounded bg-[var(--background)] px-1 py-0.5">DATABASE_URL</code> no ficheiro{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5">.env</code> e que o Postgres está a correr.
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

  const { kpis } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Valor total" value={kpis.totalValue} />
        <KpiCard label="Total investido" value={kpis.totalInvested} />
        <KpiCard
          label="Ganho desde o início"
          value={kpis.sinceInceptionGain}
          deltaAmount={kpis.sinceInceptionGain}
          deltaPercent={kpis.sinceInceptionGainPercent}
        />
        <KpiCard
          label={`Ganho YTD (${new Date().getFullYear()})`}
          value={kpis.ytdGainAmount}
          deltaAmount={kpis.ytdGainAmount}
          deltaPercent={kpis.ytdGainPercent}
          deltaLabel={kpis.ytdIncome > 0 ? `inclui rendimento` : undefined}
        />
      </div>

      <Card title="Valor do portefólio ao longo do tempo">
        <PortfolioValueChart data={data.timeSeries} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Desempenho por ativo">
            <AssetPerformanceTable rows={data.performance} />
          </Card>
        </div>
        <Card title="Alocação por categoria">
          <AllocationDonutChart data={data.allocation} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Últimos movimentos" action={
            <Link href="/transactions" className="text-sm text-[var(--series-1)] hover:underline">
              Ver tudo
            </Link>
          }>
            <RecentTransactionsList transactions={data.recentTransactions} />
          </Card>
        </div>
        <Card title="Melhores / piores desempenhos">
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
    </div>
  );
}
