import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Boxes, Package, Receipt, RotateCcw, ShoppingBasket, XCircle } from 'lucide-react'
import type { SalesStats } from '#/types/sales'

interface SalesStatCardsProps {
    stats: SalesStats
    isLoading?: boolean
}

function StatCard({
    title,
    value,
    sub,
    icon: Icon,
}: {
    title: string
    value: string | number
    sub: string
    icon: React.ElementType
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
        </Card>
    )
}

export function SalesStatCards({ stats, isLoading }: SalesStatCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-muted" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
                title="Units Sold"
                value={stats.unitsSold.toLocaleString('en-ZA')}
                sub="Items sold in period"
                icon={Package}
            />
            <StatCard
                title="Transactions"
                value={stats.salesCount}
                sub="Completed sales in period"
                icon={Receipt}
            />
            <StatCard
                title="Items per Sale"
                value={stats.itemsPerSale.toFixed(1)}
                sub="Average basket size"
                icon={ShoppingBasket}
            />
            <StatCard
                title="Products Sold"
                value={stats.uniqueProducts}
                sub="Distinct products moved"
                icon={Boxes}
            />
            <StatCard
                title="Refunds / Voids"
                value={`${stats.refundCount} / ${stats.voidCount}`}
                sub="In selected period"
                icon={RotateCcw}
            />
            <StatCard
                title="Cancelled"
                value={stats.cancelledCount}
                sub="Sales cancelled"
                icon={XCircle}
            />
        </div>
    )
}