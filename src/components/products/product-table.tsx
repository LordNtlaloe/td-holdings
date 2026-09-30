import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Tag, FolderTree, Info, Pencil, MoreHorizontal } from 'lucide-react'
import type { ProductWithDetails } from '#/types/products'
import { formatCurrency, getStatusColor, getStatusLabel } from './product-utils'

interface ProductTableProps {
    data?: ProductWithDetails[]
    isLoading: boolean
    onViewDetails: (product: ProductWithDetails) => void
    onEdit: (product: ProductWithDetails) => void
}

export function ProductTable({
    data,
    isLoading,
    onViewDetails,
    onEdit,
}: ProductTableProps) {
    const columns: ColumnDef<ProductWithDetails>[] = [
        {
            key: 'name',
            header: 'Product Name',
            searchable: true,
        },
        {
            key: 'sku',
            header: 'SKU',
            searchable: true,
            cell: (row) => (
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{row.sku}</code>
            ),
        },
        {
            key: 'sizes',
            header: 'Sizes',
            cell: (row) => {
                if (!row.sizes?.length) return <span className="text-muted-foreground">—</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {row.sizes.slice(0, 3).map((size) => (
                            <Badge key={size} variant="outline" className="text-xs px-1.5 py-0">
                                {size}
                            </Badge>
                        ))}
                        {row.sizes.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                                +{row.sizes.length - 3}
                            </Badge>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'colors',
            header: 'Colors',
            cell: (row) => {
                if (!row.colors?.length) return <span className="text-muted-foreground">—</span>
                return (
                    <div className="flex flex-wrap gap-1">
                        {row.colors.slice(0, 3).map((color) => (
                            <Badge key={color} variant="outline" className="text-xs px-1.5 py-0 gap-1">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color.toLowerCase() }}
                                />
                                {color}
                            </Badge>
                        ))}
                        {row.colors.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                                +{row.colors.length - 3}
                            </Badge>
                        )}
                    </div>
                )
            },
        },
        {
            key: 'category',
            header: 'Category',
            // `row.category` is an object — search needs an explicit accessor.
            accessor: (row) => row.category?.name ?? 'Unknown',
            cell: (row) => (
                <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {row.category?.name || 'Unknown'}
                </span>
            ),
        },
        {
            key: 'department',
            header: 'Department',
            // `row.department` is an object — search needs an explicit accessor.
            accessor: (row) => row.department?.name ?? 'Unknown',
            cell: (row) => (
                <span className="flex items-center gap-1">
                    <FolderTree className="h-3 w-3 text-muted-foreground" />
                    {row.department?.name || 'Unknown'}
                </span>
            ),
        },
        {
            key: 'sellingPrice',
            header: 'Price',
            cell: (row) => (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.sellingPrice)}
                </span>
            ),
        },
        {
            key: 'totalStock',
            header: 'Stock',
            cell: (row) => (
                <Badge variant={row.totalStock > 0 ? 'default' : 'secondary'}>
                    {row.totalStock || 0}
                </Badge>
            ),
        },
        {
            key: 'isActive',
            header: 'Status',
            cell: (row) => (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(row.isActive)}`}>
                    {getStatusLabel(row.isActive)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => onViewDetails(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Info className="h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onEdit(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Product
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    return (
        <DataTable
            data={data as any}
            columns={columns as any}
            rowKey="_id"
            loading={isLoading}
            searchPlaceholder="Search products..."
            emptyMessage="No products found"
            pageSizeOptions={[10, 25, 50]}
            defaultPageSize={10}
            enableColumnVisibility={true}
        />
    )
}