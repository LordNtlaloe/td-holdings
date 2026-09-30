import { useEffect, useMemo, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '#/components/ui/select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { Department, InventoryItemWithDetails, Product } from '#/types/inventory'
import { unsizedStock } from './inventory-utils'

interface ReceiveBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    departments?: Department[]
    inventoryItems?: InventoryItemWithDetails[]
    selectedDepartmentId: string | null
    selectedProductId: string | null
    /** Which size the batch belongs to — required for size-priced products. */
    selectedSize: string | null
    batchNumber: string
    batchQuantity: number
    batchCostPrice: number
    onDepartmentChange: (value: string | null) => void
    onProductChange: (value: string | null) => void
    onSizeChange: (value: string) => void
    onBatchNumberChange: (value: string) => void
    onBatchQuantityChange: (value: number) => void
    onBatchCostPriceChange: (value: number) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
    isProductEligible: (productId: string) => boolean
    /** 7-day rule scoped to a single size (size-priced products only). */
    isSizeEligible: (productId: string, size: string) => boolean
    /**
     * Set when the dialog is opened from a specific product row. The product and
     * its department are already known, so the pickers are replaced by a
     * read-only summary and the only thing left to enter is the quantity.
     */
    lockProduct?: ReceiveLockedProduct | null
}

export interface ReceiveLockedProduct {
    name: string
    sku?: string
    departmentName?: string
    /** Full product, so the dialog can read its per-size pricing. */
    product?: Product | null
    quantity: number
    reorderLevel?: number | null
    /** Per-size stock, so the size list can show what's on hand. */
    sizes?: Array<{ size: string; quantity: number }>
}

export function ReceiveBatchDialog({
    open,
    onOpenChange,
    departments,
    inventoryItems,
    selectedDepartmentId,
    selectedProductId,
    selectedSize,
    batchNumber,
    batchQuantity,
    batchCostPrice,
    onDepartmentChange,
    onProductChange,
    onSizeChange,
    onBatchNumberChange,
    onBatchQuantityChange,
    onBatchCostPriceChange,
    onSubmit,
    isLoading,
    error,
    isProductEligible,
    isSizeEligible,
    lockProduct,
}: ReceiveBatchDialogProps) {
    // Products the batch picker can still receive stock for.
    //
    // Products that already got a batch in the last 7 days are left OUT of the
    // list entirely (the server rejects them regardless — batches must be a week
    // apart) rather than shown as disabled entries.
    //
    // The rest are sorted lowest stock first, so out-of-stock and sub-10 items
    // are at the top of the dropdown where they're most needed.
    const departmentItems = useMemo(() => {
        const source = selectedDepartmentId
            ? inventoryItems?.filter((item) => item.product?.departmentId === selectedDepartmentId)
            : inventoryItems
        return source ?? []
    }, [inventoryItems, selectedDepartmentId])

    // A size-priced product is only blocked once EVERY one of its sizes has had a
    // batch in the last 7 days — otherwise you could never restock the other
    // sizes.
    const hasReceivableSize = (item: InventoryItemWithDetails) => {
        const sizes = item.product?.sizePricing?.map((sp) => sp.size) ?? []
        if (sizes.length === 0) return isProductEligible(item.productId)
        return sizes.some((size) => isSizeEligible(item.productId, size))
    }

    const availableItems = useMemo(
        () =>
            departmentItems
                .filter(hasReceivableSize)
                .sort((a, b) => (a.quantity || 0) - (b.quantity || 0)),
        [departmentItems, isProductEligible, isSizeEligible]
    )

    const blockedByRecentBatch = departmentItems.length - availableItems.length

    const isLocked = Boolean(lockProduct)

    // Size-priced products hold stock per size, so the batch needs a size.
    const inventoryEntry = inventoryItems?.find((i) => i.productId === selectedProductId)
    const batchProduct: Product | null | undefined = isLocked
        ? lockProduct?.product
        : inventoryEntry?.product
    const sizeStock = (isLocked ? lockProduct?.sizes : inventoryEntry?.sizes) ?? []

    // Units this size-priced product still holds with no size attached, from
    // batches received before sizes were tracked. Without calling it out, the
    // per-size list below reads "Out of stock" across the board.
    const unsizedHeld = unsizedStock(
        isLocked ? lockProduct?.quantity : inventoryEntry?.quantity,
        sizeStock
    )

    const sizeOptions = (batchProduct?.sizePricing ?? [])
        .map((sp) => ({
            size: sp.size,
            quantity: sizeStock.find((s) => s.size === sp.size)?.quantity ?? 0,
            // Every priced size stays listed. A size already batched this week is
            // shown disabled rather than dropped: hiding them made the whole
            // selector disappear once all sizes were batched, while submit was
            // still gated on choosing one — a dead end with no visible reason.
            eligible: isSizeEligible(selectedProductId ?? '', sp.size),
        }))
        // Lowest stock first, most in need of restocking at the top.
        .sort((a, b) => a.quantity - b.quantity)
    // Batch number and cost price are auto-generated/prefilled when the product
    // is known, so they stay collapsed unless the user asks for them.
    const [showAdvanced, setShowAdvanced] = useState(false)
    useEffect(() => {
        if (open) setShowAdvanced(false)
    }, [open])

    const sizeOptionsBlocked = sizeOptions.filter((option) => !option.eligible).length
    const allSizesBlocked = sizeOptions.length > 0 && sizeOptionsBlocked === sizeOptions.length
    // Scoped to the size when there is one — a size-priced product can have one
    // size batched this week and the rest perfectly receivable.
    const recentlyBatched = Boolean(
        isLocked &&
            selectedProductId &&
            (sizeOptions.length > 0
                ? selectedSize
                    ? !sizeOptions.find((option) => option.size === selectedSize)?.eligible
                    : allSizesBlocked
                : !isProductEligible(selectedProductId))
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isLocked ? 'Receive Stock' : 'Receive Batch'}</DialogTitle>
                    <DialogDescription>
                        {isLocked
                            ? 'How many units did you receive?'
                            : 'Add a new batch of stock to inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isLocked ? (
                        <>
                            <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
                                <p className="font-medium">{lockProduct?.name}</p>
                                {[lockProduct?.sku, lockProduct?.departmentName].filter(Boolean).length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {[lockProduct?.sku, lockProduct?.departmentName]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {lockProduct?.quantity ?? 0} in stock
                                    {lockProduct?.reorderLevel != null &&
                                        ` · reorder at ${lockProduct.reorderLevel}`}
                                </p>
                            </div>

                            {recentlyBatched && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {allSizesBlocked && !selectedSize
                                            ? 'Every size of this product was batched in the last 7 days. Batches must be at least 7 days apart.'
                                            : 'That size was batched in the last 7 days. Batches must be at least 7 days apart — pick another size.'}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    ) : (
                        <>
                    <div className="space-y-2">
                        <Label>Filter by Department</Label>
                        <Select
                            value={selectedDepartmentId || 'all'}
                            onValueChange={(value) => {
                                onDepartmentChange(value === 'all' ? null : value)
                                // Reset product selection when department changes
                                if (value !== selectedDepartmentId) {
                                    onProductChange(null)
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments?.map((department) => (
                                    <SelectItem key={department._id} value={department._id}>
                                        {department.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Product</Label>
                        <Select
                            value={selectedProductId || ''}
                            onValueChange={(value) => {
                                onProductChange(value || null)
                                // Sizes belong to the product, so clear the choice.
                                onSizeChange('')
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableItems.length === 0 ? (
                                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                        {departmentItems.length === 0
                                            ? selectedDepartmentId
                                                ? 'No products in this department'
                                                : 'No products available'
                                            : 'Every product here received a batch in the last 7 days'}
                                    </div>
                                ) : (
                                    availableItems.map((item) => {
                                        const productName = item.product?.name || 'Unknown Product'
                                        const sku = item.product?.sku || ''
                                        const inStock = item.quantity || 0
                                        return (
                                            <SelectItem
                                                key={item.productId}
                                                value={item.productId}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{productName}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({sku})
                                                    </span>
                                                    <Badge
                                                        variant={inStock <= 0 ? 'destructive' : 'outline'}
                                                        className={
                                                            inStock > 0 && inStock < 10
                                                                ? 'text-xs border-amber-500 text-amber-600'
                                                                : 'text-xs'
                                                        }
                                                    >
                                                        {inStock <= 0 ? 'Out of stock' : `${inStock} in stock`}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        )
                                    })
                                )}
                            </SelectContent>
                        </Select>
                        {blockedByRecentBatch > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {blockedByRecentBatch}{' '}
                                {blockedByRecentBatch === 1 ? 'product is' : 'products are'} hidden —
                                a batch was received in the last 7 days
                            </p>
                        )}
                    </div>
                        </>
                    )}

                    {sizeOptions.length > 0 && (
                        <div className="space-y-2">
                            <Label>
                                Size{' '}
                                <span className="text-muted-foreground">
                                    — stock is tracked per size for this product
                                </span>
                            </Label>
                            <Select value={selectedSize ?? ''} onValueChange={onSizeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sizeOptions.map(({ size, quantity, eligible }) => (
                                        <SelectItem key={size} value={size} disabled={!eligible}>
                                            <div className="flex items-center gap-2">
                                                <span>{size}</span>
                                                <Badge
                                                    variant={quantity <= 0 ? 'destructive' : 'outline'}
                                                    className={
                                                        quantity > 0 && quantity < 10
                                                            ? 'text-xs border-amber-500 text-amber-600'
                                                            : 'text-xs'
                                                    }
                                                >
                                                    {quantity > 0
                                                        ? `${quantity} in stock`
                                                        : unsizedHeld > 0
                                                          ? '0 in this size'
                                                          : 'Out of stock'}
                                                </Badge>
                                                {!eligible && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        batched this week
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {unsizedHeld > 0 && (
                                <p className="text-xs text-amber-600">
                                    {unsizedHeld} unit{unsizedHeld === 1 ? '' : 's'} on hand with no
                                    size — received before per-size tracking. Count it and assign a
                                    size, or receive this batch for the correct size.
                                </p>
                            )}
                        </div>
                    )}
                    {(!isLocked || showAdvanced) && (
                        <div className="space-y-2">
                            <Label>Batch Number</Label>
                            <Input
                                value={batchNumber}
                                onChange={(e) => onBatchNumberChange(e.target.value)}
                                placeholder="Enter batch number"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                            type="number"
                            value={batchQuantity}
                            onChange={(e) => onBatchQuantityChange(Number(e.target.value))}
                            min={1}
                            autoFocus={isLocked}
                        />
                    </div>
                    {(!isLocked || showAdvanced) && (
                        <div className="space-y-2">
                            <Label>Cost Price per Unit</Label>
                            <Input
                                type="number"
                                value={batchCostPrice}
                                onChange={(e) => onBatchCostPriceChange(Number(e.target.value))}
                                min={0}
                                step={0.01}
                            />
                        </div>
                    )}
                    {isLocked && !showAdvanced && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-0"
                            onClick={() => setShowAdvanced(true)}
                        >
                            Adjust batch number or cost price
                        </Button>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading || !selectedProductId}>
                        {isLoading ? 'Receiving...' : 'Receive Batch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}