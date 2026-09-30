'use client'

import { useState } from 'react'
import { useUpdateSalePaymentMethod } from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Sale } from '#/types/sales'
import { formatCurrency } from './sales-utils'

interface EditSaleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sale: Sale | null
    onSuccess: () => void
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

export function EditSaleDialog({ open, onOpenChange, sale, onSuccess }: EditSaleDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>('')
    const [reason, setReason] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const updateSalePaymentMethod = useUpdateSalePaymentMethod()

    // Reset form when dialog opens with new sale
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen && sale) {
            setPaymentMethod(sale.paymentMethod || '')
            setReason('')
            setError(null)
        }
        onOpenChange(newOpen)
    }

    const handleSubmit = async () => {
        if (!sale) return

        if (!paymentMethod) {
            setError('Please select a payment method')
            return
        }

        if (!reason.trim()) {
            setError('Please provide a reason for the change')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const result = await updateSalePaymentMethod({
                saleId: sale._id,
                paymentMethod,
                reason: reason.trim(),
            })

            if (result.success) {
                toast.success('Payment method updated successfully')
                onSuccess()
                onOpenChange(false)
            } else {
                setError(result.message || 'Failed to update payment method')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update payment method'
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!sale) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Sale Payment</DialogTitle>
                    <DialogDescription>
                        Update the payment method for sale #{sale._id.slice(-8)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label>Current Payment Method</Label>
                        <div className="rounded-md bg-muted p-3 text-sm font-medium">
                            {sale.paymentMethod || 'Unknown'}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paymentMethod">New Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger id="paymentMethod">
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Change</Label>
                        <Textarea
                            id="reason"
                            placeholder="Please explain why this payment method needs to be changed..."
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value)
                                if (error) setError(null)
                            }}
                            rows={3}
                        />
                    </div>

                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium">Sale Details</p>
                        <div className="mt-1 space-y-1 text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span className="font-medium text-foreground">
                                    {formatCurrency(sale.totalAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="font-medium text-foreground capitalize">
                                    {sale.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Date:</span>
                                <span className="font-medium text-foreground">
                                    {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Payment Method'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}