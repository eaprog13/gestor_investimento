import { describe, expect, it } from "vitest";
import { atualizarUtilizador } from "@/core/services/userService";
import type { Dependencias } from "@/core/deps";
import type { Profile } from "@/core/types";

function contentorFalso(perfisIniciais: Profile[] = []) {
  const perfis = [...perfisIniciais];
  const nomesAtualizadosNaIdentidade: Record<string, string> = {};

  const dependencias: Dependencias = {
    perfis: {
      listar: async () => perfis,
      obterPorId: async (id) => perfis.find((p) => p.id === id) ?? null,
      obterPorEmail: async (email) => perfis.find((p) => p.email === email) ?? null,
      atualizar: async (id, dados) => {
        const perfil = perfis.find((p) => p.id === id);
        if (!perfil) throw new Error("Perfil não encontrado.");
        perfil.name = dados.name;
        return perfil;
      },
    },
    identidade: {
      atualizarNome: async (id, name) => {
        nomesAtualizadosNaIdentidade[id] = name;
      },
    },
    // Não usados por atualizarUtilizador — só para
    // satisfazer o tipo Dependencias.
    ativos: {} as Dependencias["ativos"],
    transacoes: {} as Dependencias["transacoes"],
    valorizacoes: {} as Dependencias["valorizacoes"],
    cotacoes: {} as Dependencias["cotacoes"],
    inflacao: {} as Dependencias["inflacao"],
  };

  return { dependencias, nomesAtualizadosNaIdentidade };
}

describe("atualizarUtilizador", () => {
  it("atualiza o nome em profiles e em user_metadata (identidade)", async () => {
    const existente: Profile = { id: "id-1", email: "ana@x.com", name: "Ana", createdAt: new Date() };
    const { dependencias, nomesAtualizadosNaIdentidade } = contentorFalso([existente]);

    const perfil = await atualizarUtilizador(dependencias, "id-1", { name: "Ana Maria" });
    expect(perfil.name).toBe("Ana Maria");
    expect(nomesAtualizadosNaIdentidade["id-1"]).toBe("Ana Maria");
  });
});
