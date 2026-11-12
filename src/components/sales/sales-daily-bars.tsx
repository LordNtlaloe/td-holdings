import { SALES_COLOR, formatMoneyCompact } from "#/components/expenses/theme";
import { niceCeil } from "#/components/expenses/chart-utils";

export interface SalesDayBar {
    label: string;
    revenue: number;
    transactions: number;
}

const W = 530;
const H = 180;
const BASE = 150;
const TOP = 20;
const PAD = 10;

/** Daily sales bars. The last entry is today and is highlighted. */
export function SalesDailyBarsChart({ days }: { days: SalesDayBar[] }) {
    const n = days.length;
    if (n === 0) return null;

    const max = niceCeil(Math.max(0, ...days.map((d) => d.revenue)));
    const groupW = (W - PAD * 2) / n;
    const barW = Math.min(24, groupW - 10);
    const height = (v: number) => ((BASE - TOP) * v) / max;
    const today = days[n - 1];

    const summary =
        `Bar chart of daily sales for the last ${n} days. ` +
        `Today: sales ${formatMoneyCompact(today.revenue)}.`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
            <rect
                x={PAD + (n - 1) * groupW + 2}
                y={TOP - 6}
                width={groupW - 4}
                height={BASE - TOP + 6}
                rx="6"
                fill="#e8eefc"
            />
            <line x1={PAD} x2={W - PAD} y1={BASE} y2={BASE} stroke="#d4d8df" />

            {days.map((d, i) => {
                const x0 = PAD + i * groupW + (groupW - barW) / 2;
                const isToday = i === n - 1;
                return (
                    <g key={i}>
                        <rect
                            x={x0}
                            y={BASE - height(d.revenue)}
                            width={barW}
                            height={height(d.revenue)}
                            rx="2"
                            fill={SALES_COLOR}
                        />
                        {(n - 1 - i) % 2 === 0 && (
                            <text
                                x={PAD + i * groupW + groupW / 2}
                                y={168}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight={isToday ? 600 : 400}
                                fill={isToday ? "#14181f" : "#5b6270"}
                            >
                                {isToday ? "Today" : d.label}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
