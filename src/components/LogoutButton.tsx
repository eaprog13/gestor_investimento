"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--surface)] hover:text-[var(--text-primary)] active:scale-95"
      >
        <LogOut size={16} aria-hidden />
        Sair
      </button>
    </form>
  );
}
