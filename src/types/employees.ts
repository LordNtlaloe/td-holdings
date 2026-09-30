import type { Doc } from "./entities"

export type Employee = Doc<"employees">
export type User = Doc<"users">
export type Store = Doc<"stores">

export interface EmployeeWithDetails extends Employee {
    user: User | null
    store: Store | null
}

export interface EmployeeStats {
    total: number
    active: number
    inactive: number
    storeDistribution: Array<{ label: string; value: number }>
    roleDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        users: number
        active: number
    }>
}