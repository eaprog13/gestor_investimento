import "server-only";
import type { RepositorioCotacoes } from "@/core/ports/repositories";
import type { PriceProvider } from "@/core/types";

// Cache de 24h (Next.js Data Cache, via fetch "next.revalidate") — não é só
// otimização: a Alpha Vantage tem 25 pedidos/dia no plano grátis, pedir a
// cada render esgotava a quota com uma mão-cheia de ativos. "diário" também
// é literalmente o que foi pedido (comparar com "os valores diários").
const REVALIDATE_SEGUNDOS = 60 * 60 * 24;

// Um símbolo mal configurado ou uma API lenta/em baixo não pode bloquear o
// render da página à espera de um pedido pendurado — sobretudo com vários
// ativos a pedir em paralelo (ver Promise.all em src/lib/data.ts). Aborta e
// cai no fallback (valorização manual) como se a API tivesse falhado.
const TIMEOUT_MS = 5_000;

/**
 * Serializa pedidos ao mesmo fornecedor com pelo menos "intervaloMs" entre
 * cada um, em vez de os deixar disparar todos de uma vez (Promise.all a
 * buscar a cotação de vários ativos, ver src/lib/data.ts) — os dois
 * fornecedores rejeitam pedidos em rajada, mesmo dentro da quota total (ver
 * os dois comentários abaixo, cada um com o teste ao vivo que confirmou o
 * intervalo). Devolve uma função "aguardarVez()" independente por
 * fornecedor (cada um com o seu próprio relógio).
 */
function criarLimitadorDeRajada(intervaloMs: number) {
  let proximoDisponivelEm = 0;
  return async function aguardarVez(): Promise<void> {
    const agora = Date.now();
    const disponivelEm = Math.max(agora, proximoDisponivelEm);
    proximoDisponivelEm = disponivelEm + intervaloMs;
    const espera = disponivelEm - agora;
    if (espera > 0) await new Promise((resolve) => setTimeout(resolve, espera));
  };
}

// O plano grátis da Alpha Vantage diz suportar 1 pedido/segundo, mas dois
// pedidos "ao mesmo tempo" fazem a API rejeitar um deles com uma mensagem
// de aviso ("Information: ... 1 request per second..."), devolvida com
// HTTP 200 (não é um erro), que fica indistinguível de "sem cotação".
// Confirmado ao vivo (3 pedidos em paralelo ao mesmo símbolo): com 1.1s de
// intervalo ainda falhava um; com 2.2s, os três passaram — o limite real
// parece mais apertado do que "1/segundo" à letra.
//
// Contrapartida consciente: com N ativos ligados à Alpha Vantage no mesmo
// render, o tempo total sobe para ~N × 2.2s (são sequenciais, não param os
// outros pedidos, só os espaça) — para um portefólio pessoal (poucos
// ativos) isto é aceitável; com muitos ativos na Alpha Vantage em
// simultâneo, pode valer a pena rever.
const aguardarVezAlphaVantage = criarLimitadorDeRajada(2_200);

// A CoinGecko não documenta um número exato para o endpoint público sem
// chave (só documentam o plano "Demo", com chave registada: 100/min) — ao
// testar, 5 pedidos em paralelo passaram bem, mas 10 (com este IP de
// desenvolvimento já a ter feito vários pedidos antes) levaram um 429 em
// TODOS, e o bloqueio durou bem mais do que alguns segundos a passar (não
// é um limite por-segundo como a Alpha Vantage, parece mais por-minuto,
// com arrefecimento lento). 1.5s de intervalo é uma margem conservadora
// dado não haver um número oficial para confiar — se um dia isto continuar
// a falhar com poucos ativos cripto, vale a pena registar uma chave grátis
// da CoinGecko (ver README) em vez de tentar afinar isto às cegas.
const aguardarVezCoinGecko = criarLimitadorDeRajada(1_500);

async function obterPrecoCoinGecko(symbol: string, currency: string): Promise<number | null> {
  await aguardarVezCoinGecko();

  const moeda = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=${encodeURIComponent(moeda)}`;

  const resposta = await fetch(url, {
    next: { revalidate: REVALIDATE_SEGUNDOS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resposta.ok) {
    if (resposta.status === 429) console.warn(`[quotes] CoinGecko recusou o pedido (${symbol}) — limite de pedidos.`);
    return null;
  }

  const corpo = (await resposta.json()) as Record<string, Record<string, number>>;
  return corpo[symbol]?.[moeda] ?? null;
}

async function obterPrecoAlphaVantage(symbol: string): Promise<number | null> {
  const chave = process.env.ALPHA_VANTAGE_API_KEY;
  if (!chave) {
    console.error("[quotes] ALPHA_VANTAGE_API_KEY em falta — ver .env.example.");
    return null;
  }

  await aguardarVezAlphaVantage();

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${chave}`;
  const resposta = await fetch(url, {
    next: { revalidate: REVALIDATE_SEGUNDOS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resposta.ok) return null;

  const corpo = (await resposta.json()) as {
    "Global Quote"?: { "05. price"?: string };
    Information?: string;
    Note?: string;
  };

  // Limite de pedidos (por segundo ou diário) e símbolo inválido devolvem
  // os dois HTTP 200 — a Alpha Vantage não usa um código de erro para
  // nenhum dos casos — mas com corpos diferentes, o que ajuda a diferenciar
  // nos logs em vez de um "sem cotação" indistinto.
  if (corpo.Information || corpo.Note) {
    console.warn(`[quotes] Alpha Vantage recusou o pedido (${symbol}) — provavelmente limite de pedidos:`, corpo.Information ?? corpo.Note);
    return null;
  }

  const preco = corpo["Global Quote"]?.["05. price"];
  if (!preco) return null; // símbolo inválido — "Global Quote" vem vazio, sem indicação de erro

  const numero = Number(preco);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Cotações via HTTP — CoinGecko (cripto, API pública sem chave) e Alpha
 * Vantage (ETF/ações, precisa de ALPHA_VANTAGE_API_KEY grátis, ver
 * .env.example). Nunca lança: um símbolo errado, um timeout (ver
 * TIMEOUT_MS) ou uma API em baixo só significam "sem cotação hoje", quem
 * chama usa a última valorização manual como reserva (ver
 * computeAssetFinancials em src/lib/calculations.ts, chamado a partir de
 * src/lib/data.ts).
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
