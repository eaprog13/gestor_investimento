import Link from "next/link";
import type { TransactionType } from "@/core/types";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/format";

type Row = {
  id: string;
  type: TransactionType;
  date: Date;
  amount: number;
  asset: { id: string; name: string; currency: string };
};

export function RecentTransactionsList({ transactions }: { transactions: Row[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Ainda não há movimentos.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--border)]">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex flex-col">
            <Link href={`/assets/${tx.asset.id}`} className="font-medium text-[var(--text-primary)] hover:underline">
              {tx.asset.name}
            </Link>
            <span className="text-[var(--text-muted)]">
              {formatTransactionType(tx.type)} · {formatDate(tx.date)}
            </span>
          </div>
          <span className="tabular-nums text-[var(--text-secondary)]">
            {formatCurrency(tx.amount, tx.asset.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
