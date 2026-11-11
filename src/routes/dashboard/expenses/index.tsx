import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useApiQuery, useApiMutation } from "#/lib/api/hooks";
import AppLayout from "#/layouts/app-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  ChartLegend,
  Delta,
  ExpenseBreakdown,
  ExpenseFormDialog,
  ExpenseList,
  KpiCard,
  RecentPeriodsTable,
  SalesExpensesChart,
  SegmentedControl,
  TodayPanel,
  btnDark,
  btnIcon,
  btnOutline,
  card,
  downloadCsv,
  fieldCls,
  formatMoney,
  formatMoneyCompact,
  lastDaysBuckets,
  listRange,
  overviewBuckets,
  overviewLabel,
  overviewRange,
  previousPeriodName,
  shiftOverview,
  type ChartPoint,
  type ExpenseRecord,
  type ListPeriod,
  type OverviewPeriod,
  type RecentRow,
  type Summary,
} from "#/components/expenses";

export const Route = createFileRoute("/dashboard/expenses/")({
  component: ExpensesDashboard,
});

const OVERVIEW_PERIODS: { value: OverviewPeriod; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

// Queries to refresh whenever an expense is added or removed.
const INVALIDATE_ON_CHANGE = [
  "expenses.summary.main",
  "expenses.summary.previous",
  "expenses.summary.recent",
  "expenses.list",
  "dashboard",
  "reports.profitAndLoss",
  "reports.expenseByCategory",
  "reports.cashFlowReport",
];

const EMPTY_EXPENSES: ExpenseRecord[] = [];
const RECENT_DAYS = 14;

function ExpensesDashboard() {
  // Top of the page
  const [period, setPeriod] = useState<OverviewPeriod>("year");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [compare, setCompare] = useState(true);
  const [selectedStore, setSelectedStore] = useState("");

  // Expense list
  const [listPeriod, setListPeriod] = useState<ListPeriod>("day");
  const [listAnchor, setListAnchor] = useState<Date>(() => new Date());

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: currentUser } = useApiQuery<any>("users.getUserProfile", "/api/users/profile");
  const isGlobal = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const { data: stores } = useApiQuery<any>("expenses.allStores", "/api/stores", undefined, !!isGlobal);

  const storeParam = useMemo<Record<string, string>>(
    () => (isGlobal && selectedStore ? { storeId: selectedStore } : {} as Record<string, string>),
    [isGlobal, selectedStore]
  );

  // Every range and bucket boundary is computed here, in the browser's
  // timezone, and sent as a timestamp so the server's timezone never matters.
  const range = useMemo(() => overviewRange(period, anchor), [period, anchor]);
  const buckets = useMemo(() => overviewBuckets(period, range), [period, range]);
  const previousRange = useMemo(
    () => overviewRange(period, shiftOverview(period, anchor, -1)),
    [period, anchor]
  );
  const recent = useMemo(() => lastDaysBuckets(RECENT_DAYS), []);
  const listRangeMs = useMemo(() => listRange(listPeriod, listAnchor), [listPeriod, listAnchor]);

  const { data: main } = useApiQuery<Summary>("expenses.summary.main", "/api/expenses/summary", {
    from: String(range.from),
    to: String(range.to),
    buckets: buckets.boundaries.join(","),
    ...storeParam,
  });
  const { data: previous } = useApiQuery<Summary>(
    "expenses.summary.previous",
    "/api/expenses/summary",
    { from: String(previousRange.from), to: String(previousRange.to), ...storeParam },
    compare
  );
  const { data: recentSummary } = useApiQuery<Summary>(
    "expenses.summary.recent",
    "/api/expenses/summary",
    {
      from: String(recent.starts[0]),
      to: String(recent.boundaries[recent.boundaries.length - 1] - 1),
      buckets: recent.boundaries.join(","),
      ...storeParam,
    }
  );
  const { data: list } = useApiQuery<{ expenses: ExpenseRecord[] }>(
    "expenses.list",
    "/api/expenses/list",
    { from: String(listRangeMs.from), to: String(listRangeMs.to), ...storeParam }
  );

  const createExpense = useApiMutation("expenses.create", "POST", "/api/expenses", INVALIDATE_ON_CHANGE);
  const deleteExpense = useApiMutation("expenses.delete", "DELETE", "/api/expenses", INVALIDATE_ON_CHANGE);

  // ── Derived data ──────────────────────────────────────────────────────────
  const now = Date.now();
  const byDay = buckets.unit === "day";
  const series = main?.series ?? [];
  const totals = main?.totals;
  const elapsed = Math.max(1, buckets.starts.filter((s) => s <= now).length);

  const points: ChartPoint[] = buckets.starts.map((start, i) => ({
    label: buckets.labels[i],
    sales: start <= now ? series[i]?.sales ?? 0 : null,
    expenses: start <= now ? series[i]?.expenses ?? 0 : null,
  }));

  const peak = (key: "sales" | "expenses") => {
    let best = 0;
    let index = -1;
    series.forEach((b, i) => {
      if (b[key] > best) {
        best = b[key];
        index = i;
      }
    });
    if (index < 0) return null;
    const when = new Date(buckets.starts[index]);
    return `Peak: ${formatMoneyCompact(best)} ${byDay ? `on ${format(when, "d MMM")}` : `in ${format(when, "LLL")}`}`;
  };

  const recentRows: RecentRow[] = buckets.starts
    .map((start, i) => ({
      key: String(start),
      label: byDay ? format(new Date(start), "EEE d MMM") : format(new Date(start), "LLLL"),
      sales: series[i]?.sales ?? 0,
      expenses: series[i]?.expenses ?? 0,
      start,
    }))
    .filter((row) => row.start <= now)
    .reverse();

  const recentDays = (recentSummary?.series ?? []).map((b, i) => ({
    label: recent.labels[i],
    sales: b.sales,
    expenses: b.expenses,
  }));

  const compareName = previousPeriodName(period, anchor);
  const averageUnit = byDay ? "daily" : "monthly";
  const comparing = compare && previous;

  // Pre-fill the form with today if the list is showing it, else the list's first day.
  const formDefaultDate =
    now >= listRangeMs.from && now <= listRangeMs.to ? new Date(now) : new Date(listRangeMs.from);

  const handleExport = () => {
    const rows: (string | number)[][] = [["Period", "Sales", "Expenses"]];
    buckets.starts.forEach((start, i) => {
      rows.push([
        format(new Date(start), byDay ? "yyyy-MM-dd" : "LLLL yyyy"),
        series[i]?.sales ?? 0,
        series[i]?.expenses ?? 0,
      ]);
    });
    rows.push(["Total", totals?.sales ?? 0, totals?.expenses ?? 0]);
    downloadCsv(
      `sales-vs-expenses-${format(new Date(range.from), "yyyy-MM-dd")}-to-${format(new Date(range.to), "yyyy-MM-dd")}.csv`,
      rows
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteExpense.mutateAsync({ id: deleteTarget.id });
      toast.success("Expense deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = !main;

  return (
    <AppLayout>
      <div className="min-h-full bg-[#f6f7f9] px-6 py-8 text-[#14181f]">
        <div className="mx-auto flex max-w-310 flex-col gap-5">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold">Sales vs Expenses</h1>
              <div className="mt-1 flex items-center text-sm text-[#5b6270]">
                <button
                  type="button"
                  aria-label={`Previous ${period}`}
                  onClick={() => setAnchor((a) => shiftOverview(period, a, -1))}
                  className={cn(btnIcon, "size-8 rounded-md")}
                >
                  ‹
                </button>
                <span className="px-1">{overviewLabel(period, anchor)}</span>
                <button
                  type="button"
                  aria-label={`Next ${period}`}
                  onClick={() => setAnchor((a) => shiftOverview(period, a, 1))}
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
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">All stores</option>
                  {(stores || []).map((s: any) => (
                    <option key={s._id ?? s.id} value={s._id ?? s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                aria-pressed={compare}
                onClick={() => setCompare((v) => !v)}
                className={cn(btnOutline, compare && "border-[#2563eb] bg-[#eef3fe]")}
              >
                Compare to {compareName}
              </button>
              <button type="button" onClick={handleExport} className={btnDark}>
                Export
              </button>
            </div>
          </header>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
            <KpiCard label="Total sales" value={totals ? formatMoneyCompact(totals.sales) : "—"}>
              {comparing && totals && (
                <Delta
                  current={totals.sales}
                  previous={comparing.totals.sales}
                  higherIsBetter
                  suffix={`vs ${compareName}`}
                />
              )}
            </KpiCard>
            <KpiCard label="Total expenses" value={totals ? formatMoneyCompact(totals.expenses) : "—"}>
              {comparing && totals && (
                <Delta
                  current={totals.expenses}
                  previous={comparing.totals.expenses}
                  higherIsBetter={false}
                  suffix={`vs ${compareName}`}
                />
              )}
            </KpiCard>
            <KpiCard
              label={`Average ${averageUnit} sales`}
              value={totals ? formatMoneyCompact(totals.sales / elapsed) : "—"}
            >
              <span className="text-[#5b6270]">{peak("sales")}</span>
            </KpiCard>
            <KpiCard
              label={`Average ${averageUnit} expenses`}
              value={totals ? formatMoneyCompact(totals.expenses / elapsed) : "—"}
            >
              <span className="text-[#5b6270]">{peak("expenses")}</span>
            </KpiCard>
          </div>

          {/* Headline numbers */}
          <ExpenseList
            expenses={list?.expenses ?? EMPTY_EXPENSES}
            period={listPeriod}
            anchor={listAnchor}
            loading={!list}
            showStore={isGlobal && !selectedStore}
            onPeriodChange={setListPeriod}
            onAnchorChange={setListAnchor}
            onAdd={() => setFormOpen(true)}
            onDelete={setDeleteTarget}
          />

          {/* Today */}
          <TodayPanel
            days={recentDays}
            dateLabel={format(new Date(now), "EEE d MMM")}
            loading={!recentSummary}
          />

          {/* Trend + breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className={cn(card, "min-w-0 lg:col-span-2")}>
              <div className="mb-3 flex flex-wrap justify-between gap-3">
                <h2 className="text-base font-semibold">Sales vs expenses over time</h2>
                <ChartLegend />
              </div>
              <SalesExpensesChart points={points} unit={buckets.unit} loading={loading} />
            </section>
            <ExpenseBreakdown categories={main?.categories ?? []} loading={loading} />
          </div>

          {/* Recent periods */}
          <RecentPeriodsTable
            title={byDay ? "Recent days" : "Recent months"}
            firstColumn={byDay ? "Day" : "Month"}
            rows={recentRows}
          />

          {/* Expense records */}

        </div>

        <ExpenseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          isGlobal={isGlobal}
          stores={stores || []}
          defaultDate={formDefaultDate}
          onSubmit={async (payload) => {
            await createExpense.mutateAsync(payload);
          }}
        />

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete expense</AlertDialogTitle>
              <AlertDialogDescription>
                Delete {deleteTarget?.category} — {formatMoney(deleteTarget?.amount ?? 0)}? This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  // Radix closes the dialog on click by default. Hold it open until
                  // the request finishes so "Deleting..." shows and errors stay visible.
                  event.preventDefault();
                  void handleDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}