import { useState } from "react";
import { Minus, Plus, Trash2, Tag, X } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { CartLine } from "#/types/pos";
import { cartKey, formatCurrency } from "#/lib/pos/utils";

type CartLineItemProps = {
    line: CartLine;
    onUpdateQuantity: (key: string, quantity: number) => void;
    onUpdatePrice: (key: string, unitPrice: number) => void;
    onUpdateDiscount: (key: string, discount: number) => void;
    onRemove: (key: string) => void;
};

export function CartLineItem({
    line,
    onUpdateQuantity,
    onUpdatePrice,
    onUpdateDiscount,
    onRemove,
}: CartLineItemProps) {
    const key = cartKey(line.productId, line.size, line.color, line.variant);
    const optionLabel = [line.size, line.color, line.variant].filter(Boolean).join(" / ");

    // Show the discount input by default if a discount is already applied,
    // so existing discounts remain visible instead of being hidden away.
    const [showDiscountInput, setShowDiscountInput] = useState(
        (line.manualDiscount ?? 0) > 0
    );

    const handleRemoveDiscount = () => {
        onUpdateDiscount(key, 0);
        setShowDiscountInput(false);
    };

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-medium">
                        {line.name}
                        {optionLabel && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({optionLabel})
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground">{line.sku}</p>
                    <p className="text-xs text-muted-foreground">{line.departmentName}</p>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onRemove(key)}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => onUpdateQuantity(key, line.quantity - 1)}
                        disabled={line.quantity <= 1}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                        type="number"
                        min={1}
                        max={line.availableQuantity}
                        value={line.quantity}
                        onChange={(e) => onUpdateQuantity(key, Number(e.target.value))}
                        className="h-7 w-14 text-center"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => onUpdateQuantity(key, line.quantity + 1)}
                        disabled={line.quantity >= line.availableQuantity}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R</span>
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitPrice}
                        onChange={(e) => onUpdatePrice(key, Number(e.target.value))}
                        className="h-7 w-20 text-right"
                    />
                </div>
            </div>

            {!showDiscountInput ? (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowDiscountInput(true)}
                >
                    <Tag className="h-3 w-3" />
                    Add discount
                </Button>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Discount:</span>
                    <Input
                        type="number"
                        min={0}
                        step={0.01}
                        autoFocus
                        value={line.manualDiscount || 0}
                        onChange={(e) => onUpdateDiscount(key, Number(e.target.value))}
                        className="h-7 w-20 text-right"
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleRemoveDiscount}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            <p className="text-right text-sm font-medium">
                {formatCurrency(line.unitPrice * line.quantity - (line.manualDiscount || 0))}
            </p>
        </div>
    );
}