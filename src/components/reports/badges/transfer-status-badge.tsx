// components/reports/TransferStatusBadge.tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TransferStatusBadgeProps {
    status: "pending" | "in_transit" | "received" | "cancelled";
    className?: string;
}

const statusConfig = {
    pending: { variant: "outline" as const, label: "Pending", className: "border-yellow-500 text-yellow-600" },
    in_transit: { variant: "default" as const, label: "In Transit", className: "bg-blue-500" },
    received: { variant: "default" as const, label: "Received", className: "bg-green-500" },
    cancelled: { variant: "destructive" as const, label: "Cancelled", className: "" },
};

export function TransferStatusBadge({ status, className }: TransferStatusBadgeProps) {
    const config = statusConfig[status];
    return (
        <Badge variant={config.variant} className={cn("", config.className, className)}>
            {config.label}
        </Badge>
    );
}