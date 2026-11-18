import { Loader2, Package, Search } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { cn } from "#/lib/utils";
import { formatCurrency, needsVariantPicker } from "#/lib/pos/utils";
import type { InventoryItem } from "#/types/pos";

type Store = { _id: string; name: string };
type Department = { _id: string; name: string };

type InvoiceProductPickerProps = {
    myStore: Store | null | undefined;
    activeStores: Store[];
    storeId: string | null;
    onStoreChange: (id: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
    departmentId: string | null;
    onDepartmentChange: (id: string | null) => void;
    departments: Department[] | undefined;
    inventory: InventoryItem[] | undefined;
    items: InventoryItem[];
    cartQuantityForProduct: (productId: string) => number;
    onProductClick: (item: InventoryItem) => void;
};

/**
 * Stock badge: grey when out, red when at or under half the reorder level, amber when at or
 * under the reorder level, green otherwise (green is also used when no reorder level is set).
 */
function stockBadge(item: InventoryItem) {
    const qty = item.quantity;
    const reorder = item.reorderLevel ?? 0;
    if (qty <= 0) return { label: "Out of stock", tone: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200" };
    if (reorder > 0 && qty <= Math.ceil(reorder / 2))
        return { label: `${qty} left`, tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" };
    if (reorder > 0 && qty <= reorder)
        return { label: `${qty} left`, tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" };
    return { label: `${qty} in stock`, tone: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" };
}

function priceLabel(item: InventoryItem) {
    const product = item.product!;
    if (!product.sizePricing?.length) return formatCurrency(product.sellingPrice);
    const prices = product.sizePricing.map((sp) => sp.sellingPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)}–${formatCurrency(max)}`;
}

export function InvoiceProductPicker({
    myStore,
    activeStores,
    storeId,
    onStoreChange,
    search,
    onSearchChange,
    departmentId,
    onDepartmentChange,
    departments,
    inventory,
    items,
    cartQuantityForProduct,
    onProductClick,
}: InvoiceProductPickerProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
                {myStore === null ? (
                    <Select value={storeId ?? undefined} onValueChange={onStoreChange}>
                        <SelectTrigger className="sm:w-56">
                            <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeStores.map((store) => (
                                <SelectItem key={store._id} value={store._id}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : myStore ? (
                    <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium sm:w-56">
                        {myStore.name}
                    </div>
                ) : (
                    <div className="flex h-9 items-center sm:w-56">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search products by name or SKU"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                        disabled={!storeId}
                    />
                </div>

                <Select value={departmentId ?? "all"} onValueChange={(v) => onDepartmentChange(v === "all" ? null : v)}>
                    <SelectTrigger className="sm:w-52">
                        <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departments?.map((d) => (
                            <SelectItem key={d._id} value={d._id}>
                                {d.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!storeId && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                    <Package className="mb-2 h-8 w-8" />
                    <p>{myStore === null ? "Select a store to see its stock" : "Loading your store..."}</p>
                </div>
            )}

            {storeId && inventory === undefined && (
                <div className="flex justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {storeId && inventory !== undefined && items.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                    <Package className="mb-2 h-8 w-8" />
                    <p>No products match your search</p>
                </div>
            )}

            {items.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                    {items.map((item) => {
                        const badge = stockBadge(item);
                        const inCart = cartQuantityForProduct(item.productId);
                        return (
                            <button
                                key={item.productId}
                                type="button"
                                onClick={() => onProductClick(item)}
                                className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <span className="line-clamp-2 text-sm font-semibold">{item.product!.name}</span>
                                <span className="text-xs text-muted-foreground">{item.product!.sku}</span>
                                <span className="font-bold">{priceLabel(item)}</span>
                                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.tone)}>{badge.label}</span>
                                {(needsVariantPicker(item.product!) || inCart > 0) && (
                                    <span className="text-xs text-muted-foreground">
                                        {[needsVariantPicker(item.product!) ? "Select options" : null, inCart > 0 ? `${inCart} in document` : null]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}