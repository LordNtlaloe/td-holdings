import { type LucideIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'

type Trend = {
    value: number       // e.g. 12 means +12%
    label?: string      // e.g. "vs last month"
}

type SparkPoint = { value: number }

interface StatCardProps {
    title: string
    value: string | number
    icon?: LucideIcon
    trend?: Trend
    description?: string
    spark?: SparkPoint[]   // optional mini sparkline (requires recharts)
    className?: string
    loading?: boolean
}

// ── tiny sparkline (pure SVG, zero deps) ─────────────────────────────────────
function Sparkline({ data }: { data: SparkPoint[] }) {
    if (data.length < 2) return null
    const vals = data.map(d => d.value)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1
    const w = 80
    const h = 28
    const step = w / (vals.length - 1)
    const points = vals
        .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
        .join(' ')

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-20 h-7 overflow-visible"
            aria-hidden
        >
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
            />
        </svg>
    )
}

// ── skeleton pulse ────────────────────────────────────────────────────────────
function CardSkeleton() {
    return (
        <Card className="@container/card">
            <CardHeader>
                <CardDescription>
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </CardFooter>
        </Card>
    )
}

// ── main component ────────────────────────────────────────────────────────────
export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    spark,
    className,
    loading = false,
}: StatCardProps) {
    if (loading) return <CardSkeleton />

    const trendUp = trend && trend.value >= 0
    const TrendIcon = trendUp ? IconTrendingUp : IconTrendingDown
    const trendColor = trendUp ? 'text-emerald-600' : 'text-rose-500'

    return (
        <Card className={cn('@container/card', className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardDescription>{title}</CardDescription>
                    {Icon && (
                        <span className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
                            <Icon className="size-4" />
                        </span>
                    )}
                </div>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {value}
                </CardTitle>
                {trend && (
                    <CardAction>
                        <Badge variant="outline" className={trendColor}>
                            <TrendIcon className="size-3" />
                            {trendUp ? '+' : ''}{trend.value}%
                        </Badge>
                    </CardAction>
                )}
                {spark && (
                    <div className="mt-2">
                        <Sparkline data={spark} />
                    </div>
                )}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
                {trend && (
                    <div className={cn('line-clamp-1 flex gap-2 font-medium', trendColor)}>
                        {trendUp ? 'Trending up' : 'Trending down'} {trend.label || 'this period'}
                        <TrendIcon className="size-4" />
                    </div>
                )}
                {description && (
                    <div className="text-muted-foreground">
                        {description}
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}