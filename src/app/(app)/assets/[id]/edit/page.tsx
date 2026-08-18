import { notFound } from "next/navigation";
import { getAsset } from "@/lib/data";
import { AssetForm } from "@/components/AssetForm";
import { updateAsset, toggleArchiveAsset, deleteAsset } from "@/app/(app)/assets/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) notFound();

  const boundUpdate = updateAsset.bind(null, id);
  const boundToggleArchive = toggleArchiveAsset.bind(null, id, asset.isArchived);
  const boundDelete = deleteAsset.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Editar ativo</h1>
      <AssetForm
        action={boundUpdate}
        submitLabel="Guardar alterações"
        defaultValues={{
          name: asset.name,
          category: asset.category,
          currency: asset.currency,
          notes: asset.notes,
        }}
      />

      <div className="mt-2 flex max-w-md items-center justify-between border-t border-[var(--border)] pt-4">
        <form action={boundToggleArchive}>
          <button
            type="submit"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)]"
          >
            {asset.isArchived ? "Reativar ativo" : "Arquivar ativo"}
          </button>
        </form>
        <ConfirmDeleteButton
          action={boundDelete}
          label="Apagar ativo"
          confirmMessage="Apagar este ativo remove também todas as transações e valorizações associadas. Continuar?"
        />
      </div>
    </div>
  );
}
