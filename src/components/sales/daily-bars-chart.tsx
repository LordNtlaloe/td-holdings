import { SALES_COLOR, UNITS_COLOR, formatMoneyCompact, formatCount } from "./theme";
import { niceCeil } from "./chart-utils";

export interface DayBar {
    label: string;
    sales: number;
    units: number;
}

const W = 530;
const H = 180;
const BASE = 150;
const TOP = 20;
const PAD = 10;

export function DailyBarsChart({ days }: { days: DayBar[] }) {
    const n = days.length;
    if (n === 0) return null;

    const max = niceCeil(Math.max(0, ...days.flatMap((d) => [d.sales, d.units])));
    const groupW = (W - PAD * 2) / n;
    const barW = Math.min(12, (groupW - 10) / 2);
    const height = (v: number) => ((BASE - TOP) * v) / max;
    const today = days[n - 1];

    const summary =
        `Paired bar chart of daily revenue and units for the last ${n} days. ` +
        `Today: revenue ${formatMoneyCompact(today.sales)}, units ${formatCount(today.units)}.`;

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
                const x0 = PAD + i * groupW + (groupW - (barW * 2 + 2)) / 2;
                const isToday = i === n - 1;
                return (
                    <g key={i}>
                        <rect x={x0} y={BASE - height(d.sales)} width={barW} height={height(d.sales)} rx="2" fill={SALES_COLOR} />
                        <rect x={x0 + barW + 2} y={BASE - height(d.units)} width={barW} height={height(d.units)} rx="2" fill={UNITS_COLOR} />
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

export function BarsLegend() {
    return (
        <div className="flex gap-4 text-[13px] text-[#3d4452]">
            <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-[3px]" style={{ background: SALES_COLOR }} />
                Revenue
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-[3px]" style={{ background: UNITS_COLOR }} />
                Units
            </span>
        </div>
    );
}