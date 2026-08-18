"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium text-[var(--text-primary)]">{label ? formatDate(label) : ""}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function PortfolioValueChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">
        Precisas de pelo menos duas valorizações (em datas diferentes) para ver a evolução.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--gridline)" }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={compactCurrency}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--gridline)" }} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }}
            formatter={(value: string) => (
              <span style={{ color: "var(--text-secondary)" }}>{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Valor do portefólio"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="var(--series-1)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="invested"
            name="Capital investido"
            stroke="var(--text-muted)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
