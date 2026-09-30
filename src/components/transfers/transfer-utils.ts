import type { TransferStatus, TransferWithStores, TransferStats, TransferChartStats } from '#/types/transfers'

export function getStatusBadgeVariant(status: TransferStatus): 'default' | 'secondary' | 'destructive' {
    switch (status) {
        case 'pending':
            return 'secondary'
        case 'in_transit':
            return 'default'
        case 'received':
            return 'default'
        case 'cancelled':
            return 'destructive'
    }
}

export function getStatusLabel(status: TransferStatus): string {
    switch (status) {
        case 'pending':
            return 'Pending'
        case 'in_transit':
            return 'In Transit'
        case 'received':
            return 'Received'
        case 'cancelled':
            return 'Cancelled'
    }
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString()
}

export function calculateTransferStats(transfersByStatus: Record<TransferStatus, TransferWithStores[]>): TransferStats {
    return {
        pending: transfersByStatus.pending.length,
        inTransit: transfersByStatus.in_transit.length,
        received: transfersByStatus.received.length,
        cancelled: transfersByStatus.cancelled.length,
    }
}

export function calculateChartStats(
    transfersByStatus: Record<TransferStatus, TransferWithStores[]>,
    transfers?: TransferWithStores[],
    transferActivityStats?: any[]
): TransferChartStats {
    const statusColors: Record<TransferStatus, string> = {
        pending: '#f59e0b',
        in_transit: '#3b82f6',
        received: '#22c55e',
        cancelled: '#ef4444',
    }
    const statusLabels: Record<TransferStatus, string> = {
        pending: 'Pending',
        in_transit: 'In Transit',
        received: 'Received',
        cancelled: 'Cancelled',
    }

    const statusDistribution = (Object.keys(transfersByStatus) as TransferStatus[])
        .map((status) => ({
            label: statusLabels[status],
            value: transfersByStatus[status].length,
            color: statusColors[status],
        }))
        .filter((d) => d.value > 0)

    const storeCounts = new Map<string, { name: string; count: number }>()
    for (const t of transfers ?? []) {
        if (t.fromStore) {
            const entry = storeCounts.get(t.fromStore._id) ?? { name: t.fromStore.name, count: 0 }
            entry.count++
            storeCounts.set(t.fromStore._id, entry)
        }
        if (t.toStore) {
            const entry = storeCounts.get(t.toStore._id) ?? { name: t.toStore.name, count: 0 }
            entry.count++
            storeCounts.set(t.toStore._id, entry)
        }
    }
    const storeDistribution = Array.from(storeCounts.values())
        .map((entry) => ({ label: entry.name, value: entry.count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    let activityData = transferActivityStats
    if (!activityData || activityData.length === 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label) => ({
            label,
            Created: 0,
            Shipped: 0,
            Received: 0,
            Cancelled: 0,
        }))
    }

    return { statusDistribution, storeDistribution, activityData }
}