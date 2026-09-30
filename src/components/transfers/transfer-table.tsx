import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { ArrowRightLeft, Truck, PackageCheck, XCircle } from 'lucide-react'
import type { TransferStatus, TransferWithStores } from '#/types/transfers'
import { getStatusBadgeVariant, getStatusLabel, formatDate } from './transfer-utils'

interface TransferTableProps {
    data?: TransferWithStores[]
    status: TransferStatus
    isLoading: boolean
    onShip: (transfer: TransferWithStores) => void
    onReceive: (transfer: TransferWithStores) => void
    onCancel: (transfer: TransferWithStores) => void
}

export function TransferTable({
    data,
    status,
    isLoading,
    onShip,
    onReceive,
    onCancel,
}: TransferTableProps) {
    const columns: ColumnDef<TransferWithStores>[] = [
        {
            key: 'route',
            header: 'Route',
            cell: (row) => (
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{row.fromStore?.name ?? 'Unknown'}</span>
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{row.toStore?.name ?? 'Unknown'}</span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row) => (
                <Badge variant={getStatusBadgeVariant(row.status as TransferStatus)}>
                    {getStatusLabel(row.status as TransferStatus)}
                </Badge>
            ),
        },
        {
            key: 'createdAt',
            header: 'Created',
            cell: (row) => formatDate(row.createdAt ?? 0),
        },
        {
            key: 'notes',
            header: 'Notes',
            cell: (row) => (
                <span className="text-sm text-muted-foreground">{row.notes || '—'}</span>
            ),
        },
    ]

    if (status === 'received') {
        columns.push({
            key: 'receivedAt',
            header: 'Received',
            cell: (row) => (row.receivedAt ? formatDate(row.receivedAt) : '—'),
        })
    }

    columns.push({
        key: 'actions',
        header: 'Actions',
        cell: (row) => (
            <div className="flex gap-2">
                {status === 'pending' && (
                    <>
                        <Button size="sm" onClick={() => onShip(row)}>
                            <Truck className="mr-2 h-3 w-3" />
                            Ship
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onCancel(row)}
                        >
                            <XCircle className="h-3 w-3" />
                        </Button>
                    </>
                )}
                {status === 'in_transit' && (
                    <>
                        <Button size="sm" onClick={() => onReceive(row)}>
                            <PackageCheck className="mr-2 h-3 w-3" />
                            Receive
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onCancel(row)}
                        >
                            <XCircle className="h-3 w-3" />
                        </Button>
                    </>
                )}
            </div>
        ),
    })

    const statusLabels: Record<TransferStatus, string> = {
        pending: 'Pending',
        in_transit: 'In Transit',
        received: 'Received',
        cancelled: 'Cancelled',
    }

    return (
        <DataTable
            data={data as any}
            columns={columns as any}
            rowKey="_id"
            loading={isLoading}
            searchPlaceholder="Search transfers..."
            emptyMessage={`No ${statusLabels[status].toLowerCase()} transfers`}
            pageSizeOptions={[10, 25, 50]}
            defaultPageSize={10}
            enableColumnVisibility={true}
        />
    )
}