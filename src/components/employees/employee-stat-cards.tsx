import { Users, UserCheck, UserX, Building2 } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { EmployeeStats } from '#/types/employees'

interface EmployeeStatCardsProps {
    stats: EmployeeStats
    totalStores: number
    isLoading: boolean
}

export function EmployeeStatCards({ stats, totalStores, isLoading }: EmployeeStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Employees',
            value: stats.total,
            icon: Users,
            description: 'All employees across all stores',
        },
        {
            id: 'active',
            title: 'Active Employees',
            value: stats.active,
            icon: UserCheck,
            description: 'Currently active employees',
        },
        {
            id: 'inactive',
            title: 'Inactive Employees',
            value: stats.inactive,
            icon: UserX,
            description: 'Deactivated employees',
        },
        {
            id: 'stores',
            title: 'Total Stores',
            value: totalStores,
            icon: Building2,
            description: 'Stores with employees',
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