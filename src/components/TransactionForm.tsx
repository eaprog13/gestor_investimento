"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(app)/assets/actions";
import { toDateInputValue } from "@/lib/format";
import { TRANSACTION_TYPES } from "@/lib/validation";
import { formatTransactionType } from "@/lib/format";

const initialState: ActionState = { status: "idle" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "A guardar…" : label}
    </button>
  );
}

type TransactionFormProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  assetOptions?: { id: string; name: string; category: string }[];
  fixedAssetId?: string;
  defaultValues?: {
    assetId: string;
    type: string;
    date: string;
    quantity: number | null;
    unitPrice: number | null;
    amount: number;
    notes: string | null;
  };
};

export function TransactionForm({
  action,
  submitLabel,
  assetOptions,
  fixedAssetId,
  defaultValues,
}: TransactionFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [quantity, setQuantity] = useState(defaultValues?.quantity?.toString() ?? "");
  const [unitPrice, setUnitPrice] = useState(defaultValues?.unitPrice?.toString() ?? "");
  const [amount, setAmount] = useState(defaultValues?.amount?.toString() ?? "");

  function handleQtyOrPrice(qty: string, price: string) {
    setQuantity(qty);
    setUnitPrice(price);
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (!Number.isNaN(q) && !Number.isNaN(p)) {
      setAmount((q * p).toFixed(2));
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fixedAssetId ? (
        <input type="hidden" name="assetId" value={fixedAssetId} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assetId" className="text-sm font-medium text-[var(--text-primary)]">
            Ativo
          </label>
          <select
            id="assetId"
            name="assetId"
            required
            defaultValue={defaultValues?.assetId ?? ""}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          >
            <option value="" disabled>
              Escolhe um ativo
            </option>
            {assetOptions?.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} · {asset.category}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-[var(--text-primary)]">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={defaultValues?.type ?? "BUY"}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatTransactionType(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-[var(--text-primary)]">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date ?? toDateInputValue()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantity" className="text-sm font-medium text-[var(--text-primary)]">
            Quantidade <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => handleQtyOrPrice(e.target.value, unitPrice)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unitPrice" className="text-sm font-medium text-[var(--text-primary)]">
            Preço unitário <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="any"
            value={unitPrice}
            onChange={(e) => handleQtyOrPrice(quantity, e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-sm font-medium text-[var(--text-primary)]">
          Valor total
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="any"
          required
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="preenchido a partir de quantidade × preço, ou introduz diretamente"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-[var(--text-primary)]">
          Notas <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
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
          Movimento guardado.
        </p>
      ) : null}

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
