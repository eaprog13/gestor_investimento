// SVG minimalista, sem dependências — para uma tendência tão pequena
// (dentro de um KpiCard) o overhead de um ResponsiveContainer/ResizeObserver
// do recharts (já usado nos gráficos maiores da página) não compensa.
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "var(--series-1)",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // evita divisão por zero quando a série é plana
  const step = width / (data.length - 1);

  const points = data.map((value, i) => {
    const x = i * step;
    // Y invertido: 0 é o topo do SVG, valor mais alto tem de ficar mais acima.
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = data[data.length - 1]! >= data[0]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0"
      role="img"
      aria-label={isUp ? "Tendência a subir" : "Tendência a descer"}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
