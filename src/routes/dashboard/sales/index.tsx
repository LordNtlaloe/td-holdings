import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  max,
  min,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useApiQuery } from "#/lib/api/hooks";
import AppLayout from "#/layouts/app-layout";
import { cn } from "@/lib/utils";
import {
  ChartLegend,
  Delta,
  KpiCard,
  RecentPeriodsTable,
  SaleDetailsDialog,
  SalesList,
  SalesRevenueChart,
  SegmentedControl,
  TodayPanel,
  WEEK_OPTIONS,
  btnDark,
  btnIcon,
  btnOutline,
  card,
  downloadXlsx,
  fieldCls,
  formatCount,
  formatDateRange,
  formatMoneyCompact,
  lastDaysBuckets,
  listLabel,
  listRange,
  overviewBuckets,
  overviewLabel,
  overviewRange,
  previousPeriodName,
  shiftOverview,
  type ChartPoint,
  type ListPeriod,
  type OverviewPeriod,
  type ProductBreakdownRow,
  type RecentRow,
  type SaleDetailsData,
  type XlsxCell,
} from "#/components/sales";
import { reprintSale, cancelSale, voidSale } from "#/components/sales/sales-actions";

export const Route = createFileRoute("/dashboard/sales/")({
  component: SalesPage,
});

const OVERVIEW_PERIODS: { value: OverviewPeriod; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const RECENT_DAYS = 14;

/** Column used for sales whose per-method amounts were never recorded. */
const UNSPLIT_LABEL = "Split";

interface RawPaymentSplit {
  method?: string | null;
  amount?: number | string | null;
  value?: number | string | null;
  total?: number | string | null;
}

interface RawSale {
  _id: string;
  totalAmount: number;
  createdAt: number;
  status: "completed" | "refunded" | "voided" | "cancelled";
  paymentMethod?: string | null;
  /** JSON string (or already-parsed array) of { method, amount } entries. */
  paymentSplits?: string | RawPaymentSplit[] | null;
  discountTotal?: number | null;
  amountReceived?: number | null;
  changeDue?: number | null;
  store?: { name?: string } | null;
  customer?: { name?: string } | null;
  items?: {
    productName?: string;
    departmentName?: string | null;
    quantity?: number;
    unitPrice?: number;
    size?: string | null;
    color?: string | null;
    variant?: string | null;
  }[];
}

interface SaleListItem {
  id: string;
  storeName: string;
  customerName: string;
  products: string;
  units: number;
  status: "completed" | "refunded" | "voided" | "cancelled";
  amount: number;
  paymentMethod: string;
  createdAt: number;
}

interface Store {
  _id?: string;
  id?: string;
  name: string;
}

function toListItem(raw: RawSale): SaleListItem {
  const items = raw.items ?? [];

  const products = items
    .map((item) => item.productName ?? "Unknown")
    .slice(0, 3)
    .join(", ");

  return {
    id: raw._id,
    storeName: raw.store?.name ?? "Unknown",
    customerName: raw.customer?.name ?? "Walk-in",
    products:
      items.length > 3
        ? `${products} +${items.length - 3} more`
        : products,
    units: items.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0
    ),
    status: raw.status,
    amount: raw.totalAmount,
    paymentMethod: raw.paymentMethod ?? "Unknown",
    createdAt: raw.createdAt,
  };
}

/** "MPESA", " mpesa " -> "Mpesa" so every spelling lands in one column. */
function normalizeMethod(method: string | null | undefined): string {
  const clean = (method ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return "Unknown";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function parseSplits(raw: RawSale["paymentSplits"]): RawPaymentSplit[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns how a sale's revenue is shared across the base payment methods
 * (Cash, Mpesa, Ecocash, Card). Shares always add up to 1.
 *
 * 1. Recorded splits -> proportional to the amount paid on each method.
 * 2. A combined string without splits ("Cash + Card") -> one "Split" column,
 *    because the per-method amounts are unknown.
 * 3. A single method -> 100% on that method.
 */
function paymentShares(sale: RawSale): { method: string; share: number }[] {
  const splits = parseSplits(sale.paymentSplits);
  const byMethod = new Map<string, number>();
  let sum = 0;

  for (const split of splits) {
    const amount = Number(split.amount ?? split.value ?? split.total ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const method = normalizeMethod(split.method);
    byMethod.set(method, (byMethod.get(method) ?? 0) + amount);
    sum += amount;
  }

  if (sum > 0) {
    return [...byMethod.entries()].map(([method, amount]) => ({
      method,
      share: amount / sum,
    }));
  }

  const raw = sale.paymentMethod?.trim() ?? "";
  if (raw.includes("+")) return [{ method: UNSPLIT_LABEL, share: 1 }];

  return [{ method: normalizeMethod(raw), share: 1 }];
}

/** Aggregates the products sold between `from` and `to` into breakdown rows. */
function summarizeProducts(
  sales: RawSale[],
  from: number,
  to: number
): ProductBreakdownRow[] {
  const map = new Map<
    string,
    {
      department: string;
      quantity: number;
      revenue: number;
      payments: Map<string, { revenue: number; units: number }>;
      soldAt: Set<number>;
    }
  >();

  for (const sale of sales) {
    if (sale.createdAt < from || sale.createdAt > to) continue;

    const shares = paymentShares(sale);

    for (const item of sale.items ?? []) {
      const name = item.productName?.trim() || "Unknown";
      const quantity = item.quantity ?? 0;
      const line = quantity * (item.unitPrice ?? 0);

      const current = map.get(name) ?? {
        department: item.departmentName?.trim() || "",
        quantity: 0,
        revenue: 0,
        payments: new Map<string, { revenue: number; units: number }>(),
        soldAt: new Set<number>(),
      };

      if (!current.department) current.department = item.departmentName?.trim() || "";

      current.quantity += quantity;
      current.revenue += line;
      current.soldAt.add(sale.createdAt);

      for (const { method, share } of shares) {
        const payment = current.payments.get(method) ?? { revenue: 0, units: 0 };
        payment.revenue += line * share;
        payment.units += quantity * share;
        current.payments.set(method, payment);
      }

      map.set(name, current);
    }
  }

  return [...map.entries()]
    .map(([productName, values]) => ({
      productName,
      department: values.department,
      quantity: values.quantity,
      revenue: values.revenue,
      soldAt: [...values.soldAt].sort((a, b) => a - b),
      payments: [...values.payments.entries()]
        .map(([method, { revenue, units }]) => ({ method, revenue, units }))
        .sort((a, b) => b.revenue - a.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Day view: every line of every sale is its own row (a product bought five
 * times appears five times), oldest first.
 */
function listTransactions(
  sales: RawSale[],
  from: number,
  to: number
): ProductBreakdownRow[] {
  const rows: ProductBreakdownRow[] = [];

  const inRange = sales
    .filter((sale) => sale.createdAt >= from && sale.createdAt <= to)
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const sale of inRange) {
    const shares = paymentShares(sale);

    (sale.items ?? []).forEach((item, index) => {
      const quantity = item.quantity ?? 0;
      const line = quantity * (item.unitPrice ?? 0);

      rows.push({
        id: `${sale._id}-${index}`,
        saleId: sale._id,
        productName: item.productName?.trim() || "Unknown",
        department: item.departmentName?.trim() || "",
        quantity,
        revenue: line,
        soldAt: [sale.createdAt],
        payments: shares.map(({ method, share }) => ({
          method,
          revenue: line * share,
          units: quantity * share,
        })),
      });
    });
  }

  return rows;
}

function SalesPage() {
  const [period, setPeriod] = useState<OverviewPeriod>("year");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [compare, setCompare] = useState(true);
  const [selectedStore, setSelectedStore] = useState("");

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const [listPeriod, setListPeriod] = useState<ListPeriod>("day");
  const [listAnchor, setListAnchor] = useState<Date>(() => new Date());

  // Current user
  const {
    data: userRes,
    isLoading: userLoading,
  } = useApiQuery<{ user: any }>(
    "users.getUserProfile",
    "/api/users/me"
  );

  const currentUser = userRes?.user;

  const isGlobal =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "admin";

  // Stores
  const {
    data: storesRes,
    isError: storesError,
    error: storesQueryError,
  } = useApiQuery<Store[]>(
    "sales.allStores",
    "/api/stores",
    undefined,
    !!isGlobal
  );

  const stores = storesRes ?? [];

  const storeParam = useMemo<Record<string, string>>(
    (): Record<string, string> => {
      if (isGlobal && selectedStore) {
        return { storeId: selectedStore };
      }
      return {};
    },
    [isGlobal, selectedStore]
  );

  // Date ranges
  const range = useMemo(
    () => overviewRange(period, anchor),
    [period, anchor]
  );

  const buckets = useMemo(
    () => overviewBuckets(period, range),
    [period, range]
  );

  const previousRange = useMemo(
    () => overviewRange(period, shiftOverview(period, anchor, -1)),
    [period, anchor]
  );

  const recent = useMemo(
    () => lastDaysBuckets(RECENT_DAYS),
    []
  );

  const listRangeMs = useMemo(
    () => listRange(listPeriod, listAnchor),
    [listPeriod, listAnchor]
  );

  // Completed sales
  const {
    data: rawSales,
    isLoading: salesLoading,
    isError: salesError,
    error: salesQueryError,
    refetch: refetchSales,
  } = useApiQuery<RawSale[]>(
    "sales.completed",
    "/api/sales/completed"
  );

  const allSales = useMemo<SaleListItem[]>(
    () => (rawSales ?? []).map(toListItem),
    [rawSales]
  );

  const selectedSale = useMemo(
    () =>
      selectedSaleId
        ? ((rawSales ?? []).find((sale) => sale._id === selectedSaleId) as
            | SaleDetailsData
            | undefined) ?? null
        : null,
    [rawSales, selectedSaleId]
  );

  const now = Date.now();
  const byDay = buckets.unit === "day";

  // Sales in selected period
  const selectedStoreName = storeParam.storeId
    ? stores.find(
        (store) =>
          (store._id ?? store.id) === storeParam.storeId
      )?.name
    : undefined;

  const salesInRange = useMemo(
    () =>
      allSales.filter(
        (sale) =>
          sale.createdAt >= range.from &&
          sale.createdAt <= range.to &&
          (!selectedStoreName ||
            sale.storeName === selectedStoreName)
      ),
    [allSales, range, selectedStoreName]
  );

  const previousInRange = useMemo(
    () =>
      allSales.filter(
        (sale) =>
          sale.createdAt >= previousRange.from &&
          sale.createdAt <= previousRange.to &&
          (!selectedStoreName ||
            sale.storeName === selectedStoreName)
      ),
    [allSales, previousRange, selectedStoreName]
  );

  // Chart buckets
  const salesByBucket = useMemo(() => {
    const sales = new Array<number>(buckets.starts.length).fill(0);
    const units = new Array<number>(buckets.starts.length).fill(0);

    for (const sale of salesInRange) {
      for (let i = 0; i < buckets.starts.length; i++) {
        const start = buckets.starts[i];
        const end =
          i + 1 < buckets.starts.length
            ? buckets.starts[i + 1]
            : range.to + 1;

        if (sale.createdAt >= start && sale.createdAt < end) {
          sales[i] += sale.amount;
          units[i] += sale.units;
          break;
        }
      }
    }

    return { sales, units };
  }, [salesInRange, buckets, range.to]);

  // Totals
  const totals = useMemo(() => {
    const revenue = salesInRange.reduce(
      (sum, sale) => sum + sale.amount,
      0
    );

    const units = salesInRange.reduce(
      (sum, sale) => sum + sale.units,
      0
    );

    return {
      revenue,
      units,
      count: salesInRange.length,
    };
  }, [salesInRange]);

  const previousTotals = useMemo(() => {
    const revenue = previousInRange.reduce(
      (sum, sale) => sum + sale.amount,
      0
    );

    const units = previousInRange.reduce(
      (sum, sale) => sum + sale.units,
      0
    );

    return { revenue, units };
  }, [previousInRange]);

  const elapsed = Math.max(
    1,
    buckets.starts.filter((start) => start <= now).length
  );

  const points: ChartPoint[] = buckets.starts.map(
    (start, i) => ({
      label: buckets.labels[i],
      sales:
        start <= now
          ? salesByBucket.sales[i]
          : null,
      units:
        start <= now
          ? salesByBucket.units[i]
          : null,
    })
  );

  // Recent periods
  const recentRows: RecentRow[] = buckets.starts
    .map((start, i) => ({
      key: String(start),
      label: byDay
        ? format(new Date(start), "EEE d MMM")
        : format(new Date(start), "LLLL"),
      sales: salesByBucket.sales[i],
      units: salesByBucket.units[i],
      start,
    }))
    .filter((row) => row.start <= now)
    .reverse();

  // Recent days
  const recentDays = useMemo(() => {
    const salesByDayMap = new Map<
      number,
      { sales: number; units: number }
    >();

    const cutoff = recent.starts[0];

    for (const sale of allSales) {
      if (sale.createdAt < cutoff) continue;

      const dayStart = new Date(sale.createdAt);
      dayStart.setHours(0, 0, 0, 0);

      const key = dayStart.getTime();

      const current = salesByDayMap.get(key) ?? {
        sales: 0,
        units: 0,
      };

      current.sales += sale.amount;
      current.units += sale.units;

      salesByDayMap.set(key, current);
    }

    return recent.starts.map((start, i) => ({
      label: recent.labels[i],
      sales: salesByDayMap.get(start)?.sales ?? 0,
      units: salesByDayMap.get(start)?.units ?? 0,
    }));
  }, [allSales, recent]);

  // Product breakdown grouped by day (week) or week (month) for the accordion.
  const productGroups = useMemo(() => {
    const completed = (rawSales ?? []).filter(
      (sale) =>
        sale.status === "completed" &&
        (!selectedStoreName || sale.store?.name === selectedStoreName)
    );

    const buckets: { from: number; to: number; label: string }[] = [];

    if (listPeriod === "day") {
      buckets.push({
        from: listRangeMs.from,
        to: listRangeMs.to,
        label: listLabel(listPeriod, listAnchor),
      });
    } else if (listPeriod === "week") {
      const start = startOfWeek(listAnchor, WEEK_OPTIONS);
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        buckets.push({
          from: startOfDay(day).getTime(),
          to: endOfDay(day).getTime(),
          label: format(day, "EEE d MMM") + (isToday(day) ? " (today)" : ""),
        });
      }
    } else {
      const monthStart = startOfMonth(listAnchor);
      const monthEnd = endOfMonth(listAnchor);
      let cursor = startOfWeek(monthStart, WEEK_OPTIONS);
      while (cursor.getTime() <= monthEnd.getTime()) {
        const first = max([cursor, monthStart]);
        const last = min([endOfWeek(cursor, WEEK_OPTIONS), monthEnd]);
        const label =
          format(first, "d MMM") === format(last, "d MMM")
            ? format(first, "d MMM")
            : `${format(first, "d MMM")} – ${format(last, "d MMM")}`;
        buckets.push({ from: first.getTime(), to: last.getTime(), label });
        cursor = addWeeks(cursor, 1);
      }
    }

    return buckets
      .map((bucket) => {
        const products =
          listPeriod === "day"
            ? listTransactions(completed, bucket.from, bucket.to)
            : summarizeProducts(completed, bucket.from, bucket.to);
        return {
          key: String(bucket.from),
          label: bucket.label,
          revenue: products.reduce((sum, product) => sum + product.revenue, 0),
          products,
        };
      })
      .filter((group) => group.products.length > 0)
      .reverse();
  }, [rawSales, listPeriod, listAnchor, listRangeMs, selectedStoreName]);

  // Comparison
  const compareName = previousPeriodName(period, anchor);

  const comparing =
    compare &&
    (previousTotals.revenue > 0 ||
      previousTotals.units > 0);

  const averageUnit = byDay ? "daily" : "monthly";

  // Loading and error states
  const loading = salesLoading;

  const peakUnits = (() => {
    let best = 0;
    let index = -1;

    salesByBucket.units.forEach((units, i) => {
      if (units > best) {
        best = units;
        index = i;
      }
    });

    if (index < 0) return null;

    const when = new Date(buckets.starts[index]);

    return `Peak: ${formatCount(best)} units ${
      byDay
        ? `on ${format(when, "d MMM")}`
        : `in ${format(when, "LLL")}`
    }`;
  })();

  const handleExport = () => {
    const rows: XlsxCell[][] = buckets.starts.map((start, i) => [
      format(new Date(start), byDay ? "yyyy-MM-dd" : "LLLL yyyy"),
      salesByBucket.sales[i],
      salesByBucket.units[i],
    ]);

    const details = [`Period: ${formatDateRange(range.from, range.to)}`];
    if (isGlobal) details.push(`Store: ${selectedStoreName ?? "All stores"}`);

    void downloadXlsx({
      fileName: `sales-${format(new Date(range.from), "yyyy-MM-dd")}-to-${format(
        new Date(range.to),
        "yyyy-MM-dd"
      )}.xlsx`,
      sheetName: "Sales overview",
      title: "Sales overview",
      details,
      header: [byDay ? "Day" : "Month", "Revenue", "Units"],
      rows,
      totalRow: ["Total", totals.revenue, totals.units],
      moneyColumns: [1],
      countColumns: [2],
    });
  };

  return (
    <AppLayout>
      <div className="min-h-full bg-[#f6f7f9] px-6 py-8 text-[#14181f]">
        <div className="mx-auto flex max-w-310 flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Sales</h1>

              <div className="mt-1 flex items-center text-sm text-[#5b6270]">
                <button
                  type="button"
                  aria-label={`Previous ${period}`}
                  onClick={() =>
                    setAnchor((current) =>
                      shiftOverview(period, current, -1)
                    )
                  }
                  className={cn(btnIcon, "size-8 rounded-md")}
                >
                  ‹
                </button>

                <span className="px-1">
                  {overviewLabel(period, anchor)}
                </span>

                <button
                  type="button"
                  aria-label={`Next ${period}`}
                  onClick={() =>
                    setAnchor((current) =>
                      shiftOverview(period, current, 1)
                    )
                  }
                  className={cn(btnIcon, "size-8 rounded-md")}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Time period"
                options={OVERVIEW_PERIODS}
                value={period}
                onChange={setPeriod}
              />

              {isGlobal && (
                <select
                  aria-label="Store"
                  value={selectedStore}
                  onChange={(event) =>
                    setSelectedStore(event.target.value)
                  }
                  className={fieldCls}
                >
                  <option value="">All stores</option>

                  {stores.map((store) => (
                    <option
                      key={store._id ?? store.id}
                      value={store._id ?? store.id}
                    >
                      {store.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                aria-pressed={compare}
                onClick={() => setCompare((value) => !value)}
                className={cn(
                  btnOutline,
                  compare && "border-[#2563eb] bg-[#eef3fe]"
                )}
              >
                Compare to {compareName}
              </button>

              <button
                type="button"
                onClick={handleExport}
                className={btnDark}
              >
                Export
              </button>
            </div>
          </header>

          {userLoading && (
            <p className="text-sm text-[#5b6270]">
              Loading your account...
            </p>
          )}

          {storesError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                Unable to load stores
              </p>
              <p className="mt-1">
                {storesQueryError instanceof Error
                  ? storesQueryError.message
                  : "An unexpected error occurred."}
              </p>
            </div>
          )}

          {salesError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                Unable to load sales
              </p>

              <p className="mt-1">
                {salesQueryError instanceof Error
                  ? salesQueryError.message
                  : "An unexpected error occurred while fetching sales."}
              </p>

              <button
                type="button"
                onClick={() => refetchSales()}
                className="mt-3 rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
            <KpiCard
              label="Total revenue"
              value={
                loading
                  ? "—"
                  : formatMoneyCompact(totals.revenue)
              }
            >
              {comparing && !loading && (
                <Delta
                  current={totals.revenue}
                  previous={previousTotals.revenue}
                  higherIsBetter
                  suffix={`vs ${compareName}`}
                />
              )}
            </KpiCard>

            <KpiCard
              label="Total units"
              value={
                loading
                  ? "—"
                  : formatCount(totals.units)
              }
            >
              {comparing && !loading && (
                <Delta
                  current={totals.units}
                  previous={previousTotals.units}
                  higherIsBetter
                  suffix={`vs ${compareName}`}
                />
              )}
            </KpiCard>

            <KpiCard
              label={`Average ${averageUnit} revenue`}
              value={
                loading
                  ? "—"
                  : formatMoneyCompact(
                      totals.revenue / elapsed
                    )
              }
            >
              <span className="text-[#5b6270]">
                {loading ? "—" : `${totals.count} sales`}
              </span>
            </KpiCard>

            <KpiCard
              label={`Average ${averageUnit} units`}
              value={
                loading
                  ? "—"
                  : formatCount(totals.units / elapsed)
              }
            >
              <span className="text-[#5b6270]">
                {loading ? "—" : peakUnits ?? "—"}
              </span>
            </KpiCard>
          </div>

          <SalesList
            groups={productGroups}
            period={listPeriod}
            anchor={listAnchor}
            loading={loading}
            storeLabel={isGlobal ? selectedStoreName ?? "All stores" : undefined}
            onSaleClick={setSelectedSaleId}
            onPeriodChange={setListPeriod}
            onAnchorChange={setListAnchor}
          />

          <TodayPanel
            days={recentDays}
            dateLabel={format(new Date(now), "EEE d MMM")}
            loading={loading}
          />

          <section className={cn(card, "min-w-0")}>
            <div className="mb-3 flex flex-wrap justify-between gap-3">
              <h2 className="text-base font-semibold">
                Revenue vs units over time
              </h2>

              <ChartLegend />
            </div>

            <SalesRevenueChart
              points={points}
              unit={buckets.unit}
              loading={loading}
            />
          </section>

          <RecentPeriodsTable
            title={byDay ? "Recent days" : "Recent months"}
            firstColumn={byDay ? "Day" : "Month"}
            rows={recentRows}
          />

          <SaleDetailsDialog
            sale={selectedSale}
            open={selectedSaleId !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedSaleId(null);
            }}
            canVoid={Boolean(isGlobal)}
            onReprint={reprintSale}
            onCancelSale={async (saleId, reason) => {
              await cancelSale(saleId, reason);
              await refetchSales();
            }}
            onVoidSale={async (saleId, reason) => {
              await voidSale(saleId, reason);
              await refetchSales();
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}