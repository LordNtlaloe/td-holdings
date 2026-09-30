import type { User, UserStatus, UserStats } from '#/types/users'

export function calculateUserStats(
    users?: User[],
    activityStats?: any[]
): UserStats {
    if (!users) {
        return {
            total: 0,
            active: 0,
            suspended: 0,
            banned: 0,
            roleDistribution: [],
            activityData: [],
        }
    }

    const total = users.length
    const active = users.filter((u: User) => u.status === 'active' || !u.status).length
    const suspended = users.filter((u: User) => u.status === 'suspended').length
    const banned = users.filter((u: User) => u.status === 'banned').length

    const roleMap = new Map<string, number>()
    users.forEach((u: User) => {
        roleMap.set(u.role, (roleMap.get(u.role) || 0) + 1)
    })
    const roleDistribution = Array.from(roleMap.entries()).map(([label, value]) => ({
        label: label.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value,
    }))

    // Use real activity data if available, otherwise fallback to empty
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
        suspended,
        banned,
        roleDistribution,
        activityData,
    }
}

export function getStatusColor(status: UserStatus): string {
    const colors = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        banned: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || colors.active
}

export function getStatusLabel(status: UserStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1)
}

export function formatRole(role: string): string {
    return role.replace('_', ' ')
}