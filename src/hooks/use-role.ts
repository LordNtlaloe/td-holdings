import { useCurrentUser } from '#/lib/api/hooks'

export type Role = "super_admin" | "admin" | "manager" | "cashier"

export function useRole() {
    const { data, isLoading } = useCurrentUser()
    const user = data?.user

    return {
        role: user?.role as Role | undefined,
        storeId: (user?.storeId ?? null) as string | null,
        isLoading,
        isAdmin: user?.role === "admin" || user?.role === "super_admin",
        isManager: user?.role === "manager",
        isCashier: user?.role === "cashier",
        hasRole: (roles: Role[]) => !!user?.role && roles.includes(user.role as Role),
    }
}