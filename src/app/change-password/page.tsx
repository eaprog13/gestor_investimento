import { connection } from "next/server";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { requireSession } from "@/lib/auth/session";
import { veioDaRecuperacao } from "@/lib/security/sessionCookies";

export default async function ChangePasswordPage() {
  // Força renderização dinâmica (por pedido): o CSP em src/proxy.ts usa um
  // nonce novo a cada pedido, e o Next só consegue aplicá-lo aos scripts que
  // gera quando a página é renderizada dinamicamente — pré-gerada em build
  // não tem pedido/nonce nenhum disponível, e os scripts ficavam bloqueados
  // pelo próprio CSP.
  await connection();

  // a sessão do link de recuperação não sabe a password atual; as outras têm de a confirmar
  const session = await requireSession();
  const pedirPasswordAtual = !(await veioDaRecuperacao(session.sub));

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Definir nova password</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Escolhe uma password para a tua conta.</p>
        </div>
        <ChangePasswordForm pedirPasswordAtual={pedirPasswordAtual} />
      </div>
    </div>
  );
}
