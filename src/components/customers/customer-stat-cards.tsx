import { Users, UserCheck, Repeat, UserPlus } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { CustomerStats } from '#/types/customers'

interface CustomerStatCardsProps {
    stats: CustomerStats
    isLoading: boolean
}

export function CustomerStatCards({ stats, isLoading }: CustomerStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Customers',
            value: stats.total,
            icon: Users,
            description: 'All registered customers',
        },
        {
            id: 'active',
            title: 'Active Customers',
            value: stats.active,
            icon: UserCheck,
            description: 'Active customer accounts',
        },
        {
            id: 'repeat',
            title: 'Repeat Customers',
            value: stats.repeatCustomers,
            icon: Repeat,
            description: 'Customers with multiple purchases',
        },
        {
            id: 'new',
            title: 'New This Month',
            value: stats.newThisMonth,
            icon: UserPlus,
            description: 'New customers this month',
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