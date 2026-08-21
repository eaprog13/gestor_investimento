import type { Dependencias } from "@/core/deps";

export function criarOuAtualizarValorizacao(
  dependencias: Dependencias,
  dados: { assetId: string; date: Date; value: number; notes?: string }
) {
  return dependencias.valorizacoes.criarOuAtualizar(dados);
}

export function removerValorizacao(dependencias: Dependencias, id: string) {
  return dependencias.valorizacoes.remover(id);
}
