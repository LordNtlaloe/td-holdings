// components/reports/ProfitLossCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../report-utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface ProfitLossCardProps {
    income: number;
    expenses: number;
    profit: number;
    className?: string;
}

export function ProfitLossCard({ income, expenses, profit, className }: ProfitLossCardProps) {
    const isProfit = profit >= 0;

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="text-lg">Profit & Loss Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground">Income</div>
                        <div className="text-xl font-bold text-green-600">{formatCurrency(income)}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            Revenue
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground">Expenses</div>
                        <div className="text-xl font-bold text-red-600">{formatCurrency(expenses)}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingDown className="h-3 w-3" />
                            Costs
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground">Net Profit</div>
                        <div className={cn("text-xl font-bold", isProfit ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(profit)}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {isProfit ? "Profit" : "Loss"}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}