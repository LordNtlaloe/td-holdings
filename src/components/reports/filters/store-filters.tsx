// components/reports/StoreFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StoreFilterProps {
    stores: { _id: string; name: string }[];
    selectedStore?: string;
    onStoreChange: (storeId?: string) => void;
    className?: string;
    placeholder?: string;
}

export function StoreFilter({
    stores,
    selectedStore,
    onStoreChange,
    className,
    placeholder = "All Stores",
}: StoreFilterProps) {
    return (
        <Select
            value={selectedStore || "all"}
            onValueChange={(value) => onStoreChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-50", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                        {store.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}