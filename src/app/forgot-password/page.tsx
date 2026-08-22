import { Suspense } from "react";
import { connection } from "next/server";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  // Ver comentário equivalente em src/app/change-password/page.tsx: força
  // renderização dinâmica para que o nonce do CSP (src/proxy.ts) chegue aos
  // scripts desta página.
  await connection();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Recuperar password</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Indica o email com que costumas entrar. Enviamos-te um link para definires uma nova password.
          </p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
