import { useAddStockBatch } from '#/lib/api/hooks'
import { useForm } from '@tanstack/react-form'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import type { Id } from '#/types/entities'

interface AddBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    medicationId: Id<'medications'> | null
    medicationName?: string
}

export function AddBatchDialog({
    open,
    onOpenChange,
    medicationId,
    medicationName,
}: AddBatchDialogProps) {
    const addStockBatch = useAddStockBatch()

    const form = useForm({
        defaultValues: {
            batchNumber: '',
            expiryDate: '',
            quantity: '',
            costPrice: '',
            sellingPrice: '',
        },
        onSubmit: async ({ value }) => {
            if (!medicationId) return
            await addStockBatch({
                medicationId,
                batchNumber: Number(value.batchNumber),   // schema: v.number()
                expiryDate: value.expiryDate,
                quantity: Number(value.quantity),
                costPrice: Number(value.costPrice),
                sellingPrice: Number(value.sellingPrice),
            })
            onOpenChange(false)
            form.reset()
        },
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-600 bg-background border shadow-xl backdrop-blur-none w-600">
                <DialogHeader>
                    <DialogTitle>Add Stock Batch</DialogTitle>
                    {medicationName && (
                        <DialogDescription>
                            Adding a new batch for <strong>{medicationName}</strong>
                        </DialogDescription>
                    )}
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                    className="space-y-4 py-2"
                >
                    {/* Batch Number — numeric per schema */}
                    <form.Field name="batchNumber">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="batch-no">Batch Number *</Label>
                                <Input
                                    id="batch-no"
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 20240001"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Expiry Date */}
                    <form.Field name="expiryDate">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="expiry">Expiry Date *</Label>
                                <Input
                                    id="expiry"
                                    type="date"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Quantity */}
                    <form.Field name="quantity">
                        {(field) => (
                            <div className="space-y-1.5">
                                <Label htmlFor="qty">Quantity *</Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 100"
                                    value={field.state.value}
                                    onChange={e => field.handleChange(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>

                    {/* Prices side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <form.Field name="costPrice">
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor="cost">Cost Price *</Label>
                                    <Input
                                        id="cost"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={field.state.value}
                                        onChange={e => field.handleChange(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="sellingPrice">
                            {(field) => (
                                <div className="space-y-1.5">
                                    <Label htmlFor="sell">Selling Price *</Label>
                                    <Input
                                        id="sell"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={field.state.value}
                                        onChange={e => field.handleChange(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <form.Subscribe selector={s => s.isSubmitting}>
                            {(isSubmitting) => (
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding…' : 'Add Batch'}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}