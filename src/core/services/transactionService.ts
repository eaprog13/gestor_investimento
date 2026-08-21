import type { Dependencias } from "@/core/deps";
import type { NewTransaction } from "@/core/ports/repositories";

export function criarTransacao(dependencias: Dependencias, dados: NewTransaction) {
  return dependencias.transacoes.criar(dados);
}

export function atualizarTransacao(dependencias: Dependencias, id: string, dados: NewTransaction) {
  return dependencias.transacoes.atualizar(id, dados);
}

export function removerTransacao(dependencias: Dependencias, id: string) {
  return dependencias.transacoes.remover(id);
}
