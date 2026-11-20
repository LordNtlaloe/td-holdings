/**
 * One place that decides what "local time" means for receipts, sale details and exports.
 *
 * Why this exists: the receipt is rendered on the server (Vercel runs in UTC) while the
 * Excel export is built in the browser, so the same sale showed two different times.
 * Formatting every timestamp in one explicit time zone makes them agree no matter where the
 * server runs or what the computer's clock/time zone is set to.
 *
 * Pure Intl code, so it is safe to import from both the API and the frontend.
 */

/** Lesotho (UTC+2, same as South Africa). Change this if the shop moves time zone. */
export const STORE_TIME_ZONE = "Africa/Maseru";

/** "2026/11/20, 14:35:12" — the same layout the receipt has always printed (en-ZA). */
export function formatReceiptDateTime(ms: number): string {
    return new Date(ms).toLocaleString("en-ZA", { timeZone: STORE_TIME_ZONE });
}

/** "14:35" */
export function formatStoreTime(ms: number): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(new Date(ms));
}

/** "Fri 20 Nov 2026, 14:35" */
export function formatStoreDateTime(ms: number): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE_TIME_ZONE,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
}