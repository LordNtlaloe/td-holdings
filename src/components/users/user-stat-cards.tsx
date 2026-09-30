import { Users, UserCheck, UserX, ShieldBan } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { UserStats } from '#/types/users'

interface UserStatCardsProps {
    stats: UserStats
    isLoading: boolean
}

export function UserStatCards({ stats, isLoading }: UserStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Users',
            value: stats.total,
            icon: Users,
            description: 'All registered users',
        },
        {
            id: 'active',
            title: 'Active Users',
            value: stats.active,
            icon: UserCheck,
            description: 'Users with active status',
        },
        {
            id: 'suspended',
            title: 'Suspended',
            value: stats.suspended,
            icon: UserX,
            description: 'Temporarily suspended accounts',
        },
        {
            id: 'banned',
            title: 'Banned',
            value: stats.banned,
            icon: ShieldBan,
            description: 'Permanently banned accounts',
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