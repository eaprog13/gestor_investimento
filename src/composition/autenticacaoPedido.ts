import "server-only";
import { cookies } from "next/headers";
import { LimitadorTentativasMemoria } from "@/adapters/memoria/limitadorTentativas";
import { LimitadorTentativasUpstash } from "@/adapters/upstash/limitadorTentativas";
import type { FornecedorAutenticacao, LimitadorTentativas } from "@/core/ports/auth";
import { criarAutenticacao } from "@/composition/autenticacao";

/** Prefixo das chaves no Upstash (o mesmo Redis pode servir vários projetos). */
const PREFIXO_LIMITES = "gestor-investimento";

/** Autenticação com a sessão do pedido atual (Server Components, Server Actions, Route Handlers). */
export async function autenticacaoDoPedido(): Promise<FornecedorAutenticacao> {
  const armazem = await cookies();
  return criarAutenticacao({
    ler: (nome) => armazem.get(nome)?.value,
    escrever: (nome, valor, opcoes) => {
      try {
        armazem.set({ name: nome, value: valor, ...opcoes });
      } catch {
        // chamado a partir de um Server Component (só leitura): o proxy
        // (src/proxy.ts) trata da renovação da sessão nesse caso.
      }
    },
  });
}

let limitador: LimitadorTentativas | null = null;
let avisouSemUpstash = false;

/**
 * Upstash quando configurado (obrigatório em produção: o limite é partilhado
 * por todas as instâncias); senão, em memória — nunca sem limite nenhum.
 */
export function limitadorTentativas(): LimitadorTentativas {
  if (limitador) return limitador;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    limitador = new LimitadorTentativasUpstash(url, token, PREFIXO_LIMITES);
  } else {
    if (!avisouSemUpstash && process.env.NODE_ENV === "production") {
      avisouSemUpstash = true;
      console.warn("[rate-limit] Upstash não configurado: limite de tentativas só em memória (por instância).");
    }
    limitador = new LimitadorTentativasMemoria();
  }
  return limitador;
}
