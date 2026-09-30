'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    FolderTree,
    Tag,
    Package,
    Store,
    Calendar,
    Clock,
    X,
    Edit,
    Trash2,
    FileText,
    Users,
    AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'

type Department = Doc<"departments">

interface DepartmentInfoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    department: Department | null
    onEdit?: () => void
    onDelete?: () => void
    stats?: {
        totalCategories?: number
        totalProducts?: number
        totalStores?: number
    }
    error?: string | null
}

export function DepartmentInfoDialog({
    open,
    onOpenChange,
    department,
    onEdit,
    onDelete,
    stats = {},
    error,
}: DepartmentInfoDialogProps) {
    if (!department) return null

    const createdDate = department._creationTime ? new Date(department._creationTime) : null

    // Generate initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Stats cards configuration
    const statCards = [
        {
            icon: Tag,
            label: 'Categories',
            value: stats.totalCategories || 0,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            icon: Package,
            label: 'Products',
            value: stats.totalProducts || 0,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
            icon: Store,
            label: 'Stores',
            value: stats.totalStores || 0,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-950/30',
        },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-y-auto p-0 gap-0">
                {/* Header with Gradient */}
                <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-primary/5 to-transparent rounded-t-lg" />
                    <div className="relative p-6 pb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-16 w-16 rounded-xl shadow-lg ring-2 ring-primary/20">
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {getInitials(department.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1.5">
                                    <DialogTitle className="text-2xl font-bold tracking-tight">
                                        {department.name}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                                            <FolderTree className="h-3 w-3" />
                                            Department
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

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
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

                    {/* Description */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            Description
                        </h4>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-sm leading-relaxed">
                                {department.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Metadata */}
                    <div className="space-y-2 text-sm">
                        {createdDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Created: <span className="font-medium">{format(createdDate, 'PPP')}</span></span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Managed by: <span className="font-medium">System Admin</span></span>
                        </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onEdit}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            <Edit className="h-4 w-4" />
                            Edit Department
                        </Button>

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