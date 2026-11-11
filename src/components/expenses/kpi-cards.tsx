import type { ReactNode } from "react";
import { card, BAD_COLOR, GOOD_COLOR } from "./theme";

export function KpiCard({
    label,
    value,
    children,
}: {
    label: string;
    value: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className={card}>
            <div className="text-[13px] font-medium text-[#5b6270]">{label}</div>
            <div className="mb-1.5 mt-2 text-[30px] font-bold leading-tight text-[#14181f]">{value}</div>
            <div className="min-h-5 text-[13px]">{children}</div>
        </div>
    );
}

/**
 * Change versus a previous value, e.g. "▲ 14.2% vs 2025".
 * Green is the good direction and brown the bad one; the arrow carries the
 * direction too, so it never depends on color alone.
 */
export function Delta({
    current,
    previous,
    higherIsBetter,
    suffix,
}: {
    current: number;
    previous: number;
    higherIsBetter: boolean;
    suffix: string;
}) {
    if (previous === 0) {
        return <span className="text-[#5b6270]">{current === 0 ? "No data yet" : `New ${suffix}`}</span>;
    }
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.05) {
        return <span className="text-[#5b6270]">No change {suffix}</span>;
    }
    const up = pct > 0;
    const good = up === higherIsBetter;
    return (
        <span>
            <span className="font-semibold" style={{ color: good ? GOOD_COLOR : BAD_COLOR }}>
                <span aria-hidden="true">{up ? "▲" : "▼"}</span>
                <span className="sr-only">{up ? "Up" : "Down"}</span> {Math.abs(pct).toFixed(1)}%
            </span>{" "}
            <span className="text-[#5b6270]">{suffix}</span>
        </span>
    );
}