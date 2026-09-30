import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    Receipt,
    AlertTriangle,
    Building2,
    ArrowRightLeft,
    ShoppingCart,
    Users,
    Activity,
    DollarSign,
    BarChart2,
    UserCheck,
    Repeat2,
    Package,
    Percent,
    RefreshCw,
    XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '#/types/dashboard'
import { formatCurrency } from './dashboard-utils'

interface DashboardStatCardsProps {
    data: DashboardData
    isGlobal: boolean
}

function StatCard({
    title,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    title: string
    value: string | number
    sub: string
    icon: React.ElementType
    accent?: 'green' | 'red' | 'amber'
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div
                    className={cn(
                        'text-2xl font-bold',
                        accent === 'green' && 'text-green-600 dark:text-green-400',
                        accent === 'red' && 'text-destructive',
                        accent === 'amber' && 'text-amber-600 dark:text-amber-400',
                    )}
                >
                    {value}
                </div>
                <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
        </Card>
    )
}

export function DashboardStatCards({ data, isGlobal }: DashboardStatCardsProps) {
    const { stats, customers, financial } = data

    // Non-revenue performance: volume and efficiency rather than money.
    const perf = {
        unitsSold: data.performance?.unitsSold ?? 0,
        itemsPerSale: data.performance?.itemsPerSale ?? 0,
        sellThroughRate: data.performance?.sellThroughRate ?? 0,
        stockTurnover: data.performance?.stockTurnover ?? stats.stockTurnover ?? 0,
        cancellationRate: data.performance?.cancellationRate ?? 0,
    }

    const avgTxValue = stats.avgTransactionValue ?? 0
    const grossMargin = financial?.grossProfitMargin ?? stats.grossProfitMargin ?? 0
    const grossProfit = financial?.grossProfit ?? 0
    const newCustomers = customers?.newThisMonth ?? 0
    const returnRate =
        customers && customers.total > 0
            ? Math.round(
                ((customers.total - newCustomers) / customers.total) * 100,
            )
            : 0

    return (
        <>
            {/* Row 1 — always visible */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    sub="All completed sales"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Total Sales"
                    value={stats.totalSales}
                    sub="Completed transactions"
                    icon={Receipt}
                />
                <StatCard
                    title="Gross Profit"
                    value={formatCurrency(grossProfit)}
                    sub={`${grossMargin.toFixed(1)}% margin`}
                    icon={DollarSign}
                    accent={grossMargin >= 20 ? 'green' : grossMargin >= 10 ? 'amber' : 'red'}
                />
                <StatCard
                    title="Avg Transaction"
                    value={formatCurrency(avgTxValue)}
                    sub="Per completed sale"
                    icon={BarChart2}
                />
            </div>

            {/* Row 2 — always visible */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    title="Low Stock"
                    value={stats.lowStockCount}
                    sub="At or below reorder level"
                    icon={AlertTriangle}
                    accent={stats.lowStockCount > 0 ? 'amber' : undefined}
                />
                <StatCard
                    title={isGlobal ? 'Active Stores' : 'Your Store'}
                    value={isGlobal ? stats.activeStores : (data.recentSales[0]?.storeName ?? '—')}
                    sub={isGlobal ? 'Currently active' : 'Assigned location'}
                    icon={Building2}
                />
                <StatCard
                    title="New Customers"
                    value={newCustomers}
                    sub="Registered this month"
                    icon={UserCheck}
                    accent={newCustomers > 0 ? 'green' : undefined}
                />
                <StatCard
                    title="Return Rate"
                    value={`${returnRate}%`}
                    sub="Repeat buyers"
                    icon={Repeat2}
                    accent={returnRate >= 40 ? 'green' : returnRate >= 20 ? 'amber' : undefined}
                />
            </div>

            {/* Row 3 — non-revenue performance */}
            <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Performance — non-revenue
                </p>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Units Sold"
                        value={perf.unitsSold.toLocaleString()}
                        sub={`${perf.itemsPerSale.toFixed(1)} items per sale`}
                        icon={Package}
                    />
                    <StatCard
                        title="Sell-through"
                        value={`${perf.sellThroughRate.toFixed(1)}%`}
                        sub="Units sold vs stock on hand"
                        icon={Percent}
                        accent={
                            perf.sellThroughRate >= 60
                                ? 'green'
                                : perf.sellThroughRate >= 30
                                    ? 'amber'
                                    : undefined
                        }
                    />
                    <StatCard
                        title="Stock Turnover"
                        value={`${perf.stockTurnover.toFixed(2)}×`}
                        sub="Units sold ÷ units in stock"
                        icon={RefreshCw}
                        accent={perf.stockTurnover >= 1 ? 'green' : undefined}
                    />
                    <StatCard
                        title="Cancellations"
                        value={`${perf.cancellationRate.toFixed(1)}%`}
                        sub="Cancelled, refunded or voided"
                        icon={XCircle}
                        accent={
                            perf.cancellationRate >= 10
                                ? 'red'
                                : perf.cancellationRate >= 5
                                    ? 'amber'
                                    : 'green'
                        }
                    />
                </div>
            </div>

            {/* Row 4 — global/admin only */}
            {isGlobal && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Pending Transfers"
                        value={data.transfers.pendingCount}
                        sub={`${data.transfers.inTransitCount} in transit`}
                        icon={ArrowRightLeft}
                        accent={data.transfers.pendingCount > 0 ? 'amber' : undefined}
                    />
                    <StatCard
                        title="Stock Spend (MTD)"
                        value={formatCurrency(data.purchases.totalThisMonth)}
                        sub={`${data.purchases.pendingCount} pending PO${data.purchases.pendingCount !== 1 ? 's' : ''}`}
                        icon={ShoppingCart}
                    />
                    <StatCard
                        title="Customers"
                        value={customers?.total ?? 0}
                        sub={`+${newCustomers} this month`}
                        icon={Users}
                    />
                    <StatCard
                        title="Activity"
                        value={data.activityFeed.length}
                        sub="Recent actions logged"
                        icon={Activity}
                    />
                </div>
            )}
        </>
    )
}