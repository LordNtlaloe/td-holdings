'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAllCategories, useAllDepartments, useCreateProduct, useUpdateProduct } from '#/lib/api/hooks'
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
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package, Pencil, X, Plus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'

type Product = Doc<"products">
type Category = Doc<"categories">
type Department = Doc<"departments">

interface SizePriceRow {
    costPrice: string
    sellingPrice: string
}

interface FormErrors {
    name?: string
    sku?: string
    categoryId?: string
    departmentId?: string
    costPrice?: string
    sellingPrice?: string
    sizePrices?: Record<string, { costPrice?: string; sellingPrice?: string }>
}

interface ProductFormProps {
    mode?: 'create' | 'edit'
    product?: Product
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
    onError?: (error: Error) => void
    error?: string | null
    trigger?: React.ReactNode
}

export function ProductForm({
    mode = 'create',
    product,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    onError,
    error: externalError,
    trigger
}: ProductFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [sku, setSku] = useState('')
    const [categoryId, setCategoryId] = useState<string>('')
    const [departmentId, setDepartmentId] = useState<string>('')
    const [sizes, setSizes] = useState<string[]>([])
    const [colors, setColors] = useState<string[]>([])
    const [variants, setVariants] = useState<string[]>([])
    const [newSize, setNewSize] = useState('')
    const [newColor, setNewColor] = useState('')
    const [newVariant, setNewVariant] = useState('')
    const [costPrice, setCostPrice] = useState('')
    const [sellingPrice, setSellingPrice] = useState('')
    const [description, setDescription] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [error, setError] = useState<string | null>(externalError || null)

    // Per-size pricing
    const [perSizePricing, setPerSizePricing] = useState(false)
    const [sizePrices, setSizePrices] = useState<Record<string, SizePriceRow>>({})

    // Field-level errors
    const [errors, setErrors] = useState<FormErrors>({})

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOnOpenChange || setInternalOpen

    const categories = useAllCategories()
    const departments = useAllDepartments()
    const createProduct = useCreateProduct()
    const updateProduct = useUpdateProduct()

    // Get the department of the selected category
    const selectedCategory = useMemo(() => {
        return categories?.find((c: Category) => c._id === categoryId)
    }, [categories, categoryId])

    // Auto-select department when category changes
    useEffect(() => {
        if (selectedCategory && selectedCategory.departmentId) {
            const deptId = selectedCategory.departmentId
            if (departmentId !== deptId) {
                setDepartmentId(deptId)
                if (errors.departmentId) {
                    setErrors((prev) => ({ ...prev, departmentId: undefined }))
                }
                if (error) setError(null)
            }
        }
    }, [selectedCategory, departmentId, errors.departmentId, error])

    // Sync external error
    useEffect(() => {
        if (externalError !== undefined) {
            setError(externalError)
        }
    }, [externalError])

    useEffect(() => {
        if (mode === 'edit' && product && open) {
            setName(product.name)
            setSku(product.sku)
            setCategoryId(product.categoryId)
            setDepartmentId(product.departmentId)
            setSizes(product.sizes || [])
            setColors(product.colors || [])
            setVariants(product.variants || [])
            setCostPrice(product.costPrice.toString())
            setSellingPrice(product.sellingPrice.toString())
            setDescription(product.description || '')
            setIsActive(product.isActive)
            setErrors({})
            setError(null)

            if (product.sizePricing && product.sizePricing.length > 0) {
                setPerSizePricing(true)
                const map: Record<string, SizePriceRow> = {}
                product.sizePricing.forEach((row) => {
                    map[row.size] = {
                        costPrice: row.costPrice.toString(),
                        sellingPrice: row.sellingPrice.toString(),
                    }
                })
                setSizePrices(map)
            } else {
                setPerSizePricing(false)
                setSizePrices({})
            }
        }
    }, [mode, product, open])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setErrors({})
            setError(null)
            if (mode === 'create') {
                setName('')
                setSku('')
                setCategoryId('')
                setDepartmentId('')
                setSizes([])
                setColors([])
                setVariants([])
                setNewSize('')
                setNewColor('')
                setNewVariant('')
                setCostPrice('')
                setSellingPrice('')
                setDescription('')
                setIsActive(true)
                setPerSizePricing(false)
                setSizePrices({})
            }
        }
    }

    const addSize = () => {
        const trimmed = newSize.trim()
        if (trimmed && !sizes.includes(trimmed)) {
            setSizes([...sizes, trimmed])
            setSizePrices((prev) => ({
                ...prev,
                [trimmed]: {
                    costPrice: prev[trimmed]?.costPrice ?? costPrice,
                    sellingPrice: prev[trimmed]?.sellingPrice ?? sellingPrice,
                },
            }))
            setNewSize('')
        }
    }

    const removeSize = (size: string) => {
        setSizes(sizes.filter(s => s !== size))
        setSizePrices((prev) => {
            const next = { ...prev }
            delete next[size]
            return next
        })
        setErrors((prev) => {
            if (!prev.sizePrices) return prev
            const nextSizePrices = { ...prev.sizePrices }
            delete nextSizePrices[size]
            return { ...prev, sizePrices: nextSizePrices }
        })
    }

    const updateSizePrice = (size: string, field: 'costPrice' | 'sellingPrice', value: string) => {
        setSizePrices((prev) => ({
            ...prev,
            [size]: {
                ...prev[size],
                [field]: value,
            },
        }))
        setErrors((prev) => {
            if (!prev.sizePrices?.[size]?.[field]) return prev
            return {
                ...prev,
                sizePrices: {
                    ...prev.sizePrices,
                    [size]: {
                        ...prev.sizePrices[size],
                        [field]: undefined,
                    },
                },
            }
        })
    }

    const addColor = () => {
        if (newColor.trim() && !colors.includes(newColor.trim())) {
            setColors([...colors, newColor.trim()])
            setNewColor('')
        }
    }

    const removeColor = (color: string) => {
        setColors(colors.filter(c => c !== color))
    }

    const addVariant = () => {
        if (newVariant.trim() && !variants.includes(newVariant.trim())) {
            setVariants([...variants, newVariant.trim()])
            setNewVariant('')
        }
    }

    const removeVariant = (variant: string) => {
        setVariants(variants.filter(v => v !== variant))
    }

    const generateSku = (name: string) => {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 8)
    }

    const handleNameChange = (value: string) => {
        setName(value)
        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
        if (mode === 'create' && !sku) {
            setSku(generateSku(value))
        }
        if (error) setError(null)
    }

    const handleSkuChange = (value: string) => {
        setSku(value.toUpperCase())
        if (errors.sku) setErrors((prev) => ({ ...prev, sku: undefined }))
        if (error) setError(null)
    }

    const handleCategoryChange = (value: string) => {
        setCategoryId(value)
        // Department will be auto-set by the useEffect
        if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }))
        if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
        if (error) setError(null)
    }

    const handleCostPriceChange = (value: string) => {
        setCostPrice(value)
        if (errors.costPrice) setErrors((prev) => ({ ...prev, costPrice: undefined }))
        if (error) setError(null)
    }

    const handleSellingPriceChange = (value: string) => {
        setSellingPrice(value)
        if (errors.sellingPrice) setErrors((prev) => ({ ...prev, sellingPrice: undefined }))
        if (error) setError(null)
    }

    const applyServerError = (message: string) => {
        const lower = message.toLowerCase()

        if (lower.includes('sku')) {
            setErrors((prev) => ({ ...prev, sku: message }))
            return
        }
        if (lower.includes('category does not belong')) {
            setErrors((prev) => ({ ...prev, categoryId: message }))
            return
        }
        if (lower.includes('category not found')) {
            setErrors((prev) => ({ ...prev, categoryId: message }))
            return
        }
        if (lower.includes('department not found')) {
            setErrors((prev) => ({ ...prev, departmentId: message }))
            return
        }
        if (lower.includes('selling price') || lower.includes('cost price') || lower.includes('prices cannot be negative')) {
            setErrors((prev) => ({
                ...prev,
                sellingPrice: lower.includes('selling price') ? message : prev.sellingPrice,
                costPrice: lower.includes('cost price') && !lower.includes('selling') ? message : prev.costPrice,
            }))
            return
        }

        toast.error(message)
    }

    const handleSubmit = async () => {
        const nextErrors: FormErrors = {}
        const sizePriceErrors: Record<string, { costPrice?: string; sellingPrice?: string }> = {}

        if (!name.trim()) {
            nextErrors.name = 'Product name is required'
        }
        if (!sku.trim()) {
            nextErrors.sku = 'SKU is required'
        }
        if (!categoryId) {
            nextErrors.categoryId = 'Please select a category'
        }
        if (!departmentId) {
            nextErrors.departmentId = 'Please select a department'
        }

        const parsedCost = parseFloat(costPrice)
        const parsedSelling = parseFloat(sellingPrice)

        if (!costPrice.trim() || isNaN(parsedCost) || parsedCost < 0) {
            nextErrors.costPrice = 'Enter a valid cost price'
        }
        if (!sellingPrice.trim() || isNaN(parsedSelling) || parsedSelling < 0) {
            nextErrors.sellingPrice = 'Enter a valid selling price'
        }
        if (
            !nextErrors.costPrice &&
            !nextErrors.sellingPrice &&
            parsedSelling < parsedCost
        ) {
            nextErrors.sellingPrice = 'Cannot be lower than cost price'
        }

        let sizePricing: { size: string; costPrice: number; sellingPrice: number }[] | undefined

        if (perSizePricing && sizes.length > 0) {
            sizePricing = []
            for (const size of sizes) {
                const row = sizePrices[size]
                const rowCostRaw = row?.costPrice ?? ''
                const rowSellingRaw = row?.sellingPrice ?? ''
                const rowCost = parseFloat(rowCostRaw || costPrice)
                const rowSelling = parseFloat(rowSellingRaw || sellingPrice)

                const rowErrors: { costPrice?: string; sellingPrice?: string } = {}

                if (isNaN(rowCost) || rowCost < 0) {
                    rowErrors.costPrice = 'Invalid'
                }
                if (isNaN(rowSelling) || rowSelling < 0) {
                    rowErrors.sellingPrice = 'Invalid'
                }
                if (!rowErrors.costPrice && !rowErrors.sellingPrice && rowSelling < rowCost) {
                    rowErrors.sellingPrice = 'Lower than cost'
                }

                if (Object.keys(rowErrors).length > 0) {
                    sizePriceErrors[size] = rowErrors
                } else {
                    sizePricing.push({ size, costPrice: rowCost, sellingPrice: rowSelling })
                }
            }
        }

        if (Object.keys(sizePriceErrors).length > 0) {
            nextErrors.sizePrices = sizePriceErrors
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
            const productData = {
                name: name.trim(),
                sku: sku.trim(),
                categoryId: categoryId as any,
                departmentId: departmentId as any,
                sizes: sizes.length > 0 ? sizes : undefined,
                colors: colors.length > 0 ? colors : undefined,
                variants: variants.length > 0 ? variants : undefined,
                sizePricing,
                costPrice: parsedCost,
                sellingPrice: parsedSelling,
                description: description.trim() || undefined,
                isActive: isActive,
            }

            if (mode === 'edit' && product) {
                await updateProduct({
                    id: product._id,
                    ...productData,
                })
                toast.success('Product updated successfully')
                onSuccess?.()
                setOpen(false)
            } else {
                await createProduct(productData)
                toast.success('Product created successfully')
                onSuccess?.()
                setOpen(false)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} product`
            const cleanMessage = message
                .replace(/^.*Uncaught Error:\s*/i, '')
                .replace(/\s*at\s.+$/s, '')
                .trim()
            const errMsg = cleanMessage || message
            setError(errMsg)
            applyServerError(errMsg)
            onError?.(error instanceof Error ? error : new Error(errMsg))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = mode === 'create' ? (
        <Button className="gap-2">
            <Package className="size-4" />
            Create Product
        </Button>
    ) : (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Product</span>
        </Button>
    )

    const isEditing = mode === 'edit'

    // Get the department name for display
    const selectedDepartmentName = useMemo(() => {
        if (!departmentId || !departments) return ''
        const dept = departments.find((d: Department) => d._id === departmentId)
        return dept?.name || ''
    }, [departmentId, departments])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-137.5 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Product' : 'Create Product'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Update product details for ${product?.name || 'Unknown'}`
                            : 'Add a new product to your inventory.'
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
                                placeholder="Enter product name"
                                disabled={loading}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive mt-1">{errors.name}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sku" className="text-right">
                            SKU
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <Input
                                id="sku"
                                value={sku}
                                onChange={(e) => handleSkuChange(e.target.value)}
                                className={cn(errors.sku && 'border-destructive focus-visible:ring-destructive')}
                                placeholder="Enter SKU (auto-generated)"
                                disabled={loading}
                            />
                            {errors.sku && (
                                <p className="text-xs text-destructive mt-1">{errors.sku}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <Select
                                value={categoryId}
                                onValueChange={handleCategoryChange}
                                disabled={!categories || loading}
                            >
                                <SelectTrigger
                                    className={cn('w-full', errors.categoryId && 'border-destructive focus-visible:ring-destructive')}
                                >
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories?.map((cat: Category) => (
                                        <SelectItem key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.categoryId && (
                                <p className="text-xs text-destructive mt-1">{errors.categoryId}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            Department
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <Input
                                id="department"
                                value={selectedDepartmentName || 'Select a category first'}
                                disabled
                                className="bg-muted cursor-not-allowed"
                            />
                            <input type="hidden" value={departmentId} />
                            {errors.departmentId && (
                                <p className="text-xs text-destructive mt-1">{errors.departmentId}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Department is automatically set based on the selected category.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Sizes</Label>
                        <div className="col-span-3 space-y-2 min-w-0">
                            <div className="flex gap-2">
                                <Input
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value)}
                                    placeholder="Add size (e.g., S, M, L)"
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addSize()
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={addSize}
                                    disabled={loading || !newSize.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {sizes.map((size) => (
                                    <Badge key={size} variant="secondary" className="gap-1">
                                        {size}
                                        <button
                                            type="button"
                                            onClick={() => removeSize(size)}
                                            className="hover:text-destructive"
                                            disabled={loading}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {sizes.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-4 sm:col-start-2 sm:col-span-3 space-y-3 min-w-0">
                                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                                    <div className="min-w-0">
                                        <Label htmlFor="perSizePricing" className="text-sm font-medium cursor-pointer block">
                                            Price varies by size
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Set different prices per size
                                        </p>
                                    </div>
                                    <Switch
                                        id="perSizePricing"
                                        checked={perSizePricing}
                                        onCheckedChange={setPerSizePricing}
                                        disabled={loading}
                                    />
                                </div>

                                {perSizePricing && (
                                    <div className="space-y-2">
                                        {sizes.map((size) => {
                                            const rowErrors = errors.sizePrices?.[size]
                                            return (
                                                <div key={size} className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="w-14 justify-center shrink-0">
                                                            {size}
                                                        </Badge>
                                                        <div className="relative flex-1 min-w-0">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R</span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="Cost"
                                                                className={cn(
                                                                    'pl-6 h-8 text-sm',
                                                                    rowErrors?.costPrice && 'border-destructive focus-visible:ring-destructive'
                                                                )}
                                                                value={sizePrices[size]?.costPrice ?? ''}
                                                                onChange={(e) => updateSizePrice(size, 'costPrice', e.target.value)}
                                                                disabled={loading}
                                                            />
                                                        </div>
                                                        <div className="relative flex-1 min-w-0">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R</span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="Selling"
                                                                className={cn(
                                                                    'pl-6 h-8 text-sm',
                                                                    rowErrors?.sellingPrice && 'border-destructive focus-visible:ring-destructive'
                                                                )}
                                                                value={sizePrices[size]?.sellingPrice ?? ''}
                                                                onChange={(e) => updateSizePrice(size, 'sellingPrice', e.target.value)}
                                                                disabled={loading}
                                                            />
                                                        </div>
                                                    </div>
                                                    {(rowErrors?.costPrice || rowErrors?.sellingPrice) && (
                                                        <p className="text-xs text-destructive pl-15">
                                                            {rowErrors?.costPrice && rowErrors?.sellingPrice
                                                                ? `Cost: ${rowErrors.costPrice}. Selling: ${rowErrors.sellingPrice}.`
                                                                : rowErrors?.costPrice
                                                                    ? `Cost price: ${rowErrors.costPrice}`
                                                                    : `Selling price: ${rowErrors?.sellingPrice}`}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Colors</Label>
                        <div className="col-span-3 space-y-2 min-w-0">
                            <div className="flex gap-2">
                                <Input
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    placeholder="Add color (e.g., Red, Blue)"
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addColor()
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={addColor}
                                    disabled={loading || !newColor.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {colors.map((color) => (
                                    <Badge key={color} variant="secondary" className="gap-1">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: color.toLowerCase() }}
                                        />
                                        {color}
                                        <button
                                            type="button"
                                            onClick={() => removeColor(color)}
                                            className="hover:text-destructive"
                                            disabled={loading}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Variants</Label>
                        <div className="col-span-3 space-y-2 min-w-0">
                            <div className="flex gap-2">
                                <Input
                                    value={newVariant}
                                    onChange={(e) => setNewVariant(e.target.value)}
                                    placeholder="Add variant (e.g., Flavored)"
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addVariant()
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={addVariant}
                                    disabled={loading || !newVariant.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {variants.map((variant) => (
                                    <Badge key={variant} variant="secondary" className="gap-1">
                                        {variant}
                                        <button
                                            type="button"
                                            onClick={() => removeVariant(variant)}
                                            className="hover:text-destructive"
                                            disabled={loading}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPrice" className="text-right">
                            Cost Price (R)
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                <Input
                                    id="costPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={costPrice}
                                    onChange={(e) => handleCostPriceChange(e.target.value)}
                                    className={cn('pl-7', errors.costPrice && 'border-destructive focus-visible:ring-destructive')}
                                    placeholder="0.00"
                                    disabled={loading}
                                />
                            </div>
                            {errors.costPrice && (
                                <p className="text-xs text-destructive mt-1">{errors.costPrice}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sellingPrice" className="text-right">
                            Selling Price (R)
                        </Label>
                        <div className="col-span-3 min-w-0">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                <Input
                                    id="sellingPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={sellingPrice}
                                    onChange={(e) => handleSellingPriceChange(e.target.value)}
                                    className={cn('pl-7', errors.sellingPrice && 'border-destructive focus-visible:ring-destructive')}
                                    placeholder="0.00"
                                    disabled={loading}
                                />
                            </div>
                            {errors.sellingPrice && (
                                <p className="text-xs text-destructive mt-1">{errors.sellingPrice}</p>
                            )}
                        </div>
                    </div>
                    {perSizePricing && (
                        <div className="grid grid-cols-4 gap-4">
                            <p className="col-span-4 sm:col-start-2 sm:col-span-3 text-xs text-muted-foreground -mt-2">
                                Used as the fallback price when no size is selected.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter product description (optional)"
                            disabled={loading}
                            rows={3}
                        />
                    </div>
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