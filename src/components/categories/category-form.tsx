'use client'

import { useState, useEffect } from 'react'
import { useAllDepartments, useCreateCategory, useUpdateCategory } from '#/lib/api/hooks'
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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tag, Pencil, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'

type Category = Doc<"categories">
type Department = Doc<"departments">

interface FormErrors {
    name?: string
    departmentId?: string
}

interface CategoryFormProps {
    mode?: 'create' | 'edit'
    category?: Category
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
    onError?: (error: Error) => void
    error?: string | null
    trigger?: React.ReactNode
}

export function CategoryForm({
    mode = 'create',
    category,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    onError,
    error: externalError,
    trigger
}: CategoryFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [departmentId, setDepartmentId] = useState<string>('')
    const [description, setDescription] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})
    const [error, setError] = useState<string | null>(externalError || null)

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOnOpenChange || setInternalOpen

    const departments = useAllDepartments()
    const createCategory = useCreateCategory()
    const updateCategory = useUpdateCategory()

    // Sync external error
    useEffect(() => {
        if (externalError !== undefined) {
            setError(externalError)
        }
    }, [externalError])

    useEffect(() => {
        if (mode === 'edit' && category && open) {
            setName(category.name)
            setDepartmentId(category.departmentId)
            setDescription(category.description || '')
            setErrors({})
            setError(null)
        }
    }, [mode, category, open])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setErrors({})
            setError(null)
            if (mode === 'create') {
                setName('')
                setDepartmentId('')
                setDescription('')
            }
        }
    }

    const handleNameChange = (value: string) => {
        setName(value)
        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
        if (error) setError(null)
    }

    const handleDepartmentChange = (value: string) => {
        setDepartmentId(value)
        if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
        if (error) setError(null)
    }

    const handleSubmit = async () => {
        const nextErrors: FormErrors = {}

        if (!name.trim()) {
            nextErrors.name = 'Category name is required'
        }
        if (!departmentId) {
            nextErrors.departmentId = 'Please select a department'
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            toast.error('Please fix the highlighted fields')
            return
        }

        setErrors({})
        setError(null)
        setLoading(true)

        try {
            if (mode === 'edit' && category) {
                await updateCategory({
                    id: category._id,
                    name: name.trim(),
                    departmentId: departmentId as any,
                    description: description.trim() || undefined,
                })
                toast.success('Category updated successfully')
                onSuccess?.()
                setOpen(false)
            } else {
                await createCategory({
                    name: name.trim(),
                    departmentId: departmentId as any,
                    description: description.trim() || undefined,
                })
                toast.success('Category created successfully')
                onSuccess?.()
                setOpen(false)
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} category`
            setError(errMsg)
            toast.error(errMsg)
            onError?.(error instanceof Error ? error : new Error(errMsg))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = mode === 'create' ? (
        <Button className="gap-2">
            <Tag className="size-4" />
            Create Category
        </Button>
    ) : (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Category</span>
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
                    <DialogTitle>{isEditing ? 'Edit Category' : 'Create Category'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Update category details for ${category?.name || 'Unknown'}`
                            : 'Add a new category to a department.'
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
                        <div className="col-span-3 min-w-0">
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                                placeholder="Enter category name"
                                disabled={loading}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive mt-1">{errors.name}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            Department
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <Select
                                value={departmentId}
                                onValueChange={handleDepartmentChange}
                                disabled={!departments || loading}
                            >
                                <SelectTrigger
                                    className={cn('w-full', errors.departmentId && 'border-destructive focus-visible:ring-destructive')}
                                >
                                    <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments?.map((dept: Department) => (
                                        <SelectItem key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.departmentId && (
                                <p className="text-xs text-destructive mt-1">{errors.departmentId}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter category description (optional)"
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