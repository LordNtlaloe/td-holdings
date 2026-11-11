"use client";

import { Fragment, useMemo, useState } from "react";
import { endOfWeek, format, isSameDay, isToday, max, min, startOfDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "./segmented-control";
import {
    WEEK_OPTIONS,
    listLabel,
    listRange,
    shiftList,
    type ListPeriod,
    type Range,
} from "./range-utils";
import { btnDark, btnIcon, card, fieldCls, formatMoney } from "./theme";
import type { ExpenseRecord } from "./types";

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
    items: ExpenseRecord[];
    total: number;
}

/** Week → one group per day. Month → one group per week (clipped to the month). */
function buildGroups(expenses: ExpenseRecord[], period: "week" | "month", range: Range): Group[] {
    const groups = new Map<number, Group>();

    for (const expense of expenses) {
        const when = new Date(expense.date);
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
        group.items.push(expense);
        group.total += expense.amount;
    }

    return [...groups.entries()]
        .sort((a, b) => b[0] - a[0]) // newest first
        .map(([, group]) => ({ ...group, items: [...group.items].sort((a, b) => b.amount - a.amount) }));
}

/** Time the record was made; backdated records also show the day they were entered. */
function timeCell(expense: ExpenseRecord, period: ListPeriod) {
    if (period === "month") return format(new Date(expense.date), "EEE d MMM");
    const created = new Date(expense.createdAt);
    return isSameDay(created, new Date(expense.date))
        ? format(created, "HH:mm")
        : format(created, "d MMM, HH:mm");
}

interface ExpenseListProps {
    expenses: ExpenseRecord[];
    period: ListPeriod;
    anchor: Date;
    loading?: boolean;
    /** Show the store name under each description (admins looking at all stores). */
    showStore?: boolean;
    onPeriodChange: (period: ListPeriod) => void;
    onAnchorChange: (anchor: Date) => void;
    onAdd: () => void;
    onDelete: (expense: ExpenseRecord) => void;
}

export function ExpenseList({
    expenses,
    period,
    anchor,
    loading,
    showStore,
    onPeriodChange,
    onAnchorChange,
    onAdd,
    onDelete,
}: ExpenseListProps) {
    const [category, setCategory] = useState("all");
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showAll, setShowAll] = useState<Record<string, boolean>>({});

    const range = useMemo(() => listRange(period, anchor), [period, anchor]);

    const categories = useMemo(
        () => [...new Set(expenses.map((e) => e.category))].sort((a, b) => a.localeCompare(b)),
        [expenses]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return expenses.filter(
            (e) =>
                (category === "all" || e.category === category) &&
                (!q || `${e.description ?? ""} ${e.category} ${e.storeName}`.toLowerCase().includes(q))
        );
    }, [expenses, category, query]);

    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    const groups = useMemo(
        () => (period === "day" ? [] : buildGroups(filtered, period, range)),
        [filtered, period, range]
    );

    const renderRow = (expense: ExpenseRecord) => (
        <tr key={expense.id} className="border-t border-[#eef0f3]">
            <td className="whitespace-nowrap py-3 pl-3 text-[#5b6270]">{timeCell(expense, period)}</td>
            <td className="py-3">
                {expense.description || <span className="text-[#5b6270]">No description</span>}
                {showStore && <div className="text-xs text-[#5b6270]">{expense.storeName}</div>}
            </td>
            <td className="py-3">
                <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs text-[#3d4452]">
                    {expense.category}
                </span>
            </td>
            <td className="py-3 text-right font-semibold">{formatMoney(expense.amount)}</td>
            <td className="pr-3 text-right">
                <button
                    type="button"
                    onClick={() => onDelete(expense)}
                    aria-label={`Remove ${expense.category} expense of ${formatMoney(expense.amount)}`}
                    className={cn(btnIcon, "w-auto px-2 text-[13px] font-medium text-[#9a3d00]")}
                >
                    Remove
                </button>
            </td>
        </tr>
    );

    return (
        <section className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Expenses</h2>
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
                            {listLabel(period, anchor)} · {filtered.length} {filtered.length === 1 ? "item" : "items"}
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
                        label="Expense list period"
                        options={LIST_PERIODS}
                        value={period}
                        onChange={onPeriodChange}
                    />
                    <select
                        aria-label="Filter by category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={fieldCls}
                    >
                        <option value="all">All categories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    <input
                        type="search"
                        aria-label="Search expenses"
                        placeholder="Search expenses"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={cn(fieldCls, "w-45")}
                    />
                    <button type="button" onClick={onAdd} className={btnDark}>
                        Add expense
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">Loading…</p>
            ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-[#5b6270]">No expenses recorded for this {period}.</p>
                    <button type="button" onClick={onAdd} className={btnDark}>
                        Add an expense
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">No expenses match your filters.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-140 border-collapse text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#5b6270]">
                                <th className="py-2 pl-3 font-medium">{period === "month" ? "Date" : "Time"}</th>
                                <th className="py-2 font-medium">Description</th>
                                <th className="py-2 font-medium">Category</th>
                                <th className="py-2 text-right font-medium">Amount</th>
                                <th className="py-2 pr-3">
                                    <span className="sr-only">Actions</span>
                                </th>
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
                                    const hiddenTotal = hidden.reduce((sum, e) => sum + e.amount, 0);

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
                                                            · {group.items.length} {group.items.length === 1 ? "item" : "items"}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="text-right font-semibold">{formatMoney(group.total)}</td>
                                                <td />
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
                                                                : `${hidden.length} more ${hidden.length === 1 ? "item" : "items"}`}
                                                        </button>
                                                    </td>
                                                    <td className="text-right font-semibold">
                                                        {all ? "" : formatMoney(hiddenTotal)}
                                                    </td>
                                                    <td />
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-[#d4d8df]">
                                <td colSpan={3} className="py-3 pl-3 font-semibold">
                                    Total expenses
                                </td>
                                <td className="py-3 text-right font-bold">{formatMoney(total)}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}