"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(app)/assets/actions";
import { toDateInputValue } from "@/lib/format";

const initialState: ActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "A guardar…" : "Adicionar valorização"}
    </button>
  );
}

export function ValuationForm({
  action,
  fixedAssetId,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  fixedAssetId: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="assetId" value={fixedAssetId} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="v-date" className="text-sm font-medium text-[var(--text-primary)]">
            Data
          </label>
          <input
            id="v-date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="v-value" className="text-sm font-medium text-[var(--text-primary)]">
            Valor atual
          </label>
          <input
            id="v-value"
            name="value"
            type="number"
            step="any"
            min={0}
            required
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="v-notes" className="text-sm font-medium text-[var(--text-primary)]">
          Notas <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="v-notes"
          name="notes"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-sm font-medium" style={{ color: "var(--delta-good)" }}>
          Valorização guardada.
        </p>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
