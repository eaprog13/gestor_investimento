"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUser, type ActionState } from "@/app/(app)/settings/users/actions";

const initialState: ActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "A criar…" : "Criar utilizador"}
    </button>
  );
}

export function UserForm() {
  const [state, formAction] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-name" className="text-sm font-medium text-[var(--text-primary)]">
          Nome
        </label>
        <input
          id="u-name"
          name="name"
          required
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-email" className="text-sm font-medium text-[var(--text-primary)]">
          Email
        </label>
        <input
          id="u-email"
          name="email"
          type="email"
          required
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-password" className="text-sm font-medium text-[var(--text-primary)]">
          Password
        </label>
        <input
          id="u-password"
          name="password"
          type="password"
          required
          minLength={10}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Pelo menos 10 caracteres, com maiúscula, minúscula e número.
        </p>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-sm font-medium" style={{ color: "var(--delta-good)" }}>
          {state.message}
        </p>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
