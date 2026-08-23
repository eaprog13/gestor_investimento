import "server-only";
import type { RepositorioCotacoes } from "@/core/ports/repositories";
import type { PriceProvider } from "@/core/types";

// Cache de 24h (Next.js Data Cache, via fetch "next.revalidate") — não é só
// otimização: a Alpha Vantage tem 25 pedidos/dia no plano grátis, pedir a
// cada render esgotava a quota com uma mão-cheia de ativos. "diário" também
// é literalmente o que foi pedido (comparar com "os valores diários").
const REVALIDATE_SEGUNDOS = 60 * 60 * 24;

async function obterPrecoCoinGecko(symbol: string, currency: string): Promise<number | null> {
  const moeda = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=${moeda}`;

  const resposta = await fetch(url, { next: { revalidate: REVALIDATE_SEGUNDOS } });
  if (!resposta.ok) return null;

  const corpo = (await resposta.json()) as Record<string, Record<string, number>>;
  return corpo[symbol]?.[moeda] ?? null;
}

async function obterPrecoAlphaVantage(symbol: string): Promise<number | null> {
  const chave = process.env.ALPHA_VANTAGE_API_KEY;
  if (!chave) {
    console.error("[quotes] ALPHA_VANTAGE_API_KEY em falta — ver .env.example.");
    return null;
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${chave}`;
  const resposta = await fetch(url, { next: { revalidate: REVALIDATE_SEGUNDOS } });
  if (!resposta.ok) return null;

  const corpo = (await resposta.json()) as { "Global Quote"?: { "05. price"?: string } };
  const preco = corpo["Global Quote"]?.["05. price"];
  if (!preco) return null; // símbolo inválido ou quota diária esgotada — a Alpha Vantage devolve 200 com corpo vazio/nota, não um erro HTTP

  const numero = Number(preco);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Cotações via HTTP — CoinGecko (cripto, API pública sem chave) e Alpha
 * Vantage (ETF/ações, precisa de ALPHA_VANTAGE_API_KEY grátis, ver
 * .env.example). Nunca lança: um símbolo errado ou uma API em baixo só
 * significa "sem cotação hoje", quem chama usa a última valorização manual
 * como reserva (ver core/services/quoteService.ts).
 *
 * Nota sobre moeda na Alpha Vantage: GLOBAL_QUOTE devolve o preço na moeda
 * da própria bolsa onde o símbolo cota, sem indicar qual — por isso escolhe
 * um símbolo já cotado na moeda do ativo (ex.: a listagem em EUR de um ETF
 * na XETRA, não a listagem em USD numa bolsa americana), ou o valor fica
 * errado sem conversão nenhuma a avisar.
 */
export class RepositorioCotacoesHttp implements RepositorioCotacoes {
  async obterPreco(provider: PriceProvider, symbol: string, currency: string): Promise<number | null> {
    try {
      if (provider === "coingecko") return await obterPrecoCoinGecko(symbol, currency);
      if (provider === "alphavantage") return await obterPrecoAlphaVantage(symbol);
      return null;
    } catch (erro) {
      console.error(`[quotes] falha a obter preço (${provider}/${symbol}):`, erro);
      return null;
    }
  }
}
