import { Button } from '#/components/ui/button'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Info, Pencil, MoreHorizontal } from 'lucide-react'
import type { Store } from '#/types/stores'
import {
    formatPhoneNumber,
    getStatusColor,
    getStatusLabel,
    getStoreTypeLabel,
} from './store-utils'

interface StoreTableProps {
    data?: Store[]
    isLoading: boolean
    onViewDetails: (store: Store) => void
    onEdit: (store: Store) => void
}

export function StoreTable({
    data,
    isLoading,
    onViewDetails,
    onEdit,
}: StoreTableProps) {
    const columns: ColumnDef<Store>[] = [
        {
            key: 'name',
            header: 'Store Name',
            searchable: true,
        },
        {
            key: 'type',
            header: 'Type',
            cell: (row) => (
                <span className="capitalize inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                    {getStoreTypeLabel(row.type)}
                </span>
            ),
        },
        {
            key: 'address',
            header: 'Address',
            cell: (row) => (
                <span className="text-muted-foreground">{row.address}</span>
            ),
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (row) => (
                <span>{formatPhoneNumber(row.phone)}</span>
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
                            Edit Store
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
            searchPlaceholder="Search stores..."
            emptyMessage="No stores found"
            pageSizeOptions={[10, 25, 50]}
            defaultPageSize={10}
            enableColumnVisibility={true}
        />
    )
}