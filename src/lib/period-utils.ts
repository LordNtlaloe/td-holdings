import {
    addDays,
    addMonths,
    addWeeks,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from "date-fns";

export type Period = "day" | "week" | "month";

/** Weeks run Monday to Sunday. Use `weekStartsOn: 0` for Sunday-first weeks. */
export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
];

/** First and last instant of the period containing `anchor`, in local time. */
export function getPeriodRange(period: Period, anchor: Date): { from: Date; to: Date } {
    switch (period) {
        case "week":
            return { from: startOfWeek(anchor, WEEK_OPTIONS), to: endOfWeek(anchor, WEEK_OPTIONS) };
        case "month":
            return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
        default:
            return { from: startOfDay(anchor), to: endOfDay(anchor) };
    }
}

/** Move to the previous (-1) or next (1) day, week or month. */
export function shiftAnchor(period: Period, anchor: Date, direction: 1 | -1): Date {
    if (period === "week") return addWeeks(anchor, direction);
    if (period === "month") return addMonths(anchor, direction);
    return addDays(anchor, direction);
}

export function formatPeriodLabel(period: Period, anchor: Date): string {
    const { from, to } = getPeriodRange(period, anchor);
    if (period === "month") return format(from, "LLLL y");
    if (period === "week") return `${format(from, "LLL dd")} – ${format(to, "LLL dd, y")}`;
    return format(from, "LLL dd, y");
}