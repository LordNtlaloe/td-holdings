// components/reports/charts/StockMovementChart.tsx
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface StockMovementChartProps {
    data: Array<{
        date: string;
        incoming: number;
        outgoing: number;
        balance: number;
    }>;
    className?: string;
}

export function StockMovementChart({ data, className }: StockMovementChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300} className={className}>
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                    type="monotone"
                    dataKey="incoming"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Incoming"
                />
                <Area
                    type="monotone"
                    dataKey="outgoing"
                    stackId="1"
                    stroke="#ff6b6b"
                    fill="#ff6b6b"
                    name="Outgoing"
                />
                <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Balance"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}