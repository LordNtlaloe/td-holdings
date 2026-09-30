import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { UserStats } from '#/types/users'

interface UserChartsProps {
    stats: UserStats
}

export function UserCharts({ stats }: UserChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={stats.roleDistribution}
                title="User Distribution by Role"
                description="Breakdown of users across different roles"
                height={250}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'users', label: 'Total Users', color: '#3b82f6' },
                    { key: 'active', label: 'Active Users', color: '#22c55e' },
                ]}
                title="User Activity"
                description="User activity over the last 7 days"
                height={250}
            />
        </div>
    )
}