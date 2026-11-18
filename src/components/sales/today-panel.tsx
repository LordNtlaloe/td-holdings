import { Delta } from "./kpi-cards";
import { BarsLegend, DailyBarsChart, type DayBar } from "./daily-bars-chart";
import { SALES_COLOR, UNITS_COLOR, card, formatMoneyCompact } from "./theme";

export function TodayPanel({
    days,
    dateLabel,
    loading,
}: {
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

                <Stat label="Revenue today" color={SALES_COLOR} loading={loading} value={today?.sales}>
                    {today && yesterday && (
                        <Delta
                            current={today.sales}
                            previous={yesterday.sales}
                            higherIsBetter
                            suffix={`vs ${formatMoneyCompact(yesterday.sales)} yesterday`}
                        />
                    )}
                </Stat>
                <Stat label="Units today" color={UNITS_COLOR} loading={loading} value={today?.units}>
                    {today && yesterday && (
                        <Delta
                            current={today.units}
                            previous={yesterday.units}
                            higherIsBetter
                            suffix={`vs ${yesterday.units} yesterday`}
                        />
                    )}
                </Stat>
            </div>

            <div className="min-w-0 flex-[3_1_420px]">
                <div className="mb-3 flex flex-wrap justify-between gap-3">
                    <h2 className="text-base font-semibold">Daily revenue vs units, last 14 days</h2>
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
                {loading || value === undefined ? "—" : label.startsWith("Revenue") ? formatMoneyCompact(value) : value}
            </div>
            <div className="min-h-5 text-[13px]">{!loading && children}</div>
        </div>
    );
}