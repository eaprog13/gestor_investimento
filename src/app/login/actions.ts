"use server";

import { redirect } from "next/navigation";
import { autenticacaoDoPedido, limitadorTentativas } from "@/composition/autenticacaoPedido";
import { entrar } from "@/core/services/authService";
import { iniciarAtividade, obterIp } from "@/lib/security/sessionCookies";
import { loginSchema } from "@/lib/validation";

export type ActionState = {
  status: "idle" | "error";
  message?: string;
};

const DESTINO_POR_DEFEITO = "/dashboard";

// As regras (limite de tentativas, só membros) estão em core/services/authService.ts.
export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const resultado = await entrar(
    { autenticacao: await autenticacaoDoPedido(), limitador: limitadorTentativas() },
    { email: parsed.data.email, password: parsed.data.password, ip: await obterIp() },
  );

  if (!resultado.ok) {
    return {
      status: "error",
      message:
        resultado.motivo === "limite"
          ? "Demasiadas tentativas. Tenta de novo daqui a alguns minutos."
          : "Credenciais inválidas.",
    };
  }

  await iniciarAtividade(resultado.utilizador.id);

  // "//evil.com" e "/\evil.com" também começam por "/" mas os browsers
  // tratam-nos como URL absoluto — sem este teste, um link
  // "/login?from=//evil.com" seria um open redirect após o login.
  const redirectTo = formData.get("from");
  const destinoSeguro = typeof redirectTo === "string" && /^\/(?![/\\])/.test(redirectTo);
  redirect(destinoSeguro ? redirectTo : DESTINO_POR_DEFEITO);
}
