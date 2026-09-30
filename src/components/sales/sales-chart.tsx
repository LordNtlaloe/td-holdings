import { useMemo, useState } from 'react'
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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = [
    '#3b82f6',
    '#ef4444',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
]

interface SalesChartsProps {
    salesData: any[]
    isLoading: boolean
    isGlobal: boolean
    /**
     * Extra chart card(s) to flow into the same grid.
     *
     * The page used to render its own two-column wrapper around this component
     * plus the payment-method chart, which left all of these charts squeezed
     * into half the page with an empty column beside them. Receiving it here
     * means one grid holds every chart, so they lay out 2x2 on wide screens.
     */
    extraCharts?: React.ReactNode
}

// Helper to get week number
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Helper to get Monday of the week
function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

// Helper to get week label
function getWeekLabel(date: Date): string {
    const monday = getMonday(date)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const month = monday.toLocaleString('default', { month: 'short' })
    const day1 = monday.getDate()
    const day2 = sunday.getDate()
    return `${month} ${day1} - ${day2}`
}

// Units moved in a single sale — the volume counterpart to its money total.
function saleUnits(sale: any): number {
    return (sale.items ?? []).reduce(
        (sum: number, item: any) => sum + (item.quantity ?? 0),
        0
    )
}

export function SalesCharts({ salesData, isLoading, isGlobal, extraCharts }: SalesChartsProps) {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
    const [chartView, setChartView] = useState<'overview' | 'departments' | 'stores'>('overview')
    // Which volume metric the charts plot — both are counts, never money.
    const [metric, setMetric] = useState<'units' | 'transactions'>('units')

    // Department volume — units moved, not money.
    // NOTE: `departmentName` is injected by /api/sales/completed. That endpoint
    // does not populate `product.department`, so relying on it alone (as this
    // used to) tagged every sale as "Uncategorized".
    const departmentSales = useMemo(() => {
        if (!salesData || salesData.length === 0) return []

        const deptMap = new Map<string, { units: number; transactions: number }>()

        salesData.forEach((sale: any) => {
            if (sale.status !== 'completed') return

            const seenInSale = new Set<string>()
            sale.items?.forEach((item: any) => {
                const deptName =
                    item.departmentName || item.product?.department?.name || 'Uncategorized'
                const isFirstInSale = !seenInSale.has(deptName)
                seenInSale.add(deptName)

                const existing = deptMap.get(deptName)
                if (existing) {
                    existing.units += item.quantity ?? 0
                    if (isFirstInSale) existing.transactions += 1
                } else {
                    deptMap.set(deptName, {
                        units: item.quantity ?? 0,
                        transactions: 1,
                    })
                }
            })
        })

        return Array.from(deptMap.entries())
            .map(([name, data]) => ({
                departmentName: name,
                units: data.units,
                transactions: data.transactions,
            }))
            .sort((a, b) => b.units - a.units)
    }, [salesData])

    // Store volume — units moved, not money.
    const storeSales = useMemo(() => {
        if (!salesData || salesData.length === 0) return []

        const storeMap = new Map<string, { units: number; transactions: number }>()

        salesData.forEach((sale: any) => {
            if (sale.status !== 'completed') return
            const storeName = sale.store?.name || 'Unknown'
            const units = saleUnits(sale)
            const existing = storeMap.get(storeName)
            if (existing) {
                existing.units += units
                existing.transactions += 1
            } else {
                storeMap.set(storeName, {
                    units,
                    transactions: 1,
                })
            }
        })

        return Array.from(storeMap.entries())
            .map(([name, data]) => ({
                storeName: name,
                units: data.units,
                transactions: data.transactions,
            }))
            .sort((a, b) => b.units - a.units)
    }, [salesData])

    // Calculate timeline data - grouped by week (Monday to Sunday)
    const timelineData = useMemo(() => {
        if (!salesData || salesData.length === 0) return []

        const now = new Date()
        let days: number

        switch (timeRange) {
            case '7d':
                days = 7
                break
            case '30d':
                days = 30
                break
            case '90d':
                days = 90
                break
            case '12m':
                days = 365
                break
            default:
                days = 30
        }

        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days)

        // For 12 months, group by month
        if (timeRange === '12m') {
            const monthMap = new Map<string, { units: number; transactions: number }>()
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

            salesData.forEach((sale: any) => {
                if (sale.status !== 'completed') return
                const date = new Date(sale.createdAt)
                const monthKey = months[date.getMonth()]
                const yearKey = date.getFullYear()
                const key = `${monthKey} ${yearKey}`

                const existing = monthMap.get(key)
                if (existing) {
                    existing.units += saleUnits(sale)
                    existing.transactions += 1
                } else {
                    monthMap.set(key, {
                        units: saleUnits(sale),
                        transactions: 1,
                    })
                }
            })

            // Get last 12 months
            const result: any[] = []
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now)
                d.setMonth(d.getMonth() - i)
                const monthKey = months[d.getMonth()]
                const yearKey = d.getFullYear()
                const key = `${monthKey} ${yearKey}`
                const data = monthMap.get(key) || { units: 0, transactions: 0 }
                result.push({
                    period: key,
                    units: data.units,
                    transactions: data.transactions,
                })
            }
            return result
        }

        // For weeks, group by Monday-Sunday
        const weekMap = new Map<string, { units: number; transactions: number; monday: Date }>()

        // Process sales data - only include sales after startDate
        salesData.forEach((sale: any) => {
            if (sale.status !== 'completed') return
            const date = new Date(sale.createdAt)
            if (date >= startDate) {
                const monday = getMonday(date)
                const weekKey = monday.toISOString().split('T')[0]
                const existing = weekMap.get(weekKey)
                if (existing) {
                    existing.units += saleUnits(sale)
                    existing.transactions += 1
                } else {
                    weekMap.set(weekKey, {
                        units: saleUnits(sale),
                        transactions: 1,
                        monday: monday,
                    })
                }
            }
        })

        // Fill in missing weeks
        const result: any[] = []
        const currentDate = new Date(now)
        const startCopy = new Date(startDate)
        
        // Find the Monday of the start week
        let currentMonday = getMonday(startCopy)
        
        // Loop through weeks until we reach current week
        while (currentMonday <= currentDate) {
            const weekKey = currentMonday.toISOString().split('T')[0]
            const data = weekMap.get(weekKey) || { units: 0, transactions: 0, monday: currentMonday }
            
            // Get the Sunday of this week
            const sunday = new Date(currentMonday)
            sunday.setDate(sunday.getDate() + 6)
            
            result.push({
                period: getWeekLabel(currentMonday),
                units: data.units,
                transactions: data.transactions,
                monday: currentMonday.getTime(),
                weekNumber: getWeekNumber(currentMonday),
            })
            
            // Move to next week (Monday + 7 days)
            currentMonday.setDate(currentMonday.getDate() + 7)
        }
        
        return result
    }, [salesData, timeRange])

    // Totals for whichever volume metric is selected — counts, never money.
    const totalVolume = useMemo(() => {
        return timelineData.reduce((sum, d) => sum + d[metric], 0)
    }, [timelineData, metric])

    const avgVolume = useMemo(() => {
        if (timelineData.length === 0) return 0
        return totalVolume / timelineData.length
    }, [timelineData, totalVolume])

    const metricLabel = metric === 'units' ? 'Units' : 'Transactions'

    // Tooltip formatter helper — plain counts, not currency.
    const formatTooltipValue = (value: any) => {
        if (typeof value === 'number') {
            return value.toLocaleString('en-ZA')
        }
        return String(value)
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-50 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!salesData || salesData.length === 0) {
        return (
            <Card>
                <CardContent className="flex h-75 items-center justify-center">
                    <p className="text-muted-foreground">No sales data available for charts</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">Sales Volume Analytics</h2>
                    <p className="text-sm text-muted-foreground">
                        Total {metricLabel}: {totalVolume.toLocaleString('en-ZA')} · Avg{' '}
                        {Math.round(avgVolume).toLocaleString('en-ZA')} per period
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Metric" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="units">Units sold</SelectItem>
                            <SelectItem value="transactions">Transactions</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                        <SelectTrigger className="w-30">
                            <SelectValue placeholder="Time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="12m">Last 12 months</SelectItem>
                        </SelectContent>
                    </Select>

                    <Tabs value={chartView} onValueChange={(v: any) => setChartView(v)}>
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="departments">Departments</TabsTrigger>
                            {isGlobal && <TabsTrigger value="stores">Stores</TabsTrigger>}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Charts - two by two on wider screens. The timeline is NOT
                span-2, so the four charts form a clean 2x2 grid. */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Timeline Chart - Week view */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">
                            {metricLabel} Timeline (Week-by-Week)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fontSize: 10 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis tickFormatter={(value) => value.toLocaleString('en-ZA')} />
                                <Tooltip
                                    formatter={formatTooltipValue}
                                    labelFormatter={(label) => `Week: ${label}`}
                                />
                                <Bar dataKey={metric} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Department Pie Chart */}
                {(chartView === 'overview' || chartView === 'departments') && departmentSales.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">
                                {metricLabel} by Department
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={departmentSales.slice(0, 8)}
                                        dataKey={metric}
                                        nameKey="departmentName"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => {
                                            const pct = percent || 0
                                            return `${name}: ${(pct * 100).toFixed(0)}%`
                                        }}
                                    >
                                        {departmentSales.slice(0, 8).map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={formatTooltipValue} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Store Chart - only if global */}
                {isGlobal && (chartView === 'overview' || chartView === 'stores') && storeSales.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">
                                {metricLabel} by Store
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={storeSales.slice(0, 8)}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="storeName"
                                        tick={{ fontSize: 10 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis tickFormatter={(value) => value.toLocaleString('en-ZA')} />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Bar dataKey={metric} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Department Bar Chart - detailed view */}
                {chartView === 'departments' && departmentSales.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">
                                Department Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart
                                    data={departmentSales.slice(0, 8)}
                                    layout="vertical"
                                    margin={{ left: 60 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        type="number"
                                        tickFormatter={(value) => value.toLocaleString('en-ZA')}
                                    />
                                    <YAxis type="category" dataKey="departmentName" />
                                    <Tooltip formatter={formatTooltipValue} />
                                    <Bar dataKey={metric} fill="#22c55e" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Supplied by the page (e.g. the payment-method breakdown), so it
                    shares this grid and completes the 2x2 arrangement. */}
                {extraCharts}
            </div>
        </div>
    )
}