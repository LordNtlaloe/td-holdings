import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { StoreStats } from '#/types/stores'

interface StoreChartsProps {
    stats: StoreStats
}

export function StoreCharts({ stats }: StoreChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={stats.typeDistribution}
                title="Store Distribution by Type"
                description="Breakdown of stores by type"
                height={250}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'users', label: 'Total Users', color: '#3b82f6' },
                    { key: 'active', label: 'Active Users', color: '#22c55e' },
                ]}
                title="Store Activity"
                description="Store activity over the last 7 days"
                height={250}
            />
        </div>
    )
}