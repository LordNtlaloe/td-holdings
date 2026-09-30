// components/reports/charts/TopProductsChart.tsx
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface TopProductsChartProps {
    data: Array<{
        name: string;
        quantity: number;
        revenue: number;
    }>;
    className?: string;
}

export function TopProductsChart({ data, className }: TopProductsChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300} className={className}>
            <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#8884d8" name="Quantity Sold" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
            </BarChart>
        </ResponsiveContainer>
    );
}