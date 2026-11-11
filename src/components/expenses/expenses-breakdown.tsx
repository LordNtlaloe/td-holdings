import { EXPENSE_COLOR, card, formatMoneyCompact } from "./theme";

const MAX_ROWS = 5;

/** Expense categories as proportional bars. Anything past the top 5 is rolled up. */
export function ExpenseBreakdown({
    categories,
    loading,
}: {
    categories: { category: string; amount: number }[];
    loading?: boolean;
}) {
    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    const top = categories.slice(0, MAX_ROWS);
    const rest = categories.slice(MAX_ROWS).reduce((sum, c) => sum + c.amount, 0);
    const rows = rest > 0 ? [...top, { category: "Everything else", amount: rest }] : top;

    return (
        <section className={`${card} min-w-0`}>
            <h2 className="mb-4 text-base font-semibold">Where the money goes</h2>
            {loading ? (
                <p className="text-sm text-[#5b6270]">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-[#5b6270]">No expenses recorded in this period yet.</p>
            ) : (
                <ul className="flex flex-col gap-3.5">
                    {rows.map((row) => {
                        const pct = total > 0 ? (row.amount / total) * 100 : 0;
                        return (
                            <li key={row.category}>
                                <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                                    <span className="truncate">{row.category}</span>
                                    <span className="shrink-0 font-semibold">
                                        {formatMoneyCompact(row.amount)} · {Math.round(pct)}%
                                    </span>
                                </div>
                                <div className="h-2 rounded bg-[#eef0f3]">
                                    <div
                                        className="h-2 rounded"
                                        style={{ width: `${pct}%`, background: EXPENSE_COLOR }}
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