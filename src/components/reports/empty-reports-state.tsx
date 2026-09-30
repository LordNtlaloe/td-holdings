// components/reports/EmptyReportState.tsx
import { FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyReportStateProps {
    title?: string;
    description?: string;
    onRefresh?: () => void;
    className?: string;
}

export function EmptyReportState({
    title = "No data available",
    description = "Try adjusting your filters or date range to see results.",
    onRefresh,
    className,
}: EmptyReportStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12", className)}>
            <div className="rounded-full bg-muted p-4 mb-4">
                <FileSearch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                {description}
            </p>
            {onRefresh && (
                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            )}
        </div>
    );
}