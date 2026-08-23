"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Users, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";

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
  // Antes disto, <768px mostrava uma faixa de abas com scroll horizontal —
  // escondia "Utilizadores" fora do ecrã sem qualquer pista de que havia
  // mais para o lado. Um menu hamburguer é sempre visível e não esconde
  // nada. Fecha sozinho ao mudar de página.
  const [menuAberto, setMenuAberto] = useState(false);
  // Sem useEffect: ajustar estado durante o render em resposta a uma prop
  // que mudou é o padrão recomendado pelo React (evita o re-render extra
  // de um efeito) e resolve o aviso do eslint (react-hooks/set-state-in-effect).
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setMenuAberto(false);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      {/* Grid "1fr auto 1fr": as colunas dos lados dividem o espaço
          sobrante em partes IGUAIS entre si (ao contrário de "auto 1fr
          auto", em que só a coluna do meio recebia esse espaço) — só assim
          o menu fica realmente centrado, independentemente de o nome da
          app e as ações terem larguras diferentes. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6">
        {/* Nome completo só a partir de "md" — abaixo disso quebrava em 2
            linhas e empurrava a altura do cabeçalho (ver Logo.tsx). */}
        <Link href="/dashboard" className="justify-self-start">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
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

        {/* Hamburguer: substitui o menu completo em todo o intervalo <768px. */}
        <button
          type="button"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          aria-expanded={menuAberto}
          aria-controls="menu-mobile"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          className="flex items-center justify-center rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--background)] hover:text-[var(--text-primary)] md:hidden"
        >
          {menuAberto ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden items-center justify-self-end gap-3 md:flex">
          <span className="text-sm text-[var(--text-secondary)]">{userName}</span>
          <span className="h-5 w-px bg-[var(--border)]" aria-hidden />
          <LogoutButton />
        </div>
      </div>

      {menuAberto && (
        <nav
          id="menu-mobile"
          className="flex flex-col gap-0.5 border-t border-[var(--border)] p-2 md:hidden"
        >
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
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
          <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] px-3 pt-2">
            <span className="text-sm text-[var(--text-secondary)]">{userName}</span>
            <LogoutButton />
          </div>
        </nav>
      )}
    </header>
  );
}
