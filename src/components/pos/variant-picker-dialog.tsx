import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import type { InventoryItem } from "#/types/pos";
import { formatCurrency, resolvePrice } from "#/lib/pos/utils";

type VariantPickerDialogProps = {
    pickerItem: InventoryItem | null;
    pickerSize: string | null;
    pickerColor: string | null;
    pickerVariant: string | null;
    onSizeChange: (size: string) => void;
    onColorChange: (color: string) => void;
    onVariantChange: (variant: string) => void;
    onClose: () => void;
    onConfirm: () => void;
};

export function VariantPickerDialog({
    pickerItem,
    pickerSize,
    pickerColor,
    pickerVariant,
    onSizeChange,
    onColorChange,
    onVariantChange,
    onClose,
    onConfirm,
}: VariantPickerDialogProps) {
    return (
        <Dialog open={!!pickerItem} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select options</DialogTitle>
                    <DialogDescription>{pickerItem?.product?.name}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {pickerItem?.product?.sizes && pickerItem.product.sizes.length > 0 && (
                        <div className="space-y-2">
                            <Label>Size</Label>
                            <div className="flex flex-wrap gap-2">
                                {pickerItem.product.sizes.map((size) => (
                                    <Button
                                        key={size}
                                        type="button"
                                        size="sm"
                                        variant={pickerSize === size ? "default" : "outline"}
                                        onClick={() => onSizeChange(size)}
                                    >
                                        {size}
                                        {pickerItem.product!.sizePricing?.find((sp) => sp.size === size) && (
                                            <span className="ml-1 text-xs opacity-75">
                                                (
                                                {formatCurrency(
                                                    pickerItem.product!.sizePricing!.find((sp) => sp.size === size)!
                                                        .sellingPrice
                                                )}
                                                )
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {pickerItem?.product?.colors && pickerItem.product.colors.length > 0 && (
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {pickerItem.product.colors.map((color) => (
                                    <Button
                                        key={color}
                                        type="button"
                                        size="sm"
                                        variant={pickerColor === color ? "default" : "outline"}
                                        onClick={() => onColorChange(color)}
                                    >
                                        {color}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {pickerItem?.product?.variants && pickerItem.product.variants.length > 0 && (
                        <div className="space-y-2">
                            <Label>Variant</Label>
                            <div className="flex flex-wrap gap-2">
                                {pickerItem.product.variants.map((variant) => (
                                    <Button
                                        key={variant}
                                        type="button"
                                        size="sm"
                                        variant={pickerVariant === variant ? "default" : "outline"}
                                        onClick={() => onVariantChange(variant)}
                                    >
                                        {variant}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {pickerItem?.product && (
                        <p className="text-right text-lg font-semibold">
                            {formatCurrency(resolvePrice(pickerItem.product, pickerSize ?? undefined))}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm}>Add to cart</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}