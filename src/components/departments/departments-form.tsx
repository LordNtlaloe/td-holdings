'use client'

import { useState, useEffect } from 'react'
import { useCreateDepartment, useUpdateDepartment } from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FolderTree, Pencil, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Doc } from '#/types/entities'

type Department = Doc<"departments">

interface DepartmentFormProps {
    mode?: 'create' | 'edit'
    department?: Department | null
    onSuccess?: () => void
    onError?: (error: Error) => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    error?: string | null
}

export function DepartmentForm({
    mode = 'create',
    department,
    onSuccess,
    onError,
    trigger,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    error: externalError,
}: DepartmentFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState<string | null>(externalError || null)

    const createDepartment = useCreateDepartment()
    const updateDepartment = useUpdateDepartment()

    // Use external open if provided, otherwise use internal
    const open = externalOpen !== undefined ? externalOpen : internalOpen
    const setOpen = externalOnOpenChange || setInternalOpen

    // Sync external error
    useEffect(() => {
        if (externalError !== undefined) {
            setError(externalError)
        }
    }, [externalError])

    // Load department data when editing
    useEffect(() => {
        if (mode === 'edit' && department && open) {
            setName(department.name)
            setDescription(department.description || '')
            setError(null)
        }
    }, [mode, department, open])

    // Reset form when closed
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setError(null)
            if (mode === 'create') {
                setName('')
                setDescription('')
            }
        }
    }

    const handleSubmit = async () => {
        if (!name.trim()) {
            const errMsg = 'Department name is required'
            setError(errMsg)
            toast.error(errMsg)
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (mode === 'edit' && department) {
                await updateDepartment({
                    id: department._id,
                    name: name.trim(),
                    description: description.trim() || undefined,
                })
                toast.success('Department updated successfully')
                onSuccess?.()
                setOpen(false)
            } else {
                await createDepartment({
                    name: name.trim(),
                    description: description.trim() || undefined,
                })
                toast.success('Department created successfully')
                onSuccess?.()
                setOpen(false)
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} department`
            setError(errMsg)
            toast.error(errMsg)
            onError?.(error instanceof Error ? error : new Error(errMsg))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = mode === 'create' ? (
        <Button className="gap-2">
            <FolderTree className="size-4" />
            Create Department
        </Button>
    ) : (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Department</span>
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
                    <DialogTitle>{isEditing ? 'Edit Department' : 'Create Department'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Update department details for ${department?.name || 'Unknown'}`
                            : 'Add a new department to the system.'
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
                            className="col-span-3"
                            placeholder="Enter department name"
                            disabled={loading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value)
                                if (error) setError(null)
                            }}
                            className="col-span-3"
                            placeholder="Enter department description (optional)"
                            disabled={loading}
                            rows={3}
                        />
                    </div>
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