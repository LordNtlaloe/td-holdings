import { cn } from '#/lib/utils'

type Status = 'active' | 'suspended' | 'banned' | undefined

const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    banned: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export function UserStatusBadge({ status = 'active' }: { status?: Status }) {
    return (
        <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            styles[status] ?? styles.active
        )}>
            {status ?? 'active'}
        </span>
    )
}