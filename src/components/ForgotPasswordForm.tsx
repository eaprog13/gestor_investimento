"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkInvalido = searchParams.get("erro") === "link_invalido";

  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setAEnviar(true);

    const supabase = criarClienteSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    // Mostra sempre a mesma mensagem de sucesso, quer o email exista ou não
    // como conta — revelar isso a quem não conhece as credenciais seria dar
    // informação para tentar adivinhar contas válidas. O erro real (se
    // algum) fica só na consola.
    if (error) {
      console.error("[recuperar password] Supabase respondeu com erro:", error.status, error.message);
    }

    setAEnviar(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm text-[var(--text-primary)]">
          Se existir uma conta com o email <strong>{email}</strong>, vais receber uma mensagem com um
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
    <form onSubmit={submeter} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[var(--text-primary)]">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

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
