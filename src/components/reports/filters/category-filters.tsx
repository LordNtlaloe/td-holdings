// components/reports/CategoryFilter.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
    categories: { _id: string; name: string }[];
    selectedCategory?: string;
    onCategoryChange: (categoryId?: string) => void;
    className?: string;
    placeholder?: string;
}

export function CategoryFilter({
    categories,
    selectedCategory,
    onCategoryChange,
    className,
    placeholder = "All Categories",
}: CategoryFilterProps) {
    return (
        <Select
            value={selectedCategory || "all"}
            onValueChange={(value) => onCategoryChange(value === "all" ? undefined : value)}
        >
            <SelectTrigger className={cn("w-50", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                        {category.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}