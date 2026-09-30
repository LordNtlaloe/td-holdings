import type { Store, StoreStats } from '#/types/stores'

export function calculateStoreStats(
    stores?: Store[],
    activityStats?: any[]
): StoreStats {
    if (!stores) {
        return {
            total: 0,
            active: 0,
            inactive: 0,
            central: 0,
            branch: 0,
            typeDistribution: [],
            activityData: [],
        }
    }

    const total = stores.length
    const active = stores.filter((s: Store) => s.isActive).length
    const inactive = stores.filter((s: Store) => !s.isActive).length
    const central = stores.filter((s: Store) => s.type === 'central').length
    const branch = stores.filter((s: Store) => s.type === 'branch').length

    // Type distribution
    const typeMap = new Map<string, number>()
    stores.forEach((s: Store) => {
        const label = s.type.charAt(0).toUpperCase() + s.type.slice(1)
        typeMap.set(label, (typeMap.get(label) || 0) + 1)
    })
    const typeDistribution = Array.from(typeMap.entries()).map(([label, value]) => ({
        label,
        value,
    }))

    // Use real activity data if available
    let activityData = []
    if (activityStats && activityStats.length > 0) {
        activityData = activityStats
    } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label: string) => ({
            label,
            users: 0,
            active: 0,
        }))
    }

    return {
        total,
        active,
        inactive,
        central,
        branch,
        typeDistribution,
        activityData,
    }
}

export function formatPhoneNumber(phone: string): string {
    return phone || 'No phone'
}

export function formatAddress(address: string): string {
    return address || 'No address'
}

export function getStatusColor(isActive: boolean): string {
    return isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive'
}

export function getStoreTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1)
}