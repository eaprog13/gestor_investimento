"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, type ActionState } from "@/app/change-password/actions";

const initialState: ActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-[var(--series-1)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "A guardar…" : "Guardar nova password"}
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">
          Nova password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--text-primary)]">
          Confirmar password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
