import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '#/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '#/components/ui/select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import type { DraftItem } from '#/types/transfers'
import type { Store } from "#/types/stores"

interface CreateTransferDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    centralStores: Store[]
    branchStores: Store[]
    availableProducts: any[]
    fromStoreId: string | null
    toStoreId: string | null
    notes: string
    draftItems: DraftItem[]
    onFromStoreChange: (value: string | null) => void
    onToStoreChange: (value: string | null) => void
    onNotesChange: (value: string) => void
    onDraftItemsChange: (items: DraftItem[]) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
    trigger?: React.ReactNode
}

export function CreateTransferDialog({
    open,
    onOpenChange,
    centralStores,
    branchStores,
    availableProducts,
    fromStoreId,
    toStoreId,
    notes,
    draftItems,
    onFromStoreChange,
    onToStoreChange,
    onNotesChange,
    onDraftItemsChange,
    onSubmit,
    isLoading,
    error,
    trigger,
}: CreateTransferDialogProps) {
    const addDraftItem = () => {
        onDraftItemsChange([...draftItems, { productId: '', quantityRequested: 1 }])
    }

    const updateDraftItem = (index: number, patch: Partial<DraftItem>) => {
        onDraftItemsChange(
            draftItems.map((item, i) => (i === index ? { ...item, ...patch } : item))
        )
    }

    const removeDraftItem = (index: number) => {
        onDraftItemsChange(draftItems.filter((_, i) => i !== index))
    }

    const resetForm = () => {
        onFromStoreChange(null)
        onToStoreChange(null)
        onNotesChange('')
        onDraftItemsChange([])
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                if (!open) resetForm()
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Transfer
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Transfer</DialogTitle>
                    <DialogDescription>
                        Request stock to move from a central store to a branch. Nothing leaves
                        the source until the transfer is shipped.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From (Central Store)</Label>
                            <Select
                                value={fromStoreId || undefined}
                                onValueChange={(value) => {
                                    onFromStoreChange(value)
                                    onDraftItemsChange([])
                                }}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source store" />
                                </SelectTrigger>
                                <SelectContent>
                                    {centralStores.map((store) => (
                                        <SelectItem key={store._id} value={store._id}>
                                            {store.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>To (Branch)</Label>
                            <Select
                                value={toStoreId || undefined}
                                onValueChange={onToStoreChange}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branchStores.map((store) => (
                                        <SelectItem key={store._id} value={store._id}>
                                            {store.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Items</Label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={addDraftItem}
                                disabled={!fromStoreId || isLoading}
                            >
                                <Plus className="mr-2 h-3 w-3" />
                                Add Item
                            </Button>
                        </div>

                        {!fromStoreId && (
                            <p className="text-sm text-muted-foreground">
                                Select a source store first to choose items.
                            </p>
                        )}

                        {fromStoreId && draftItems.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No items added yet. Click "Add Item" to start.
                            </p>
                        )}

                        <div className="space-y-2">
                            {draftItems.map((item, index) => {
                                const pickedElsewhere = draftItems
                                    .filter((_, i) => i !== index)
                                    .map((d) => d.productId)

                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        <Select
                                            value={item.productId || undefined}
                                            onValueChange={(value) => updateDraftItem(index, { productId: value })}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select a product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableProducts
                                                    .filter(
                                                        (p) =>
                                                            !pickedElsewhere.includes(p.productId) ||
                                                            p.productId === item.productId
                                                    )
                                                    .map((p) => (
                                                        <SelectItem key={p.productId} value={p.productId}>
                                                            {p.product?.name ?? 'Unknown'} (avail: {p.quantity})
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.quantityRequested}
                                            onChange={(e) =>
                                                updateDraftItem(index, {
                                                    quantityRequested: Number(e.target.value),
                                                })
                                            }
                                            className="w-24"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeDraftItem(index)}
                                            disabled={isLoading}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Any context for this transfer"
                            rows={2}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Transfer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}