"use client";

import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "./segmented-control";
import { listLabel, listRange, shiftList, type ListPeriod } from "./range-util";
import { btnDark, btnIcon, card, fieldCls, formatCount, formatMoney } from "./theme";
import { downloadXlsx, formatDateRange, type XlsxRow } from "./export-csv";

export interface ProductPaymentSplit {
    method: string;
    revenue: number;
    units: number;
}

export interface ProductBreakdownRow {
    /** Unique id for rows that are single transactions (Day view). */
    id?: string;
    /** The sale this transaction row belongs to (Day view). */
    saleId?: string;
    productName: string;
    department: string;
    quantity: number;
    revenue: number;
    payments: ProductPaymentSplit[];
    /** Timestamps (ms) of the sales this row is made of, oldest first. */
    soldAt?: number[];
}

export interface ProductBreakdownGroup {
    key: string;
    label: string;
    revenue: number;
    products: ProductBreakdownRow[];
}

const LIST_PERIODS: { value: ListPeriod; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
];

/** Label for products that have no department. */
const NO_DEPARTMENT = "No department";

const departmentOf = (row: ProductBreakdownRow) => row.department?.trim() || NO_DEPARTMENT;

/** Groups show their biggest items first; the rest sit behind "N more items". */
const PREVIEW_ITEMS = 10;

interface SalesListProps {
    groups: ProductBreakdownGroup[];
    period: ListPeriod;
    anchor: Date;
    loading?: boolean;
    /** Shown in the export header, e.g. "All stores" or a store name. */
    storeLabel?: string;
    /** Called when a transaction row is clicked in Day view. */
    onSaleClick?: (saleId: string) => void;
    onPeriodChange: (period: ListPeriod) => void;
    onAnchorChange: (anchor: Date) => void;
}

export function SalesList({
    groups,
    period,
    anchor,
    loading,
    storeLabel,
    onSaleClick,
    onPeriodChange,
    onAnchorChange,
}: SalesListProps) {
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showAll, setShowAll] = useState<Record<string, boolean>>({});
    const [department, setDepartment] = useState("");

    const allProducts = useMemo(
        () => groups.flatMap((group) => group.products),
        [groups]
    );

    // Distinct payment methods across every group, most-used first. Columns
    // stay stable while the user searches.
    const methods = useMemo(() => {
        const totals = new Map<string, number>();

        for (const row of allProducts) {
            for (const payment of row.payments) {
                totals.set(
                    payment.method,
                    (totals.get(payment.method) ?? 0) + payment.revenue
                );
            }
        }

        return [...totals.entries()]
            .map(([method, total]) => ({ method, total }))
            .sort((a, b) => b.total - a.total);
    }, [allProducts]);

    // Departments present in the current period, for the filter dropdown.
    const departmentOptions = useMemo(
        () => [...new Set(allProducts.map(departmentOf))].sort((a, b) => a.localeCompare(b)),
        [allProducts]
    );

    // A department picked in another period may not exist here: fall back to all.
    const activeDepartment = departmentOptions.includes(department) ? department : "";

    // Groups limited to the chosen department (empty groups are dropped).
    const visibleGroups = useMemo(() => {
        if (!activeDepartment) return groups;

        return groups
            .map((group) => {
                const products = group.products.filter(
                    (row) => departmentOf(row) === activeDepartment
                );
                return {
                    ...group,
                    products,
                    revenue: products.reduce((sum, row) => sum + row.revenue, 0),
                };
            })
            .filter((group) => group.products.length > 0);
    }, [groups, activeDepartment]);

    const filtered = useMemo(() => {
        const scoped = visibleGroups.flatMap((group) => group.products);
        const q = query.trim().toLowerCase();
        if (!q) return scoped;
        return scoped.filter((row) =>
            `${row.productName} ${row.department}`.toLowerCase().includes(q)
        );
    }, [visibleGroups, query]);

    const totals = useMemo(() => {
        const methodTotals = new Map<string, number>();
        let quantity = 0;
        let revenue = 0;

        for (const row of filtered) {
            quantity += row.quantity;
            revenue += row.revenue;
            for (const payment of row.payments) {
                methodTotals.set(
                    payment.method,
                    (methodTotals.get(payment.method) ?? 0) + payment.revenue
                );
            }
        }

        return { quantity, revenue, methodTotals };
    }, [filtered]);

    const searching = query.trim().length > 0;
    const columnCount = 4 + methods.length;

    const renderRow = (row: ProductBreakdownRow) => {
        const saleId = period === "day" ? row.saleId : undefined;
        const clickable = Boolean(saleId && onSaleClick);

        return (
        <tr
            key={row.id ?? row.productName}
            onClick={clickable ? () => onSaleClick?.(saleId as string) : undefined}
            onKeyDown={
                clickable
                    ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSaleClick?.(saleId as string);
                          }
                      }
                    : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            title={clickable ? "View sale details" : undefined}
            className={cn(clickable && "cursor-pointer hover:bg-[#f6f7f9] focus-visible:bg-[#f6f7f9]")}
        >
            <td className="border-b border-[#eef0f3] py-3 font-medium">
                {row.productName}
            </td>
            <td className="border-b border-[#eef0f3] py-3">
                <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs text-[#3d4452]">
                    {row.department || "—"}
                </span>
            </td>
            {period === "day" && (
                <td className="whitespace-nowrap border-b border-[#eef0f3] py-3 tabular-nums text-[#5b6270]">
                    {row.soldAt?.[0] ? format(new Date(row.soldAt[0]), "HH:mm") : "—"}
                </td>
            )}
            <td className="border-b border-[#eef0f3] py-3 text-right">
                {formatCount(row.quantity)}
            </td>
            <td className="border-b border-[#eef0f3] py-3 text-right font-semibold">
                {formatMoney(row.revenue)}
            </td>
            {methods.map((m) => {
                const payment = row.payments.find((p) => p.method === m.method);
                return (
                    <td key={m.method} className="border-b border-[#eef0f3] py-3 text-right">
                        {payment ? formatMoney(payment.revenue) : "—"}
                    </td>
                );
            })}
        </tr>
        );
    };

    const handleExport = () => {
        const { from, to } = listRange(period, anchor);

        const cleanLabel = (label: string) => label.replace(/\s*\(today\)\s*$/, "");

        // Day view shows when the product sold: "09:14", "09:14, 11:02" or,
        // for many sales, "09:14 – 17:40 · 6 sales".
        const timesLabel = (times: number[] | undefined, fallback: string) => {
            if (!times || times.length === 0) return fallback;
            const stamps = times.map((time) => format(new Date(time), "HH:mm"));
            if (stamps.length <= 3) return stamps.join(", ");
            return `${stamps[0]} – ${stamps[stamps.length - 1]} · ${stamps.length} sales`;
        };
        const q = query.trim().toLowerCase();
        const matches = (row: ProductBreakdownRow) =>
            !q || `${row.productName} ${row.department}`.toLowerCase().includes(q);

        const methodValues = (payments: Map<string, number>) =>
            methods.map((m) => payments.get(m.method) ?? 0);

        interface ExportEntry {
            dates: string;
            row: ProductBreakdownRow;
            payments: Map<string, number>;
        }

        // Rows are kept per period (week for Month view, day for Week view) so
        // the Dates column shows when each product sold.
        const departments = new Map<
            string,
            {
                name: string;
                items: ExportEntry[];
                quantity: number;
                revenue: number;
                payments: Map<string, number>;
            }
        >();

        // Oldest period first so the Dates column reads top to bottom.
        for (const periodGroup of [...visibleGroups].reverse()) {
            for (const row of periodGroup.products) {
                if (!matches(row)) continue;

                const name = row.department?.trim() || NO_DEPARTMENT;
                const department = departments.get(name) ?? {
                    name,
                    items: [],
                    quantity: 0,
                    revenue: 0,
                    payments: new Map<string, number>(),
                };

                const payments = new Map<string, number>();
                for (const payment of row.payments) {
                    payments.set(payment.method, payment.revenue);
                    department.payments.set(
                        payment.method,
                        (department.payments.get(payment.method) ?? 0) + payment.revenue
                    );
                }

                const entry: ExportEntry = {
                    dates:
                        period === "day"
                            ? timesLabel(row.soldAt, cleanLabel(periodGroup.label))
                            : cleanLabel(periodGroup.label),
                    row,
                    payments,
                };

                department.items.push(entry);
                department.quantity += row.quantity;
                department.revenue += row.revenue;

                departments.set(name, department);
            }
        }

        const departmentList = [...departments.values()].sort(
            (a, b) => b.revenue - a.revenue
        );

        const rows: XlsxRow[] = [];

        // Sales listed separately per department, each with its own total.
        // Blank rows keep every department visually separate.
        rows.push([]);

        // Day view: each department lists its transactions in time order.
        for (const department of departmentList) {
            const productCount = new Set(
                department.items.map((item) => item.row.productName)
            ).size;

            rows.push({
                kind: "section",
                cells: [
                    `${department.name} · ${productCount} ${
                        productCount === 1 ? "product" : "products"
                    }`,
                ],
            });

            for (const item of department.items) {
                rows.push([
                    item.row.productName,
                    department.name,
                    item.dates,
                    item.row.quantity,
                    item.row.revenue,
                    ...methodValues(item.payments),
                ]);
            }

            rows.push({
                kind: "subtotal",
                cells: [
                    `Total – ${department.name}`,
                    "",
                    "",
                    department.quantity,
                    department.revenue,
                    ...methodValues(department.payments),
                ],
            });

            rows.push([]);
        }

        // Compact summary of department totals, right before the grand total.
        rows.push({ kind: "section", cells: ["Totals by department"] });
        for (const department of departmentList) {
            rows.push([
                department.name,
                "",
                "",
                department.quantity,
                department.revenue,
                ...methodValues(department.payments),
            ]);
        }
        rows.push([]);

        const details = [`Period: ${formatDateRange(from, to)}`];
        if (storeLabel) details.push(`Store: ${storeLabel}`);
        if (activeDepartment) details.push(`Department: ${activeDepartment}`);
        if (searching) details.push(`Search: "${query.trim()}"`);

        const sameDay =
            format(new Date(from), "yyyy-MM-dd") === format(new Date(to), "yyyy-MM-dd");
        const fileRange = sameDay
            ? format(new Date(from), "yyyy-MM-dd")
            : `${format(new Date(from), "yyyy-MM-dd")}-to-${format(new Date(to), "yyyy-MM-dd")}`;

        void downloadXlsx({
            fileName: `sales-products-${fileRange}.xlsx`,
            sheetName: "Sales",
            title: period === "day" ? "Sales by transaction" : "Sales by product",
            details,
            header: [
                "Product",
                "Department",
                period === "day" ? "Time" : "Dates",
                "Qty",
                "Revenue",
                ...methods.map((m) => m.method),
            ],
            rows,
            totalRow: [
                "Grand total",
                "",
                "",
                totals.quantity,
                totals.revenue,
                ...methods.map((m) => totals.methodTotals.get(m.method) ?? 0),
            ],
            countColumns: [3],
            moneyColumns: [4, ...methods.map((_, i) => 5 + i)],
        });
    };

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
                            {listLabel(period, anchor)} · {filtered.length}{" "}
                            {period === "day"
                                ? filtered.length === 1
                                    ? "item"
                                    : "items"
                                : filtered.length === 1
                                  ? "product"
                                  : "products"}
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
                        aria-label="Department"
                        value={activeDepartment}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={cn(fieldCls, "max-w-48")}
                    >
                        <option value="">All departments</option>
                        {departmentOptions.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="search"
                        aria-label="Search products"
                        placeholder="Search products"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={cn(fieldCls, "w-45")}
                    />
                    <button type="button" onClick={handleExport} className={btnDark}>
                        Export
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">Loading…</p>
            ) : allProducts.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#5b6270]">
                    No products sold in this {period}.
                </p>
            ) : (
                <div className="max-h-120 overflow-auto">
                    <table className="w-full min-w-150 border-separate border-spacing-0 text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="text-left text-xs text-[#5b6270]">
                                <th className="border-b border-[#eef0f3] bg-white py-2 font-medium">
                                    Product
                                </th>
                                <th className="border-b border-[#eef0f3] bg-white py-2 font-medium">
                                    Department
                                </th>
                                {period === "day" && (
                                    <th className="border-b border-[#eef0f3] bg-white py-2 font-medium">
                                        Time
                                    </th>
                                )}
                                <th className="border-b border-[#eef0f3] bg-white py-2 text-right font-medium">
                                    Qty
                                </th>
                                <th className="border-b border-[#eef0f3] bg-white py-2 text-right font-medium">
                                    Revenue
                                </th>
                                {methods.map((m) => (
                                    <th
                                        key={m.method}
                                        className="border-b border-[#eef0f3] bg-white py-2 text-right font-medium"
                                    >
                                        {m.method}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {searching || period === "day" ? (
                                filtered.map(renderRow)
                            ) : (
                                visibleGroups.map((group, index) => {
                                    const isOpen = expanded[group.key] ?? index === 0;
                                    const all = showAll[group.key] ?? false;
                                    const visible = all
                                        ? group.products
                                        : group.products.slice(0, PREVIEW_ITEMS);
                                    const hidden = group.products.slice(PREVIEW_ITEMS);

                                    return (
                                        <Fragment key={group.key}>
                                            <tr className="border-t border-[#e3e6eb] bg-[#f6f7f9]">
                                                <td colSpan={columnCount} className="p-0">
                                                    <div className="flex min-h-11 w-full items-center justify-between gap-2 pl-3 pr-3">
                                                        <button
                                                            type="button"
                                                            aria-expanded={isOpen}
                                                            onClick={() =>
                                                                setExpanded((s) => ({
                                                                    ...s,
                                                                    [group.key]: !isOpen,
                                                                }))
                                                            }
                                                            className="flex min-h-11 flex-1 items-center gap-2 text-left font-semibold"
                                                        >
                                                            <span aria-hidden="true" className="w-3 text-xs text-[#5b6270]">
                                                                {isOpen ? "▾" : "▸"}
                                                            </span>
                                                            {group.label}
                                                            <span className="font-normal text-[#5b6270]">
                                                                · {group.products.length}{" "}
                                                                {group.products.length === 1 ? "product" : "products"}
                                                            </span>
                                                        </button>
                                                        <span className="font-semibold">
                                                            {formatMoney(group.revenue)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isOpen && visible.map(renderRow)}
                                            {isOpen && hidden.length > 0 && (
                                                <tr className="border-t border-[#eef0f3] text-[13px] text-[#5b6270]">
                                                    <td colSpan={columnCount} className="p-0">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowAll((s) => ({
                                                                    ...s,
                                                                    [group.key]: !all,
                                                                }))
                                                            }
                                                            className="min-h-11 pl-11 text-left font-medium text-[#1d4ed8]"
                                                        >
                                                            {all
                                                                ? "Show fewer"
                                                                : `${hidden.length} more ${hidden.length === 1 ? "product" : "products"}`}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-10">
                            <tr>
                                <td className="border-t-2 border-[#d4d8df] bg-white py-3 font-semibold">
                                    Total
                                </td>
                                <td className="border-t-2 border-[#d4d8df] bg-white py-3" />
                                {period === "day" && (
                                    <td className="border-t-2 border-[#d4d8df] bg-white py-3" />
                                )}
                                <td className="border-t-2 border-[#d4d8df] bg-white py-3 text-right font-semibold">
                                    {formatCount(totals.quantity)}
                                </td>
                                <td className="border-t-2 border-[#d4d8df] bg-white py-3 text-right font-bold">
                                    {formatMoney(totals.revenue)}
                                </td>
                                {methods.map((m) => {
                                    const total = totals.methodTotals.get(m.method);
                                    return (
                                        <td
                                            key={m.method}
                                            className="border-t-2 border-[#d4d8df] bg-white py-3 text-right font-semibold"
                                        >
                                            {total ? formatMoney(total) : "—"}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}