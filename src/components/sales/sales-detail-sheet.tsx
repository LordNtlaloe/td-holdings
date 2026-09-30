import { useSaleById, usePrintReceipt } from '#/lib/api/hooks'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { XCircle, Printer, Loader2, Pencil, History } from 'lucide-react'
import { useState } from 'react'
import type { Id } from '#/types/entities'
import type { Sale } from '#/types/sales'
import { formatCurrency, formatTimestamp, getStatusVariant } from './sales-utils'
import { toast } from "sonner"
import { EditSaleDialog } from './edit-sales-dialog'
import { SaleEditHistoryDialog } from './sales-edit-history-dialog'

interface SaleDetailSheetProps {
    saleId: Id<'sales'> | null
    open: boolean
    onClose: () => void
    canAction: boolean
    canVoid: boolean
    onVoid: (id: Id<'sales'>) => void
    onCancel: (id: Id<'sales'>) => void
}

// Helper to safely parse payment splits
function parsePaymentSplits(paymentSplits: string | undefined | null): any[] {
    if (!paymentSplits) return []
    try {
        const parsed = JSON.parse(paymentSplits)
        return Array.isArray(parsed) ? parsed : []
    } catch (e) {
        console.error('Failed to parse payment splits:', e)
        return []
    }
}

export function SaleDetailSheet({
    saleId,
    open,
    onClose,
    canAction,
    canVoid,
    onVoid,
    onCancel,
}: SaleDetailSheetProps) {
    const [isPrinting, setIsPrinting] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showHistoryDialog, setShowHistoryDialog] = useState(false)

    const sale = useSaleById(saleId ?? undefined) as
        | (Sale & { discounts?: any[]; store?: any })
        | undefined
    const printReceipt = usePrintReceipt()

    const handleReprint = async () => {
        if (!sale) return

        setIsPrinting(true)
        try {
            const result = await printReceipt({
                saleId: sale._id,
                storeName: sale.store?.name || 'TD Holdings',
                storePhone: sale.store?.phone || '',
                storeAddress: sale.store?.address || '',
                customerName: sale.customer?.name || 'Walk-in',
                cashierName: 'Cashier',
                paymentMethod: sale.paymentMethod || 'Unknown',
                amountReceived: sale.amountReceived || 0,
                changeDue: sale.changeDue || 0,
                items: sale.items?.map((item: any) => ({
                    productId: item.productId,
                    name: item.product?.name || item.productName || 'Unknown Product',
                    sku: item.product?.sku || '',
                    size: item.size,
                    color: item.color,
                    variant: item.variant,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    availableQuantity: 0,
                    departmentId: item.departmentId || '',
                    departmentName: item.departmentName || '',
                })) || [],
                discounts: sale.discounts?.map((d: any) => ({
                    productId: d.productId,
                    discountAmount: d.discountAmount,
                    reason: d.reason || '',
                })) || [],
                total: sale.totalAmount,
                itemCount: sale.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
                completedAt: sale.createdAt,
            })

            if (result.success) {
                toast('Receipt Printed', {
                    description: 'The receipt has been sent to the printer.',
                })
            } else {
                toast('Print Failed', {
                    description: result.error || 'Failed to print receipt',
                })
            }
        } catch (error) {
            console.error('Print error:', error)
            toast('Print Failed', {
                description: error instanceof Error ? error.message : 'Failed to print receipt',
            })
        } finally {
            setIsPrinting(false)
        }
    }

    const handleEditSuccess = () => {
        toast('Payment Method Updated', {
            description: 'The sale payment method has been updated successfully.',
        })
        // Refetch the sale data
        // The query will automatically refetch
    }

    return (
        <>
            <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    {sale === undefined ? (
                        <div className="space-y-4 pt-6">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    ) : !sale ? (
                        <p className="pt-6 text-sm text-muted-foreground">Sale not found.</p>
                    ) : (
                        <>
                            <SheetHeader className="mb-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <SheetTitle>Sale Detail</SheetTitle>
                                        <SheetDescription>
                                            {sale.store?.name ?? 'Unknown Store'} · {formatTimestamp(sale.createdAt)}
                                            {sale.status === 'cancelled' && sale.cancelledAt && (
                                                <span className="block text-destructive">
                                                    Cancelled: {formatTimestamp(sale.cancelledAt)}
                                                    {sale.cancelledReason && ` (${sale.cancelledReason})`}
                                                </span>
                                            )}
                                        </SheetDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        {(canAction || canVoid) && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setShowHistoryDialog(true)}
                                                title="View Edit History"
                                            >
                                                <History className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer</span>
                                    <span>{sale.customer?.name ?? 'Walk-in'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-muted-foreground">Total</span>
                                    <span>{formatCurrency(sale.totalAmount)}</span>
                                </div>
                                {sale.paymentMethod && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Payment Method</span>
                                        <div className="flex items-center gap-2">
                                            <span>{sale.paymentMethod}</span>
                                            {(canAction || canVoid) && sale.status === 'completed' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setShowEditDialog(true)}
                                                    title="Edit Payment Method"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {sale.paymentSplits && (() => {
                                    const splits = parsePaymentSplits(sale.paymentSplits)
                                    if (splits.length === 0) return null
                                    return (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Split</span>
                                            <span className="text-right text-xs">
                                                {splits.map((p: any) => (
                                                    <div key={p.method}>
                                                        {p.method}: {formatCurrency(p.amount)}
                                                        {p.changeDue && p.changeDue > 0 && (
                                                            <span className="text-muted-foreground">
                                                                {' '}(Change: {formatCurrency(p.changeDue)})
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </span>
                                        </div>
                                    )
                                })()}
                                {sale.discountTotal && sale.discountTotal > 0 && (
                                    <div className="flex justify-between text-destructive">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span>-{formatCurrency(sale.discountTotal)}</span>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-4" />

                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Line Items
                            </p>
                            <div className="space-y-3">
                                {sale.items && sale.items.length > 0 ? (
                                    sale.items.map((item: any) => (
                                        <div key={item._id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-medium">
                                                    {item.product?.name ?? item.productName ?? 'Unknown Product'}
                                                </span>
                                                <span className="shrink-0 font-medium">
                                                    {formatCurrency(item.unitPrice * item.quantity)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                                                <span>Qty: {item.quantity}</span>
                                                <span>Unit: {formatCurrency(item.unitPrice)}</span>
                                                {item.size && <span>Size: {item.size}</span>}
                                                {item.color && <span>Color: {item.color}</span>}
                                                {item.variant && <span>Variant: {item.variant}</span>}
                                            </div>
                                            {item.batches?.length > 0 && (
                                                <div className="mt-2 space-y-0.5">
                                                    {item.batches.map((b: any) => (
                                                        <div
                                                            key={b.batchId}
                                                            className="flex justify-between text-xs text-muted-foreground"
                                                        >
                                                            <span>Batch {b.batchNumber ?? b.batchId}</span>
                                                            <span>×{b.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No items found for this sale.</p>
                                )}
                            </div>

                            {(canAction || canVoid) && sale.status === 'completed' && (
                                <>
                                    <Separator className="my-4" />
                                    <div className="flex gap-2">
                                        {canVoid && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => onVoid(sale._id)}
                                            >
                                                <XCircle className="mr-1.5 h-4 w-4" />
                                                Void Sale
                                            </Button>
                                        )}
                                        {canAction && (
                                            <>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => onCancel(sale._id)}
                                                >
                                                    <XCircle className="mr-1.5 h-4 w-4" />
                                                    Cancel Sale
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={handleReprint}
                                                    disabled={isPrinting}
                                                >
                                                    {isPrinting ? (
                                                        <>
                                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                            Printing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Printer className="mr-1.5 h-4 w-4" />
                                                            Reprint
                                                        </>
                                                    )}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Edit Sale Dialog */}
            <EditSaleDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                sale={sale || null}
                onSuccess={handleEditSuccess}
            />

            {/* Edit History Dialog */}
            <SaleEditHistoryDialog
                open={showHistoryDialog}
                onOpenChange={setShowHistoryDialog}
                saleId={saleId}
            />
        </>
    )
}