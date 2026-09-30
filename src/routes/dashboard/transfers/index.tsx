import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Badge } from '#/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { toast } from 'sonner'
import AppLayout from '#/layouts/app-layout'
import {
    TransferStatCards,
    TransferCharts,
    TransferTable,
    CreateTransferDialog,
    ShipTransferDialog,
    ReceiveTransferDialog,
    calculateTransferStats,
    calculateChartStats,
    type TransferWithStores,
    type TransferStatus,
    type DraftItem,
    type ReceiveDraftItem,
} from '#/components/transfers'

export const Route = createFileRoute('/dashboard/transfers/')({
    component: RouteComponent,
})

function RouteComponent() {
    // Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [shipDialogOpen, setShipDialogOpen] = useState(false)
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [activeTransfer, setActiveTransfer] = useState<TransferWithStores | null>(null)

    // Create form state
    const [fromStoreId, setFromStoreId] = useState<string | null>(null)
    const [toStoreId, setToStoreId] = useState<string | null>(null)
    const [notes, setNotes] = useState('')
    const [draftItems, setDraftItems] = useState<DraftItem[]>([])

    // Receive form state
    const [receiveDraftItems, setReceiveDraftItems] = useState<ReceiveDraftItem[]>([])

    // Error states
    const [createError, setCreateError] = useState<string | null>(null)
    const [shipError, setShipError] = useState<string | null>(null)
    const [receiveError, setReceiveError] = useState<string | null>(null)
    const [cancelError, setCancelError] = useState<string | null>(null)

    // Loading states
    const [creating, setCreating] = useState(false)
    const [shipping, setShipping] = useState(false)
    const [receiving, setReceiving] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    // Queries
    const { data: transfers } = useApiQuery<any>('transfers.getAllTransfers', '/api/transfers')
    const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores')
    const { data: transferActivityStats } = useApiQuery<any>('transfers.getTransferActivityStats', '/api/transfers/stats/activity')
    const { data: inventoryAtFromStore } = useApiQuery<any>(
        'inventory.getInventoryByStore',
        '/api/inventory/store/' + (fromStoreId || ''),
        undefined,
        !!fromStoreId
    )
    const { data: transferItems } = useApiQuery<any>(
        'transfers.getTransferItems',
        '/api/transfers/' + (activeTransfer?._id || '') + '/items',
        undefined,
        !!activeTransfer
    )

    // Mutations
    const createTransfer = useApiMutation('transfers.createTransfer', 'POST', '/api/transfers', ['transfers.getAllTransfers'])
    const markTransferInTransit = useApiMutation('transfers.markTransferInTransit', 'PATCH', '/api/transfers/in-transit', ['transfers.getAllTransfers'])
    const receiveTransfer = useApiMutation('transfers.receiveTransfer', 'PATCH', '/api/transfers/receive', ['transfers.getAllTransfers'])
    const cancelTransfer = useApiMutation('transfers.cancelTransfer', 'PATCH', '/api/transfers/cancel', ['transfers.getAllTransfers'])

    const centralStores = useMemo(
        () => stores?.filter((s: any) => s.type === 'central' && s.isActive) ?? [],
        [stores]
    )
    const branchStores = useMemo(
        () => stores?.filter((s: any) => s.type === 'branch' && s.isActive) ?? [],
        [stores]
    )

    const availableProducts = useMemo(
        () => (inventoryAtFromStore ?? []).filter((item: any) => item.quantity > 0),
        [inventoryAtFromStore]
    )

    const transfersByStatus = useMemo(() => {
        const buckets: Record<TransferStatus, TransferWithStores[]> = {
            pending: [],
            in_transit: [],
            received: [],
            cancelled: [],
        }
        for (const t of transfers ?? []) {
            buckets[t.status as TransferStatus].push(t as TransferWithStores)
        }
        return buckets
    }, [transfers])

    const stats = useMemo(() => {
        return calculateTransferStats(transfersByStatus)
    }, [transfersByStatus])

    const chartStats = useMemo(() => {
        return calculateChartStats(
            transfersByStatus,
            transfers as TransferWithStores[] | undefined,
            transferActivityStats
        )
    }, [transfersByStatus, transfers, transferActivityStats])

    const isLoading = transfers === undefined || stores === undefined

    // Reset create form
    const resetCreateForm = () => {
        setFromStoreId(null)
        setToStoreId(null)
        setNotes('')
        setDraftItems([])
        setCreateError(null)
    }

    // Handle create transfer
    const handleCreateTransfer = async () => {
        if (!fromStoreId || !toStoreId) {
            setCreateError('Please select both a source and destination store')
            toast.error('Please select both a source and destination store')
            return
        }
        if (draftItems.length === 0) {
            setCreateError('Add at least one item to transfer')
            toast.error('Add at least one item to transfer')
            return
        }
        for (const item of draftItems) {
            if (!item.productId) {
                setCreateError('Every line item needs a product selected')
                toast.error('Every line item needs a product selected')
                return
            }
            if (item.quantityRequested <= 0) {
                setCreateError('Quantity must be greater than 0')
                toast.error('Quantity must be greater than 0')
                return
            }
        }

        setCreating(true)
        setCreateError(null)

        try {
            await createTransfer({
                fromStoreId: fromStoreId as any,
                toStoreId: toStoreId as any,
                notes: notes.trim() || undefined,
                items: draftItems.map((item) => ({
                    productId: item.productId as any,
                    quantityRequested: item.quantityRequested,
                })),
            })
            toast.success('Transfer created successfully')
            setCreateDialogOpen(false)
            resetCreateForm()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create transfer'
            setCreateError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setCreating(false)
        }
    }

    // Handle ship transfer
    const handleShipTransfer = async () => {
        if (!activeTransfer) return

        setShipping(true)
        setShipError(null)

        try {
            await markTransferInTransit({ transferId: activeTransfer._id })
            toast.success('Transfer shipped — stock deducted from source')
            setShipDialogOpen(false)
            setActiveTransfer(null)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to ship transfer'
            setShipError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setShipping(false)
        }
    }

    // Handle receive transfer
    const handleReceiveTransfer = async () => {
        if (!activeTransfer) return

        for (const item of receiveDraftItems) {
            if (item.quantityReceived < 0) {
                setReceiveError('Quantity received cannot be negative')
                toast.error('Quantity received cannot be negative')
                return
            }
            if (item.quantityReceived > item.quantityRequested) {
                setReceiveError('Quantity received cannot exceed quantity requested')
                toast.error('Quantity received cannot exceed quantity requested')
                return
            }
            if (item.quantityReceived !== item.quantityRequested && !item.discrepancyReason.trim()) {
                setReceiveError(`A reason is required for "${item.productName}" since the quantity differs`)
                toast.error(`A reason is required for "${item.productName}" since the quantity differs`)
                return
            }
        }

        setReceiving(true)
        setReceiveError(null)

        try {
            await receiveTransfer({
                transferId: activeTransfer._id,
                items: receiveDraftItems.map((item) => ({
                    transferItemId: item.transferItemId,
                    quantityReceived: item.quantityReceived,
                    discrepancyReason: item.discrepancyReason.trim() || undefined,
                })),
            })
            toast.success('Transfer received successfully')
            setReceiveDialogOpen(false)
            setActiveTransfer(null)
            setReceiveDraftItems([])
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to receive transfer'
            setReceiveError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setReceiving(false)
        }
    }

    // Handle cancel transfer - now opens the AlertDialog
    const openCancelDialog = (transfer: TransferWithStores) => {
        setActiveTransfer(transfer)
        setCancelError(null)
        setCancelDialogOpen(true)
    }

    const handleCancelTransfer = async () => {
        if (!activeTransfer) return

        setCancelling(true)
        setCancelError(null)

        try {
            await cancelTransfer({ transferId: activeTransfer._id })
            toast.success('Transfer cancelled successfully')
            setCancelDialogOpen(false)
            setActiveTransfer(null)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel transfer'
            setCancelError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setCancelling(false)
        }
    }

    // Open ship dialog
    const openShipDialog = (transfer: TransferWithStores) => {
        setActiveTransfer(transfer)
        setShipError(null)
        setShipDialogOpen(true)
    }

    // Open receive dialog
    const openReceiveDialog = (transfer: TransferWithStores) => {
        setActiveTransfer(transfer)
        setReceiveError(null)
        setReceiveDialogOpen(true)
        // Populate receive items when dialog opens
        if (transferItems) {
            setReceiveDraftItems(
                transferItems.map((item: any) => ({
                    transferItemId: item._id,
                    productName: item.product?.name ?? 'Unknown product',
                    quantityRequested: item.quantityRequested,
                    quantityReceived: item.quantityRequested,
                    discrepancyReason: '',
                }))
            )
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Transfers</h1>
                        <p className="text-sm text-muted-foreground">
                            Move stock from central stores to branches
                        </p>
                    </div>
                    <CreateTransferDialog
                        open={createDialogOpen}
                        onOpenChange={(open) => {
                            setCreateDialogOpen(open)
                            if (!open) resetCreateForm()
                        }}
                        centralStores={centralStores}
                        branchStores={branchStores}
                        availableProducts={availableProducts}
                        fromStoreId={fromStoreId}
                        toStoreId={toStoreId}
                        notes={notes}
                        draftItems={draftItems}
                        onFromStoreChange={setFromStoreId}
                        onToStoreChange={setToStoreId}
                        onNotesChange={setNotes}
                        onDraftItemsChange={setDraftItems}
                        onSubmit={handleCreateTransfer}
                        isLoading={creating}
                        error={createError}
                    />
                </div>

                {/* Stats */}
                <TransferStatCards stats={stats} isLoading={isLoading} />

                {/* Charts */}
                <TransferCharts chartStats={chartStats} />

                {/* Tabs */}
                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="pending">
                            Pending
                            {stats.pending > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {stats.pending}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="in_transit">
                            In Transit
                            {stats.inTransit > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {stats.inTransit}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="received">
                            Received
                        </TabsTrigger>
                        <TabsTrigger value="cancelled">
                            Cancelled
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        <TransferTable
                            data={transfersByStatus.pending}
                            status="pending"
                            isLoading={isLoading}
                            onShip={openShipDialog}
                            onReceive={openReceiveDialog}
                            onCancel={openCancelDialog}
                        />
                    </TabsContent>

                    <TabsContent value="in_transit">
                        <TransferTable
                            data={transfersByStatus.in_transit}
                            status="in_transit"
                            isLoading={isLoading}
                            onShip={openShipDialog}
                            onReceive={openReceiveDialog}
                            onCancel={openCancelDialog}
                        />
                    </TabsContent>

                    <TabsContent value="received">
                        <TransferTable
                            data={transfersByStatus.received}
                            status="received"
                            isLoading={isLoading}
                            onShip={openShipDialog}
                            onReceive={openReceiveDialog}
                            onCancel={openCancelDialog}
                        />
                    </TabsContent>

                    <TabsContent value="cancelled">
                        <TransferTable
                            data={transfersByStatus.cancelled}
                            status="cancelled"
                            isLoading={isLoading}
                            onShip={openShipDialog}
                            onReceive={openReceiveDialog}
                            onCancel={openCancelDialog}
                        />
                    </TabsContent>
                </Tabs>

                {/* Ship Dialog */}
                <ShipTransferDialog
                    open={shipDialogOpen}
                    onOpenChange={(open) => {
                        setShipDialogOpen(open)
                        if (!open) {
                            setActiveTransfer(null)
                            setShipError(null)
                        }
                    }}
                    transfer={activeTransfer}
                    onSubmit={handleShipTransfer}
                    isLoading={shipping}
                    error={shipError}
                />

                {/* Receive Dialog */}
                <ReceiveTransferDialog
                    open={receiveDialogOpen}
                    onOpenChange={(open) => {
                        setReceiveDialogOpen(open)
                        if (!open) {
                            setActiveTransfer(null)
                            setReceiveDraftItems([])
                            setReceiveError(null)
                        }
                    }}
                    transfer={activeTransfer}
                    receiveItems={receiveDraftItems}
                    onReceiveItemsChange={setReceiveDraftItems}
                    onSubmit={handleReceiveTransfer}
                    isLoading={receiving}
                    error={receiveError}
                />

                {/* Cancel Confirmation Dialog */}
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Transfer</AlertDialogTitle>
                            <AlertDialogDescription>
                                {activeTransfer?.status === 'in_transit'
                                    ? 'Cancel this transfer? Stock already shipped will be credited back to the source store.'
                                    : 'Are you sure you want to cancel this transfer? This action cannot be undone.'}
                                {cancelError && (
                                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span className="text-sm">{cancelError}</span>
                                    </div>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={cancelling}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleCancelTransfer}
                                disabled={cancelling}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    )
}