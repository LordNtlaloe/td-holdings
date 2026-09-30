import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type {  Batch, } from '#/types/inventory'


interface ReorderLevelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    reorderLevel: number
    onReorderLevelChange: (value: number) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}

export function ReorderLevelDialog({
    open,
    onOpenChange,
    reorderLevel,
    onReorderLevelChange,
    onSubmit,
    isLoading,
    error,
}: ReorderLevelDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Reorder Level</DialogTitle>
                    <DialogDescription>
                        Set the minimum stock level for this product.
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
                        <Label>Reorder Level</Label>
                        <Input
                            type="number"
                            value={reorderLevel}
                            onChange={(e) => onReorderLevelChange(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface AdjustBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batch: Batch | null
    adjustQuantity: number
    adjustReason: string
    onQuantityChange: (value: number) => void
    onReasonChange: (value: string) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}

export function AdjustBatchDialog({
    open,
    onOpenChange,
    adjustQuantity,
    adjustReason,
    onQuantityChange,
    onReasonChange,
    onSubmit,
    isLoading,
    error,
}: AdjustBatchDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Batch Quantity</DialogTitle>
                    <DialogDescription>
                        Update the quantity for this batch.
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
                        <Label>New Quantity</Label>
                        <Input
                            type="number"
                            value={adjustQuantity}
                            onChange={(e) => onQuantityChange(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Input
                            value={adjustReason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder="Why is this adjustment needed?"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        {isLoading ? 'Updating...' : 'Update Quantity'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}