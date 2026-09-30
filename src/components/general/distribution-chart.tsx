'use client'

import {
    PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts'
import { cn } from '#/lib/utils'

export interface DistributionSlice {
    label: string
    value: number
    color?: string
}

interface RoleDistributionChartProps {
    data: DistributionSlice[]
    title?: string
    description?: string
    /** inner radius as a percentage of the chart's bounding box — set to 0 for a solid pie */
    innerRadius?: number | string
    /** outer radius as a percentage of the chart's bounding box */
    outerRadius?: number | string
    height?: number
    className?: string
    /** show total in the donut hole */
    showTotal?: boolean
}

const DEFAULT_COLORS = [
    '#16a34a',   // green  – admin
    '#0ea5e9',   // sky    – doctor
    '#f59e0b',   // amber  – pharmacist
    '#8b5cf6',   // violet – cashier
    '#ec4899',   // pink
    '#14b8a6',   // teal
]

function CustomTooltip({
    active, payload,
}: {
    active?: boolean
    payload?: Array<{ name: string; value: number; payload: DistributionSlice }>
}) {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
        <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
            <div className="flex items-center gap-2">
                <span
                    className="inline-block size-2 rounded-full shrink-0"
                    style={{ background: item.payload.color ?? '#16a34a' }}
                />
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-1">{item.value}</span>
            </div>
        </div>
    )
}

export function DistributionChart({
    data,
    title,
    description,
    innerRadius = '40%',
    outerRadius = '75%',
    height = 220,
    className,
    showTotal = true,
}: RoleDistributionChartProps) {
    const total = data.reduce((s, d) => s + d.value, 0)

    // attach colors if not provided
    const coloredData = data.map((d, i) => ({
        ...d,
        color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))

    const isDonut = innerRadius !== 0 && innerRadius !== '0%' && innerRadius !== '0'

    return (
        <div className={cn('rounded-xl border bg-card px-5 py-4 space-y-3', className)}>
            {(title || description) && (
                <div>
                    {title && <p className="text-sm font-medium">{title}</p>}
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            )}

            <div className="relative">
                <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                        <Pie
                            data={coloredData}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="45%"
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            paddingAngle={2}
                            strokeWidth={0}
                        >
                            {coloredData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span style={{ fontSize: 12 }}>{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* total label in the hole */}
                {showTotal && isDonut && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                        style={{ paddingBottom: 28 }}   // nudge up to account for legend
                    >
                        <span className="text-xl font-semibold">{total}</span>
                        <span className="text-xs text-muted-foreground">total</span>
                    </div>
                )}
            </div>
        </div>
    )
}