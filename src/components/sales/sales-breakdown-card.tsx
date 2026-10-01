import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MobileCardList } from '#/components/general/mobile-card-list'
import type { Id } from '#/types/entities'
import { formatCurrency } from './sales-utils'

interface ProductSalesBreakdownCardProps {
    todayProductSales: any[] | undefined
    availableDepartments: string[]
    isLoadingDepartments: boolean
    breakdownDepartment: string
    onBreakdownDepartmentChange: (value: string) => void
    storeFilter: string
    stores: { _id: Id<'stores'>; name: string }[] | undefined
    /** Active date pickers (YYYY-MM-DD). Empty means "today". */
    dateFrom?: string
    dateTo?: string
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
}

const SHORT_DATE: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
}

/**
 * Parses a `YYYY-MM-DD` value from a date input as a *local* date.
 *
 * `new Date('2026-10-01')` is parsed as UTC midnight, which renders as
 * 30 September in any timezone behind UTC. Building the date from its parts
 * keeps the heading on the day the user actually picked.
 */
function parseFilterDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function ProductSalesBreakdownCard({
    todayProductSales,
    availableDepartments,
    isLoadingDepartments,
    breakdownDepartment,
    onBreakdownDepartmentChange,
    storeFilter,
    stores,
    dateFrom,
    dateTo,
}: ProductSalesBreakdownCardProps) {
    const products = todayProductSales ?? []

    /**
     * The card used to be hardcoded to "today", which was wrong as soon as a
     * date range was chosen — the numbers followed the filter but the heading
     * still claimed to be today's takings. Both now describe the same period.
     */
    const range = useMemo(() => {
        const today = new Date()

        if (!dateFrom && !dateTo) {
            return { title: "Today's Product Sales", subtitle: today.toLocaleDateString('en-GB', LONG_DATE) }
        }

        if (dateFrom && dateTo) {
            const from = parseFilterDate(dateFrom)
            const to = parseFilterDate(dateTo)
            // A single day reads better as a full date than as "1 Oct – 1 Oct".
            const sameDay = dateFrom === dateTo
            return {
                title: 'Product Sales',
                subtitle: sameDay
                    ? from.toLocaleDateString('en-GB', LONG_DATE)
                    : `${from.toLocaleDateString('en-GB', SHORT_DATE)} – ${to.toLocaleDateString('en-GB', SHORT_DATE)}`,
            }
        }

        if (dateFrom) {
            return {
                title: 'Product Sales',
                subtitle: `From ${parseFilterDate(dateFrom).toLocaleDateString('en-GB', SHORT_DATE)}`,
            }
        }

        return {
            title: 'Product Sales',
            subtitle: `Up to ${parseFilterDate(dateTo!).toLocaleDateString('en-GB', SHORT_DATE)}`,
        }
    }, [dateFrom, dateTo])

    const totals = useMemo(() => {
        return {
            qty: products.reduce((sum: number, p: any) => sum + p.totalQuantity, 0),
            revenue: products.reduce((sum: number, p: any) => sum + p.totalRevenue, 0),
        }
    }, [products])

    const totalByMethod = useMemo(() => {
        const acc: Record<string, number> = {}
        products.forEach((p: any) => {
            p.paymentMethods?.forEach((pm: any) => {
                acc[pm.method] = (acc[pm.method] ?? 0) + pm.amount
            })
        })
        return acc
    }, [products])

    // Shown both in the card's empty state and as the mobile list's fallback.
    const emptyLabel =
        `${dateFrom || dateTo ? 'No sales recorded in this period' : 'No sales recorded today'}` +
        `${breakdownDepartment !== 'all' ? ` in ${breakdownDepartment}` : ''}`

    const showDepartmentColumn = availableDepartments.length > 0 && breakdownDepartment === 'all'

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                        <CardTitle>{range.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {range.subtitle}
                            {storeFilter !== 'all' && stores
                                ? ` · ${stores.find((s) => s._id === storeFilter)?.name ?? ''}`
                                : ''}
                            {breakdownDepartment !== 'all' && ` · ${breakdownDepartment}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isLoadingDepartments && availableDepartments.length > 0 && (
                            <Select value={breakdownDepartment} onValueChange={onBreakdownDepartmentChange}>
                                <SelectTrigger className="w-full shrink-0 sm:w-44">
                                    <SelectValue placeholder="All departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All departments</SelectItem>
                                    {availableDepartments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {todayProductSales === undefined ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                ) : products.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">{emptyLabel}</p>
                ) : (
                    <div className="space-y-3">
                        {/* Phones get one card per product — this table is six
                            columns wide and cannot be read by scrolling sideways. */}
                        <MobileCardList
                            items={products}
                            getId={(product: any) => product.productId}
                            title={(product: any) => (
                                <div className="space-y-0.5">
                                    <div>{product.productName}</div>
                                    {product.sku && (
                                        <div className="font-mono text-xs font-normal text-muted-foreground">
                                            {product.sku}
                                        </div>
                                    )}
                                </div>
                            )}
                            fields={(product: any) => [
                                {
                                    label: 'Department',
                                    hidden: !showDepartmentColumn,
                                    value: product.department ? (
                                        <Badge variant="secondary" className="text-xs">
                                            {product.department}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    ),
                                },
                                { label: 'Qty', value: product.totalQuantity },
                                {
                                    label: 'Revenue',
                                    value: formatCurrency(product.totalRevenue),
                                },
                                {
                                    label: 'Payment',
                                    value: product.paymentMethods?.length ? (
                                        <div className="space-y-0.5">
                                            {product.paymentMethods.map((pm: any) => (
                                                <div key={pm.method} className="text-xs">
                                                    {pm.method}: {formatCurrency(pm.amount)}{' '}
                                                    <span className="text-muted-foreground">
                                                        ({Math.round(pm.quantity)} units)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    ),
                                },
                            ]}
                            empty={emptyLabel}
                        />

                        {/* md and up: the full table, with payment-method detail. */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Product</th>
                                        <th className="pb-2 font-medium text-right">SKU</th>
                                        {showDepartmentColumn && (
                                            <th className="pb-2 font-medium text-right">Department</th>
                                        )}
                                        <th className="pb-2 font-medium text-right">Qty</th>
                                        <th className="pb-2 font-medium text-right">Revenue</th>
                                        <th className="pb-2 font-medium text-right">Payment Methods</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product: any) => (
                                        <tr key={product.productId} className="border-b last:border-0">
                                            <td className="py-2 font-medium">{product.productName}</td>
                                            <td className="py-2 text-right font-mono text-xs text-muted-foreground">
                                                {product.sku}
                                            </td>
                                            {showDepartmentColumn && (
                                                <td className="py-2 text-right">
                                                    {product.department ? (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {product.department}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-2 text-right">{product.totalQuantity}</td>
                                            <td className="py-2 text-right font-medium">
                                                {formatCurrency(product.totalRevenue)}
                                            </td>
                                            <td className="py-2 text-right">
                                                <div className="space-y-0.5">
                                                    {product.paymentMethods.map((pm: any) => (
                                                        <div key={pm.method} className="flex justify-end gap-2 text-xs">
                                                            <span className="text-muted-foreground">{pm.method}:</span>
                                                            <span>{formatCurrency(pm.amount)}</span>
                                                            <span className="text-muted-foreground">
                                                                ({Math.round(pm.quantity)} units)
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t bg-muted/30 font-medium">
                                        <td className="py-2 pl-1">
                                            Total
                                            {breakdownDepartment !== 'all' && (
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    ({breakdownDepartment})
                                                </span>
                                            )}
                                        </td>
                                        <td />
                                        {showDepartmentColumn && <td />}
                                        <td className="py-2 text-right">{totals.qty}</td>
                                        <td className="py-2 text-right">{formatCurrency(totals.revenue)}</td>
                                        <td className="py-2 text-right">
                                            {Object.entries(totalByMethod).map(([method, amount]) => (
                                                <div key={method} className="text-xs">
                                                    {method}: {formatCurrency(amount as number)}
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* The totals row folds away with the table, so repeat it here. */}
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm md:hidden">
                            <div className="flex items-center justify-between gap-3 font-medium">
                                <span>
                                    Total
                                    {breakdownDepartment !== 'all' && (
                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                            ({breakdownDepartment})
                                        </span>
                                    )}
                                </span>
                                <span>{formatCurrency(totals.revenue)}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{totals.qty} units</span>
                                <span className="flex flex-wrap justify-end gap-x-3">
                                    {Object.entries(totalByMethod).map(([method, amount]) => (
                                        <span key={method} className="whitespace-nowrap">
                                            {method}: {formatCurrency(amount as number)}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}