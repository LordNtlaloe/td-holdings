import { Label } from '#/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '#/components/ui/select'
import type { Store } from '#/types/inventory'

interface InventoryStoreSelectorProps {
    stores?: Store[]
    selectedStoreId: string | null
    onStoreChange: (storeId: string) => void
}

export function InventoryStoreSelector({
    stores,
    selectedStoreId,
    onStoreChange,
}: InventoryStoreSelectorProps) {
    return (
        <div className="flex items-center gap-4">
            <Label htmlFor="store-select" className="text-sm font-medium">
                Store:
            </Label>
            <Select
                value={selectedStoreId ?? ''}
                onValueChange={onStoreChange}
            >
                <SelectTrigger className="w-50">
                    <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                    {stores?.map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                            {store.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}