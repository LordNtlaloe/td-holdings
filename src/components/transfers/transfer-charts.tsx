import { DistributionChart } from '#/components/general/distribution-chart'
import { ActivityBarChart } from '#/components/general/activity-chart'
import type { TransferChartStats } from '#/types/transfers'

interface TransferChartsProps {
    chartStats: TransferChartStats
}

export function TransferCharts({ chartStats }: TransferChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <DistributionChart
                data={chartStats.statusDistribution}
                title="Transfers by Status"
                description="Current breakdown across the pipeline"
                height={250}
                innerRadius={55}
                showTotal={true}
            />
            <DistributionChart
                data={chartStats.storeDistribution}
                title="Top Stores by Transfer Volume"
                description="Stores most involved in transfers (in or out)"
                height={250}
                innerRadius={0}
                showTotal={false}
            />
            <ActivityBarChart
                data={chartStats.activityData}
                series={[
                    { key: 'Created', label: 'Created', color: '#3b82f6' },
                    { key: 'Shipped', label: 'Shipped', color: '#8b5cf6' },
                    { key: 'Received', label: 'Received', color: '#22c55e' },
                    { key: 'Cancelled', label: 'Cancelled', color: '#ef4444' },
                ]}
                title="Transfer Activity"
                description="Transfer operations over the last 7 days"
                height={250}
            />
        </div>
    )
}