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

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Gestor de Investimento
          </span>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-[var(--series-1)]/10 text-[var(--series-1)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--text-secondary)] sm:inline">{userName}</span>
          <LogoutButton />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-[var(--border)] px-4 py-1.5 sm:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-[var(--series-1)]/10 text-[var(--series-1)] font-medium"
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
