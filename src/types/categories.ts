import type { Doc } from "./entities"

export type Category = Doc<"categories">
export type Department = Doc<"departments">

export interface CategoryWithDepartment extends Category {
    department: Department | null
    productCount?: number
}

export interface CategoryStats {
    total: number
    totalDepartments: number
    departmentsWithCategories: number
    departmentsWithoutCategories: number
    avgCategoriesPerDepartment: number
    maxCategoriesInDepartment: number
    totalProducts: number
    categoriesWithProducts: number
    categoriesWithoutProducts: number
    departmentDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        Created: number
        Updated: number
        Deleted: number
    }>
}