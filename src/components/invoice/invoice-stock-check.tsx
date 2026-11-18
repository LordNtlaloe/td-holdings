import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

export type StockLine = { productId: string; name: string; requested: number; available: number };

/** One row per product: lines of the same product share a single stock pool. */
export function getStockLines(invoice: any): StockLine[] {
    const byProduct = new Map<string, StockLine>();
    for (const item of invoice.items ?? []) {
        const existing = byProduct.get(item.productId);
        if (existing) existing.requested += item.quantity;
        else
            byProduct.set(item.productId, {
                productId: item.productId,
                name: item.product?.name ?? "Unknown product",
                requested: item.quantity,
                available: item.availableQuantity ?? 0,
            });
    }
    return [...byProduct.values()];
}

export function getShortages(invoice: any): StockLine[] {
    return getStockLines(invoice).filter((line) => line.requested > line.available);
}

export function InvoiceStockCheck({ invoice }: { invoice: any }) {
    // Stock has already moved once the invoice became a sale; cancelled documents don't need it.
    if (invoice.convertedToSaleId || invoice.status === "cancelled") return null;
    const lines = getStockLines(invoice);
    if (lines.length === 0) return null;
    const hasShortage = lines.some((l) => l.requested > l.available);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Stock check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
                {lines.map((line) => {
                    const short = line.requested - line.available;
                    const tone =
                        short > 0
                            ? "text-red-700 dark:text-red-300"
                            : line.available === line.requested
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-green-700 dark:text-green-300";
                    return (
                        <p key={line.productId} className={cn(tone)}>
                            {line.name}: {line.available} available
                            {short > 0 ? `, short by ${short}` : line.available === line.requested ? ", uses all remaining stock" : ""}
                        </p>
                    );
                })}
                {hasShortage && (
                    <p className="pt-1 text-xs text-muted-foreground">Convert to sale is blocked while any line is short.</p>
                )}
            </CardContent>
        </Card>
    );
}