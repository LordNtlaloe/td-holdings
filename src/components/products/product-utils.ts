import type { Product, Category, Department, ProductWithDetails, ProductStats } from '#/types/products'

export function calculateProductStats(
    products?: Product[],
    productsWithDetails?: ProductWithDetails[],
    categories?: Category[],
    departments?: Department[],
    productActivityStats?: any[]
): ProductStats {
    if (!products || !productsWithDetails) {
        return {
            total: 0,
            active: 0,
            inactive: 0,
            totalStock: 0,
            totalValue: 0,
            totalSales: 0,
            productsWithStock: 0,
            productsWithoutStock: 0,
            departmentDistribution: [],
            activityData: [],
            uniqueSizes: 0,
            uniqueColors: 0,
        }
    }

    const total = products.length
    const active = products.filter((p: Product) => p.isActive).length
    const inactive = products.filter((p: Product) => !p.isActive).length

    let totalStock = 0
    let totalValue = 0
    let totalSales = 0
    let productsWithStock = 0
    const sizes = new Set<string>()
    const colors = new Set<string>()

    productsWithDetails.forEach((p: ProductWithDetails) => {
        totalStock += p.totalStock || 0
        totalValue += (p.totalStock || 0) * p.costPrice
        totalSales += p.totalSales || 0
        if ((p.totalStock || 0) > 0) productsWithStock++
        if (p.sizes) p.sizes.forEach(s => sizes.add(s))
        if (p.colors) p.colors.forEach(c => colors.add(c))
    })

    const productsWithoutStock = total - productsWithStock

    // Categories per department
    const deptMap = new Map<string, number>()
    if (categories) {
        categories.forEach((c: Category) => {
            deptMap.set(c.departmentId, (deptMap.get(c.departmentId) || 0) + 1)
        })
    }

    const departmentDistribution = Array.from(deptMap.entries())
        .map(([departmentId, count]) => {
            const dept = departments?.find(d => d._id === departmentId)
            return {
                label: dept?.name || 'Unknown Department',
                value: count,
            }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    let activityData = []
    if (productActivityStats && productActivityStats.length > 0) {
        activityData = productActivityStats
    } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label: string) => ({
            label,
            Created: 0,
            Updated: 0,
            Deleted: 0,
            Deactivated: 0,
            Reactivated: 0,
        }))
    }

    return {
        total,
        active,
        inactive,
        totalStock,
        totalValue,
        totalSales,
        productsWithStock,
        productsWithoutStock,
        departmentDistribution,
        activityData,
        uniqueSizes: sizes.size,
        uniqueColors: colors.size,
    }
}

export function formatCurrency(amount: number): string {
    return `R${amount.toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export function getStatusColor(isActive: boolean): string {
    return isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

export function getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive'
}