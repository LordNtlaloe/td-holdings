import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { SalesFiltersType } from '#/types/sales'

interface SalesFiltersProps {
    filters: SalesFiltersType
    onFilterChange: (key: keyof SalesFiltersType, value: string) => void
    onClearFilters: () => void
    isGlobal: boolean
    stores?: Array<{ _id: string; name: string }>
    hasActiveFilters: boolean
}

export function SalesFilters({
    filters,
    onFilterChange,
    onClearFilters,
    isGlobal,
    stores,
    hasActiveFilters,
}: SalesFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    className="w-52 pl-8"
                    placeholder="Search customer / store…"
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                />
            </div>

            <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange('status', value)}
            >
                <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
            </Select>

            {isGlobal && stores && (
                <Select
                    value={filters.store}
                    onValueChange={(value) => onFilterChange('store', value)}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Store" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All stores</SelectItem>
                        {stores.map((store) => (
                            <SelectItem key={store._id} value={store._id}>
                                {store.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                    type="date"
                    className="w-36"
                    value={filters.dateFrom}
                    onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                />
            </div>
            <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                    type="date"
                    className="w-36"
                    value={filters.dateTo}
                    onChange={(e) => onFilterChange('dateTo', e.target.value)}
                />
            </div>

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                    Clear
                </Button>
            )}
        </div>
    )
}