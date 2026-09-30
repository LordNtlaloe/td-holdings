import { Receipt } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "#/components/ui/dialog";
import type { CompletedSale } from "#/types/pos";
import { formatCurrency } from "#/lib/pos/utils";

type ReceiptDialogProps = {
    completedSale: CompletedSale;
    receiptPrinted: boolean;
    onClose: () => void;
    onPrint: () => void;
};

export function ReceiptDialog({
    completedSale,
    receiptPrinted,
    onClose,
    onPrint,
}: ReceiptDialogProps) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>Sale Complete</DialogTitle>
                <DialogDescription>
                    {completedSale.itemCount} item(s) — {formatCurrency(completedSale.total)}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-sm">
                <p>
                    <span className="font-medium">Payment:</span> {completedSale.paymentMethod}
                </p>
                {completedSale.payments.map((p, i) => (
                    <div key={i} className="ml-4 text-xs">
                        <span className="font-medium">{p.method}:</span> {formatCurrency(p.amount)}
                        {p.method === "Cash" && p.amountReceived && (
                            <span className="text-muted-foreground">
                                {" "}
                                (Received: {formatCurrency(p.amountReceived)}, Change:{" "}
                                {formatCurrency(p.changeDue || 0)})
                            </span>
                        )}
                    </div>
                ))}
                {completedSale.discounts.length > 0 && (
                    <p>
                        <span className="font-medium">Discounts Applied:</span>{" "}
                        {formatCurrency(completedSale.discounts.reduce((s, d) => s + d.discountAmount, 0))}
                    </p>
                )}
                {completedSale.customerName && (
                    <p>
                        <span className="font-medium">Customer:</span> {completedSale.customerName}
                    </p>
                )}
                {completedSale.cashierName && (
                    <p>
                        <span className="font-medium">Cashier:</span> {completedSale.cashierName}
                    </p>
                )}
            </div>

            <p className="text-sm text-muted-foreground">
                {receiptPrinted
                    ? "Receipt printed. You can now close this dialog."
                    : "Print the receipt before closing, or close without printing."}
            </p>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={onClose} className="sm:order-1">
                    {receiptPrinted ? "Close" : "Close Without Printing"}
                </Button>
                <Button
                    onClick={onPrint}
                    variant={receiptPrinted ? "outline" : "default"}
                    className="sm:order-2"
                >
                    <Receipt className="mr-2 h-4 w-4" />
                    {receiptPrinted ? "Print Again" : "Print Receipt"}
                </Button>
            </DialogFooter>
        </>
    );
}