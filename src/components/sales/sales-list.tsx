"use client";

import { Fragment, useMemo, useState } from "react";
import { endOfWeek, format, isToday, max, min, startOfDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "#/components/expenses/segmented-control";
import {
    WEEK_OPTIONS,
    listLabel,
    shiftList,
    type ListPeriod,
    type Range,
} from "#/components/expenses/range-utils";
import { btnIcon, card, fieldCls, formatMoney } from "#/components/expenses/theme";
import type { SaleLike } from "./sales-summary-utils";

const LIST_PERIODS: { value: ListPeriod; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
];

/** Groups show their biggest items first; the rest sit behind "N more items". */
const PREVIEW_ITEMS = 3;

interface Group {
    key: string;
    label: string;
    items: SaleLike[];
    total: number;
}

/** Week → one group per day. Month → one group per week (clipped to the month). */
function buildGroups(sales: SaleLike[], period: "week" | "month", range: Range): Group[] {
    const groups = new Map<number, Group>();

    for (const sale of sales) {
        const when = new Date(sale.createdAt);
        const start = period === "week" ? startOfDay(when) : startOfWeek(when, WEEK_OPTIONS);
        const startMs = start.getTime();

        let group = groups.get(startMs);
        if (!group) {
            let label: string;
            if (period === "week") {
                label = format(start, "EEE d MMM") + (isToday(start) ? " (today)" : "");
            } else {
                const first = max([start, new Date(range.from)]);
                const last = min([endOfWeek(start, WEEK_OPTIONS), new Date(range.to)]);
                label =
                    format(first, "d MMM") === format(last, "d MMM")
                        ? format(first, "d MMM")
                        : `${format(first, "d MMM")} – ${format(last, "d MMM")}`;
            }
            group = { key: String(startMs), label, items: [], total: 0 };
            groups.set(startMs, group);
        }
        group.items.push(sale);
        group.total += sale.totalAmount;
    }

    return [...groups.entries()]
        .sort((a, b) => b[0] - a[0]) // newest first
        .map(([, group]) => ({
            ...group,
            items: [...group.items].sort((a, b) => b.createdAt - a.createdAt),
        }));
}

function timeCell(sale: SaleLike, period: ListPeriod) {
    if (period === "month") return format(new Date(sale.createdAt), "EEE d MMM");
    return format(new Date(sale.createdAt), "HH:mm");
}

const customerName = (sale: SaleLike) => sale.customer?.name?.trim() || "Walk-in";

interface SalesListProps {
    sales: SaleLike[];
    period: ListPeriod;
    anchor: Date;
    /** Range being shown (ms timestamps); used to clip week labels at month edges. */
    range: Range;
    loading?: boolean;
    /** Show the store name under each customer (admins looking at all stores). */
    showStore?: boolean;
    onPeriodChange: (period: ListPeriod) => void;
    onAnchorChange: (anchor: Date) => void;
}

export function SalesList({
    sales,
    period,
    anchor,
    range,
    loading,
    showStore,
    onPeriodChange,
    onAnchorChange,
}: SalesListProps) {
    const [payment, setPayment] = useState("all");
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showAll, setShowAll] = useState<Record<string, boolean>>({});

    const payments = useMemo(
        () => [...new Set(sales.map((s) => s.paymentMethod).filter((p): p is string => Boolean(p)))].sort((a, b) => a.localeCompare(b)),
        [sales]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sales.filter(
            (s) =>
                (payment === "all" || (s.paymentMethod ?? "Unknown") === payment) &&
                (!q ||
                    `${customerName(s)} ${s.store?.name ?? ""} ${s.paymentMethod ?? ""}`
                        .toLowerCase()
                        .includes(q))
        );
    }, [sales, payment, query]);

    const total = filtered.reduce((sum, s) => sum + s.totalAmount, 0);
    const groups = useMemo(
        () => (period === "day" ? [] : buildGroups(filtered, period, range)),
        [filtered, period, range]
    );

    const renderRow = (sale: SaleLike) => (
        <tr key={sale._id} className="border-t border-[#eef0f3]">
            <td className="whitespace-nowrap py-3 pl-3 text-[#5b6270]">{timeCell(sale, period)}</td>
            <td className="py-3">
                {customerName(sale)}
                {showStore && <div className="text-xs text-[#5b6270]">{sale.store?.name ?? "Unknown"}</div>}
            </td>
            <td className="py-3">
                <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs text-[#3d4452]">
                    {sale.paymentMethod || "Unknown"}
                </span>
            </td>
            <td className="py-3 text-right font-semibold">{formatMoney(sale.totalAmount)}</td>
        </tr>
    );

    return (
        <section className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Sales</h2>
                    <div className="mt-0.5 flex items-center text-[13px] text-[#5b6270]">
                        <button
                            type="button"
                            aria-label={`Previous ${period}`}
                            onClick={() => onAnchorChange(shiftList(period, anchor, -1))}
                            className={cn(btnIcon, "size-8 rounded-md")}
                        >
                            ‹
                        </button>
                        <span className="px-1">
                            {listLabel(period, anchor)} · {filtered.length} {filtered.length === 1 ? "sale" : "sales"}
                        </span>
                        <button
                            type="button"
                            aria-label={`Next ${period}`}
                            onClick={() => onAnchorChange(shiftList(period, anchor, 1))}
                            className={cn(btnIcon, "size-8 rounded-md")}
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <SegmentedControl
                        label="Sales list period"
                        options={LIST_PERIODS}
                        value={period}
                        onChange={onPeriodChange}
                    />
                    <select
                        aria-label="Filter by payment method"
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        className={fieldCls}
                    >
                        <option value="all">All payment methods</option>
                        {payments.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                    <input
                        type="search"
                        aria-label="Search sales"
                        placeholder="Search sales"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={cn(fieldCls, "w-45")}
                    />
                </div>
            </div>

            {loading ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">Loading…</p>
            ) : sales.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-[#5b6270]">No sales recorded for this {period}.</p>
                </div>
            ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">No sales match your filters.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-120 border-collapse text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#5b6270]">
                                <th className="py-2 pl-3 font-medium">{period === "month" ? "Date" : "Time"}</th>
                                <th className="py-2 font-medium">Customer</th>
                                <th className="py-2 font-medium">Payment</th>
                                <th className="py-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {period === "day"
                                ? filtered.map(renderRow)
                                : groups.map((group, index) => {
                                    const isOpen = expanded[group.key] ?? index === 0;
                                    const all = showAll[group.key] ?? false;
                                    const visible = all ? group.items : group.items.slice(0, PREVIEW_ITEMS);
                                    const hidden = group.items.slice(PREVIEW_ITEMS);
                                    const hiddenTotal = hidden.reduce((sum, s) => sum + s.totalAmount, 0);

                                    return (
                                        <Fragment key={group.key}>
                                            <tr className="border-t border-[#e3e6eb] bg-[#f6f7f9]">
                                                <td colSpan={3} className="p-0">
                                                    <button
                                                        type="button"
                                                        aria-expanded={isOpen}
                                                        onClick={() => setExpanded((s) => ({ ...s, [group.key]: !isOpen }))}
                                                        className="flex min-h-11 w-full items-center gap-2 pl-3 text-left font-semibold"
                                                    >
                                                        <span aria-hidden="true" className="w-3 text-xs text-[#5b6270]">
                                                            {isOpen ? "▾" : "▸"}
                                                        </span>
                                                        {group.label}
                                                        <span className="font-normal text-[#5b6270]">
                                                            · {group.items.length} {group.items.length === 1 ? "sale" : "sales"}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="text-right font-semibold">{formatMoney(group.total)}</td>
                                            </tr>
                                            {isOpen && visible.map(renderRow)}
                                            {isOpen && hidden.length > 0 && (
                                                <tr className="border-t border-[#eef0f3] text-[13px] text-[#5b6270]">
                                                    <td />
                                                    <td colSpan={2}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAll((s) => ({ ...s, [group.key]: !all }))}
                                                            className="min-h-11 text-left font-medium text-[#1d4ed8]"
                                                        >
                                                            {all
                                                                ? "Show fewer"
                                                                : `${hidden.length} more ${hidden.length === 1 ? "sale" : "sales"}`}
                                                        </button>
                                                    </td>
                                                    <td className="text-right font-semibold">
                                                        {all ? "" : formatMoney(hiddenTotal)}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-[#d4d8df]">
                                <td colSpan={3} className="py-3 pl-3 font-semibold">
                                    Total sales
                                </td>
                                <td className="py-3 text-right font-bold">{formatMoney(total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}
