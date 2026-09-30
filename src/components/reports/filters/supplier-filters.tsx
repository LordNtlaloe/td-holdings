// components/reports/SupplierFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SupplierFilterProps {
    suppliers: { _id: string; name: string }[];
    selectedSupplier?: string;
    onSupplierChange: (supplierId?: string) => void;
    className?: string;
    placeholder?: string;
}

export function SupplierFilter({
    suppliers,
    selectedSupplier,
    onSupplierChange,
    className,
    placeholder = "All Suppliers",
}: SupplierFilterProps) {
    return (
        <Select
            value={selectedSupplier || "all"}
            onValueChange={(value) => onSupplierChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-50", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}