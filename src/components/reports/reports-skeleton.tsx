// components/reports/ReportSkeleton.tsx
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportSkeletonProps {
    className?: string;
    showFilters?: boolean;
    showChart?: boolean;
}

export function ReportSkeleton({ className, showFilters = true, showChart = true }: ReportSkeletonProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {showFilters && (
                <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-10 w-65" />
                    <Skeleton className="h-10 w-50" />
                    <Skeleton className="h-10 w-50" />
                    <Skeleton className="h-10 w-45" />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>

            {showChart && <Skeleton className="h-75" />}

            <div className="rounded-md border">
                <div className="p-4 space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
            </div>
        </div>
    );
}