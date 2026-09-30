'use client'

import { useState } from 'react'
import { useSaleById, useUpdateSalePaymentMethod, usePrintReceipt } from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Printer, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Id } from '#/types/entities'
import type { Sale } from '#/types/sales'
import { formatCurrency, formatTimestamp, getStatusVariant } from './sales-utils'

interface TodaySaleDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    saleId: Id<'sales'> | null
    onSaleUpdated?: () => void
}

const PAYMENT_METHODS = [
    'Cash',
    'Card',
    'Mpesa',
    'Ecocash',
    'Bank Transfer',
    'Mobile Payment',
    'Credit',
    'Voucher',
]

export function TodaySaleDetailDialog({
    open,
    onOpenChange,
    saleId,
    onSaleUpdated,
}: TodaySaleDetailDialogProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('')
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const sale = useSaleById(saleId ?? undefined) as
        | (Sale & { discounts?: any[]; store?: any })
        | undefined
    const updateSalePaymentMethod = useUpdateSalePaymentMethod()
    const printReceipt = usePrintReceipt()
    const [isPrinting, setIsPrinting] = useState(false)

    const handleEdit = () => {
        if (sale) {
            setPaymentMethod(sale.paymentMethod || '')
            setReason('')
            setError(null)
            setIsEditing(true)
        }
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setError(null)
        setReason('')
    }

    const handleUpdate = async () => {
        if (!sale) return

        if (!paymentMethod) {
            setError('Please select a payment method')
            return
        }

        if (!reason.trim()) {
            setError('Please provide a reason for the change')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await updateSalePaymentMethod({
                saleId: sale._id,
                paymentMethod,
                reason: reason.trim(),
            })

            if (result.success) {
                toast.success('Payment method updated successfully')
                setIsEditing(false)
                onSaleUpdated?.()
            } else {
                setError(result.message || 'Failed to update payment method')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update payment method'
            setError(message)
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

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
                toast.success('Receipt printed successfully')
            } else {
                toast.error(result.error || 'Failed to print receipt')
            }
        } catch (err) {
            toast.error('Failed to print receipt')
        } finally {
            setIsPrinting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Sale Details</DialogTitle>
                    <DialogDescription>
                        View and manage transaction details
                    </DialogDescription>
                </DialogHeader>

                {sale === undefined ? (
                    <div className="space-y-4 py-4 px-6">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : !sale ? (
                    <p className="py-8 text-center text-muted-foreground px-6">Sale not found</p>
                ) : (
                    <ScrollArea className="flex-1 px-6">
                        <div className="space-y-4 pb-4">
                            {/* Header Info */}
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Transaction ID</span>
                                    <span className="font-mono text-xs">#{sale._id.slice(-8)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Store</span>
                                    <span>{sale.store?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer</span>
                                    <span>{sale.customer?.name || 'Walk-in'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date</span>
                                    <span>{formatTimestamp(sale.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                                </div>
                                <div className="flex justify-between font-medium text-lg pt-2">
                                    <span className="text-muted-foreground">Total</span>
                                    <span>{formatCurrency(sale.totalAmount)}</span>
                                </div>
                            </div>

                            <Separator />

                            {/* Payment Method - Editable */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Payment Method</Label>
                                    {sale.status === 'completed' && !isEditing && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleEdit}
                                            className="h-7 gap-1"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                        </Button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-3">
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map((method) => (
                                                    <SelectItem key={method} value={method}>
                                                        {method}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="space-y-1">
                                            <Label htmlFor="edit-reason" className="text-xs">
                                                Reason for change <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                id="edit-reason"
                                                placeholder="Why is this payment method being changed?"
                                                value={reason}
                                                onChange={(e) => {
                                                    setReason(e.target.value)
                                                    if (error) setError(null)
                                                }}
                                                rows={2}
                                            />
                                        </div>

                                        {error && (
                                            <Alert variant="destructive" className="py-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-sm">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleUpdate}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                        Updating...
                                                    </>
                                                ) : (
                                                    'Update Payment'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-md bg-muted p-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{sale.paymentMethod || 'Unknown'}</span>
                                            {sale.paymentSplits && (() => {
                                                try {
                                                    const splits = JSON.parse(sale.paymentSplits)
                                                    if (Array.isArray(splits) && splits.length > 0) {
                                                        return (
                                                            <div className="text-xs text-muted-foreground space-y-0.5">
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
                                                            </div>
                                                        )
                                                    }
                                                } catch (e) {
                                                    return null
                                                }
                                                return null
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Line Items */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Items Purchased</Label>
                                <div className="space-y-2">
                                    {sale.items && sale.items.length > 0 ? (
                                        sale.items.map((item: any) => (
                                            <div key={item._id} className="rounded-md border p-3">
                                                <div className="flex justify-between">
                                                    <span className="font-medium">
                                                        {item.product?.name || item.productName || 'Unknown'}
                                                    </span>
                                                    <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                    <span>Qty: {item.quantity}</span>
                                                    <span>Unit: {formatCurrency(item.unitPrice)}</span>
                                                    {item.size && <span>Size: {item.size}</span>}
                                                    {item.color && <span>Color: {item.color}</span>}
                                                    {item.variant && <span>Variant: {item.variant}</span>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No items found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="gap-2 px-6 py-4 border-t flex-shrink-0">
                    {/* Always show reprint button for completed sales */}
                    {sale && sale.status === 'completed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReprint}
                            disabled={isPrinting}
                        >
                            {isPrinting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Printing...
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Reprint
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}