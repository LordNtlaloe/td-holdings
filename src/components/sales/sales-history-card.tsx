import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Id } from '#/types/entities'
import type { Sale } from '#/types/sales'
import { SalesTable } from './sales-table'

interface SalesHistoryCardProps {
    sales: Sale[]
    isLoading: boolean
    isGlobal: boolean
    canAction: boolean
    canVoid: boolean
    statusFilter: string
    storeFilter: string
    stores: { _id: Id<'stores'>; name: string }[] | undefined
    onSelectSale: (id: Id<'sales'>) => void
    onVoid: (id: Id<'sales'>) => void
    onCancel: (id: Id<'sales'>) => void
    onRefund: (id: Id<'sales'>) => void
}

export function SalesHistoryCard({
    sales,
    isLoading,
    isGlobal,
    canAction,
    canVoid,
    statusFilter,
    storeFilter,
    stores,
    onSelectSale,
    onVoid,
    onCancel,
    onRefund,
}: SalesHistoryCardProps) {
    const historyTransactionCount = sales.filter((s) => s.status === 'completed').length

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales History</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {historyTransactionCount} completed transaction{historyTransactionCount !== 1 ? 's' : ''}
                    {statusFilter !== 'all' && ` · filtered by ${statusFilter}`}
                    {storeFilter !== 'all' && stores
                        ? ` · ${stores.find((s) => s._id === storeFilter)?.name ?? ''}`
                        : ''}
                </p>
            </CardHeader>
            <CardContent>
                <SalesTable
                    sales={sales}
                    isLoading={isLoading}
                    isGlobal={isGlobal}
                    canAction={canAction}
                    canVoid={canVoid}
                    onSelectSale={onSelectSale}
                    onVoid={onVoid}
                    onCancel={onCancel}
                    onRefund={onRefund}
                />
            </CardContent>
        </Card>
    )
}