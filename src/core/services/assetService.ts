import type { Dependencias } from "@/core/deps";
import type { NewAsset } from "@/core/ports/repositories";

export function criarAtivo(dependencias: Dependencias, dados: NewAsset) {
  return dependencias.ativos.criar(dados);
}

export function atualizarAtivo(dependencias: Dependencias, id: string, dados: NewAsset) {
  return dependencias.ativos.atualizar(id, dados);
}

export function arquivarAtivo(dependencias: Dependencias, id: string, arquivadoAtualmente: boolean) {
  return dependencias.ativos.arquivar(id, !arquivadoAtualmente);
}

export function removerAtivo(dependencias: Dependencias, id: string) {
  return dependencias.ativos.remover(id);
}
