"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationSlice } from "@/lib/calculations";
import { assignCategoryColors } from "@/lib/colors";
import { formatCurrency, formatPercent } from "@/lib/format";

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AllocationSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-[var(--text-primary)]">{slice.category}</p>
      <p className="text-[var(--text-secondary)]">
        {formatCurrency(slice.value)} · {formatPercent(slice.pct)}
      </p>
    </div>
  );
}

export function AllocationDonutChart({ data }: { data: AllocationSlice[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[220px] items-center justify-center text-sm text-[var(--text-muted)]">
        Sem valorizações para mostrar a alocação.
      </p>
    );
  }

  const colors = assignCategoryColors(data.map((d) => d.category));

  return (
    // @container: o layout reage à largura real do card, não à do ecrã — este card
    // vive numa grelha de 3 colunas e fica estreito mesmo em ecrãs largos, onde
    // `sm:flex-row` forçava o donut fixo (224px) a transbordar do card.
    <div className="@container">
      <div className="flex flex-col gap-4 @sm:flex-row @sm:items-center">
        <div className="mx-auto h-48 w-48 shrink-0 @sm:mx-0 @sm:h-40 @sm:w-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="category"
                innerRadius="62%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
              >
                {data.map((slice) => (
                  <Cell key={slice.category} fill={colors.get(slice.category)} />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {data.map((slice) => (
            <li key={slice.category} className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-[var(--text-primary)]">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colors.get(slice.category) }}
                  aria-hidden
                />
                <span className="truncate">{slice.category}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-[var(--text-secondary)]">
                {formatCurrency(slice.value)}
                <span className="ml-1.5 text-[var(--text-muted)]">{formatPercent(slice.pct)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
