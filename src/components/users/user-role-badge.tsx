import { cn } from '#/lib/utils'

type Role = 'admin' | 'doctor' | 'pharmacist' | 'cashier'

const styles: Record<Role, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    doctor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    pharmacist: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    cashier: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
}

export function UserRoleBadge({ role }: { role: Role }) {
    return (
        <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            styles[role]
        )}>
            {role}
        </span>
    )
}