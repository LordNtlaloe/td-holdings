import { useMemo, useState } from 'react'
import { useApiQuery } from '#/lib/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Boxes, PackageX, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { endOfDay, startOfDay } from './sales-utils'

interface ProductPerformanceProps {
    storeFilter: string
    dateFrom: string
    dateTo: string
}

interface ProductRow {
    productId: string
    productName: string
    sku: string
    department: string | null
    isActive: boolean
    addedAt: number
    units: number
    transactions: number
    lastSoldAt: number | null
    stockOnHand: number
}

interface DepartmentRow {
    department: string
    products: number
    soldProducts: number
    neverSoldCount: number
    units: number
}

const fmt = (value: number) => value.toLocaleString('en-ZA')

function shortDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function SummaryTile({
    title,
    value,
    sub,
    icon: Icon,
    tone,
}: {
    title: string
    value: string
    sub: string
    icon: React.ElementType
    tone?: 'warn'
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon
                    className={
                        tone === 'warn'
                            ? 'h-4 w-4 text-destructive'
                            : 'h-4 w-4 text-muted-foreground'
                    }
                />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
        </Card>
    )
}

/** Ranked product table shared by the Top sellers and Least sold tabs. */
function SellerTable({ rows, emptyLabel }: { rows: ProductRow[]; emptyLabel: string }) {
    if (rows.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">{emptyLabel}</p>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="hidden w-10 sm:table-cell">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    <TableHead className="hidden sm:table-cell">Department</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Last sold</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row, index) => (
                    <TableRow key={row.productId}>
                        <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                            {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                            {row.productName}
                            {!row.isActive && (
                                <Badge variant="outline" className="ml-2 align-middle">
                                    Inactive
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{row.sku}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {row.department ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                            {fmt(row.units)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {fmt(row.transactions)}
                        </TableCell>
                        <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                            {row.lastSoldAt ? shortDate(row.lastSoldAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {fmt(row.stockOnHand)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

/** Products with no sales in the selected period. */
function NeverSoldTable({ rows }: { rows: ProductRow[] }) {
    const [query, setQuery] = useState('')
    const [activeOnly, setActiveOnly] = useState(false)
    const [showAll, setShowAll] = useState(false)

    const filtered = useMemo(() => {
        let result = rows
        if (activeOnly) result = result.filter((row) => row.isActive)
        const q = query.trim().toLowerCase()
        if (q) {
            result = result.filter(
                (row) =>
                    row.productName.toLowerCase().includes(q) ||
                    row.sku.toLowerCase().includes(q) ||
                    (row.department ?? '').toLowerCase().includes(q)
            )
        }
        return result
    }, [rows, query, activeOnly])

    const visible = showAll ? filtered : filtered.slice(0, 15)

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-55">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search product, SKU or department…"
                        className="pl-8"
                    />
                </div>
                <Button
                    variant={activeOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveOnly((prev) => !prev)}
                >
                    Active only
                </Button>
                <span className="text-sm text-muted-foreground">
                    {fmt(filtered.length)} of {fmt(rows.length)}
                </span>
            </div>

            {visible.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                    Nothing matches those filters
                </p>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead className="text-right">Stock on hand</TableHead>
                                <TableHead className="text-right">Added</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((row) => (
                                <TableRow key={row.productId}>
                                    <TableCell className="font-medium">
                                        {row.productName}
                                        {!row.isActive && (
                                            <Badge variant="outline" className="ml-2 align-middle">
                                                Inactive
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{row.sku}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {row.department ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {row.stockOnHand > 0 ? (
                                            fmt(row.stockOnHand)
                                        ) : (
                                            <span className="text-muted-foreground">0</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {shortDate(row.addedAt)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filtered.length > visible.length && (
                        <div className="flex justify-center">
                            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                                Show all {fmt(filtered.length)}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export function ProductPerformance({ storeFilter, dateFrom, dateTo }: ProductPerformanceProps) {
    const params = useMemo(
        () => ({
            storeId: storeFilter !== 'all' ? storeFilter : undefined,
            dateFrom: dateFrom ? String(startOfDay(new Date(dateFrom))) : undefined,
            dateTo: dateTo ? String(endOfDay(new Date(dateTo))) : undefined,
            limit: 10,
        }),
        [storeFilter, dateFrom, dateTo]
    )

    const { data, isLoading } = useApiQuery<any>(
        'sales.getProductPerformance',
        '/api/sales/product-performance',
        params
    )

    const summary = data?.summary
    const topSellers: ProductRow[] = data?.topSellers ?? []
    const leastSellers: ProductRow[] = data?.leastSellers ?? []
    const neverSold: ProductRow[] = data?.neverSold ?? []
    const byDepartment: DepartmentRow[] = data?.byDepartment ?? []

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold">Product Performance</h2>
                <p className="text-sm text-muted-foreground">
                    What sold, what barely sold, and what never sold — by units, not revenue
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryTile
                    title="Products in Catalogue"
                    value={fmt(summary?.totalProducts ?? 0)}
                    sub={`${fmt(summary?.inactiveCount ?? 0)} inactive`}
                    icon={Boxes}
                />
                <SummaryTile
                    title="Sold in Period"
                    value={fmt(summary?.soldProducts ?? 0)}
                    sub={`${fmt(summary?.unitsSold ?? 0)} units moved`}
                    icon={TrendingUp}
                />
                <SummaryTile
                    title="Never Sold"
                    value={fmt(summary?.neverSoldCount ?? 0)}
                    sub="No sales in period"
                    icon={PackageX}
                    tone="warn"
                />
                <SummaryTile
                    title="Stock, Never Sold"
                    value={fmt(summary?.deadStockCount ?? 0)}
                    sub="Holding stock that never moved"
                    icon={TrendingDown}
                    tone="warn"
                />
            </div>

            <Card>
                <Tabs defaultValue="top">
                    <CardHeader className="pb-3">
                        <TabsList>
                            <TabsTrigger value="top">Top Sellers</TabsTrigger>
                            <TabsTrigger value="least">Least Sold</TabsTrigger>
                            <TabsTrigger value="never">Never Sold</TabsTrigger>
                            <TabsTrigger value="department">Departments</TabsTrigger>
                        </TabsList>
                    </CardHeader>

                    <CardContent>
                        <TabsContent value="top" className="mt-0">
                            <SellerTable
                                rows={topSellers}
                                emptyLabel="No products sold in this period"
                            />
                        </TabsContent>

                        <TabsContent value="least" className="mt-0">
                            <SellerTable
                                rows={leastSellers}
                                emptyLabel="No products sold in this period"
                            />
                        </TabsContent>

                        <TabsContent value="never" className="mt-0">
                            <NeverSoldTable rows={neverSold} />
                        </TabsContent>

                        <TabsContent value="department" className="mt-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="text-right">Products</TableHead>
                                        <TableHead className="text-right">Sold</TableHead>
                                        <TableHead className="text-right">Never sold</TableHead>
                                        <TableHead className="text-right">Units moved</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byDepartment.map((row) => (
                                        <TableRow key={row.department}>
                                            <TableCell className="font-medium">
                                                {row.department}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {fmt(row.products)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {fmt(row.soldProducts)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {row.neverSoldCount > 0 ? (
                                                    <span className="text-destructive">
                                                        {fmt(row.neverSoldCount)}
                                                    </span>
                                                ) : (
                                                    fmt(row.neverSoldCount)
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {fmt(row.units)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    )
}
