import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { EmployeeStats } from '#/types/employees'

interface EmployeeChartsProps {
    stats: EmployeeStats
}

export function EmployeeCharts({ stats }: EmployeeChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={stats.roleDistribution}
                title="Employee Distribution by Role"
                description="Breakdown of employees across different roles"
                height={250}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'users', label: 'Total Users', color: '#3b82f6' },
                    { key: 'active', label: 'Active Users', color: '#22c55e' },
                ]}
                title="Employee Activity"
                description="Employee activity over the last 7 days"
                height={250}
            />
        </div>
    )
}