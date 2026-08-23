import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";
import { LogoMark } from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { from } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={40} className="mb-3" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Gestor de Investimento</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Livro-razão do portefólio familiar
          </p>
        </div>
        <LoginForm from={from} />
      </div>
    </div>
  );
}
