'use client'

import { useState, useEffect } from 'react'
import { useCreateStore, useUpdateStore } from '#/lib/api/hooks'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Pencil, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'
import { toast } from "sonner";

type Store = Doc<"stores">

interface StoreFormProps {
    mode?: 'create' | 'edit'
    store?: Store
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
    onError?: (error: Error) => void
    error?: string | null
    trigger?: React.ReactNode
}

export function StoreForm({
    mode = 'create',
    store,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    onError,
    error: externalError,
    trigger
}: StoreFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [type, setType] = useState<'central' | 'branch'>('branch')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [xCoordinates, setXCoordinates] = useState('')
    const [yCoordinates, setYCoordinates] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [error, setError] = useState<string | null>(externalError || null)

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOnOpenChange || setInternalOpen

    const createStore = useCreateStore()
    const updateStore = useUpdateStore()

    // Sync external error
    useEffect(() => {
        if (externalError !== undefined) {
            setError(externalError)
        }
    }, [externalError])

    // Load store data when editing
    useEffect(() => {
        if (mode === 'edit' && store && open) {
            setName(store.name)
            setType(store.type)
            setAddress(store.address || '')
            setPhone(store.phone || '')
            setXCoordinates(store.xCoordinates || '')
            setYCoordinates(store.yCoordinates || '')
            setIsActive(store.isActive)
            setError(null)
        }
    }, [mode, store, open])

    // Reset form when closed
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setError(null)
            if (mode === 'create') {
                setName('')
                setType('branch')
                setAddress('')
                setPhone('')
                setXCoordinates('')
                setYCoordinates('')
                setIsActive(true)
            }
        }
    }

    const handleSubmit = async () => {
        if (!name.trim()) {
            const errMsg = 'Store name is required'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        if (!phone.trim()) {
            const errMsg = 'Phone number is required'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        if (!xCoordinates.trim()) {
            const errMsg = 'X coordinates are required'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        if (!yCoordinates.trim()) {
            const errMsg = 'Y coordinates are required'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (mode === 'edit' && store) {
                await updateStore({
                    id: store._id,
                    name: name.trim(),
                    type: type,
                    address: address.trim() || undefined,
                    phone: phone.trim(),
                    xCoordinates: xCoordinates.trim(),
                    yCoordinates: yCoordinates.trim(),
                })
                toast.success('Store updated successfully')
                onSuccess?.()
                setOpen(false)
            } else {
                await createStore({
                    name: name.trim(),
                    type: type,
                    address: address.trim() || undefined,
                    phone: phone.trim(),
                    xCoordinates: xCoordinates.trim(),
                    yCoordinates: yCoordinates.trim(),
                })
                toast.success('Store created successfully')
                onSuccess?.()
                setOpen(false)
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} store`
            setError(errMsg)
            toast.error(errMsg)
            onError?.(error instanceof Error ? error : new Error(errMsg))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = mode === 'create' ? (
        <Button className="gap-2">
            <Building2 className="size-4" />
            Create Store
        </Button>
    ) : (
        <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit Store</span>
        </Button>
    )

    const isEditing = mode === 'edit'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Store' : 'Create Store'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Update store details for ${store?.name || 'Unknown'}`
                            : 'Add a new store to the system.'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {error && (
                        <Alert variant="destructive" className="col-span-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                if (error) setError(null)
                            }}
                            className={cn('col-span-3', error && !name.trim() && 'border-destructive')}
                            placeholder="Enter store name"
                            disabled={loading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select
                            value={type}
                            onValueChange={(value: 'central' | 'branch') => setType(value)}
                            disabled={loading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select store type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="central">Central</SelectItem>
                                <SelectItem value="branch">Branch</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                            Address
                        </Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value)
                                if (error) setError(null)
                            }}
                            className="col-span-3"
                            placeholder="Enter store address (optional)"
                            disabled={loading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                            Phone
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value)
                                if (error) setError(null)
                            }}
                            className={cn('col-span-3', error && !phone.trim() && 'border-destructive')}
                            placeholder="Enter phone number"
                            disabled={loading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="xCoordinates" className="text-right">
                            X Coord
                        </Label>
                        <Input
                            id="xCoordinates"
                            value={xCoordinates}
                            onChange={(e) => {
                                setXCoordinates(e.target.value)
                                if (error) setError(null)
                            }}
                            className={cn('col-span-3', error && !xCoordinates.trim() && 'border-destructive')}
                            placeholder="Enter X coordinates"
                            disabled={loading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="yCoordinates" className="text-right">
                            Y Coord
                        </Label>
                        <Input
                            id="yCoordinates"
                            value={yCoordinates}
                            onChange={(e) => {
                                setYCoordinates(e.target.value)
                                if (error) setError(null)
                            }}
                            className={cn('col-span-3', error && !yCoordinates.trim() && 'border-destructive')}
                            placeholder="Enter Y coordinates"
                            disabled={loading}
                        />
                    </div>
                    {isEditing && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="active" className="text-right">
                                Active
                            </Label>
                            <div className="col-span-3">
                                <Switch
                                    id="active"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}