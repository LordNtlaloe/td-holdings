'use client'

import { useState, useEffect } from 'react'
import {
    useAllStores,
    useStoresByDepartment,
    useAssignDepartmentToStore,
    useRemoveDepartmentFromStore,
} from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Store, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'

type Department = Doc<"departments">
type Store = Doc<"stores">

interface StoreAssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    department: Department | null
    onSuccess?: () => void
    onError?: (error: Error) => void
    error?: string | null
}

export function StoreAssignmentDialog({
    open,
    onOpenChange,
    department,
    onSuccess,
    onError,
    error: externalError,
}: StoreAssignmentDialogProps) {
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(externalError || null)

    const stores = useAllStores()

    // Only fetch assigned stores if we have a department
    const assignedStores = useStoresByDepartment(department?._id)

    const assignDepartmentToStore = useAssignDepartmentToStore()
    const removeDepartmentFromStore = useRemoveDepartmentFromStore()

    // Sync external error
    useEffect(() => {
        if (externalError !== undefined) {
            setError(externalError)
        }
    }, [externalError])

    // Load assigned stores when dialog opens
    useEffect(() => {
        if (open && assignedStores) {
            setSelectedStoreIds(assignedStores.map((sd) => sd._id))
            setError(null)
        }
    }, [open, assignedStores])

    // Reset when dialog closes
    useEffect(() => {
        if (!open) {
            setSelectedStoreIds([])
            setLoading(false)
            setError(null)
        }
    }, [open])

    if (!department) return null

    const handleToggleStore = (storeId: string) => {
        setSelectedStoreIds((prev) =>
            prev.includes(storeId)
                ? prev.filter((id) => id !== storeId)
                : [...prev, storeId]
        )
        if (error) setError(null)
    }

    const handleSave = async () => {
        if (!department) {
            const errMsg = 'No department selected'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Get current assigned store IDs
            const currentStoreIds = assignedStores?.map((sd) => sd._id) || []

            // Find stores to add and remove
            const toAdd = selectedStoreIds.filter((id) => !currentStoreIds.includes(id as any))
            const toRemove = currentStoreIds.filter((id) => !selectedStoreIds.includes(id))

            // Add new assignments
            for (const storeId of toAdd) {
                await assignDepartmentToStore({
                    storeId: storeId as any,
                    departmentId: department._id,
                })
            }

            // Remove unassigned stores
            for (const storeId of toRemove) {
                await removeDepartmentFromStore({
                    storeId: storeId as any,
                    departmentId: department._id,
                })
            }

            toast.success(`Store assignments updated for ${department.name}`)
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Failed to update store assignments'
            setError(errMsg)
            toast.error(errMsg)
            onError?.(error instanceof Error ? error : new Error(errMsg))
        } finally {
            setLoading(false)
        }
    }

    const handleClearAll = () => {
        setSelectedStoreIds([])
        if (error) setError(null)
    }

    const handleSelectAll = () => {
        if (stores) {
            setSelectedStoreIds(stores.map((s: Store) => s._id))
            if (error) setError(null)
        }
    }

    const isStoreAssigned = (storeId: string) => {
        return selectedStoreIds.includes(storeId)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>Manage Store Assignments</DialogTitle>
                    <DialogDescription>
                        Select which stores should have access to <strong>{department.name}</strong>.
                        <br />
                        <span className="text-xs text-muted-foreground">
                            {selectedStoreIds.length} of {stores?.length || 0} stores selected
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <ScrollArea className="h-75 pr-4">
                    <div className="space-y-2">
                        {stores?.map((store: Store) => {
                            const isAssigned = isStoreAssigned(store._id)
                            return (
                                <div
                                    key={store._id}
                                    className={cn(
                                        'flex items-center space-x-3 rounded-lg border p-3 transition-colors',
                                        isAssigned
                                            ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                                            : 'hover:bg-muted/50'
                                    )}
                                >
                                    <Checkbox
                                        id={`store-${store._id}`}
                                        checked={isAssigned}
                                        onCheckedChange={() => handleToggleStore(store._id)}
                                        disabled={loading}
                                    />
                                    <Label
                                        htmlFor={`store-${store._id}`}
                                        className="flex flex-1 items-center gap-2 cursor-pointer"
                                    >
                                        <Store className={cn(
                                            'h-4 w-4',
                                            isAssigned ? 'text-primary' : 'text-muted-foreground'
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{store.name}</span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {store.type} • {store.address || 'No address'}
                                            </span>
                                        </div>
                                    </Label>
                                    {isAssigned && (
                                        <Badge variant="default" className="shrink-0">
                                            <Check className="h-3 w-3 mr-1" />
                                            Assigned
                                        </Badge>
                                    )}
                                </div>
                            )
                        })}

                        {!stores?.length && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Store className="h-12 w-12 text-muted-foreground/50" />
                                <p className="mt-2 text-sm text-muted-foreground">No stores available</p>
                                <p className="text-xs text-muted-foreground">Create a store first to assign departments</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <div className="flex w-full items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearAll}
                                disabled={loading || !stores?.length}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                disabled={loading || !stores?.length}
                            >
                                <Check className="h-4 w-4 mr-1" />
                                Select All
                            </Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Assignments'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}