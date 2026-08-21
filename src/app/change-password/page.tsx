import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Definir nova password</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Escolhe uma password para a tua conta.</p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
