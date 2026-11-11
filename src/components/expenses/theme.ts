// Visual tokens for the Sales vs Expenses dashboard.
// Blue = sales, orange = expenses everywhere. They differ in lightness as well
// as hue, and charts also use line style (solid vs dashed) so the two stay
// distinguishable without color.

export const SALES_COLOR = "#2563eb";
export const EXPENSE_COLOR = "#d9640b";
export const GOOD_COLOR = "#0f6b3a";
export const BAD_COLOR = "#9a3d00";

/** ISO 4217 code used for every amount on this page. Set to your currency (e.g. "LSL"). */
export const CURRENCY = "LSL";

const full = new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY });
const whole = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
});

/** Exact amount, e.g. $2,900.00 */
export const formatMoney = (n: number) => full.format(n);

/** Short amount for cards and charts, e.g. $4.2K, $733K, $1M */
export const formatMoneyCompact = (n: number) =>
    Math.abs(n) < 1000 ? whole.format(n) : compact.format(n);

// Shared class strings (kept as literals so Tailwind can see them).
export const card = "rounded-[14px] border border-[#e3e6eb] bg-white p-5";
export const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]";
export const btnOutline = `inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#d4d8df] bg-white px-4 text-sm font-medium text-[#14181f] hover:bg-[#f6f7f9] disabled:opacity-50 ${focusRing}`;
export const btnDark = `inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#14181f] px-4 text-sm font-medium text-white hover:bg-[#2a2f3a] disabled:opacity-50 ${focusRing}`;
export const btnIcon = `inline-flex size-11 items-center justify-center rounded-[10px] text-[#3d4452] hover:bg-[#e8eaee] ${focusRing}`;
export const fieldCls = `min-h-11 rounded-[10px] border border-[#d4d8df] bg-white px-3.5 text-sm text-[#14181f] ${focusRing}`;