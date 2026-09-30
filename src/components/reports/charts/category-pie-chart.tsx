// components/reports/charts/CategoryPieChart.tsx
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../report-utils";

interface CategoryPieChartProps {
    data: Array<{
        name: string;
        value: number;
    }>;
    className?: string;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c", "#d0ed57", "#ff6b6b", "#4ecdc4"];

export function CategoryPieChart({ data, className }: CategoryPieChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300} className={className}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent as number * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}