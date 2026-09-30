import { Tag, FolderTree, Layers, Package } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { CategoryStats } from '#/types/categories'

interface CategoryStatCardsProps {
    stats: CategoryStats
    isLoading: boolean
}

export function CategoryStatCards({ stats, isLoading }: CategoryStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Categories',
            value: stats.total,
            icon: Tag,
            description: 'All categories in the system',
        },
        {
            id: 'departmentsWithCategories',
            title: 'Departments with Categories',
            value: stats.departmentsWithCategories,
            icon: FolderTree,
            description: `${stats.departmentsWithoutCategories} departments have no categories`,
        },
        {
            id: 'avgCategories',
            title: 'Avg Categories/Dept',
            value: stats.avgCategoriesPerDepartment.toFixed(1),
            icon: Layers,
            description: `${stats.maxCategoriesInDepartment} max in a single department`,
        },
        {
            id: 'categoriesWithProducts',
            title: 'Categories with Products',
            value: stats.categoriesWithProducts,
            icon: Package,
            description: `${stats.categoriesWithoutProducts} categories have no products`,
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