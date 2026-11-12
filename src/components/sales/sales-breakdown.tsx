import { SALES_COLOR, card, formatMoneyCompact } from "#/components/expenses/theme";

const MAX_ROWS = 5;

/** Revenue by department as proportional bars. Anything past the top 5 rolls up. */
export function SalesBreakdown({
    departments,
    loading,
}: {
    departments: { department: string; amount: number }[];
    loading?: boolean;
}) {
    const total = departments.reduce((sum, d) => sum + d.amount, 0);
    const top = departments.slice(0, MAX_ROWS);
    const rest = departments.slice(MAX_ROWS).reduce((sum, d) => sum + d.amount, 0);
    const rows = rest > 0 ? [...top, { department: "Everything else", amount: rest }] : top;

    return (
        <section className={`${card} min-w-0`}>
            <h2 className="mb-4 text-base font-semibold">Where the revenue comes from</h2>
            {loading ? (
                <p className="text-sm text-[#5b6270]">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-[#5b6270]">No sales recorded in this period yet.</p>
            ) : (
                <ul className="flex flex-col gap-3.5">
                    {rows.map((row) => {
                        const pct = total > 0 ? (row.amount / total) * 100 : 0;
                        return (
                            <li key={row.department}>
                                <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                                    <span className="truncate">{row.department}</span>
                                    <span className="shrink-0 font-semibold">
                                        {formatMoneyCompact(row.amount)} · {Math.round(pct)}%
                                    </span>
                                </div>
                                <div className="h-2 rounded bg-[#eef0f3]">
                                    <div
                                        className="h-2 rounded"
                                        style={{ width: `${pct}%`, background: SALES_COLOR }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
