import { describe, expect, it } from "vitest";
import { LimitadorTentativasMemoria } from "./limitadorTentativas";

async function tentativas(limitador: LimitadorTentativasMemoria, n: number, email: (i: number) => string, ip: (i: number) => string) {
  const resultados: boolean[] = [];
  for (let i = 1; i <= n; i++) resultados.push(await limitador.permitir(email(i), ip(i)));
  return resultados;
}

describe("LimitadorTentativasMemoria", () => {
  it("bloqueia à 11.ª tentativa do mesmo email e IP", async () => {
    const r = await tentativas(new LimitadorTentativasMemoria(), 12, () => "ana@x.pt", () => "1.1.1.1");
    expect(r.indexOf(false) + 1).toBe(11);
  });

  it("bloqueia à 21.ª tentativa do mesmo email a partir de IPs diferentes", async () => {
    const r = await tentativas(new LimitadorTentativasMemoria(), 25, () => "ana@x.pt", (i) => `10.0.0.${i}`);
    expect(r.indexOf(false) + 1).toBe(21);
  });

  it("emails diferentes não se bloqueiam um ao outro", async () => {
    const limitador = new LimitadorTentativasMemoria();
    await tentativas(limitador, 12, () => "ana@x.pt", () => "1.1.1.1");
    expect(await limitador.permitir("rui@x.pt", "1.1.1.1")).toBe(true);
  });

  it("volta a deixar tentar quando a janela passa", async () => {
    let agora = 0;
    const limitador = new LimitadorTentativasMemoria(undefined, () => agora);
    await tentativas(limitador, 11, () => "ana@x.pt", () => "1.1.1.1");
    expect(await limitador.permitir("ana@x.pt", "1.1.1.1")).toBe(false);
    agora += 61_000;
    expect(await limitador.permitir("ana@x.pt", "1.1.1.1")).toBe(true);
  });
});
