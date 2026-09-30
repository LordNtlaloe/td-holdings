import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from 'recharts'
import type { DashboardData } from '#/types/dashboard'
import { formatCurrency, formatTs } from './dashboard-utils'

const COLORS = ['#164e63', '#0e7490', '#0891b2', '#22d3ee', '#a5f3fc']

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    platinum: 'default',
    gold: 'default',
    silver: 'secondary',
    bronze: 'outline',
}

const TIER_LABELS: Record<string, string> = {
    platinum: '💎 Platinum',
    gold: '🥇 Gold',
    silver: '🥈 Silver',
    bronze: '🥉 Bronze',
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

export function DashboardCustomersTab({ data }: { data: DashboardData }) {
    const { customers } = data
    if (!customers) return null

    const tierData = [
        { name: 'Platinum', value: customers.tierDistribution.platinum },
        { name: 'Gold', value: customers.tierDistribution.gold },
        { name: 'Silver', value: customers.tierDistribution.silver },
        { name: 'Bronze', value: customers.tierDistribution.bronze },
    ].filter((t) => t.value > 0)

    return (
        <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.total}</div>
                        <p className="text-xs text-muted-foreground">+{customers.newThisMonth} this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">At-Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {customers.atRisk.length}
                        </div>
                        <p className="text-xs text-muted-foreground">No purchase in 30+ days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Platinum / Gold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {customers.tierDistribution.platinum + customers.tierDistribution.gold}
                        </div>
                        <p className="text-xs text-muted-foreground">High-value customers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Acquisition Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.acquisitionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">New vs total customers</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Top spenders */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Customers</CardTitle>
                        <CardDescription>By lifetime spend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead className="text-right">Visits</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.topSpenders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No customers yet
                                        </TableCell>
                                    </TableRow>
                                )}
                                {customers.topSpenders.map((c) => (
                                    <TableRow key={c.id.toString()}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={TIER_VARIANTS[c.tier] ?? 'outline'}>
                                                {TIER_LABELS[c.tier] ?? c.tier}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{c.visitCount}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(c.totalSpent)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Tier distribution donut */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Tiers</CardTitle>
                        <CardDescription>Distribution by lifetime spend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tierData.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">No tier data</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={tierData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                    >
                                        {tierData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                                    <Tooltip formatter={(v: unknown) => [`${v} customers`, '']} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* At-risk customers */}
            {customers.atRisk.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>At-Risk Customers</CardTitle>
                        <CardDescription>Haven't purchased in 30+ days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Last Purchase</TableHead>
                                    <TableHead className="text-right">Days Since Purchase</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.atRisk.map((c) => (
                                    <TableRow key={c.id.toString()}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {c.lastPurchaseAt ? formatTs(c.lastPurchaseAt) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={c.daysSinceLastPurchase > 60 ? 'destructive' : 'secondary'}
                                            >
                                                {c.daysSinceLastPurchase}d
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// ─── Financials Tab ───────────────────────────────────────────────────────────

export function DashboardFinancialsTab({ data }: { data: DashboardData }) {
    const { financial } = data
    if (!financial) return null

    return (
        <div className="space-y-4">
            {/* P&L summary */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(financial.grossProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {financial.grossProfitMargin.toFixed(1)}% margin
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses (MTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {formatCurrency(financial.totalExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${financial.netProfit >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-destructive'
                                }`}
                        >
                            {formatCurrency(financial.netProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {financial.netProfitMargin.toFixed(1)}% margin
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Expense Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{financial.expenseBreakdown.length}</div>
                        <p className="text-xs text-muted-foreground">Distinct categories (MTD)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Cash flow chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cash Flow, last 14 days</CardTitle>
                        <CardDescription>Inflow (revenue) vs outflow (purchases + expenses)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {financial.cashFlow.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={financial.cashFlow}>
                                    <defs>
                                        <linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#164e63" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#164e63" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(d: string) =>
                                            new Date(d).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
                                        }
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={11}
                                    />
                                    <YAxis
                                        tickFormatter={(v) => `R${v}`}
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={11}
                                        width={56}
                                    />
                                    <Tooltip
                                        formatter={(v: unknown, name: unknown) => [
                                            formatCurrency(typeof v === 'number' ? v : 0),
                                            name === 'inflow' ? 'Revenue' : 'Outflow',
                                        ]}
                                    />
                                    <Area type="monotone" dataKey="inflow" stroke="#164e63" fill="url(#inFill)" strokeWidth={2} name="inflow" />
                                    <Area type="monotone" dataKey="outflow" stroke="#dc2626" fill="url(#outFill)" strokeWidth={2} name="outflow" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Expense breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expense Breakdown (MTD)</CardTitle>
                        <CardDescription>By ledger category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {financial.expenseBreakdown.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No expenses recorded this month
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={financial.expenseBreakdown} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => `R${v}`} fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="category"
                                        width={110}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        formatter={(v: unknown, _: unknown, props: any) => [
                                            `${formatCurrency(typeof v === 'number' ? v : 0)} (${props.payload?.percentage?.toFixed(1)}%)`,
                                            'Amount',
                                        ]}
                                    />
                                    <Bar dataKey="amount" fill="#164e63" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

export function DashboardInventoryTab({ data }: { data: DashboardData }) {
    const { inventory } = data
    if (!inventory) return null

    return (
        <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(inventory.totalStockValue)}</div>
                        <p className="text-xs text-muted-foreground">At cost price</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total SKUs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inventory.totalProducts}</div>
                        <p className="text-xs text-muted-foreground">In inventory</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {inventory.lowStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground">At or below reorder level</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Dead Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {inventory.deadStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground">No sales in 90 days</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Stock coverage days */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stock Coverage</CardTitle>
                        <CardDescription>
                            Estimated days of stock remaining at current sales rate
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {inventory.stockCoverageDays.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No sales data to calculate coverage
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Daily Sales</TableHead>
                                        <TableHead className="text-right">Days Left</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.stockCoverageDays.map((item) => {
                                        const urgent = item.coverageDays <= 3
                                        const warning = item.coverageDays <= 7
                                        return (
                                            <TableRow key={item.productId.toString()}>
                                                <TableCell className="font-medium">{item.productName}</TableCell>
                                                <TableCell className="text-right">{item.currentStock}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {item.avgDailySales.toFixed(1)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge
                                                        variant={
                                                            urgent ? 'destructive' : warning ? 'secondary' : 'outline'
                                                        }
                                                    >
                                                        {item.coverageDays}d
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Turnover by category */}
                <Card>
                    <CardHeader>
                        <CardTitle>Turnover by Category</CardTitle>
                        <CardDescription>Revenue per unit sold</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {inventory.turnoverByCategory.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">No sales data</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={inventory.turnoverByCategory}
                                    layout="vertical"
                                    margin={{ left: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => `R${v}`} fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="category"
                                        width={110}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        formatter={(v: unknown) => [
                                            formatCurrency(typeof v === 'number' ? v : 0),
                                            'Revenue/unit',
                                        ]}
                                    />
                                    <Bar dataKey="turnover" fill="#0e7490" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}