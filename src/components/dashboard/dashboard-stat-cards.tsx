import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    Receipt,
    Building2,
    ArrowRightLeft,
    ShoppingCart,
    Activity,
    DollarSign,
    BarChart2,
    Package,
    Percent,
    RefreshCw,
    XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '#/types/dashboard'
import { formatCurrency } from './dashboard-utils'

/** The four headline KPIs, and the only cards shown above the tabs. */
interface DashboardStatCardsProps {
    data: DashboardData
}

/**
 * Tabs that carry their own stat cards. `customers`, `financials` and `stock`
 * are absent on purpose: those tabs already render a summary row of their own
 * (`dashboard-extra-tabs.tsx`), so repeating the numbers here would be noise.
 */
export type StatCardTab =
    | 'primary'
    | 'sales'
    | 'stores'
    | 'transfers'
    | 'purchases'
    | 'inventory'
    | 'activity'

interface DashboardTabStatCardsProps {
    data: DashboardData
    isGlobal: boolean
    tab: StatCardTab
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

export function DashboardStatCards({ data }: DashboardStatCardsProps) {
    const { stats, financial } = data

    const avgTxValue = stats.avgTransactionValue ?? 0
    const grossMargin = financial?.grossProfitMargin ?? stats.grossProfitMargin ?? 0
    const grossProfit = financial?.grossProfit ?? 0

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

        </>
    )
}

/**
 * The cards for one tab.
 *
 * Everything that used to sit in rows 2–4 above the tabs now renders inside the
 * tab whose question it answers, so the dashboard leads with four headline
 * numbers instead of sixteen. Cards a tab already summarises are not repeated:
 * Low Stock, Total Customers and Gross Profit each have their own tab row.
 */
export function DashboardTabStatCards({ data, isGlobal, tab }: DashboardTabStatCardsProps) {
    const perf = {
        unitsSold: data.performance?.unitsSold ?? 0,
        itemsPerSale: data.performance?.itemsPerSale ?? 0,
        sellThroughRate: data.performance?.sellThroughRate ?? 0,
        stockTurnover: data.performance?.stockTurnover ?? data.stats.stockTurnover ?? 0,
        cancellationRate: data.performance?.cancellationRate ?? 0,
    }

    // Lazily built per tab, so a tab only touches the data it actually shows.
    const groups: Record<StatCardTab, () => React.ReactNode[]> = {
        primary: () => [],
        sales: () => [
            <StatCard
                key="units"
                title="Units Sold"
                value={perf.unitsSold.toLocaleString()}
                sub={`${perf.itemsPerSale.toFixed(1)} items per sale`}
                icon={Package}
            />,
            <StatCard
                key="cancellations"
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
            />,
        ],
        stores: () =>
            isGlobal
                ? [
                    <StatCard
                        key="stores"
                        title="Active Stores"
                        value={data.stats.activeStores}
                        sub="Currently active"
                        icon={Building2}
                    />,
                ]
                : [],
        transfers: () =>
            isGlobal
                ? [
                    <StatCard
                        key="transfers"
                        title="Pending Transfers"
                        value={data.transfers?.pendingCount ?? 0}
                        sub={`${data.transfers?.inTransitCount ?? 0} in transit`}
                        icon={ArrowRightLeft}
                        accent={(data.transfers?.pendingCount ?? 0) > 0 ? 'amber' : undefined}
                    />,
                ]
                : [],
        purchases: () =>
            isGlobal
                ? [
                    <StatCard
                        key="purchases"
                        title="Stock Spend (MTD)"
                        value={formatCurrency(data.purchases?.totalThisMonth ?? 0)}
                        sub={`${data.purchases?.pendingCount ?? 0} pending PO${data.purchases?.pendingCount !== 1 ? 's' : ''}`}
                        icon={ShoppingCart}
                    />,
                ]
                : [],
        inventory: () => [
            <StatCard
                key="sellThrough"
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
            />,
            <StatCard
                key="turnover"
                title="Stock Turnover"
                value={`${perf.stockTurnover.toFixed(2)}×`}
                sub="Units sold ÷ units in stock"
                icon={RefreshCw}
                accent={perf.stockTurnover >= 1 ? 'green' : undefined}
            />,
        ],
        activity: () =>
            isGlobal
                ? [
                    <StatCard
                        key="activity"
                        title="Activity"
                        value={data.activityFeed?.length ?? 0}
                        sub="Recent actions logged"
                        icon={Activity}
                    />,
                ]
                : [],
    }

    const items = groups[tab]()
    if (items.length === 0) return null

    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{items}</div>
}