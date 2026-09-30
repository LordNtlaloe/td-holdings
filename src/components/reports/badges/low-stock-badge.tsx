// components/reports/StockLevelBadge.tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StockLevelBadgeProps {
    quantity: number;
    reorderLevel: number;
    className?: string;
}

export function StockLevelBadge({ quantity, reorderLevel, className }: StockLevelBadgeProps) {
    const isOut = quantity === 0;
    const isLow = quantity <= reorderLevel && !isOut;

    let variant: "default" | "destructive" | "outline" = "default";
    let label = "In Stock";

    if (isOut) {
        variant = "destructive";
        label = "Out of Stock";
    } else if (isLow) {
        variant = "outline";
        label = "Low Stock";
    }

    return (
        <Badge variant={variant} className={cn("", className)}>
            {label} ({quantity})
        </Badge>
    );
}