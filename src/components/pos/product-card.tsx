import { Badge } from "#/components/ui/badge";
import type { InventoryItem } from "#/types/pos";
import { formatCurrency, needsVariantPicker } from "#/lib/pos/utils";

type ProductCardProps = {
    item: InventoryItem;
    cartQtyForProduct: number;
    onClick: () => void;
};

export function ProductCard({ item, cartQtyForProduct, onClick }: ProductCardProps) {
    const product = item.product!;
    const hasVariants = needsVariantPicker(product);

    const priceLabel = (() => {
        if (!product.sizePricing?.length) return formatCurrency(product.sellingPrice);
        const prices = product.sizePricing.map((sp) => sp.sellingPrice);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? formatCurrency(min) : `${formatCurrency(min)}–${formatCurrency(max)}`;
    })();

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={cartQtyForProduct >= item.quantity}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
            <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
            <span className="text-xs text-muted-foreground">{product.sku}</span>
            <div className="mt-1 flex w-full items-center justify-between">
                <span className="font-semibold">{priceLabel}</span>
                <Badge variant="outline" className="text-xs">
                    {item.quantity} in stock
                </Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
                {hasVariants && (
                    <Badge variant="outline" className="text-xs">
                        Select options
                    </Badge>
                )}
                {cartQtyForProduct > 0 && <Badge variant="secondary">{cartQtyForProduct} in cart</Badge>}
            </div>
        </button>
    );
}