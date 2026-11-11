"use client";

import { useState } from "react";
import { btnIcon, card, formatMoneyCompact } from "./theme";
import { cn } from "@/lib/utils";

export interface RecentRow {
    key: string;
    label: string;
    sales: number;
    expenses: number;
}

const COLLAPSED_ROWS = 3;

export function RecentPeriodsTable({
    title,
    firstColumn,
    rows,
}: {
    title: string;
    firstColumn: string;
    /** Newest first. */
    rows: RecentRow[];
}) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);

    return (
        <section className={card}>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">{title}</h2>
                {rows.length > COLLAPSED_ROWS && (
                    <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className={cn(btnIcon, "w-auto px-2 text-sm font-medium text-[#1d4ed8]")}
                    >
                        {showAll ? "Show fewer" : "View all"}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-130 border-collapse text-sm">
                    <thead>
                        <tr className="text-left text-xs text-[#5b6270]">
                            <th className="py-2 font-medium">{firstColumn}</th>
                            <th className="py-2 text-right font-medium">Sales</th>
                            <th className="py-2 text-right font-medium">Expenses</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 ? (
                            <tr className="border-t border-[#eef0f3]">
                                <td colSpan={3} className="py-6 text-center text-[#5b6270]">
                                    Nothing to show yet.
                                </td>
                            </tr>
                        ) : (
                            visible.map((row) => (
                                <tr key={row.key} className="border-t border-[#eef0f3]">
                                    <td className="py-3">{row.label}</td>
                                    <td className="text-right">{formatMoneyCompact(row.sales)}</td>
                                    <td className="text-right">{formatMoneyCompact(row.expenses)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}