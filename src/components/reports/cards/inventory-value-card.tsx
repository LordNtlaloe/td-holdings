// components/reports/InventoryValueCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../report-utils";
import { Package } from "lucide-react";

interface InventoryValueCardProps {
    totalValue: number;
    byStore?: Array<{ storeName: string; value: number }>;
    className?: string;
}

export function InventoryValueCard({ totalValue, byStore, className }: InventoryValueCardProps) {
    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Inventory Value</CardTitle>
                    <Package className="h-5 w-5 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
                {byStore && byStore.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="text-sm text-muted-foreground">By Store:</div>
                        {byStore.map((store, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <span>{store.storeName}</span>
                                <span className="font-medium">{formatCurrency(store.value)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}