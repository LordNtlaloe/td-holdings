import type { ReactNode } from "react";
import { Delta } from "#/components/expenses/kpi-cards";
import { SalesDailyBarsChart, type SalesDayBar } from "./sales-daily-bars";
import { SALES_COLOR, card, formatMoneyCompact } from "#/components/expenses/theme";

const whole = (n: number) => n.toLocaleString();

/** Today's sales against yesterday, with the last 14 days as bars. */
export function SalesTodayPanel({
    days,
    dateLabel,
    loading,
}: {
    /** Oldest first; the last entry is today. */
    days: SalesDayBar[];
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

                <Stat label="Sales today" color={SALES_COLOR} loading={loading} value={today?.revenue}>
                    {today && yesterday && (
                        <Delta
                            current={today.revenue}
                            previous={yesterday.revenue}
                            higherIsBetter
                            suffix={`vs ${formatMoneyCompact(yesterday.revenue)} yesterday`}
                        />
                    )}
                </Stat>
                <Stat
                    label="Transactions today"
                    color={SALES_COLOR}
                    loading={loading}
                    value={today?.transactions}
                    formatValue={whole}
                >
                    {today && yesterday && (
                        <Delta
                            current={today.transactions}
                            previous={yesterday.transactions}
                            higherIsBetter
                            suffix={`vs ${yesterday.transactions} yesterday`}
                        />
                    )}
                </Stat>
            </div>

            <div className="min-w-0 flex-[3_1_420px]">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Daily sales, last 14 days</h2>
                </div>
                {loading ? (
                    <div className="flex h-45 items-center justify-center text-sm text-[#5b6270]">
                        Loading…
                    </div>
                ) : (
                    <SalesDailyBarsChart days={days} />
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
    formatValue = formatMoneyCompact,
    children,
}: {
    label: string;
    color: string;
    value: number | undefined;
    loading?: boolean;
    formatValue?: (value: number) => string;
    children?: ReactNode;
}) {
    return (
        <div className="border-l-4 pl-3" style={{ borderLeftColor: color }}>
            <div className="text-[13px] font-medium text-[#5b6270]">{label}</div>
            <div className="my-1 text-[28px] font-bold leading-tight">
                {loading || value === undefined ? "—" : formatValue(value)}
            </div>
            <div className="min-h-5 text-[13px]">{!loading && children}</div>
        </div>
    );
}
