import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { paraUtilizadorAutenticado } from "./authProvider";

function utilizador(parcial: Partial<User>): User {
  return {
    id: "u1",
    email: "ana@x.pt",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    ...parcial,
  } as User;
}

describe("paraUtilizadorAutenticado", () => {
  it("só é membro com app_metadata.membro === true", () => {
    expect(paraUtilizadorAutenticado(utilizador({ app_metadata: { membro: true } }))?.membro).toBe(true);
    expect(paraUtilizadorAutenticado(utilizador({ app_metadata: { provider: "email" } }))?.membro).toBe(false);
    expect(paraUtilizadorAutenticado(utilizador({ app_metadata: { membro: "true" } }))?.membro).toBe(false);
  });

  it("o user_metadata (que o próprio utilizador pode escrever) não dá acesso", () => {
    expect(paraUtilizadorAutenticado(utilizador({ user_metadata: { membro: true } }))?.membro).toBe(false);
  });

  it("usa o nome do user_metadata, ou o email na falta dele", () => {
    expect(paraUtilizadorAutenticado(utilizador({ user_metadata: { name: "Ana" } }))?.name).toBe("Ana");
    expect(paraUtilizadorAutenticado(utilizador({}))?.name).toBe("ana@x.pt");
  });

  it("sem utilizador ou sem email não há sessão", () => {
    expect(paraUtilizadorAutenticado(null)).toBeNull();
    expect(paraUtilizadorAutenticado(utilizador({ email: undefined }))).toBeNull();
  });
});
