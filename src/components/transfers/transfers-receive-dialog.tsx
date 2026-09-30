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
import { Textarea } from '#/components/ui/textarea'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { AlertTriangle, PackageCheck, AlertCircle } from 'lucide-react'
import type { ReceiveDraftItem, TransferWithStores } from '#/types/transfers'

interface ReceiveTransferDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transfer: TransferWithStores | null
    receiveItems: ReceiveDraftItem[]
    onReceiveItemsChange: (items: ReceiveDraftItem[]) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}

export function ReceiveTransferDialog({
    open,
    onOpenChange,
    transfer,
    receiveItems,
    onReceiveItemsChange,
    onSubmit,
    isLoading,
    error,
}: ReceiveTransferDialogProps) {
    const updateReceiveItem = (index: number, patch: Partial<ReceiveDraftItem>) => {
        onReceiveItemsChange(
            receiveItems.map((item, i) => (i === index ? { ...item, ...patch } : item))
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                if (!open) {
                    onReceiveItemsChange([])
                }
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Receive Transfer</DialogTitle>
                    <DialogDescription>
                        Confirm how much of each item actually arrived at "
                        {transfer?.toStore?.name}". Any shortfall needs a reason.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 py-4">
                    {receiveItems.length === 0 && (
                        <p className="text-sm text-muted-foreground">Loading items...</p>
                    )}

                    {receiveItems.map((item, index) => {
                        const hasDiscrepancy = item.quantityReceived !== item.quantityRequested
                        return (
                            <div key={item.transferItemId} className="space-y-2 rounded-lg border p-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{item.productName}</span>
                                    <span className="text-sm text-muted-foreground">
                                        Requested: {item.quantityRequested}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="w-32 text-sm">Quantity Received</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={item.quantityRequested}
                                        value={item.quantityReceived}
                                        onChange={(e) =>
                                            updateReceiveItem(index, {
                                                quantityReceived: Number(e.target.value),
                                            })
                                        }
                                        className="w-24"
                                        disabled={isLoading}
                                    />
                                    {hasDiscrepancy && (
                                        <Badge variant="destructive" className="ml-2">
                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                            Discrepancy
                                        </Badge>
                                    )}
                                </div>
                                {hasDiscrepancy && (
                                    <div className="space-y-1">
                                        <Label className="text-sm">Reason for discrepancy</Label>
                                        <Textarea
                                            value={item.discrepancyReason}
                                            onChange={(e) =>
                                                updateReceiveItem(index, { discrepancyReason: e.target.value })
                                            }
                                            placeholder="e.g. damaged in transit, miscounted at source..."
                                            rows={2}
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        <PackageCheck className="mr-2 h-4 w-4" />
                        {isLoading ? 'Receiving...' : 'Confirm Receipt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}