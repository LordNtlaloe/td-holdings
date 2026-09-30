'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { cn } from '#/lib/utils'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export interface ActivityDataPoint {
  label: string
  [key: string]: string | number
}

interface ActivityBarChartProps {
  data: ActivityDataPoint[]
  series: Array<{
    key: string
    label: string
    color?: string
  }>
  title?: string
  description?: string
  height?: number
  className?: string
}

/* =========================================================
   CHART CONFIG BUILDER (matches shadcn line chart system)
   ========================================================= */
function buildChartConfig(series: ActivityBarChartProps['series']): ChartConfig {
  const config: ChartConfig = {}

  series.forEach((s, i) => {
    config[s.key] = {
      label: s.label,
      color:
        s.color ??
        `var(--chart-${(i % 5) + 1})`,
    }
  })

  return config
}

export function ActivityBarChart({
  data,
  series,
  title,
  description,
  height = 220,
  className,
}: ActivityBarChartProps) {
  const chartConfig = buildChartConfig(series)

  return (
    <div className={cn('rounded-xl border bg-card p-5 space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={28}
              allowDecimals={false}
            />

            <ChartTooltip
              content={<ChartTooltipContent />}
            />

            {series.length > 1 && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: 12,
                  paddingTop: 8,
                }}
              />
            )}

            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={`var(--color-${s.key})`}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}