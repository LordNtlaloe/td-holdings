// components/reports/KPICard.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface KPICardProps {
    label: string;
    value: number | string;
    change?: number;
    icon?: React.ReactNode;
    className?: string;
}

export function KPICard({ label, value, change, icon, className }: KPICardProps) {
    const trend = change ? (change > 0 ? "up" : change < 0 ? "down" : "neutral") : undefined;
    const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500";

    return (
        <Card className={cn("", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                        <span className={cn("inline-flex items-center gap-1", trendColor)}>
                            {trend === "up" && <ArrowUp className="h-3 w-3" />}
                            {trend === "down" && <ArrowDown className="h-3 w-3" />}
                            {trend === "neutral" && <Minus className="h-3 w-3" />}
                            {Math.abs(change)}%
                        </span>
                        {" from previous period"}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}