import { getUsers } from "@/lib/data";
import { EditUserForm } from "@/components/EditUserForm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Utilizadores</h1>
      <p className="max-w-xl text-sm text-[var(--text-secondary)]">
        Todos os utilizadores partilham o mesmo portefólio — não há dados separados por pessoa. As contas são criadas só no painel do Supabase (Authentication → Users) — a app não cria contas.
      </p>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Utilizadores existentes</h2>
        <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
          {users.map((user) => (
            <EditUserForm key={user.id} user={user} />
          ))}
        </ul>
      </section>
    </div>
  );
}
