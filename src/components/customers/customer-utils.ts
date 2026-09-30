import type { Customer, CustomerWithStats, CustomerStats } from '#/types/customers'

export function calculateCustomerStats(
    customers?: Customer[],
    customersWithStats?: CustomerWithStats[],
    activityStats?: any[]
): CustomerStats {
    if (!customers || !customersWithStats) {
        return {
            total: 0,
            active: 0,
            repeatCustomers: 0,
            newThisMonth: 0,
            topCustomers: [],
            activityData: [],
        }
    }

    const total = customers.length
    const active = customers.filter((c) => c.isActive !== false).length
    const repeatCustomers = customersWithStats.filter((c) => c.salesCount > 1).length

    // Count new customers this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const newThisMonth = customers.filter((c) => (c.createdAt || 0) >= startOfMonth).length

    // Top customers
    const topCustomers = customersWithStats
        .filter(c => c.salesCount > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)

    // Activity data
    let activityData = []
    if (activityStats && activityStats.length > 0) {
        activityData = activityStats
    } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label: string) => ({
            label,
            customers: 0,
            new: 0,
        }))
    }

    return {
        total,
        active,
        repeatCustomers,
        newThisMonth,
        topCustomers,
        activityData,
    }
}

export function formatCurrency(amount: number): string {
    return `R${amount.toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export function formatDate(timestamp: number | null): string {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function getCustomerStatus(customer: Customer): 'active' | 'inactive' {
    return customer.isActive !== false ? 'active' : 'inactive'
}

export function getStatusColor(status: 'active' | 'inactive'): string {
    return status === 'active'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function getStatusLabel(status: 'active' | 'inactive'): string {
    return status === 'active' ? 'Active' : 'Inactive'
}