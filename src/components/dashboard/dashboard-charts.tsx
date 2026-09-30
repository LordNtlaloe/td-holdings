import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    AreaChart,
    Area,
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
} from 'recharts'
import type { DashboardData } from '#/types/dashboard'
import { formatCurrency, formatDateShort } from './dashboard-utils'

interface DashboardChartsProps {
    data: DashboardData
    isGlobal: boolean
}

// ─── Colour palette ──────────────────────────────────────────────────────
// Wider palette so each of the 10 product slices is distinguishable
const PRODUCT_COLORS = [
    '#164e63', '#0e7490', '#0891b2', '#22d3ee', '#67e8f9',
    '#0f766e', '#115e59', '#14b8a6', '#5eead4', '#a7f3d0',
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function EmptyChart({ message = 'No data yet' }: { message?: string }) {
    return (
        <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
    )
}

// Build hourly buckets from dailySeries + rawSalesByHour if available,
// otherwise derive from salesCount patterns in dailySeries (approximation).
// The backend passes hourlyBuckets directly so we just render it.
function HourlySalesChart({ data }: { data: DashboardData }) {
    const hourly = data.hourlyBuckets
    if (!hourly || hourly.length === 0) return <EmptyChart message="No hourly data available" />

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="hour"
                    tickFormatter={(h: number) => `${h}:00`}
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
                    formatter={(value: unknown) => [
                        formatCurrency(typeof value === 'number' ? value : 0),
                        'Revenue',
                    ]}
                    labelFormatter={(h) => `${h}:00 – ${Number(h) + 1}:00`}
                />
                <Bar dataKey="revenue" fill="#0e7490" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

function TopProductsPieChart({ data }: { data: DashboardData }) {
    const products = data.topProductsByUnits
    if (!products || products.length === 0) return <EmptyChart message="No product sales yet" />

    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie
                    data={products}
                    dataKey="quantity"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                >
                    {products.map((_: unknown, i: number) => (
                        <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                    ))}
                </Pie>
                <Legend
                    formatter={(value) => (
                        <span className="text-xs text-muted-foreground">
                            {String(value).length > 18 ? `${String(value).slice(0, 18)}…` : String(value)}
                        </span>
                    )}
                />
                <Tooltip
                    formatter={(value: unknown, name: unknown, item: any) => {
                        const revenue = item?.payload?.revenue
                        const units = typeof value === 'number' ? value.toLocaleString() : '0'
                        return [
                            `${units} sold${typeof revenue === 'number' ? ` · ${formatCurrency(revenue)}` : ''}`,
                            String(name),
                        ]
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}

function CashFlowChart({ data }: { data: DashboardData }) {
    const cashFlow = data.financial?.cashFlow
    if (!cashFlow || cashFlow.length === 0) return <EmptyChart />

    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashFlow}>
                <defs>
                    <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#164e63" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#164e63" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                />
                <YAxis
                    tickFormatter={(v) => `R${v}`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={60}
                />
                <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                        formatCurrency(typeof value === 'number' ? value : 0),
                        name === 'inflow' ? 'Revenue' : name === 'outflow' ? 'Outflow' : 'Net',
                    ]}
                    labelFormatter={(label) => formatDateShort(String(label))}
                />
                <Area
                    type="monotone"
                    dataKey="inflow"
                    stroke="#164e63"
                    fill="url(#inflowFill)"
                    strokeWidth={2}
                    name="inflow"
                />
                <Area
                    type="monotone"
                    dataKey="outflow"
                    stroke="#dc2626"
                    fill="url(#outflowFill)"
                    strokeWidth={2}
                    name="outflow"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// ─── Main export ──────────────────────────────────────────────────────────

export function DashboardCharts({ data, isGlobal }: DashboardChartsProps) {
    return (
        <div className="space-y-4">
            {/* Revenue — 14 days */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue, last 14 days</CardTitle>
                    <CardDescription>
                        {isGlobal ? 'Combined revenue across all stores' : 'Revenue for your store'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.dailySeries}>
                            <defs>
                                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#164e63" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#164e63" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDateShort}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <YAxis
                                tickFormatter={(v) => `R${v}`}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                width={60}
                            />
                            <Tooltip
                                formatter={(value: unknown) => [
                                    formatCurrency(typeof value === 'number' ? value : 0),
                                    'Revenue',
                                ]}
                                labelFormatter={(label) => formatDateShort(String(label))}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#164e63"
                                fill="url(#revenueFill)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Two-column row: hourly heatmap + top products donut */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales by Hour</CardTitle>
                        <CardDescription>Revenue distribution throughout the day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HourlySalesChart data={data} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Products by Units Sold</CardTitle>
                        <CardDescription>Best sellers by volume — all departments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopProductsPieChart data={data} />
                    </CardContent>
                </Card>
            </div>

            {/* Top Products — revenue */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Products by Revenue</CardTitle>
                    <CardDescription>All-time revenue per product</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.topProducts.length === 0 ? (
                        <EmptyChart message="No sales recorded yet" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.topProducts} layout="vertical" margin={{ left: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(v) => `R${v}`} fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={140}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    formatter={(value: unknown) => [
                                        formatCurrency(typeof value === 'number' ? value : 0),
                                        'Revenue',
                                    ]}
                                />
                                <Bar dataKey="revenue" fill="#164e63" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Cash flow — global / admin only */}
            {isGlobal && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cash Flow, last 14 days</CardTitle>
                        <CardDescription>Revenue (inflow) vs purchases + expenses (outflow)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CashFlowChart data={data} />
                    </CardContent>
                </Card>
            )}

            {/* Store Revenue — global only */}
            {isGlobal && data.storeBreakdown.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Store</CardTitle>
                        <CardDescription>All-time completed sales revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.storeBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="storeName" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    tickFormatter={(v) => `R${v}`}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    formatter={(value: unknown) => [
                                        formatCurrency(typeof value === 'number' ? value : 0),
                                        'Revenue',
                                    ]}
                                />
                                <Bar dataKey="revenue" fill="#164e63" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}