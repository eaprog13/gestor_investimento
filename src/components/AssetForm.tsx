"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(app)/assets/actions";

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

type AssetFormProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  defaultValues?: {
    name: string;
    category: string;
    currency: string;
    notes: string | null;
    priceProvider?: "coingecko" | "alphavantage" | null;
    priceSymbol?: string | null;
  };
};

export function AssetForm({ action, submitLabel, defaultValues }: AssetFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)]">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="ex: ETF MSCI World"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-[var(--text-primary)]">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          required
          list="category-suggestions"
          defaultValue={defaultValues?.category}
          placeholder="ex: Ações, Cripto, Imóveis, Depósitos…"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
        <datalist id="category-suggestions">
          <option value="Ações" />
          <option value="ETFs" />
          <option value="Cripto" />
          <option value="Imóveis" />
          <option value="Depósitos" />
          <option value="Poupanças" />
          <option value="Fundos" />
          <option value="Obrigações" />
        </datalist>
        <p className="text-xs text-[var(--text-muted)]">Texto livre — usa a categoria que fizer sentido para a família.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className="text-sm font-medium text-[var(--text-primary)]">
          Moeda
        </label>
        <input
          id="currency"
          name="currency"
          required
          maxLength={3}
          defaultValue={defaultValues?.currency ?? "EUR"}
          className="w-24 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm uppercase outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-[var(--text-primary)]">
          Notas <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <label htmlFor="priceProvider" className="text-sm font-medium text-[var(--text-primary)]">
          Cotação automática <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <select
          id="priceProvider"
          name="priceProvider"
          defaultValue={defaultValues?.priceProvider ?? ""}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        >
          <option value="">Sem cotação (valorização manual)</option>
          <option value="coingecko">Cripto — CoinGecko</option>
          <option value="alphavantage">ETF / ações — Alpha Vantage</option>
        </select>
        <input
          id="priceSymbol"
          name="priceSymbol"
          defaultValue={defaultValues?.priceSymbol ?? ""}
          placeholder="Símbolo: ex. &quot;bitcoin&quot; (CoinGecko) ou &quot;AAPL&quot; (Alpha Vantage)"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--series-1)] focus:ring-1 focus:ring-[var(--series-1)]"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Cruza o valor investido com o preço de mercado diário. Na CoinGecko o símbolo é o{" "}
          <strong className="text-[var(--text-secondary)]">id</strong> deles, não o ticker da bolsa — ex: Bitcoin é{" "}
          <code className="rounded bg-[var(--background)] px-1">bitcoin</code> (não &quot;BTC&quot;), Binance Coin é{" "}
          <code className="rounded bg-[var(--background)] px-1">binancecoin</code> (não &quot;BNB&quot;); confirma em
          coingecko.com/pt/moedas/&lt;nome&gt; — o id está no URL. Certificados de Aforro, depósitos e imóveis não
          têm cotação de mercado — continuam a usar valorizações manuais.
        </p>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--delta-bad)]">
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
