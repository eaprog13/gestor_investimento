import type {
  RepositorioAtivo,
  RepositorioCotacoes,
  RepositorioPerfil,
  RepositorioTransacao,
  RepositorioValorizacao,
} from "@/core/ports/repositories";
import type { FornecedorGestaoIdentidade } from "@/core/ports/identity";

/** Forma do contentor de dependências — ver src/composition/container.ts. */
export type Dependencias = {
  perfis: RepositorioPerfil;
  ativos: RepositorioAtivo;
  transacoes: RepositorioTransacao;
  valorizacoes: RepositorioValorizacao;
  cotacoes: RepositorioCotacoes;
  identidade: FornecedorGestaoIdentidade;
};
