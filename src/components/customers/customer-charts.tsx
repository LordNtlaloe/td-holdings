import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { CustomerStats } from '#/types/customers'

interface CustomerChartsProps {
    stats: CustomerStats
}

export function CustomerCharts({ stats }: CustomerChartsProps) {
    // Prepare top customers data for chart
    const topCustomersData = stats.topCustomers.slice(0, 8).map((c) => ({
        label: c.name,
        value: c.totalSpent,
    }))

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <DistributionChart
                data={topCustomersData}
                title="Top Customers by Spending"
                description="Highest spending customers"
                height={250}
            />
            <ActivityBarChart
                data={stats.activityData}
                series={[
                    { key: 'customers', label: 'Total Customers', color: '#3b82f6' },
                    { key: 'new', label: 'New Customers', color: '#22c55e' },
                ]}
                title="Customer Activity"
                description="Customer activity over the last 7 days"
                height={250}
            />
        </div>
    )
}