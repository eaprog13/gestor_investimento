"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Users } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Ativos", icon: Wallet },
  { href: "/transactions", label: "Livro-razão", icon: Receipt },
  { href: "/settings/users", label: "Utilizadores", icon: Users },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      {/* Grid "1fr auto 1fr": as colunas dos lados dividem o espaço
          sobrante em partes IGUAIS entre si (ao contrário de "auto 1fr
          auto", em que só a coluna do meio recebia esse espaço) — só assim
          o menu fica realmente centrado, independentemente de o nome da
          app e as ações terem larguras diferentes. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6">
        <span className="justify-self-start text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          Gestor de Investimento
        </span>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ease-out active:scale-[0.97] ${
                  active
                    ? "bg-[var(--series-1)]/10 font-medium text-[var(--series-1)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <span className="hidden text-sm text-[var(--text-secondary)] sm:inline">{userName}</span>
          <span className="hidden h-5 w-px bg-[var(--border)] sm:block" aria-hidden />
          <LogoutButton />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-[var(--border)] px-4 py-1.5 sm:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ease-out active:scale-95 ${
                active
                  ? "bg-[var(--series-1)]/10 font-medium text-[var(--series-1)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
