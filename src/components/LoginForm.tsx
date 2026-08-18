"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type ActionState } from "@/app/login/actions";

const initialState: ActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-[var(--series-1)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "A entrar…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {from ? <input type="hidden" name="from" value={from} /> : null}

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
