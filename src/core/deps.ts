import type {
  RepositorioAtivo,
  RepositorioCotacoes,
  RepositorioPerfil,
  RepositorioTransacao,
  RepositorioValorizacao,
} from "@/core/ports/repositories";
import type { FornecedorGestaoIdentidade } from "@/core/ports/identity";
import type { RepositorioInflacao } from "@/core/ports/inflation";

/** Forma do contentor de dependências — ver src/composition/container.ts. */
export type Dependencias = {
  perfis: RepositorioPerfil;
  ativos: RepositorioAtivo;
  transacoes: RepositorioTransacao;
  valorizacoes: RepositorioValorizacao;
  cotacoes: RepositorioCotacoes;
  inflacao: RepositorioInflacao;
  identidade: FornecedorGestaoIdentidade;
};
