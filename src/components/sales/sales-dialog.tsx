"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { btnDark, btnOutline, formatMoney } from "./theme";

export interface SaleDetailsItem {
    productName?: string;
    departmentName?: string | null;
    quantity?: number;
    unitPrice?: number;
    size?: string | null;
    color?: string | null;
    variant?: string | null;
}

export interface SaleDetailsData {
    _id: string;
    createdAt: number;
    status: "completed" | "refunded" | "voided" | "cancelled";
    totalAmount: number;
    discountTotal?: number | null;
    paymentMethod?: string | null;
    paymentSplits?: string | { method?: string | null; amount?: number | string | null }[] | null;
    amountReceived?: number | null;
    changeDue?: number | null;
    store?: { name?: string } | null;
    customer?: { name?: string } | null;
    items?: SaleDetailsItem[];
}

interface SaleDetailsDialogProps {
    sale: SaleDetailsData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Voiding is admin-only on the API; hide the button for everyone else. */
    canVoid: boolean;
    onReprint: (saleId: string) => Promise<void>;
    onCancelSale: (saleId: string, reason: string) => Promise<void>;
    onVoidSale: (saleId: string, reason: string) => Promise<void>;
}

type Mode = "view" | "cancel" | "void";
type Busy = "print" | "cancel" | "void" | null;

const STATUS_STYLES: Record<SaleDetailsData["status"], string> = {
    completed: "bg-[#e7f6ec] text-[#166534]",
    refunded: "bg-[#fef3c7] text-[#92400e]",
    voided: "bg-[#fee2e2] text-[#991b1b]",
    cancelled: "bg-[#f1f3f6] text-[#3d4452]",
};

const btnDanger =
    "inline-flex h-9 items-center justify-center rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
const btnDangerSolid =
    "inline-flex h-9 items-center justify-center rounded-md bg-[#b91c1c] px-3 text-sm font-medium text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50";

function parsePaymentSplits(raw: SaleDetailsData["paymentSplits"]) {
    let list: { method?: string | null; amount?: number | string | null }[] = [];

    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === "string" && raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed;
        } catch {
            list = [];
        }
    }

    return list
        .map((entry) => ({
            method: (entry.method ?? "").toString().trim(),
            amount: Number(entry.amount ?? 0),
        }))
        .filter((entry) => entry.method && Number.isFinite(entry.amount) && entry.amount > 0);
}

export function SaleDetailsDialog({
    sale,
    open,
    onOpenChange,
    canVoid,
    onReprint,
    onCancelSale,
    onVoidSale,
}: SaleDetailsDialogProps) {
    const [mode, setMode] = useState<Mode>("view");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState<Busy>(null);
    const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

    // Start fresh every time the dialog opens or switches to another sale.
    useEffect(() => {
        if (!open) return;
        setMode("view");
        setReason("");
        setBusy(null);
        setNotice(null);
    }, [open, sale?._id]);

    const items = sale?.items ?? [];

    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0),
        [items]
    );

    const splits = useMemo(() => parsePaymentSplits(sale?.paymentSplits), [sale?.paymentSplits]);

    if (!sale) return null;

    const isCompleted = sale.status === "completed";
    const discount = sale.discountTotal && sale.discountTotal > 0 ? sale.discountTotal : 0;
    const shortId = sale._id.slice(-8);
    const unitCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

    const run = async (
        kind: Exclude<Busy, null>,
        task: () => Promise<void>,
        successText: string | null
    ) => {
        setBusy(kind);
        setNotice(null);

        try {
            await task();
            if (successText === null) {
                onOpenChange(false);
            } else {
                setNotice({ tone: "ok", text: successText });
            }
        } catch (error) {
            setNotice({
                tone: "error",
                text: error instanceof Error ? error.message : "Something went wrong.",
            });
        } finally {
            setBusy(null);
        }
    };

    const confirmReversal = () => {
        const text = reason.trim();
        if (mode === "cancel") {
            void run("cancel", () => onCancelSale(sale._id, text), null);
        } else if (mode === "void") {
            void run("void", () => onVoidSale(sale._id, text), null);
        }
    };

    const reversing = mode !== "view";
    const verb = mode === "void" ? "void" : "cancel";

    return (
        <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-170">
                <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="text-lg font-semibold">Sale #{shortId}</DialogTitle>
                        <span
                            className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                STATUS_STYLES[sale.status]
                            )}
                        >
                            {sale.status}
                        </span>
                    </div>
                    <DialogDescription className="text-[13px] text-[#5b6270]">
                        {format(new Date(sale.createdAt), "EEE d MMM yyyy, HH:mm")}
                        {sale.store?.name ? ` · ${sale.store.name}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 px-6 py-5 text-sm">
                    {/* Summary */}
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                        <div>
                            <dt className="text-xs text-[#5b6270]">Customer</dt>
                            <dd className="font-medium">{sale.customer?.name || "Walk-in"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-[#5b6270]">Payment</dt>
                            <dd className="font-medium">{sale.paymentMethod || "Unknown"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-[#5b6270]">Items</dt>
                            <dd className="font-medium">
                                {unitCount} {unitCount === 1 ? "unit" : "units"}
                            </dd>
                        </div>
                        {splits.length > 1 && (
                            <div className="col-span-2 sm:col-span-3">
                                <dt className="text-xs text-[#5b6270]">Payment split</dt>
                                <dd className="font-medium">
                                    {splits
                                        .map((split) => `${split.method} ${formatMoney(split.amount)}`)
                                        .join(" · ")}
                                </dd>
                            </div>
                        )}
                        {sale.paymentMethod === "Cash" && sale.amountReceived != null && (
                            <>
                                <div>
                                    <dt className="text-xs text-[#5b6270]">Amount received</dt>
                                    <dd className="font-medium">{formatMoney(sale.amountReceived)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-[#5b6270]">Change due</dt>
                                    <dd className="font-medium">{formatMoney(sale.changeDue ?? 0)}</dd>
                                </div>
                            </>
                        )}
                    </dl>

                    {/* Items */}
                    <div className="overflow-hidden rounded-lg border border-[#e3e6eb]">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#f6f7f9] text-left text-xs text-[#5b6270]">
                                    <th className="px-3 py-2 font-medium">Product</th>
                                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                                    <th className="px-3 py-2 text-right font-medium">Price</th>
                                    <th className="px-3 py-2 text-right font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const quantity = item.quantity ?? 0;
                                    const price = item.unitPrice ?? 0;
                                    const options = [item.size, item.color, item.variant]
                                        .filter(Boolean)
                                        .join(" / ");

                                    return (
                                        <tr key={index} className="border-t border-[#eef0f3]">
                                            <td className="px-3 py-2">
                                                <div className="font-medium">
                                                    {item.productName || "Unknown"}
                                                    {options && (
                                                        <span className="font-normal text-[#5b6270]">
                                                            {" "}
                                                            ({options})
                                                        </span>
                                                    )}
                                                </div>
                                                {item.departmentName && (
                                                    <div className="text-xs text-[#5b6270]">
                                                        {item.departmentName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right">{quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatMoney(price)}</td>
                                            <td className="px-3 py-2 text-right font-semibold">
                                                {formatMoney(quantity * price)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="ml-auto flex w-full max-w-65 flex-col gap-1">
                        <div className="flex justify-between text-[#5b6270]">
                            <span>Subtotal</span>
                            <span>{formatMoney(subtotal)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-[#5b6270]">
                                <span>Discount</span>
                                <span>-{formatMoney(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-[#e3e6eb] pt-1 text-base font-bold">
                            <span>Total</span>
                            <span>{formatMoney(sale.totalAmount)}</span>
                        </div>
                    </div>

                    {notice && (
                        <p
                            role="status"
                            className={cn(
                                "rounded-md border px-3 py-2 text-[13px]",
                                notice.tone === "ok"
                                    ? "border-green-200 bg-green-50 text-green-800"
                                    : "border-red-200 bg-red-50 text-red-700"
                            )}
                        >
                            {notice.text}
                        </p>
                    )}

                    {/* Cancel / void confirmation */}
                    {reversing && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <p className="font-semibold text-red-800">
                                {mode === "void" ? "Void" : "Cancel"} this sale?
                            </p>
                            <p className="mt-1 text-[13px] text-red-700">
                                The stock is returned to inventory and the sale is marked as {verb === "void" ? "voided" : "cancelled"}.
                                This can&apos;t be undone.
                            </p>
                            <label className="mt-3 block text-xs font-medium text-red-800" htmlFor="sale-reason">
                                Reason (optional)
                            </label>
                            <textarea
                                id="sale-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                rows={2}
                                maxLength={200}
                                placeholder="e.g. Wrong item rung up"
                                className="mt-1 w-full resize-none rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f3] bg-[#f6f7f9] px-6 py-4">
                    {reversing ? (
                        <>
                            <button
                                type="button"
                                className={btnOutline}
                                disabled={busy !== null}
                                onClick={() => {
                                    setMode("view");
                                    setNotice(null);
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className={btnDangerSolid}
                                disabled={busy !== null}
                                onClick={confirmReversal}
                            >
                                {busy === "cancel" || busy === "void"
                                    ? "Working…"
                                    : mode === "void"
                                      ? "Yes, void sale"
                                      : "Yes, cancel sale"}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2">
                                {isCompleted && (
                                    <button
                                        type="button"
                                        className={btnDanger}
                                        disabled={busy !== null}
                                        onClick={() => {
                                            setMode("cancel");
                                            setNotice(null);
                                        }}
                                    >
                                        Cancel sale
                                    </button>
                                )}
                                {isCompleted && canVoid && (
                                    <button
                                        type="button"
                                        className={btnDanger}
                                        disabled={busy !== null}
                                        onClick={() => {
                                            setMode("void");
                                            setNotice(null);
                                        }}
                                    >
                                        Void sale
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={btnOutline}
                                    disabled={busy !== null}
                                    onClick={() => onOpenChange(false)}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className={btnDark}
                                    disabled={busy !== null || !isCompleted}
                                    title={isCompleted ? undefined : "Only completed sales can be printed"}
                                    onClick={() =>
                                        void run(
                                            "print",
                                            () => onReprint(sale._id),
                                            "Receipt sent to the printer."
                                        )
                                    }
                                >
                                    {busy === "print" ? "Printing…" : "Reprint receipt"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}