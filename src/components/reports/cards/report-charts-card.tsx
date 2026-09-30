// components/reports/ChartCard.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    description?: string;
}

export function ChartCard({ title, children, className, description }: ChartCardProps) {
    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </CardHeader>
            <CardContent className="h-75">{children}</CardContent>
        </Card>
    );
}