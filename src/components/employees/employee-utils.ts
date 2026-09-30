import type { EmployeeWithDetails, EmployeeStats } from '#/types/employees'

export function calculateEmployeeStats(
    employees?: EmployeeWithDetails[],
    activityStats?: any[]
): EmployeeStats {
    if (!employees) {
        return {
            total: 0,
            active: 0,
            inactive: 0,
            storeDistribution: [],
            roleDistribution: [],
            activityData: [],
        }
    }

    const total = employees.length
    const active = employees.filter((e: EmployeeWithDetails) => e.isActive).length
    const inactive = employees.filter((e: EmployeeWithDetails) => !e.isActive).length

    // Store distribution
    const storeMap = new Map<string, number>()
    employees.forEach((e: EmployeeWithDetails) => {
        const storeName = e.store?.name || 'Unknown Store'
        storeMap.set(storeName, (storeMap.get(storeName) || 0) + 1)
    })
    const storeDistribution = Array.from(storeMap.entries()).map(([label, value]) => ({
        label,
        value,
    }))

    // Role distribution
    const roleMap = new Map<string, number>()
    employees.forEach((e: EmployeeWithDetails) => {
        roleMap.set(e.role, (roleMap.get(e.role) || 0) + 1)
    })
    const roleDistribution = Array.from(roleMap.entries()).map(([label, value]) => ({
        label: label.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
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
        storeDistribution,
        roleDistribution,
        activityData,
    }
}

export function getStatusColor(isActive: boolean): string {
    return isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function formatRole(role: string): string {
    return role.replace('_', ' ')
}

export function getEmployeeDisplayName(employee: EmployeeWithDetails): string {
    return employee.user?.name || 'Unknown'
}

export function getEmployeeEmail(employee: EmployeeWithDetails): string {
    return employee.user?.email || 'No email'
}

export function getStoreName(employee: EmployeeWithDetails): string {
    return employee.store?.name || 'Unknown Store'
}