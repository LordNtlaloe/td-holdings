import type { Doc } from "./entities"

export type Product = Doc<"products">
export type Category = Doc<"categories">
export type Department = Doc<"departments">

export interface ProductWithDetails extends Product {
    category: Category | null
    department: Department | null
    totalStock: number
    totalSales: number
    storeCount: number
}

export interface ProductStats {
    total: number
    active: number
    inactive: number
    totalStock: number
    totalValue: number
    totalSales: number
    productsWithStock: number
    productsWithoutStock: number
    departmentDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        Created: number
        Updated: number
        Deleted: number
        Deactivated: number
        Reactivated: number
    }>
    uniqueSizes: number
    uniqueColors: number
}