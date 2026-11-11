import { Delta } from "./kpi-cards";
import { BarsLegend, DailyBarsChart, type DayBar } from "./daily-barchart";
import { EXPENSE_COLOR, SALES_COLOR, card, formatMoneyCompact } from "./theme";

/** Today's sales and expenses against yesterday, with the last 14 days as bars. */
export function TodayPanel({
    days,
    dateLabel,
    loading,
}: {
    /** Oldest first; the last entry is today. */
    days: DayBar[];
    dateLabel: string;
    loading?: boolean;
}) {
    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];

    return (
        <section className={`${card} flex flex-wrap gap-6`} aria-label="Today">
            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-4">
                <div>
                    <h2 className="text-base font-semibold">Today</h2>
                    <p className="mt-0.5 text-[13px] text-[#5b6270]">{dateLabel} · vs yesterday</p>
                </div>

                <Stat label="Sales today" color={SALES_COLOR} loading={loading} value={today?.sales}>
                    {today && yesterday && (
                        <Delta
                            current={today.sales}
                            previous={yesterday.sales}
                            higherIsBetter
                            suffix={`vs ${formatMoneyCompact(yesterday.sales)} yesterday`}
                        />
                    )}
                </Stat>
                <Stat label="Expenses today" color={EXPENSE_COLOR} loading={loading} value={today?.expenses}>
                    {today && yesterday && (
                        <Delta
                            current={today.expenses}
                            previous={yesterday.expenses}
                            higherIsBetter={false}
                            suffix={`vs ${formatMoneyCompact(yesterday.expenses)} yesterday`}
                        />
                    )}
                </Stat>
            </div>

            <div className="min-w-0 flex-[3_1_420px]">
                <div className="mb-3 flex flex-wrap justify-between gap-3">
                    <h2 className="text-base font-semibold">Daily sales vs expenses, last 14 days</h2>
                    <BarsLegend />
                </div>
                {loading ? (
                    <div className="flex h-45 items-center justify-center text-sm text-[#5b6270]">
                        Loading…
                    </div>
                ) : (
                    <DailyBarsChart days={days} />
                )}
            </div>
        </section>
    );
}

function Stat({
    label,
    color,
    value,
    loading,
    children,
}: {
    label: string;
    color: string;
    value: number | undefined;
    loading?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="border-l-4 pl-3" style={{ borderLeftColor: color }}>
            <div className="text-[13px] font-medium text-[#5b6270]">{label}</div>
            <div className="my-1 text-[28px] font-bold leading-tight">
                {loading || value === undefined ? "—" : formatMoneyCompact(value)}
            </div>
            <div className="min-h-5 text-[13px]">{!loading && children}</div>
        </div>
    );
}