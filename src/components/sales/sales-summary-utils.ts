import type { BucketSet, Range } from "#/components/expenses/range-utils";

/**
 * Client-side aggregation for the Sales dashboard.
 *
 * The sales page loads every completed sale once (`/api/sales/completed` for
 * admins, `/api/sales/by-store/:storeId` for everyone else) and then derives
 * every period's totals, series and department breakdown here — the browser's
 * timezone is the source of truth, mirroring how the expenses page computes
 * ranges and buckets on the client before sending timestamps to the server.
 */

/** The slice of an enriched sale this dashboard actually reads. */
export interface SaleLike {
    _id: string;
    createdAt: number;
    storeId: string;
    store?: { name?: string } | null;
    customer?: { name?: string } | null;
    paymentMethod?: string | null;
    totalAmount: number;
    items?: SaleLine[];
}

export interface SaleLine {
    productName?: string | null;
    departmentName?: string | null;
    quantity?: number;
    unitPrice?: number;
}

export interface SalesBucket {
    from: number;
    to: number;
    revenue: number;
    transactions: number;
    units: number;
}

export interface SalesSummary {
    from: number;
    to: number;
    totals: { revenue: number; transactions: number; units: number };
    series: SalesBucket[];
    departments: { department: string; amount: number }[];
}

const UNCATEGORISED = "Uncategorised";

const round2 = (n: number) => Math.round(n * 100) / 100;

function saleUnits(sale: SaleLike): number {
    return (sale.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}

/** Index of the bucket containing `ts`, or -1 if it falls outside all buckets. */
export function bucketIndex(boundaries: number[], ts: number): number {
    const last = boundaries.length - 1;
    if (ts < boundaries[0] || ts >= boundaries[last]) return -1;
    let lo = 0;
    let hi = last - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (boundaries[mid] <= ts) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/**
 * Totals for sales between `range.from` and `range.to`, an optional series
 * split into the buckets passed in, and revenue grouped by department.
 */
export function summarizeSales(sales: SaleLike[], range: Range, buckets?: BucketSet): SalesSummary {
    const series: SalesBucket[] = buckets
        ? buckets.starts.map((from, i) => ({
            from,
            to: buckets.boundaries[i + 1] - 1,
            revenue: 0,
            transactions: 0,
            units: 0,
        }))
        : [];

    const byDepartment = new Map<string, number>();
    let revenue = 0;
    let transactions = 0;
    let units = 0;

    for (const sale of sales) {
        const ts = sale.createdAt;
        if (ts < range.from || ts > range.to) continue;

        const amount = sale.totalAmount ?? 0;
        const saleU = saleUnits(sale);
        revenue += amount;
        transactions += 1;
        units += saleU;

        // Department breakdown from line items. This is a proportional view
        // only, so line-level subtotals are fine even if the store applied
        // an order-level discount that `totalAmount` already absorbs.
        for (const item of sale.items ?? []) {
            const dept = item.departmentName?.trim() || UNCATEGORISED;
            const line = (item.quantity ?? 0) * (item.unitPrice ?? 0);
            byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + line);
        }

        const i = buckets ? bucketIndex(buckets.boundaries, ts) : -1;
        if (i >= 0) {
            series[i].revenue += amount;
            series[i].transactions += 1;
            series[i].units += saleU;
        }
    }

    const departments = [...byDepartment.entries()]
        .map(([department, amount]) => ({ department, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount);

    return {
        from: range.from,
        to: range.to,
        totals: { revenue: round2(revenue), transactions, units },
        series,
        departments,
    };
}
