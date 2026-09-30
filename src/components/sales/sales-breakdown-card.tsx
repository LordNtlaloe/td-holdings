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
}

export function ProductSalesBreakdownCard({
    todayProductSales,
    availableDepartments,
    isLoadingDepartments,
    breakdownDepartment,
    onBreakdownDepartmentChange,
    storeFilter,
    stores,
}: ProductSalesBreakdownCardProps) {
    const products = todayProductSales ?? []

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

    const showDepartmentColumn = availableDepartments.length > 0 && breakdownDepartment === 'all'

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <CardTitle>Today's Product Sales</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                            {storeFilter !== 'all' && stores
                                ? ` · ${stores.find((s) => s._id === storeFilter)?.name ?? ''}`
                                : ''}
                            {breakdownDepartment !== 'all' && ` · ${breakdownDepartment}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isLoadingDepartments && availableDepartments.length > 0 && (
                            <Select value={breakdownDepartment} onValueChange={onBreakdownDepartmentChange}>
                                <SelectTrigger className="w-44 shrink-0">
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
                    <p className="py-8 text-center text-muted-foreground">
                        No sales recorded today
                        {breakdownDepartment !== 'all' ? ` in ${breakdownDepartment}` : ''}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
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
                )}
            </CardContent>
        </Card>
    )
}