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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-56 w-full sm:w-56 sm:shrink-0">
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
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((slice) => (
          <li key={slice.category} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-[var(--text-primary)]">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors.get(slice.category) }}
                aria-hidden
              />
              {slice.category}
            </span>
            <span className="text-[var(--text-secondary)]">
              {formatCurrency(slice.value)}
              <span className="ml-1.5 text-[var(--text-muted)]">{formatPercent(slice.pct)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
