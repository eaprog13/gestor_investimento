import { getUsers } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { UserForm } from "@/components/UserForm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Utilizadores</h1>
      <p className="max-w-xl text-sm text-[var(--text-secondary)]">
        Todos os utilizadores partilham o mesmo portefólio — não há dados separados por pessoa. Usa isto só
        para dar acesso a mais membros da família.
      </p>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Adicionar utilizador</h2>
        <UserForm />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Utilizadores existentes</h2>
        <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
                <p className="text-[var(--text-muted)]">{user.email}</p>
              </div>
              <span className="text-[var(--text-muted)]">desde {formatDate(user.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
