import Link from "next/link";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { PoderDeCompraResultado } from "@/lib/data";

const LABEL_PERIODO = { day: "dia", week: "semana", month: "mês", year: "ano" } as const;
const LABEL_PURPOSE = { emergency_fund: "Fundo de emergência", savings: "Poupança" } as const;

function LinhaErosao({ erosao, currency }: { erosao: Record<string, number>; currency: string }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {(Object.entries(LABEL_PERIODO) as [keyof typeof LABEL_PERIODO, string][]).map(([chave, rotulo]) => (
        <div key={chave} className="rounded-md bg-[var(--background)] px-2 py-2">
          <p className="text-[10px] tracking-wide text-[var(--text-muted)] uppercase">/{rotulo}</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--delta-bad)] tabular-nums">
            −{formatCurrency(erosao[chave]!, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PoderDeCompraCard({ dados }: { dados: PoderDeCompraResultado }) {
  if (dados.ativos.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Sem ativos em &quot;Poupanças&quot; ou &quot;Fundo de Emergência&quot; ainda. Cria um ou edita a categoria de
        um existente — ou, se esse dinheiro estiver aplicado noutra coisa (ex: Certificados de Aforro), edita esse
        ativo e marca a &quot;Finalidade&quot; como fundo de emergência/poupança, sem mudar a categoria.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-xs text-[var(--text-secondary)]">
        {dados.taxaAnualInflacao !== null ? (
          <>
            Inflação homóloga atual (IPC, Banco de Portugal):{" "}
            <strong className="text-[var(--text-primary)]">{formatPercent(dados.taxaAnualInflacao)}</strong>
            {dados.dataUltimoIndice ? <> — {formatDate(dados.dataUltimoIndice)}</> : null}. Os valores por dia/semana/
            mês abaixo são uma <strong>projeção</strong> matemática a partir desta taxa anual (juro composto) — não
            existe inflação diária ou semanal publicada em lado nenhum, só a mensal/anual.
          </>
        ) : (
          "Não foi possível obter a taxa de inflação atual (BPstat) — tenta mais tarde."
        )}
      </div>

      {dados.ativos.map((ativo) => (
        <div key={ativo.assetId} className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 first:border-0 first:pt-0">
          <div className="flex items-center justify-between">
            <Link href={`/assets/${ativo.assetId}`} className="font-medium text-[var(--text-primary)] hover:underline">
              {ativo.assetName}
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              {ativo.category}
              {ativo.purpose && (
                <span className="rounded-full bg-[var(--series-1)]/15 px-2 py-0.5 text-[var(--series-1)]">
                  {LABEL_PURPOSE[ativo.purpose]}
                </span>
              )}
            </span>
          </div>

          {ativo.poderDeCompra ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Investido</p>
                <p className="text-sm tabular-nums text-[var(--text-secondary)]">
                  {formatCurrency(ativo.valorInvestido, ativo.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Vale hoje {ativo.origemValorAtual === "estimado" ? "(sem valorização — assume parado)" : ""}
                </p>
                <p className="text-sm tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(ativo.valorAtual ?? ativo.valorInvestido, ativo.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Poder de compra desde então</p>
                <p
                  className="text-sm font-medium tabular-nums"
                  style={{ color: ativo.poderDeCompra.taxaReal >= 0 ? "var(--delta-good)" : "var(--delta-bad)" }}
                >
                  {ativo.poderDeCompra.taxaReal >= 0 ? "+" : ""}
                  {formatPercent(ativo.poderDeCompra.taxaReal)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Sem transações suficientes para comparar com a inflação.</p>
          )}

          {ativo.erosaoPorPeriodo && (
            <>
              <p className="text-xs text-[var(--text-muted)]">Se o valor ficar parado, a inflação corrói aproximadamente:</p>
              <LinhaErosao erosao={ativo.erosaoPorPeriodo} currency={ativo.currency} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
