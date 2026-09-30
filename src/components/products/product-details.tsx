'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Tag,
    FolderTree,
    DollarSign,
    ShoppingBag,
    Calendar,
    X,
    Edit,
    Trash2,
    Power,
    PowerOff,
    FileText,
    TrendingUp,
    Store,
    Ruler,
    Palette,
    Layers,
    Package,
    AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'

type Product = Doc<"products">
type Category = Doc<"categories">
type Department = Doc<"departments">

interface ProductWithDetails extends Product {
    category: Category | null
    department: Department | null
    totalStock?: number
    totalSales?: number
    storeCount?: number
}

interface ProductInfoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: ProductWithDetails | null
    onEdit?: () => void
    onDeactivate?: () => void
    onReactivate?: () => void
    onDelete?: () => void
    error?: string | null
}

export function ProductInfoDialog({
    open,
    onOpenChange,
    product,
    onEdit,
    onDeactivate,
    onReactivate,
    onDelete,
    error,
}: ProductInfoDialogProps) {
    if (!product) return null

    const isActive = product.isActive
    const createdDate = product._creationTime ? new Date(product._creationTime) : null

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const hasSizePricing = !!(product.sizePricing && product.sizePricing.length > 0)

    const priceDisplay = hasSizePricing
        ? (() => {
            const prices = product.sizePricing!.map(p => p.sellingPrice)
            const min = Math.min(...prices)
            const max = Math.max(...prices)
            return min === max ? `R${min.toFixed(2)}` : `R${min.toFixed(2)} - R${max.toFixed(2)}`
        })()
        : `R${product.sellingPrice.toFixed(2)}`

    const statCards = [
        {
            icon: ShoppingBag,
            label: 'Total Stock',
            value: product.totalStock || 0,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            icon: TrendingUp,
            label: 'Total Sales',
            value: product.totalSales || 0,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
            icon: Store,
            label: 'Stores',
            value: product.storeCount || 0,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-950/30',
        },
        {
            icon: DollarSign,
            label: 'Selling Price',
            value: priceDisplay,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
        },
    ]

    const hasSizes = product.sizes && product.sizes.length > 0
    const hasColors = product.colors && product.colors.length > 0
    const hasVariants = product.variants && product.variants.length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-137.5 max-h-[90vh] overflow-y-auto p-0 gap-0">
                <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-primary/5 to-transparent rounded-t-lg" />
                    <div className="relative p-6 pb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-16 w-16 rounded-xl shadow-lg ring-2 ring-primary/20">
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {getInitials(product.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1.5">
                                    <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                                        {product.name}
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'ml-2 text-xs font-medium gap-1.5',
                                                isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800'
                                            )}
                                        >
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </DialogTitle>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="gap-1.5">
                                            <Tag className="h-3 w-3" />
                                            {product.category?.name || 'No Category'}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1.5">
                                            <FolderTree className="h-3 w-3" />
                                            {product.department?.name || 'No Department'}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {createdDate ? format(createdDate, 'MMM d, yyyy') : 'N/A'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-muted/50"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-5">
                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {statCards.map((stat, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'rounded-xl p-3 border',
                                    stat.bg,
                                    'border-transparent hover:border-border/50 transition-colors'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {stat.label}
                                    </span>
                                </div>
                                <p className={cn('text-lg font-semibold mt-1', stat.color)}>
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            Description
                        </h4>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-sm leading-relaxed">
                                {product.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    {(hasSizes || hasColors || hasVariants) && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <Package className="h-4 w-4 text-primary" />
                                    </div>
                                    Product Variations
                                </h4>
                                <div className="grid gap-3">
                                    {hasSizes && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                                <Ruler className="h-3 w-3" />
                                                Sizes
                                            </p>
                                            {hasSizePricing ? (
                                                <div className="space-y-1.5">
                                                    {product.sizePricing!.map((row) => (
                                                        <div
                                                            key={row.size}
                                                            className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5 border border-border/50"
                                                        >
                                                            <Badge variant="secondary" className="text-xs">
                                                                {row.size}
                                                            </Badge>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-muted-foreground">
                                                                    Cost R{row.costPrice.toFixed(2)}
                                                                </span>
                                                                <span className="font-medium">
                                                                    R{row.sellingPrice.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {product.sizes!.map((size) => (
                                                        <Badge key={size} variant="secondary" className="text-xs">
                                                            {size}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {hasColors && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                                <Palette className="h-3 w-3" />
                                                Colors
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {product.colors!.map((color) => (
                                                    <Badge key={color} variant="secondary" className="text-xs gap-1.5">
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-border shrink-0"
                                                            style={{ backgroundColor: color.toLowerCase() }}
                                                        />
                                                        {color}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {hasVariants && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                                <Layers className="h-3 w-3" />
                                                Variants
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {product.variants!.map((variant) => (
                                                    <Badge key={variant} variant="secondary" className="text-xs">
                                                        {variant}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-muted-foreground">SKU</p>
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{product.sku}</code>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">
                                {hasSizePricing ? 'Base Cost Price' : 'Cost Price'}
                            </p>
                            <p className="font-medium">R{product.costPrice.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">
                                {hasSizePricing ? 'Base Selling Price' : 'Selling Price'}
                            </p>
                            <p className="font-medium">R{product.sellingPrice.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">{createdDate ? format(createdDate, 'PPP') : 'N/A'}</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onEdit}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            <Edit className="h-4 w-4" />
                            Edit Product
                        </Button>

                        {isActive ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDeactivate}
                                className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                            >
                                <PowerOff className="h-4 w-4" />
                                Deactivate
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReactivate}
                                className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                            >
                                <Power className="h-4 w-4" />
                                Reactivate
                            </Button>
                        )}

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onDelete}
                            className="gap-2 ml-auto"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}