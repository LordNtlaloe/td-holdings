import {
    addDays,
    addMonths,
    addQuarters,
    addWeeks,
    addYears,
    eachDayOfInterval,
    eachMonthOfInterval,
    endOfDay,
    endOfMonth,
    endOfQuarter,
    endOfWeek,
    endOfYear,
    format,
    getQuarter,
    startOfDay,
    startOfMonth,
    startOfQuarter,
    startOfWeek,
    startOfYear,
    subDays,
} from "date-fns";

/** Top-of-page period: drives the cards, the main chart and the breakdown. */
export type OverviewPeriod = "month" | "quarter" | "year";
/** Expense list period. */
export type ListPeriod = "day" | "week" | "month";

/** Weeks run Monday to Sunday. Use `weekStartsOn: 0` for Sunday-first weeks. */
export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/** Inclusive range in milliseconds, in the browser's timezone. */
export interface Range {
    from: number;
    to: number;
}

export interface BucketSet {
    /** Start of each bucket. */
    starts: number[];
    /** starts + one final end boundary, as the API expects. */
    boundaries: number[];
    /** Short axis labels ("Jan", "11"). */
    labels: string[];
    unit: "day" | "month";
}

const toRange = (from: Date, to: Date): Range => ({ from: from.getTime(), to: to.getTime() });

// ── Overview ────────────────────────────────────────────────────────────────

export function overviewRange(period: OverviewPeriod, anchor: Date): Range {
    switch (period) {
        case "month":
            return toRange(startOfMonth(anchor), endOfMonth(anchor));
        case "quarter":
            return toRange(startOfQuarter(anchor), endOfQuarter(anchor));
        default:
            return toRange(startOfYear(anchor), endOfYear(anchor));
    }
}

export function shiftOverview(period: OverviewPeriod, anchor: Date, direction: 1 | -1): Date {
    if (period === "month") return addMonths(anchor, direction);
    if (period === "quarter") return addQuarters(anchor, direction);
    return addYears(anchor, direction);
}

/** "Jan – Dec 2026", "Jul – Sep 2026", "November 2026" */
export function overviewLabel(period: OverviewPeriod, anchor: Date): string {
    const { from, to } = overviewRange(period, anchor);
    if (period === "month") return format(from, "LLLL y");
    return `${format(from, "LLL")} – ${format(to, "LLL y")}`;
}

/** Name of the period before this one, for "Compare to 2025" / "vs 2025". */
export function previousPeriodName(period: OverviewPeriod, anchor: Date): string {
    const prev = shiftOverview(period, anchor, -1);
    if (period === "year") return format(prev, "y");
    if (period === "quarter") return `Q${getQuarter(prev)} ${format(prev, "y")}`;
    return format(prev, "LLL y");
}

/** Month period → one bucket per day. Quarter and year → one bucket per month. */
export function overviewBuckets(period: OverviewPeriod, range: Range): BucketSet {
    const interval = { start: new Date(range.from), end: new Date(range.to) };
    const byDay = period === "month";
    const dates = byDay ? eachDayOfInterval(interval) : eachMonthOfInterval(interval);
    const starts = dates.map((d) => d.getTime());
    return {
        starts,
        boundaries: [...starts, range.to + 1],
        labels: dates.map((d) => format(d, byDay ? "d" : "LLL")),
        unit: byDay ? "day" : "month",
    };
}

/** The last `count` days ending today, one bucket each. */
export function lastDaysBuckets(count: number, now: Date = new Date()): BucketSet {
    const today = startOfDay(now);
    const dates = eachDayOfInterval({ start: subDays(today, count - 1), end: today });
    const starts = dates.map((d) => d.getTime());
    return {
        starts,
        boundaries: [...starts, endOfDay(today).getTime() + 1],
        labels: dates.map((d) => format(d, "d")),
        unit: "day",
    };
}

// ── Expense list ────────────────────────────────────────────────────────────

export function listRange(period: ListPeriod, anchor: Date): Range {
    switch (period) {
        case "week":
            return toRange(startOfWeek(anchor, WEEK_OPTIONS), endOfWeek(anchor, WEEK_OPTIONS));
        case "month":
            return toRange(startOfMonth(anchor), endOfMonth(anchor));
        default:
            return toRange(startOfDay(anchor), endOfDay(anchor));
    }
}

export function shiftList(period: ListPeriod, anchor: Date, direction: 1 | -1): Date {
    if (period === "week") return addWeeks(anchor, direction);
    if (period === "month") return addMonths(anchor, direction);
    return addDays(anchor, direction);
}

/** "Wed 11 Nov", "Mon 9 – Sun 15 Nov", "November 2026" */
export function listLabel(period: ListPeriod, anchor: Date): string {
    const { from, to } = listRange(period, anchor);
    if (period === "month") return format(from, "LLLL y");
    if (period === "week") return `${format(from, "EEE d")} – ${format(to, "EEE d MMM")}`;
    return format(from, "EEE d MMM");
}