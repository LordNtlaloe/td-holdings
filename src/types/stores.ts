import type { Doc } from "./entities"

export type Store = Doc<"stores">

export interface StoreStats {
    total: number
    active: number
    inactive: number
    central: number
    branch: number
    typeDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        users: number
        active: number
    }>
}