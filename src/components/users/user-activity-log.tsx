import { useUserActivityLogs } from '#/lib/api/hooks'
import type { Id } from '#/types/entities'
import { Skeleton } from '#/components/ui/skeleton'
import { ScrollArea } from '#/components/ui/scroll-area'

const actionLabels: Record<string, string> = {
    status_changed_to_active: 'Account activated',
    status_changed_to_suspended: 'Account suspended',
    status_changed_to_banned: 'Account banned',
    role_changed: 'Role changed',
}

function timeAgo(timestamp: number) {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
}

export function UserActivityLog({ userId }: { userId: Id<'users'> }) {
    const logs = useUserActivityLogs(userId)

    if (logs === undefined) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        )
    }

    if (logs.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        )
    }

    return (
        <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
                {logs.map((log) => (
                    <div key={log._id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                                {actionLabels[log.action] ?? log.action}
                            </p>
                            {log.detail && (
                                <p className="text-xs text-muted-foreground">{log.detail}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                by {log.performerName}
                            </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {timeAgo(log.createdAt)}
                        </span>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}