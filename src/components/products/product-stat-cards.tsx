import { Package, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { ProductStats } from '#/types/products'
import { formatCurrency } from './product-utils'

interface ProductStatCardsProps {
    stats: ProductStats
    isLoading: boolean
}

export function ProductStatCards({ stats, isLoading }: ProductStatCardsProps) {
    const statCards = [
        {
            id: 'total',
            title: 'Total Products',
            value: stats.total,
            icon: Package,
            description: `${stats.active} active, ${stats.inactive} inactive`,
        },
        {
            id: 'totalStock',
            title: 'Total Stock',
            value: stats.totalStock,
            icon: ShoppingBag,
            description: `${stats.productsWithStock} products in stock`,
        },
        {
            id: 'totalValue',
            title: 'Inventory Value',
            value: formatCurrency(stats.totalValue),
            icon: DollarSign,
            description: `Total cost of all inventory`,
        },
        {
            id: 'totalSales',
            title: 'Total Sales',
            value: stats.totalSales,
            icon: TrendingUp,
            description: `Units sold across all products`,
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