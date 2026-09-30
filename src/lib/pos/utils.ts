import type { CartLine, Product } from "#/types/pos";

export function cartKey(
    productId: string,
    size?: string,
    color?: string,
    variant?: string
) {
    return `${productId}::${size ?? ""}::${color ?? ""}::${variant ?? ""}`;
}

export function resolvePrice(product: Product, size?: string) {
    if (size && product.sizePricing?.length) {
        const match = product.sizePricing.find((sp) => sp.size === size);
        if (match) return match.sellingPrice;
    }
    return product.sellingPrice;
}

export function needsVariantPicker(product: Product) {
    return (
        (product.sizes && product.sizes.length > 0) ||
        (product.colors && product.colors.length > 0) ||
        (product.variants && product.variants.length > 0)
    );
}

export function formatCurrency(amount: number) {
    return `R${amount.toFixed(2)}`;
}

export function extractRimSize(sizeStr: string): number | null {
    const m =
        sizeStr.match(/[Rr](\d+)$/) ||
        sizeStr.match(/^(\d+)$/) ||
        sizeStr.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
}

/**
 * Total discount across the cart. Discounts are entirely manual —
 * set by whoever is manning the POS via each line's `manualDiscount`.
 * No automatic/bulk discount rules are applied here.
 */
export function computeFrontendDiscounts(cart: CartLine[]): number {
    return cart.reduce((sum, l) => sum + (l.manualDiscount || 0), 0);
}

/**
 * Builds the receipt-facing discount breakdown (per product, with reasons)
 * used when finalizing a sale. Reflects only manual discounts entered by
 * the cashier — no automatic rules are applied.
 */
export function buildReceiptDiscounts(cart: CartLine[]) {
    const discounts: { productId: string; discountAmount: number; reason?: string }[] = [];

    for (const line of cart) {
        if (line.manualDiscount && line.manualDiscount > 0) {
            discounts.push({
                productId: line.productId,
                discountAmount: line.manualDiscount,
                reason: "Manual discount",
            });
        }
    }

    return discounts;
}