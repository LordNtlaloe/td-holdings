import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Truck, AlertCircle } from 'lucide-react'
import type { TransferWithStores } from '#/types/transfers'

interface ShipTransferDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transfer: TransferWithStores | null
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}

export function ShipTransferDialog({
    open,
    onOpenChange,
    transfer,
    onSubmit,
    isLoading,
    error,
}: ShipTransferDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ship Transfer</DialogTitle>
                    <DialogDescription>
                        This will deduct stock from "{transfer?.fromStore?.name}" now, using
                        FIFO across its batches. This cannot be undone except by cancelling the
                        transfer afterward.
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="py-4 text-sm">
                    <p>
                        <span className="font-medium">From:</span> {transfer?.fromStore?.name}
                    </p>
                    <p>
                        <span className="font-medium">To:</span> {transfer?.toStore?.name}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        <Truck className="mr-2 h-4 w-4" />
                        {isLoading ? 'Shipping...' : 'Confirm Shipment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}