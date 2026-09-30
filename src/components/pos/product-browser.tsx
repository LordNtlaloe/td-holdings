import { Loader2, Package, Printer, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "#/components/ui/select";
import { ProductCard } from "#/components/pos/product-card";
import type { InventoryItem } from "#/types/pos";

type Department = { _id: string; name: string };
type Store = { _id: string; name: string };

type ProductBrowserProps = {
    myStore: Store | null | undefined;
    activeStores: Store[];
    storeId: string | null;
    onStoreChange: (storeId: string) => void;
    isPrinterConfigured: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    departmentId: string | null;
    onDepartmentChange: (departmentId: string | null) => void;
    departments: Department[] | undefined;
    inventory: InventoryItem[] | undefined;
    filteredProducts: InventoryItem[];
    cartQuantityForProduct: (productId: string) => number;
    onProductClick: (item: InventoryItem) => void;
};

export function ProductBrowser({
    myStore,
    activeStores,
    storeId,
    onStoreChange,
    isPrinterConfigured,
    search,
    onSearchChange,
    departmentId,
    onDepartmentChange,
    departments,
    inventory,
    filteredProducts,
    cartQuantityForProduct,
    onProductClick,
}: ProductBrowserProps) {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1>
                <p className="text-sm text-muted-foreground">
                    {myStore === null
                        ? "Select a store, add items to the cart, and check out"
                        : "Add items to the cart and check out"}
                </p>
                {storeId && !isPrinterConfigured && (
                    <div className="mt-2 flex items-center gap-2 rounded-md bg-yellow-50 p-2 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                        <Printer className="h-4 w-4" />
                        <span>No printer configured. </span>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-yellow-800 dark:text-yellow-200"
                            onClick={() => (window.location.href = "/admin/store-settings")}
                        >
                            Configure now
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                {myStore === null ? (
                    <Select value={storeId || undefined} onValueChange={onStoreChange}>
                        <SelectTrigger className="sm:w-64">
                            <SelectValue placeholder="Select store" />
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
                    <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium sm:w-64">
                        {myStore.name}
                    </div>
                ) : (
                    <div className="flex h-10 items-center sm:w-64">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                        disabled={!storeId}
                    />
                </div>

                <Select
                    value={departmentId || "all"}
                    onValueChange={(value) => onDepartmentChange(value === "all" ? null : value)}
                >
                    <SelectTrigger className="sm:w-48">
                        <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departments?.map((dept) => (
                            <SelectItem key={dept._id} value={dept._id}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!storeId && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                    <Package className="mb-2 h-8 w-8" />
                    <p>
                        {myStore === null ? "Select a store to browse available stock" : "Loading your store..."}
                    </p>
                </div>
            )}

            {storeId && inventory === undefined && (
                <div className="flex justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {storeId && inventory !== undefined && filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                    <Package className="mb-2 h-8 w-8" />
                    <p>No products match your search</p>
                </div>
            )}

            {storeId && filteredProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((item) => (
                        <ProductCard
                            key={item.productId}
                            item={item}
                            cartQtyForProduct={cartQuantityForProduct(item.productId)}
                            onClick={() => onProductClick(item)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}