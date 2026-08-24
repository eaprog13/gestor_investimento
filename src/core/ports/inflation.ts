// Port do fornecedor de inflação — separado de repositories.ts (não é
// dados do utilizador, é uma série económica externa, mesma razão que
// justifica core/ports/quotes já existir à parte do resto).

export type PontoIndiceInflacao = {
  /** Último dia do mês a que este valor do índice diz respeito. */
  date: Date;
  /** Índice de Preços no Consumidor, base 2012=100 (BPstat/INE). */
  index: number;
};

export interface RepositorioInflacao {
  /**
   * Série mensal completa do IPC (índice, não taxa) — a taxa homóloga
   * (variação a 12 meses) e qualquer taxa acumulada entre duas datas
   * calculam-se a partir disto (ver src/lib/inflation.ts), sem precisar
   * de pedir uma segunda série à API. Ordenada por data crescente. Vazia
   * se a API falhar — nunca lança (ver adapters/bpstat/bpstatInflationProvider.ts).
   */
  obterSerieIndice(): Promise<PontoIndiceInflacao[]>;
}
