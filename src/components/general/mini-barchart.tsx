'use client'

import {
    Line,
    ResponsiveContainer,
    XAxis,
    Tooltip,
    LineChart,
} from 'recharts'

import { cn } from '#/lib/utils'

type MiniBarChartProps = {
    title: string
    data: { label: string; value: number }[]
    className?: string
}

export function MiniBarChart({ title, data, className }: MiniBarChartProps) {
    return (
        <div className={cn('rounded-xl border bg-card p-4', className)}>
            <p className="text-sm font-medium mb-3">{title}</p>

            <ResponsiveContainer width="100%" style={{ padding: "12px" }}>
                <LineChart data={data}>
                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                    />
                    <Line
                        dataKey="value"
                        fill="var(--chart-2)"
                        // radius={[4, 4, 0, 0]}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}