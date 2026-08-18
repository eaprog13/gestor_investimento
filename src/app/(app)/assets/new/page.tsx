import { AssetForm } from "@/components/AssetForm";
import { createAsset } from "@/app/(app)/assets/actions";

export default function NewAssetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Novo ativo</h1>
      <AssetForm action={createAsset} submitLabel="Criar ativo" />
    </div>
  );
}
