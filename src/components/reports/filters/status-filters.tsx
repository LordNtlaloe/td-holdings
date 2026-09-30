// components/reports/StatusFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StatusFilterProps {
    statuses: string[];
    selectedStatus?: string;
    onStatusChange: (status?: string) => void;
    className?: string;
    placeholder?: string;
}

export function StatusFilter({
    statuses,
    selectedStatus,
    onStatusChange,
    className,
    placeholder = "All Statuses",
}: StatusFilterProps) {
    return (
        <Select
            value={selectedStatus || "all"}
            onValueChange={(value) => onStatusChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-45", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
    
}