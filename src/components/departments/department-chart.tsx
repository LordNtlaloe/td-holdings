import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { DepartmentStats } from '#/types/departments'

interface DepartmentChartsProps {
    stats: DepartmentStats
}

export function DepartmentCharts({ stats }: DepartmentChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <DistributionChart
                data={stats.departmentStoreCountDistribution}
                title="Departments by Store Count"
                description="How many stores each department is assigned to"
                height={250}
                innerRadius={55}
                showTotal={true}
            />
            <DistributionChart
                data={stats.storeDistribution}
                title="Top Stores by Department Count"
                description="Stores with the most departments"
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
                    { key: 'Assigned', label: 'Assigned to Stores', color: '#8b5cf6' },
                    { key: 'Removed', label: 'Removed from Stores', color: '#f59e0b' },
                ]}
                title="Department Activity"
                description="Department operations over the last 7 days"
                height={250}
            />
        </div>
    )
}