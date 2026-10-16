import type { Dependencias } from "@/core/deps";

export async function atualizarUtilizador(dependencias: Dependencias, id: string, dados: { name: string }) {
  // Duas escritas — public.profiles (mostrado em /settings/users) e
  // user_metadata (fonte do nome na sessão, ver core/ports/identity.ts) —
  // sem transação porque são dois sistemas diferentes (BD vs. Auth); em
  // caso de falha a meio, a próxima edição volta a sincronizar os dois.
  const perfil = await dependencias.perfis.atualizar(id, dados);
  await dependencias.identidade.atualizarNome(id, dados.name);
  return perfil;
}
