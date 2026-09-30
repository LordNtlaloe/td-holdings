// components/reports/charts/sales-line-chart.tsx
import * as React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type {
    ValueType,
    NameType,
} from "recharts/types/component/DefaultTooltipContent";
import { formatCurrency } from "../report-utils";

interface SalesLineChartProps {
    data: Array<{
        date: string;
        sales: number;
        revenue: number;
    }>;
    className?: string;
}

export function SalesLineChart({ data, className }: SalesLineChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300} className={className}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

                <XAxis dataKey="date" tick={{ fontSize: 12 }} />

                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />

                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                />

                <Tooltip
                    formatter={(
                        value?: ValueType,
                        name?: NameType
                    ) => {
                        if (value == null) return "";

                        const isRevenue = name === "revenue";

                        return isRevenue
                            ? formatCurrency(Number(value))
                            : (value as React.ReactNode);
                    }}
                />

                <Legend />

                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    name="Sales Count"
                    strokeWidth={2}
                />

                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue"
                    strokeWidth={2}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}