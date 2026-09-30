import { Clock, Truck, PackageCheck, XCircle } from 'lucide-react'
import { StatCard } from '#/components/general/stat-cards'
import type { TransferStats } from '#/types/transfers'

interface TransferStatCardsProps {
    stats: TransferStats
    isLoading: boolean
}

export function TransferStatCards({ stats, isLoading }: TransferStatCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Pending"
                value={stats.pending}
                icon={Clock}
                loading={isLoading}
            />
            <StatCard
                title="In Transit"
                value={stats.inTransit}
                icon={Truck}
                loading={isLoading}
            />
            <StatCard
                title="Received"
                value={stats.received}
                icon={PackageCheck}
                loading={isLoading}
            />
            <StatCard
                title="Cancelled"
                value={stats.cancelled}
                icon={XCircle}
                loading={isLoading}
            />
        </div>
    )
}