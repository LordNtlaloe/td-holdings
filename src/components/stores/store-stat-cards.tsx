import { Building2, CheckCircle, XCircle, MapPin } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { StoreStats } from '#/types/stores'

interface StoreStatCardsProps {
    stats: StoreStats
    isLoading: boolean
}

export function StoreStatCards({ stats, isLoading }: StoreStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Stores',
            value: stats.total,
            icon: Building2,
            description: 'All stores in the system',
        },
        {
            id: 'active',
            title: 'Active Stores',
            value: stats.active,
            icon: CheckCircle,
            description: 'Currently active stores',
        },
        {
            id: 'inactive',
            title: 'Inactive Stores',
            value: stats.inactive,
            icon: XCircle,
            description: 'Deactivated stores',
        },
        {
            id: 'branches',
            title: 'Branches',
            value: stats.branch,
            icon: MapPin,
            description: 'Total branch locations',
        },
    ]

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
                <StatCard
                    key={card.id}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    loading={isLoading}
                    description={card.description}
                />
            ))}
        </div>
    )
}