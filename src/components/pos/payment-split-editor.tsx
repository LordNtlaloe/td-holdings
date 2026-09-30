import { X } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "#/components/ui/select";
import type { PaymentMethod, PaymentSplit } from "#/types/pos";
import { formatCurrency } from "#/lib/pos/utils";

type PaymentSplitEditorProps = {
    payment: PaymentSplit;
    index: number;
    canRemove: boolean;
    onChange: (index: number, field: keyof PaymentSplit, value: any) => void;
    onRemove: (index: number) => void;
};

export function PaymentSplitEditor({
    payment,
    index,
    canRemove,
    onChange,
    onRemove,
}: PaymentSplitEditorProps) {
    return (
        <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Select
                        value={payment.method}
                        onValueChange={(value) => onChange(index, "method", value as PaymentMethod)}
                    >
                        <SelectTrigger className="w-35">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Mpesa">Mpesa</SelectItem>
                            <SelectItem value="Ecocash">Ecocash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                            <SelectItem value="Credit">Credit</SelectItem>
                            <SelectItem value="Voucher">Voucher</SelectItem>
                        </SelectContent>
                    </Select>
                    {canRemove && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => onRemove(index)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={payment.amount || ""}
                        onChange={(e) => onChange(index, "amount", Number(e.target.value))}
                        className="h-8"
                    />
                </div>
                {payment.method === "Cash" && (
                    <>
                        <div>
                            <Label className="text-xs">Received</Label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={payment.amountReceived || ""}
                                onChange={(e) => onChange(index, "amountReceived", Number(e.target.value))}
                                className="h-8"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Change Due</Label>
                            <Input
                                type="text"
                                value={formatCurrency(payment.changeDue || 0)}
                                disabled
                                className="h-8 bg-muted"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}