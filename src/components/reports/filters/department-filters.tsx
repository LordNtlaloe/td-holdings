// components/reports/DepartmentFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DepartmentFilterProps {
    departments: { _id: string; name: string }[];
    selectedDepartment?: string;
    onDepartmentChange: (departmentId?: string) => void;
    className?: string;
    placeholder?: string;
}

export function DepartmentFilter({
    departments,
    selectedDepartment,
    onDepartmentChange,
    className,
    placeholder = "All Departments",
}: DepartmentFilterProps) {
    return (
        <Select
            value={selectedDepartment || "all"}
            onValueChange={(value) => onDepartmentChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-50", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}