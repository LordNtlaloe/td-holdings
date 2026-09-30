import { useBatchesByProduct, useDeleteStockBatch } from '#/lib/api/hooks'
import { useState } from 'react'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ScrollArea } from '#/components/ui/scroll-area'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Id } from '#/types/entities'
import { AddBatchDialog } from './add-batch'
import { Card } from '../ui/card'

interface BatchListDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    medicationId: Id<'medications'> | null
    medicationName?: string
}

// matches getBatchesByMedication return shape: expiryStatus, not status
type ExpiryStatus = 'expired' | 'near' | 'safe'

const STATUS_CONFIG: Record<ExpiryStatus, {
    label: string
    badgeClass: string
    rowClass: string
    dot: string
}> = {
    expired: {
        label: 'Expired',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900',
        rowClass: 'bg-red-50/40 dark:bg-red-950/10',
        dot: 'bg-red-500',
    },
    near: {
        label: 'Near Expiry',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
        rowClass: 'bg-amber-50/40 dark:bg-amber-950/10',
        dot: 'bg-amber-500',
    },
    safe: {
        label: 'Safe',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
        rowClass: '',
        dot: 'bg-emerald-500',
    },
}

function StatusBadge({ status }: { status: ExpiryStatus }) {
    const cfg = STATUS_CONFIG[status]
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
            cfg.badgeClass
        )}>
            <span className={cn('size-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    )
}

export function BatchListDialog({
    open,
    onOpenChange,
    medicationId,
    medicationName,
}: BatchListDialogProps) {
    const batches = useBatchesByProduct(medicationId ?? undefined)
    const deleteBatch = useDeleteStockBatch()
    const [addOpen, setAddOpen] = useState(false)

    // your mutation takes `id`, not `batchId`
    const handleDelete = async (id: Id<'stockBatches'>) => {
        await deleteBatch({ id })
    }

    return (
        <Card className='max-w-3xl w-3xl' title='Batch List'>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="min-w-7xl bg-background border shadow-xl backdrop-blur-none w-3xl">
                    <DialogHeader>
                        <DialogTitle>Stock Batches</DialogTitle>
                        <DialogDescription>
                            {medicationName
                                ? `All batches for ${medicationName} — sorted FIFO (earliest expiry first)`
                                : 'Stock batches'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Legend */}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-emerald-500" /> Safe
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-amber-500" /> Expiring &lt; 90 days
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-red-500" /> Expired
                        </span>
                    </div>

                    <ScrollArea className="max-h-[400px] rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b bg-muted/80 backdrop-blur-sm">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Batch No.</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Expiry</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Qty</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Sell Price</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-2.5 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {batches === undefined ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            {[...Array(6)].map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <Skeleton className="h-4 w-full max-w-[80px]" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : batches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                                            No batches yet.{' '}
                                            <button
                                                onClick={() => setAddOpen(true)}
                                                className="text-primary underline underline-offset-4 hover:opacity-80"
                                            >
                                                Add the first one
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    batches.map((batch, idx) => {
                                        const cfg = STATUS_CONFIG[batch.expiryStatus]
                                        return (
                                            <tr
                                                key={batch._id}
                                                className={cn(
                                                    'border-b last:border-0 transition-colors',
                                                    cfg.rowClass,
                                                    idx === 0 && batch.expiryStatus !== 'expired'
                                                        ? 'ring-1 ring-inset ring-primary/20'
                                                        : ''
                                                )}
                                            >
                                                <td className="px-4 py-3 font-mono text-xs font-medium">
                                                    {batch.batchNumber}
                                                    {idx === 0 && batch.expiryStatus !== 'expired' && (
                                                        <span className="ml-2 text-[10px] text-primary font-sans">FIFO</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(batch.expiryDate).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 font-medium tabular-nums">
                                                    {batch.quantity.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums">
                                                    {batch.sellingPrice.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={batch.expiryStatus} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-7 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete batch?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Batch <strong>{batch.batchNumber}</strong> will be permanently removed.
                                                                    This cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(batch._id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </ScrollArea>

                    <div className="flex justify-between items-center pt-1">
                        <p className="text-xs text-muted-foreground">
                            {batches
                                ? `${batches.length} batch${batches.length !== 1 ? 'es' : ''}`
                                : ''}
                        </p>
                        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                            <Plus className="size-3.5" />
                            Add Batch
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AddBatchDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                medicationId={medicationId}
                medicationName={medicationName}
            />
        </Card>
    )
}