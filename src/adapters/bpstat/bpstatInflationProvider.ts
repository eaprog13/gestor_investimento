import "server-only";
import type { RepositorioInflacao, PontoIndiceInflacao } from "@/core/ports/inflation";

// BPstat (Banco de Portugal) — API pública, sem chave nenhuma, dados desde
// 1948. Confirmado ao vivo (não documentação): base
// https://bpstat.bportugal.pt/data/v1, formato JSON-stat v2. Dois pedidos
// por natureza da própria API (não escolha nossa): primeiro os metadados
// da série (dá o domain_id/dataset_id), depois o dataset em si — ver
// https://fenix.iseg.ulisboa.pt (aula "Lab 6B: Accessing Economic Data
// via the BPstat API", ISEG) para o exemplo original em Python.
const BASE_URL = "https://bpstat.bportugal.pt/data/v1";

// "IPC (2012=100) total" — o ÍNDICE em si, não a taxa de variação
// homóloga (essa é outra série, 5721524) — de propósito: com o índice
// puro, qualquer taxa entre duas datas quaisquer é uma divisão simples
// (ver src/lib/inflation.ts), sem ter de compor 12 taxas mensais
// arredondadas para reconstruir uma taxa homóloga. Confirmado ao vivo que
// bate certo: dividir o índice de julho de 2026 pelo de julho de 2025
// dá 2.99%, a taxa homóloga oficial publicada para o mesmo mês é 3.0%
// (diferença é só arredondamento).
const SERIES_ID = 12559545;

const TIMEOUT_MS = 8_000;
// A inflação só é publicada uma vez por mês — cache de 24h é conservador
// (podia ser mais longo), mas mantém o mesmo padrão usado para as
// cotações de mercado (ver adapters/quotes/httpQuoteProvider.ts).
const REVALIDATE_SEGUNDOS = 60 * 60 * 24;

type RespostaMetadadosSerie = { domain_ids: number[]; dataset_id: string }[];

type RespostaDataset = {
  value: number[];
  dimension: {
    reference_date: {
      category: { index: string[] };
    };
  };
};

export class RepositorioInflacaoBPstat implements RepositorioInflacao {
  async obterSerieIndice(): Promise<PontoIndiceInflacao[]> {
    try {
      const metaUrl = `${BASE_URL}/series/?lang=PT&series_ids=${SERIES_ID}`;
      const metaResposta = await fetch(metaUrl, {
        next: { revalidate: REVALIDATE_SEGUNDOS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!metaResposta.ok) return [];

      const meta = (await metaResposta.json()) as RespostaMetadadosSerie;
      const domainId = meta[0]?.domain_ids[0];
      const datasetId = meta[0]?.dataset_id;
      if (domainId === undefined || !datasetId) return [];

      const datasetUrl = `${BASE_URL}/domains/${domainId}/datasets/${datasetId}/?lang=PT&series_ids=${SERIES_ID}`;
      const datasetResposta = await fetch(datasetUrl, {
        next: { revalidate: REVALIDATE_SEGUNDOS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!datasetResposta.ok) return [];

      const dataset = (await datasetResposta.json()) as RespostaDataset;
      const datas = dataset.dimension?.reference_date?.category?.index ?? [];
      const valores = dataset.value ?? [];
      if (datas.length === 0 || datas.length !== valores.length) return [];

      return datas.map((data, i) => ({ date: new Date(data), index: valores[i]! }));
    } catch (erro) {
      console.error("[inflation] falha a obter a série do IPC (BPstat):", erro);
      return [];
    }
  }
}
