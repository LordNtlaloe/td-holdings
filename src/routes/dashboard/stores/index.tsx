import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
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
import { ExportButton } from '#/components/general/export-button'
import { StoreForm } from '#/components/stores/stores-form'
import { StoreInfoDialog } from '#/components/stores/store-details'
import {
    StoreStatCards,
    StoreCharts,
    StoreTable,
    calculateStoreStats,
    type Store,
} from '#/components/stores'

export const Route = createFileRoute('/dashboard/stores/')({
    component: RouteComponent,
})

function RouteComponent() {
    const [selectedStore, setSelectedStore] = useState<Store | null>(null)
    const [infoDialogOpen, setInfoDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Error states
    const [infoError, setInfoError] = useState<string | null>(null)
    const [editError, setEditError] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores')
    const { data: activityStats } = useApiQuery<any>('activities.getUserActivityStats', '/api/activity-logs/stats')

    const deactivateStore = useApiMutation('stores.deactivateStore', 'PATCH', '/api/stores/deactivate', ['stores.getAllStores'])
    const reactivateStore = useApiMutation('stores.reactivateStore', 'PATCH', '/api/stores/reactivate', ['stores.getAllStores'])
    const deleteStore = useApiMutation('stores.deleteStore', 'DELETE', '/api/stores', ['stores.getAllStores'])

    const stats = useMemo(() => {
        return calculateStoreStats(stores, activityStats)
    }, [stores, activityStats])

    const isLoading = stores === undefined

    const handleDelete = async () => {
        if (!selectedStore) {
            toast.error('No store selected for deletion')
            return
        }

        setIsDeleting(true)
        setDeleteDialogOpen(false)

        try {
            await deleteStore({ storeId: selectedStore._id as any })
            toast.success(`${selectedStore.name} has been permanently deleted.`)
            setInfoDialogOpen(false)
            setSelectedStore(null)
            setDeleteError(null)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete store'
            toast.error(errorMessage)
            setDeleteError(errorMessage)
            setDeleteDialogOpen(true)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeactivate = async () => {
        if (!selectedStore) return

        try {
            await deactivateStore({ storeId: selectedStore._id as any })
            toast.success(`${selectedStore.name} has been deactivated.`)
            setInfoDialogOpen(false)
            setInfoError(null)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate store'
            setInfoError(errorMessage)
            toast.error(errorMessage)
        }
    }

    const handleReactivate = async () => {
        if (!selectedStore) return

        try {
            await reactivateStore({ storeId: selectedStore._id as any })
            toast.success(`${selectedStore.name} has been reactivated.`)
            setInfoDialogOpen(false)
            setInfoError(null)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate store'
            setInfoError(errorMessage)
            toast.error(errorMessage)
        }
    }

    const handleViewDetails = (store: Store) => {
        setSelectedStore(store)
        setInfoError(null)
        setInfoDialogOpen(true)
    }

    const handleEdit = (store: Store) => {
        setSelectedStore(store)
        setEditError(null)
        setEditDialogOpen(true)
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage stores and their configurations
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <StoreForm
                            mode="create"
                            onSuccess={() => {
                                toast.success('Store created successfully')
                            }}
                            onError={(error) => {
                                toast.error(error instanceof Error ? error.message : 'Failed to create store')
                            }}
                        />
                        {stores && (
                            <ExportButton
                                data={stores}
                                columns={[
                                    { key: 'name', header: 'Store Name' },
                                    {
                                        key: 'type',
                                        header: 'Type',
                                        format: (value: unknown) => String(value).charAt(0).toUpperCase() + String(value).slice(1)
                                    },
                                    { key: 'address', header: 'Address' },
                                    { key: 'phone', header: 'Phone' },
                                    {
                                        key: 'isActive',
                                        header: 'Status',
                                        format: (value: unknown) => value ? 'Active' : 'Inactive'
                                    },
                                ]}
                                filename="stores-export"
                                label="Export Stores"
                            />
                        )}
                    </div>
                </div>

                <StoreStatCards stats={stats} isLoading={isLoading} />

                <StoreCharts stats={stats} />

                <StoreTable
                    data={stores}
                    isLoading={isLoading}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEdit}
                />
            </div>

            {/* Store Info Dialog */}
            <StoreInfoDialog
                open={infoDialogOpen}
                onOpenChange={(open) => {
                    setInfoDialogOpen(open)
                    if (!open) setInfoError(null)
                }}
                store={selectedStore}
                onEdit={() => {
                    setInfoDialogOpen(false)
                    if (selectedStore) {
                        setEditDialogOpen(true)
                        setEditError(null)
                    }
                }}
                onDeactivate={() => {
                    if (selectedStore) {
                        handleDeactivate()
                    }
                }}
                onReactivate={() => {
                    if (selectedStore) {
                        handleReactivate()
                    }
                }}
                onDelete={() => {
                    if (selectedStore) {
                        setDeleteDialogOpen(true)
                    }
                }}
                stats={{
                    totalEmployees: 0,
                    totalProducts: 0,
                    totalSales: 0,
                    revenue: 0,
                    growth: 0,
                }}
                error={infoError}
            />

            {/* Edit Store Dialog */}
            <StoreForm
                mode="edit"
                store={selectedStore || undefined}
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setEditError(null)
                }}
                onSuccess={() => {
                    setEditDialogOpen(false)
                    setEditError(null)
                    setSelectedStore(null)
                    toast.success('Store updated successfully')
                }}
                onError={(error) => {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to update store'
                    setEditError(errorMessage)
                    toast.error(errorMessage)
                }}
                error={editError}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Store</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedStore?.name}"?
                            This action cannot be undone. This will also remove all associated
                            employees, inventory, and sales data.
                            {deleteError && (
                                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span className="text-sm">{deleteError}</span>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Store'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}