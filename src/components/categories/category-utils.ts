import type { Category, Department, CategoryWithDepartment, CategoryStats } from '#/types/categories'

export function formatDate(date: number | null): string {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
}

export function getDepartmentName(
    departmentId: string,
    departments?: Department[]
): string {
    if (!departments) return 'Unknown'
    const dept = departments.find(d => d._id === departmentId)
    return dept?.name || 'Unknown'
}

export function calculateCategoryStats(
    categories?: Category[],
    departments?: Department[],
    categoriesWithDetails?: CategoryWithDepartment[],
    categoryActivityStats?: any[]
): CategoryStats {
    if (!categories || !departments) {
        return {
            total: 0,
            totalDepartments: 0,
            departmentsWithCategories: 0,
            departmentsWithoutCategories: 0,
            avgCategoriesPerDepartment: 0,
            maxCategoriesInDepartment: 0,
            totalProducts: 0,
            categoriesWithProducts: 0,
            categoriesWithoutProducts: 0,
            departmentDistribution: [],
            activityData: [],
        }
    }

    const total = categories.length
    const totalDepartments = departments.length

    const deptMap = new Map<string, { count: number; name: string; products: number }>()
    let totalProducts = 0
    let categoriesWithProducts = 0

    categories.forEach((c: Category) => {
        const deptId = c.departmentId
        const dept = departments.find(d => d._id === deptId)

        const categoryDetail = categoriesWithDetails?.find(cd => cd._id === c._id)
        const productCount = categoryDetail?.productCount || 0
        if (productCount > 0) categoriesWithProducts++
        totalProducts += productCount

        if (deptMap.has(deptId)) {
            const entry = deptMap.get(deptId)!
            entry.count++
            entry.products += productCount
        } else {
            deptMap.set(deptId, {
                count: 1,
                name: dept?.name || 'Unknown',
                products: productCount
            })
        }
    })

    const departmentsWithCategories = deptMap.size
    const departmentsWithoutCategories = totalDepartments - departmentsWithCategories
    const categoriesWithoutProducts = total - categoriesWithProducts

    const avgCategoriesPerDepartment = totalDepartments > 0 ? total / totalDepartments : 0
    let maxCategoriesInDepartment = 0
    deptMap.forEach((value) => {
        if (value.count > maxCategoriesInDepartment) {
            maxCategoriesInDepartment = value.count
        }
    })

    const departmentDistribution = Array.from(deptMap.entries())
        .map(([, data]) => ({
            label: data.name,
            value: data.count,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    let activityData = []
    if (categoryActivityStats && categoryActivityStats.length > 0) {
        activityData = categoryActivityStats
    } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        activityData = days.map((label: string) => ({
            label,
            Created: 0,
            Updated: 0,
            Deleted: 0,
        }))
    }

    return {
        total,
        totalDepartments,
        departmentsWithCategories,
        departmentsWithoutCategories,
        avgCategoriesPerDepartment,
        maxCategoriesInDepartment,
        totalProducts,
        categoriesWithProducts,
        categoriesWithoutProducts,
        departmentDistribution,
        activityData,
    }
}