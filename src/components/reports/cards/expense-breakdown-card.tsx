// components/reports/ExpenseBreakdownCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../report-utils";
import { CategoryPieChart } from "../charts/category-pie-chart";

interface ExpenseBreakdownCardProps {
    data: Array<{ category: string; amount: number }>;
    className?: string;
}

export function ExpenseBreakdownCard({ data, className }: ExpenseBreakdownCardProps) {
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const chartData = data.map(item => ({
        name: item.category,
        value: item.amount,
    }));

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="text-lg">Expense Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">Total: {formatCurrency(total)}</p>
            </CardHeader>
            <CardContent>
                <CategoryPieChart data={chartData} />
                <div className="mt-4 space-y-2">
                    {data.slice(0, 5).map((item, index) => {
                        const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                        return (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <span>{item.category}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                                </div>
                            </div>
                        );
                    })}
                    {data.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center">
                            +{data.length - 5} more categories
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}