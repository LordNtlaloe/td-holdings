import { FolderTree, Link, Store, Users } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { DepartmentStats } from '#/types/departments'

interface DepartmentStatCardsProps {
    stats: DepartmentStats
    isLoading: boolean
}

export function DepartmentStatCards({ stats, isLoading }: DepartmentStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Departments',
            value: stats.total,
            icon: FolderTree,
            description: 'All departments in the system',
        },
        {
            id: 'assigned',
            title: 'Departments Assigned',
            value: stats.assignedToStores,
            icon: Link,
            description: `Out of ${stats.total} total departments`,
        },
        {
            id: 'storeAssignments',
            title: 'Total Store Assignments',
            value: stats.totalStoreAssignments,
            icon: Store,
            description: `${stats.totalStores} stores available`,
        },
        {
            id: 'avgStores',
            title: 'Avg Stores per Dept',
            value: stats.avgStoresPerDepartment.toFixed(1),
            icon: Users,
            description: 'Average store assignments per department',
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