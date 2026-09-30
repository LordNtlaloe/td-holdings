import { useState } from 'react'
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DashboardData } from '#/types/dashboard'

type Alert = DashboardData['alerts'][number]

interface DashboardAlertsProps {
    alerts: Alert[]
}

const alertConfig = {
    critical: {
        bg: 'bg-destructive/10 border-destructive/30',
        text: 'text-destructive',
        icon: XCircle,
        label: 'Critical',
    },
    warning: {
        bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
        text: 'text-amber-700 dark:text-amber-400',
        icon: AlertTriangle,
        label: 'Warning',
    },
    info: {
        bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Info,
        label: 'Info',
    },
}

function AlertRow({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
    const cfg = alertConfig[alert.type]
    const Icon = cfg.icon

    return (
        <div className={cn('flex items-start gap-3 rounded-md border px-3 py-2.5', cfg.bg)}>
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.text)} />
            <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium leading-snug', cfg.text)}>{alert.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
            </div>
            <button
                onClick={() => onDismiss(alert.id)}
                className={cn('mt-0.5 shrink-0 opacity-60 transition hover:opacity-100', cfg.text)}
                aria-label="Dismiss alert"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const [expanded, setExpanded] = useState(false)

    const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]))
    const visible = alerts.filter((a) => !dismissed.has(a.id))

    if (visible.length === 0) return null

    // Sort: critical first, then warning, then info
    const sorted = [...visible].sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 }
        return order[a.type] - order[b.type]
    })

    const criticalCount = sorted.filter((a) => a.type === 'critical').length
    const warningCount = sorted.filter((a) => a.type === 'warning').length
    const PREVIEW_COUNT = 2
    const shown = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT)
    const hasMore = sorted.length > PREVIEW_COUNT

    return (
        <div className="space-y-1.5">
            {/* Summary line */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {criticalCount > 0 && (
                    <span className="font-medium text-destructive">{criticalCount} critical</span>
                )}
                {criticalCount > 0 && warningCount > 0 && <span>·</span>}
                {warningCount > 0 && (
                    <span className="font-medium text-amber-600 dark:text-amber-400">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                )}
                <span className="ml-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() => setDismissed(new Set(alerts.map((a) => a.id)))}
                    >
                        Dismiss all
                    </Button>
                </span>
            </div>

            {/* Alert rows */}
            <div className="space-y-1.5">
                {shown.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} onDismiss={dismiss} />
                ))}
            </div>

            {hasMore && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setExpanded((e) => !e)}
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="h-3 w-3" /> Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3 w-3" /> Show {sorted.length - PREVIEW_COUNT} more
                        </>
                    )}
                </Button>
            )}
        </div>
    )
}