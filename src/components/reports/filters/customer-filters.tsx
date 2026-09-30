// components/reports/CustomerFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CustomerFilterProps {
    customers: { _id: string; name: string }[];
    selectedCustomer?: string;
    onCustomerChange: (customerId?: string) => void;
    className?: string;
    placeholder?: string;
}

export function CustomerFilter({
    customers,
    selectedCustomer,
    onCustomerChange,
    className,
    placeholder = "All Customers",
}: CustomerFilterProps) {
    return (
        <Select
            value={selectedCustomer || "all"}
            onValueChange={(value) => onCustomerChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-50", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                        {customer.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}