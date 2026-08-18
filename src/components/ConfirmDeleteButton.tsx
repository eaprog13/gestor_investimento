"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  action,
  confirmMessage = "Tens a certeza? Esta ação não pode ser desfeita.",
  label = "Apagar",
  compact = false,
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--delta-bad)] hover:bg-[var(--delta-bad)]/10"
            : "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--delta-bad)] hover:bg-[var(--delta-bad)]/10"
        }
      >
        <Trash2 size={compact ? 12 : 14} aria-hidden />
        {label}
      </button>
    </form>
  );
}
