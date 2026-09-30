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
        <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="store-select" className="text-sm font-medium">
                Store:
            </Label>
            <Select
                value={selectedStoreId ?? ''}
                onValueChange={onStoreChange}
            >
                {/* full width on a phone — a fixed 200px selector plus the
                    button beside it is wider than the screen */}
                <SelectTrigger className="w-full min-w-0 sm:w-50">
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