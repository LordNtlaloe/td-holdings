import type { Department, Store, DepartmentWithStoreCount, DepartmentStats } from '#/types/departments'

export function formatDate(date: number | null): string {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
}

export function calculateDepartmentStats(
    departments?: Department[],
    departmentsWithStores?: DepartmentWithStoreCount[],
    stores?: Store[],
    departmentActivityStats?: any[]
): DepartmentStats {
    if (!departments || !departmentsWithStores || !stores) {
        return {
            total: 0,
            activityData: [],
            assignedToStores: 0,
            unassigned: 0,
            totalStores: 0,
            activeStores: 0,
            totalEmployees: 0,
            totalStoreAssignments: 0,
            avgStoresPerDepartment: 0,
            departmentsWithStores: [],
            storeDistribution: [],
            departmentStoreCountDistribution: [],
        }
    }

    const total = departments.length
    const totalStores = stores.length
    const activeStores = stores.filter((s: Store) => s.isActive).length

    let assignedCount = 0
    let totalEmployees = 0
    let totalStoreAssignments = 0

    const departmentsWithStoreData = departmentsWithStores.map((dept: DepartmentWithStoreCount) => {
        if (dept.storeCount > 0) assignedCount++
        totalEmployees += dept.employeeCount || 0
        totalStoreAssignments += dept.storeCount
        return dept
    })

    const unassigned = total - assignedCount
    const avgStoresPerDepartment = total > 0 ? totalStoreAssignments / total : 0

    // Distribution of stores per department
    const storeCountMap = new Map<number, number>()
    departmentsWithStoreData.forEach((dept: DepartmentWithStoreCount) => {
        const count = dept.storeCount
        storeCountMap.set(count, (storeCountMap.get(count) || 0) + 1)
    })

    const departmentStoreCountDistribution = Array.from(storeCountMap.entries())
        .map(([stores, count]) => ({
            label: stores === 0 ? '0 Stores' : stores === 1 ? '1 Store' : stores === 2 ? '2 Stores' : `${stores} Stores`,
            value: count,
            color: stores === 0 ? '#f59e0b' : stores === 1 ? '#3b82f6' : stores <= 3 ? '#ff0000' : '#22c55e',
        }))
        .sort((a, b) => {
            const order = ['0 Stores', '1 Store', '2 Stores', '3 Stores', '4 Stores', '5+ Stores']
            return order.indexOf(a.label) - order.indexOf(b.label)
        })

    // Distribution of departments per store
    const storeDeptCount = new Map<string, { name: string; count: number }>()
    stores.forEach((store: Store) => {
        storeDeptCount.set(store._id, { name: store.name, count: 0 })
    })

    departmentsWithStoreData.forEach((dept: DepartmentWithStoreCount) => {
        dept.stores?.forEach((store: Store) => {
            if (storeDeptCount.has(store._id)) {
                const entry = storeDeptCount.get(store._id)!
                entry.count++
            }
        })
    })

    const storeDistribution = Array.from(storeDeptCount.entries())
        .map(([_, data]) => ({
            label: data.name,
            value: data.count,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    let activityData = []
    if (departmentActivityStats && departmentActivityStats.length > 0) {
        activityData = departmentActivityStats
    } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label: string) => ({
            label,
            Created: 0,
            Updated: 0,
            Deleted: 0,
            Assigned: 0,
            Removed: 0,
        }))
    }

    return {
        total,
        activityData,
        assignedToStores: assignedCount,
        unassigned,
        totalStores,
        activeStores,
        totalEmployees,
        totalStoreAssignments,
        avgStoresPerDepartment,
        departmentsWithStores: departmentsWithStoreData,
        storeDistribution,
        departmentStoreCountDistribution,
    }
}