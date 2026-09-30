import { Loader2, PlusCircle, Receipt } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "#/components/ui/dialog";
import { PaymentSplitEditor } from "#/components/pos/payment-split-editor";
import type { PaymentSplit } from "#/types/pos";
import { formatCurrency } from "#/lib/pos/utils";

type CheckoutDialogProps = {
    cartItemCount: number;
    cartTotal: number;
    discountTotal: number;
    netTotal: number;
    customerName: string;
    isSplitPayment: boolean;
    onSelectSinglePayment: () => void;
    onSelectSplitPayment: () => void;
    payments: PaymentSplit[];
    onPaymentChange: (index: number, field: keyof PaymentSplit, value: any) => void;
    onRemovePayment: (index: number) => void;
    onAddPayment: () => void;
    totalPaymentAmount: number;
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function CheckoutDialog({
    cartItemCount,
    cartTotal,
    discountTotal,
    netTotal,
    customerName,
    isSplitPayment,
    onSelectSinglePayment,
    onSelectSplitPayment,
    payments,
    onPaymentChange,
    onRemovePayment,
    onAddPayment,
    totalPaymentAmount,
    isSubmitting,
    onCancel,
    onConfirm,
}: CheckoutDialogProps) {
    const amountsMatch = Math.abs(totalPaymentAmount - netTotal) < 0.01;

    return (
        <>
            <DialogHeader>
                <DialogTitle>Confirm Sale</DialogTitle>
                <DialogDescription>
                    {cartItemCount} item(s) —{" "}
                    {discountTotal > 0
                        ? `${formatCurrency(cartTotal)} − ${formatCurrency(discountTotal)} discount = `
                        : ""}
                    {formatCurrency(netTotal)} total
                    {customerName.trim() ? ` for ${customerName.trim()}` : " (walk-in)"}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant={!isSplitPayment ? "default" : "outline"}
                        size="sm"
                        onClick={onSelectSinglePayment}
                    >
                        Single Payment
                    </Button>
                    <Button
                        type="button"
                        variant={isSplitPayment ? "default" : "outline"}
                        size="sm"
                        onClick={onSelectSplitPayment}
                    >
                        Split Payment
                    </Button>
                </div>

                <div className="space-y-3">
                    {payments.map((payment, index) => (
                        <PaymentSplitEditor
                            key={index}
                            payment={payment}
                            index={index}
                            canRemove={payments.length > 1}
                            onChange={onPaymentChange}
                            onRemove={onRemovePayment}
                        />
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={onAddPayment}
                        disabled={payments.length >= 8}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Payment Method
                    </Button>

                    <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Total Payment:</span>
                        <span className={amountsMatch ? "font-medium text-green-600" : "font-medium text-red-600"}>
                            {formatCurrency(totalPaymentAmount)}
                            {!amountsMatch && (
                                <span className="ml-1 text-xs">
                                    (Short by {formatCurrency(netTotal - totalPaymentAmount)})
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button onClick={onConfirm} disabled={isSubmitting || !amountsMatch}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Receipt className="mr-2 h-4 w-4" />
                    )}
                    Confirm Sale
                </Button>
            </DialogFooter>
        </>
    );
}
