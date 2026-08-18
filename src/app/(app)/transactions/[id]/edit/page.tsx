import { notFound } from "next/navigation";
import { getTransaction, getAssetOptions } from "@/lib/data";
import { TransactionForm } from "@/components/TransactionForm";
import { updateTransaction } from "@/app/(app)/assets/actions";
import { toDateInputValue } from "@/lib/format";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [transaction, assetOptions] = await Promise.all([getTransaction(id), getAssetOptions()]);
  if (!transaction) notFound();

  const boundUpdate = updateTransaction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Editar movimento</h1>
      <div className="max-w-md">
        <TransactionForm
          action={boundUpdate}
          submitLabel="Guardar alterações"
          assetOptions={assetOptions}
          defaultValues={{
            assetId: transaction.assetId,
            type: transaction.type,
            date: toDateInputValue(transaction.date),
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            amount: transaction.amount,
            notes: transaction.notes,
          }}
        />
      </div>
    </div>
  );
}
