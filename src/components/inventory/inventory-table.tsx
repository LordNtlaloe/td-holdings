import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Edit, Plus, XCircle } from 'lucide-react'
import type { InventoryItemWithDetails } from '#/types/inventory'
import { getProductName, getProductSku, getStockStatus, formatCurrency, unsizedStock } from './inventory-utils'

interface InventoryTableProps {
    data?: InventoryItemWithDetails[]
    isLoading: boolean
    searchTerm: string
    onEditReorder: (productId: string, reorderLevel: number) => void
    onReceiveBatch: (productId: string) => void
    onRemoveProduct: (productId: string) => void
}

export function InventoryTable({
    data,
    isLoading,
    searchTerm,
    onEditReorder,
    onReceiveBatch,
    onRemoveProduct,
}: InventoryTableProps) {
    const filteredData = data?.filter(item =>
        item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const columns: ColumnDef<InventoryItemWithDetails>[] = [
        {
            key: 'product',
            header: 'Product',
            // `row.product` is an object, so search needs an explicit accessor.
            accessor: (row) => `${getProductName(row.product)} ${getProductSku(row.product)}`,
            cell: (row) => (
                <div>
                    <div className="font-medium">{getProductName(row.product)}</div>
                    <div className="text-xs text-muted-foreground">{getProductSku(row.product)}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Stock',
            cell: (row) => {
                const quantity = row.quantity || 0
                const reorderLevel = row.reorderLevel || 0
                const status = getStockStatus(quantity, reorderLevel)
                const sizes = row.sizes ?? []
                const unsized = unsizedStock(quantity, sizes)
                return (
                    <div className="space-y-1">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {/* Size-priced products hold stock per size. */}
                        {sizes.length > 0 && (
                            <div
                                className="text-xs text-muted-foreground"
                                title={sizes.map((s) => `${s.size}: ${s.quantity}`).join('\n')}
                            >
                                {sizes
                                    .slice(0, 2)
                                    .map((s) => `${s.size} · ${s.quantity}`)
                                    .join(' | ')}
                                {sizes.length > 2 ? ` +${sizes.length - 2} more` : ''}
                            </div>
                        )}
                        {/* Legacy stock received before sizes were tracked. */}
                        {unsized > 0 && (
                            <div
                                className="text-xs text-amber-600"
                                title="Received before per-size tracking — count it and assign a size"
                            >
                                {unsized} with no size
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'reorderLevel',
            header: 'Reorder Level',
            cell: (row) => row.reorderLevel || '—',
        },
        {
            key: 'value',
            header: 'Total Value',
            cell: (row) => {
                const value = (row.quantity || 0) * (row.product?.costPrice || 0)
                return formatCurrency(value)
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditReorder(row.productId, row.reorderLevel || 5)}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReceiveBatch(row.productId)}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRemoveProduct(row.productId)}
                    >
                        <XCircle className="h-3 w-3" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Badge variant="secondary">
                    {filteredData?.length || 0} products
                </Badge>
            </div>

            <DataTable
                data={filteredData as any}
                columns={columns as any}
                rowKey="inventoryId"
                loading={isLoading}
                searchPlaceholder="Search inventory..."
                emptyMessage="No products assigned to this store"
                pageSizeOptions={[10, 25, 50]}
                defaultPageSize={10}
                enableColumnVisibility={true}
            />
        </div>
    )
}