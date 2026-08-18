// Atribuição de cor categórica estável: a cor de uma categoria depende do
// seu nome (ordem alfabética), nunca da sua posição num array ordenado por
// valor — assim um filtro ou uma mudança de valores não "repinta" as
// categorias que já lá estavam.

const SERIES_TOKENS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

export function assignCategoryColors(categories: string[]): Map<string, string> {
  const sorted = Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b, "pt"));
  const map = new Map<string, string>();
  sorted.forEach((category, index) => {
    map.set(category, SERIES_TOKENS[index % SERIES_TOKENS.length]);
  });
  return map;
}

export function categoryColor(category: string, allCategories: string[]): string {
  return assignCategoryColors(allCategories).get(category) ?? SERIES_TOKENS[0];
}
