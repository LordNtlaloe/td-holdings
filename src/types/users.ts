import type { Doc } from "./entities"

export type User = Doc<"users">
export type UserStatus = 'active' | 'suspended' | 'banned'

export interface UserStats {
    total: number
    active: number
    suspended: number
    banned: number
    roleDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        users: number
        active: number
    }>
}