'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Building2,
    MapPin,
    Phone,
    Users,
    Calendar,
    Clock,
    X,
    Edit,
    Trash2,
    Power,
    PowerOff,
    Store,
    ShoppingBag,
    TrendingUp,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Navigation,
    Crown,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Doc } from '#/types/entities'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type Store = Doc<"stores">

interface StoreInfoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    store: Store | null
    onEdit?: () => void
    onDeactivate?: () => void
    onReactivate?: () => void
    onDelete?: () => void
    stats?: {
        totalEmployees?: number
        totalProducts?: number
        totalSales?: number
        revenue?: number
        growth?: number
    }
    error?: string | null
}

const statusColors = {
    active: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle,
    },
    inactive: {
        bg: 'bg-gray-50 dark:bg-gray-950/30',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        icon: AlertCircle,
    },
}

const typeIcons = {
    central: Crown,
    branch: Store,
}

const typeColors = {
    central: {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
    },
    branch: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
    },
}

// Custom store marker icon
const createStoreIcon = (isActive: boolean) => {
    return L.divIcon({
        className: 'custom-store-marker',
        html: `
            <div style="
                background: ${isActive ? '#22c55e' : '#6b7280'};
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    })
}

export function StoreInfoDialog({
    open,
    onOpenChange,
    store,
    onEdit,
    onDeactivate,
    onReactivate,
    onDelete,
    stats = {},
}: StoreInfoDialogProps) {
    const [mapReady, setMapReady] = useState(false)

    useEffect(() => {
        // Import CSS only on client side
        import('leaflet/dist/leaflet.css')
        setMapReady(true)
    }, [])

    if (!store) return null

    const isActive = store.isActive
    const createdDate = store._creationTime ? new Date(store._creationTime) : null
    const StatusIcon = statusColors[isActive ? 'active' : 'inactive'].icon
    const TypeIcon = typeIcons[store.type as keyof typeof typeIcons] || Building2
    const typeColor = typeColors[store.type as keyof typeof typeColors] || typeColors.branch

    // Parse coordinates
    const lat = parseFloat(store.xCoordinates)
    const lng = parseFloat(store.yCoordinates)
    const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0

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
            icon: Users,
            label: 'Employees',
            value: stats.totalEmployees || 0,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            icon: ShoppingBag,
            label: 'Products',
            value: stats.totalProducts || 0,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
            icon: DollarSign,
            label: 'Revenue',
            value: stats.revenue ? `$${stats.revenue.toLocaleString()}` : '$0',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
            icon: TrendingUp,
            label: 'Growth',
            value: stats.growth ? `${stats.growth}%` : '0%',
            color: stats.growth && stats.growth > 0 ? 'text-emerald-500' : 'text-rose-500',
            bg: stats.growth && stats.growth > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30',
        },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto p-0 gap-0">
                {/* Header with Gradient */}
                <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-primary/5 to-transparent rounded-t-lg" />
                    <div className="relative p-6 pb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-16 w-16 rounded-xl shadow-lg ring-2 ring-primary/20">
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {getInitials(store.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1.5">
                                    <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                        {store.name}
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'ml-2 text-xs font-medium gap-1.5',
                                                statusColors[isActive ? 'active' : 'inactive'].bg,
                                                statusColors[isActive ? 'active' : 'inactive'].text,
                                                statusColors[isActive ? 'active' : 'inactive'].border
                                            )}
                                        >
                                            <StatusIcon className="h-3 w-3" />
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </DialogTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'capitalize gap-1.5',
                                                typeColor.bg,
                                                typeColor.text,
                                                typeColor.border
                                            )}
                                        >
                                            <TypeIcon className="h-3 w-3" />
                                            {store.type}
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
                    {/* Quick Stats Grid */}
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

                    {/* Contact Information */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <Phone className="h-4 w-4 text-primary" />
                            </div>
                            Contact Information
                        </h4>
                        <div className="grid gap-2 text-sm ml-1">
                            {store.phone && (
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{store.phone}</span>
                                </div>
                            )}
                            {store.address && (
                                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <span className="flex-1">{store.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location Map */}
                    {hasValidCoordinates && mapReady && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <MapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    Location Map
                                </h4>
                                <div className="rounded-lg overflow-hidden border border-border/50 h-50 w-full">
                                    <MapContainer
                                        center={[lat, lng]}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                        zoomControl={true}
                                        scrollWheelZoom={true}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <Marker
                                            position={[lat, lng]}
                                            icon={createStoreIcon(isActive)}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <p className="font-semibold">{store.name}</p>
                                                    <p className="text-xs text-muted-foreground">{store.address || 'No address'}</p>
                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Navigation className="h-3 w-3" />
                                        Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                                    </span>
                                    <a
                                        href={`https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1"
                                    >
                                        Get Directions
                                        <Navigation className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Metadata - Removed Store ID */}
                    <div className="space-y-2 text-sm">
                        {createdDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Created: <span className="font-medium">{format(createdDate, 'PPP')}</span></span>
                            </div>
                        )}
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
                            Edit Store
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