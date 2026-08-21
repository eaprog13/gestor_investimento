import type { Dependencias } from "@/core/deps";

export type ResultadoCriarUtilizador = { ok: true } | { ok: false; message: string };

export async function criarUtilizador(
  dependencias: Dependencias,
  dados: { name: string; email: string; password: string }
): Promise<ResultadoCriarUtilizador> {
  const existing = await dependencias.perfis.obterPorEmail(dados.email);
  if (existing) {
    return { ok: false, message: "Já existe um utilizador com este email." };
  }

  await dependencias.identidade.criarUtilizador(dados);
  return { ok: true };
}

export async function atualizarUtilizador(dependencias: Dependencias, id: string, dados: { name: string }) {
  // Duas escritas — public.profiles (mostrado em /settings/users) e
  // user_metadata (fonte do nome na sessão, ver core/ports/identity.ts) —
  // sem transação porque são dois sistemas diferentes (BD vs. Auth); em
  // caso de falha a meio, a próxima edição volta a sincronizar os dois.
  const perfil = await dependencias.perfis.atualizar(id, dados);
  await dependencias.identidade.atualizarNome(id, dados.name);
  return perfil;
}
