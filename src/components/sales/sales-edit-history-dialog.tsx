'use client'

import { useSaleEditHistory } from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimestamp } from './sales-utils'
import type { Id } from '#/types/entities'

interface SaleEditHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    saleId: Id<'sales'> | null
}

export function SaleEditHistoryDialog({ open, onOpenChange, saleId }: SaleEditHistoryDialogProps) {
    const editHistory = useSaleEditHistory(saleId ?? undefined)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Sale Edit History</DialogTitle>
                    <DialogDescription>
                        Track all changes made to this sale's payment method
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    {editHistory === undefined ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-md border p-4 space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-64" />
                                </div>
                            ))}
                        </div>
                    ) : editHistory.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No edits have been made to this sale.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editHistory.map((edit: any) => (
                                <div key={edit._id} className="rounded-md border p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">Edit #{editHistory.length - editHistory.indexOf(edit)}</Badge>
                                            <span className="text-sm text-muted-foreground">
                                                by {edit.editorName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimestamp(edit.editedAt)}
                                        </span>
                                    </div>

                                    {edit.changes.paymentMethod && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Payment Method Changed</p>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">From:</span>
                                                <span className="line-through text-destructive">
                                                    {edit.changes.paymentMethod.from}
                                                </span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="font-medium text-green-600">
                                                    {edit.changes.paymentMethod.to}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {edit.changes.paymentSplits && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Payment Splits Changed</p>
                                            <div className="text-sm">
                                                <div className="text-muted-foreground">From:</div>
                                                <div className="pl-4 text-xs">
                                                    {(() => {
                                                        try {
                                                            const splits = JSON.parse(edit.changes.paymentSplits.from || '[]')
                                                            return splits.map((s: any) => (
                                                                <div key={s.method}>
                                                                    {s.method}: {formatCurrency(s.amount)}
                                                                </div>
                                                            ))
                                                        } catch {
                                                            return <span>Invalid data</span>
                                                        }
                                                    })()}
                                                </div>
                                                <div className="text-muted-foreground mt-1">To:</div>
                                                <div className="pl-4 text-xs">
                                                    {(() => {
                                                        try {
                                                            const splits = JSON.parse(edit.changes.paymentSplits.to || '[]')
                                                            return splits.map((s: any) => (
                                                                <div key={s.method}>
                                                                    {s.method}: {formatCurrency(s.amount)}
                                                                </div>
                                                            ))
                                                        } catch {
                                                            return <span>Invalid data</span>
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2 rounded-md bg-muted/50 p-2">
                                        <p className="text-xs font-medium text-muted-foreground">Reason:</p>
                                        <p className="text-sm">{edit.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}