import { Badge } from '#/components/ui/badge'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Button } from '#/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import type { CustomerWithStats } from '#/types/customers'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from './customer-utils'

interface CustomerTableProps {
    data?: CustomerWithStats[]
    isLoading: boolean
    onViewDetails: (customer: CustomerWithStats) => void
    onEdit: (customer: CustomerWithStats) => void
    onDelete: (customer: CustomerWithStats) => void
}

export function CustomerTable({
    data,
    isLoading,
    onViewDetails,
    onEdit,
    onDelete,
}: CustomerTableProps) {
    const columns: ColumnDef<CustomerWithStats>[] = [
        {
            key: 'name',
            header: 'Customer Name',
            searchable: true,
        },
        {
            key: 'email',
            header: 'Email',
            searchable: true,
            cell: (row) => row.email || '—',
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (row) => row.phone || '—',
        },
        {
            key: 'salesCount',
            header: 'Orders',
            cell: (row) => (
                <Badge variant="secondary">{row.salesCount || 0}</Badge>
            ),
        },
        {
            key: 'totalSpent',
            header: 'Total Spent',
            cell: (row) => (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.totalSpent || 0)}
                </span>
            ),
        },
        {
            key: 'lastPurchase',
            header: 'Last Purchase',
            cell: (row) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.lastPurchase)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row) => {
                const status = row.isActive !== false ? 'active' : 'inactive'
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                    </span>
                )
            },
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
                            <Eye className="h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onEdit(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(row)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Customer
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
            searchPlaceholder="Search customers..."
            emptyMessage="No customers found"
            pageSizeOptions={[10, 25, 50]}
            defaultPageSize={10}
            enableColumnVisibility={true}
        />
    )
}