import { getAssetOptions } from "@/lib/data";
import { TransactionForm } from "@/components/TransactionForm";
import { createTransaction } from "@/app/(app)/assets/actions";

export default async function NewTransactionPage() {
  const assetOptions = await getAssetOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Novo movimento</h1>
      {assetOptions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Ainda não tens ativos — cria primeiro um ativo antes de registares transações.
        </p>
      ) : (
        <div className="max-w-md">
          <TransactionForm action={createTransaction} submitLabel="Adicionar transação" assetOptions={assetOptions} />
        </div>
      )}
    </div>
  );
}
