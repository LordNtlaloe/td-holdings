import type { Doc } from './entities'

export type Customer = Doc<"customers">

export interface CustomerWithStats extends Customer {
    salesCount: number
    totalSpent: number
    lastPurchase: number | null
}

export interface CustomerInsights {
    totalSales: number
    totalSpent: number
    averageSpent: number
    lastPurchase: number | null
    firstPurchase: number | null
    averageDaysBetweenPurchases: number
    topProducts: Array<{ name: string; count: number; total: number }>
    isRepeatCustomer: boolean
    customerSince: number | null
}

export interface CustomerWithDetails extends Customer {
    salesHistory: any[]
    insights: CustomerInsights
}

export interface CustomerStats {
    total: number
    active: number
    repeatCustomers: number
    newThisMonth: number
    topCustomers: CustomerWithStats[]
    activityData: Array<{
        label: string
        customers: number
        new: number
    }>
}