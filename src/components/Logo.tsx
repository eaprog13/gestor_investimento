// Ícone: 3 barras ascendentes (motivo "crescimento de portefólio"), na cor
// --series-1 já usada em todo o resto da app (estados ativos, botões).
// Mesma composição visual do favicon gerado em src/app/icon.tsx — aqui em
// SVG (nítido a qualquer tamanho no Nav), lá em divs (Satori/ImageResponse
// não interpreta CSS var(), por isso o favicon usa o hex equivalente).
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" style={{ fill: "var(--series-1)" }} />
      <rect x="7" y="17" width="5" height="9" rx="1.5" fill="white" />
      <rect x="14" y="11" width="5" height="15" rx="1.5" fill="white" />
      <rect x="21" y="6" width="5" height="20" rx="1.5" fill="white" />
    </svg>
  );
}

export function Logo({ size = 28, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <LogoMark size={size} />
      {wordmark && (
        <span className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          <span className="hidden md:inline">Gestor de Investimento</span>
          <span className="md:hidden">Investimento</span>
        </span>
      )}
    </span>
  );
}
