import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { ProductStats } from '#/types/products'

interface ProductChartsProps {
    stats: ProductStats
}

export function ProductCharts({ stats }: ProductChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={stats.departmentDistribution}
                title="Categories by Department"
                description="Distribution of categories across departments"
                height={350}
                innerRadius={0}
                showTotal={false}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'Created', label: 'Created', color: '#22c55e' },
                    { key: 'Updated', label: 'Updated', color: '#3b82f6' },
                    { key: 'Deactivated', label: 'Deactivated', color: '#f59e0b' },
                    { key: 'Reactivated', label: 'Reactivated', color: '#8b5cf6' },
                    { key: 'Deleted', label: 'Deleted', color: '#ef4444' },
                ]}
                title="Product Activity"
                description="Product operations over the last 7 days"
                height={380}
            />
        </div>
    )
}