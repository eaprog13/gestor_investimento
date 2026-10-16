"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { pedirLinkRecuperacao, type ActionState } from "@/app/forgot-password/actions";

const estadoInicial: ActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkInvalido = searchParams.get("erro") === "link_invalido";

  // O pedido corre no servidor (src/app/forgot-password/actions.ts): o
  // browser não fala com o fornecedor de autenticação. A resposta é sempre a
  // mesma, quer o email exista como conta quer não.
  const [state, formAction, aEnviar] = useActionState(pedirLinkRecuperacao, estadoInicial);

  if (state.status === "enviado") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm text-[var(--text-primary)]">
          Se existir uma conta com o email <strong>{state.email}</strong>, vais receber uma mensagem com um
          link para definires uma nova password.
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Não recebeste nada em alguns minutos? Verifica o spam ou tenta de novo.
        </p>
        <Link href="/login" className="text-sm font-medium text-[var(--series-1)] hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[var(--text-primary)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          {state.message}
        </p>
      ) : null}

      {linkInvalido && (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          Esse link de recuperação já não é válido ou expirou. Pede um novo abaixo.
        </p>
      )}

      <button
        type="submit"
        disabled={aEnviar}
        className="w-full rounded-md bg-[var(--series-1)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {aEnviar ? "A enviar…" : "Enviar link de recuperação"}
      </button>

      <Link href="/login" className="text-center text-sm text-[var(--text-secondary)] hover:underline">
        Voltar ao login
      </Link>
    </form>
  );
}
