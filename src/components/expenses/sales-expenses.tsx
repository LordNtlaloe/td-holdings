import { EXPENSE_COLOR, SALES_COLOR, formatMoneyCompact } from "./theme";
import { niceCeil } from "./chart-utils";

export interface ChartPoint {
    label: string;
    /** null = this bucket is in the future, so the lines stop before it. */
    sales: number | null;
    expenses: number | null;
}

const W = 740;
const H = 260;
const LEFT = 48;
const RIGHT = 20;
const TOP = 20;
const BOTTOM = 220;

export function SalesExpensesChart({
    points,
    unit,
    loading,
}: {
    points: ChartPoint[];
    unit: "day" | "month";
    loading?: boolean;
}) {
    const known = points.filter((p) => p.sales !== null && p.expenses !== null);
    const max = niceCeil(Math.max(0, ...known.flatMap((p) => [p.sales ?? 0, p.expenses ?? 0])));
    const hasData = known.some((p) => (p.sales ?? 0) > 0 || (p.expenses ?? 0) > 0);

    if (loading || !hasData) {
        return (
            <div className="flex h-65 items-center justify-center text-sm text-[#5b6270]">
                {loading ? "Loading…" : "No sales or expenses recorded in this period yet."}
            </div>
        );
    }

    const n = points.length;
    const plotW = W - LEFT - RIGHT;
    const x = (i: number) => (n === 1 ? LEFT + plotW / 2 : LEFT + (plotW * i) / (n - 1));
    const y = (v: number) => TOP + (BOTTOM - TOP) * (1 - v / max);

    const path = (key: "sales" | "expenses") =>
        points
            .map((p, i) => (p[key] === null ? null : `${x(i).toFixed(1)},${y(p[key] as number).toFixed(1)}`))
            .filter(Boolean)
            .join(" ");

    const lastIndex = points.reduce((acc, p, i) => (p.sales !== null ? i : acc), 0);
    const last = points[lastIndex];
    const ticks = [0, 1, 2, 3].map((t) => (max * t) / 3);
    const labelEvery = Math.ceil(n / 12);

    const summary =
        `Line chart of sales and expenses by ${unit}, ${points[0].label} to ${points[n - 1].label}. ` +
        `Latest, ${last.label}: sales ${formatMoneyCompact(last.sales ?? 0)}, ` +
        `expenses ${formatMoneyCompact(last.expenses ?? 0)}.`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
            {ticks.map((t) => (
                <g key={t}>
                    <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} stroke="#e3e6eb" />
                    <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5b6270">
                        {formatMoneyCompact(t)}
                    </text>
                </g>
            ))}

            <polyline
                fill="none"
                stroke={EXPENSE_COLOR}
                strokeWidth="2.5"
                strokeDasharray="6 4"
                points={path("expenses")}
            />
            <polyline fill="none" stroke={SALES_COLOR} strokeWidth="2.5" points={path("sales")} />
            <circle cx={x(lastIndex)} cy={y(last.sales ?? 0)} r="5" fill={SALES_COLOR} />
            <circle cx={x(lastIndex)} cy={y(last.expenses ?? 0)} r="5" fill={EXPENSE_COLOR} />

            {points.map((p, i) =>
                i % labelEvery === 0 ? (
                    <text key={i} x={x(i)} y={242} textAnchor="middle" fontSize="11" fill="#5b6270">
                        {p.label}
                    </text>
                ) : null
            )}
        </svg>
    );
}

export function ChartLegend() {
    return (
        <div className="flex gap-4 text-[13px] text-[#3d4452]">
            <span className="inline-flex items-center gap-1.5">
                <span className="h-0.75 w-3 rounded-sm" style={{ background: SALES_COLOR }} />
                Sales
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t-[3px] border-dashed" style={{ borderColor: EXPENSE_COLOR }} />
                Expenses
            </span>
        </div>
    );
}