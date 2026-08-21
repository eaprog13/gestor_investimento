"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, X } from "lucide-react";
import { updateUser, type ActionState } from "@/app/(app)/settings/users/actions";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/core/types";

const initialState: ActionState = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[var(--series-1)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
    >
      {pending ? "A guardar…" : "Guardar"}
    </button>
  );
}

export function EditUserForm({ user }: { user: Profile }) {
  const [aEditar, setAEditar] = useState(false);
  const updateUserComId = updateUser.bind(null, user.id);
  const [state, formAction] = useActionState(updateUserComId, initialState);

  // Fecha o formulário assim que a alteração é guardada com sucesso — ajuste
  // de estado durante a renderização (em vez de um efeito) para evitar o
  // duplo render que um useEffect a chamar setState causaria (ver "You
  // Might Not Need an Effect" na documentação do React).
  const [ultimoEstadoVisto, setUltimoEstadoVisto] = useState(state);
  if (state !== ultimoEstadoVisto) {
    setUltimoEstadoVisto(state);
    if (state.status === "success" && aEditar) setAEditar(false);
  }

  if (aEditar) {
    return (
      <li className="flex flex-col gap-1.5 py-2.5">
        <form action={formAction} className="flex items-center gap-2">
          <input
            name="name"
            defaultValue={user.name}
            required
            minLength={2}
            maxLength={80}
            autoFocus
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
          <SaveButton />
          <button
            type="button"
            onClick={() => setAEditar(false)}
            title="Cancelar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </form>
        {state.status === "error" ? <p className="text-xs text-[var(--delta-bad)]">{state.message}</p> : null}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2.5">
      <div>
        <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
        <p className="text-[var(--text-muted)]">{user.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-muted)]">desde {formatDate(user.createdAt)}</span>
        <button
          type="button"
          onClick={() => setAEditar(true)}
          title="Editar nome"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          <Pencil size={14} />
        </button>
      </div>
    </li>
  );
}
