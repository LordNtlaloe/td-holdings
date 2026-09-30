import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { CategoryStats } from '#/types/categories'

interface CategoryChartsProps {
    stats: CategoryStats
}

export function CategoryCharts({ stats }: CategoryChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={stats.departmentDistribution}
                title="Categories by Department"
                description="Distribution of categories across departments"
                height={250}
                innerRadius={0}
                showTotal={false}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'Created', label: 'Created', color: '#22c55e' },
                    { key: 'Updated', label: 'Updated', color: '#3b82f6' },
                    { key: 'Deleted', label: 'Deleted', color: '#ef4444' },
                ]}
                title="Category Activity"
                description="Category operations over the last 7 days"
                height={250}
            />
        </div>
    )
}