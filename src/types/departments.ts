import type { Doc } from "./entities"

export type Department = Doc<"departments">
export type Store = Doc<"stores">

export interface DepartmentWithStoreCount extends Department {
    storeCount: number
    stores: Store[]
    employeeCount: number
}

export interface DepartmentStats {
    total: number
    activityData: Array<{
        label: string
        Created: number
        Updated: number
        Deleted: number
        Assigned: number
        Removed: number
    }>
    assignedToStores: number
    unassigned: number
    totalStores: number
    activeStores: number
    totalEmployees: number
    totalStoreAssignments: number
    avgStoresPerDepartment: number
    departmentsWithStores: DepartmentWithStoreCount[]
    storeDistribution: Array<{ label: string; value: number }>
    departmentStoreCountDistribution: Array<{ 
        label: string
        value: number
        color: string
    }>
}