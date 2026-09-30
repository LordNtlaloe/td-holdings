import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Edit, Trash2, Plus } from 'lucide-react'
import type { Batch, Product } from '#/types/inventory'
import { formatCurrency } from './inventory-utils'

interface BatchesTableProps {
    data?: Batch[]
    products?: Product[]
    isLoading: boolean
    onEditBatch: (batch: Batch) => void
    onDeleteBatch: (batchId: string) => void
    onReceiveBatch: () => void
}

export function BatchesTable({
    data,
    products,
    isLoading,
    onEditBatch,
    onDeleteBatch,
    onReceiveBatch,
}: BatchesTableProps) {
    const columns: ColumnDef<Batch>[] = [
        {
            key: 'batchNumber',
            header: 'Batch Number',
            searchable: true,
        },
        {
            key: 'productId',
            header: 'Product',
            // The key holds an id, so without an accessor the search matched raw
            // ids and searching by product NAME found nothing.
            accessor: (row) => {
                const product = products?.find((p) => p._id === row.productId)
                return product ? `${product.name} ${product.sku ?? ''}` : ''
            },
            cell: (row) => {
                const product = products?.find(p => p._id === row.productId)
                return product?.name || 'Unknown'
            },
        },
        {
            key: 'size',
            header: 'Size',
            // Only size-priced products carry a size; the rest show a dash.
            cell: (row) =>
                row.size ? (
                    <Badge variant="outline" className="text-xs">
                        {row.size}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            key: 'quantity',
            header: 'Quantity',
            cell: (row) => (
                <Badge variant={row.quantity > 0 ? 'default' : 'secondary'}>
                    {row.quantity}
                </Badge>
            ),
        },
        {
            key: 'costPrice',
            header: 'Cost Price',
            cell: (row) => formatCurrency(row.costPrice),
        },
        {
            key: 'receivedAt',
            header: 'Received',
            cell: (row) => new Date(row.receivedAt).toLocaleDateString(),
        },
        {
            key: 'actions',
            header: 'Actions',
            // Edit + Delete sit side by side; the card view folds them into one ⋯ menu.
            mobileActions: 'group',
            cell: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditBatch(row)}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteBatch(row._id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Batch History</h3>
                    <p className="text-sm text-muted-foreground">
                        Track individual batches and their quantities
                    </p>
                </div>
                <Button onClick={onReceiveBatch}>
                    <Plus className="mr-2 h-4 w-4" />
                    Receive Batch
                </Button>
            </div>

            <DataTable
                data={data as any}
                columns={columns as any}
                rowKey="_id"
                loading={isLoading}
                searchPlaceholder="Search batches..."
                emptyMessage="No batches found"
                pageSizeOptions={[10, 25, 50]}
                defaultPageSize={10}
                enableColumnVisibility={true}
            />
        </div>
    )
}