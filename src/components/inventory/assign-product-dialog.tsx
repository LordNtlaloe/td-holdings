import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '#/components/ui/select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { Department, Product } from '#/types/inventory'

interface AssignProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    departments?: Department[]
    unassignedProducts?: Product[]
    selectedDepartmentId: string | null
    selectedProductId: string | null
    reorderLevel: number
    onDepartmentChange: (value: string | null) => void
    onProductChange: (value: string | null) => void
    onReorderLevelChange: (value: number) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}

export function AssignProductDialog({
    open,
    onOpenChange,
    departments,
    unassignedProducts,
    selectedDepartmentId,
    selectedProductId,
    reorderLevel,
    onDepartmentChange,
    onProductChange,
    onReorderLevelChange,
    onSubmit,
    isLoading,
    error,
}: AssignProductDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Product to Store</DialogTitle>
                    <DialogDescription>
                        Add a product to this store's inventory catalog.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label>Filter by Department</Label>
                        <Select
                            value={selectedDepartmentId || 'all'}
                            onValueChange={(value) => onDepartmentChange(value === 'all' ? null : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments?.map((department) => (
                                    <SelectItem key={department._id} value={department._id}>
                                        {department.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Product</Label>
                        <Select
                            value={selectedProductId || ''}
                            onValueChange={(value) => onProductChange(value || null)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {!unassignedProducts || unassignedProducts.length === 0 ? (
                                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                        {selectedDepartmentId && selectedDepartmentId !== 'all'
                                            ? 'No products in this department'
                                            : 'No products available to assign'}
                                    </div>
                                ) : (
                                    unassignedProducts.map((product) => {
                                        const department = departments?.find(d => d._id === product.departmentId)
                                        return (
                                            <SelectItem key={product._id} value={product._id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{product.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({product.sku})
                                                    </span>
                                                    {department && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {department.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        )
                                    })
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Reorder Level</Label>
                        <Input
                            type="number"
                            value={reorderLevel}
                            onChange={(e) => onReorderLevelChange(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading || !selectedProductId}>
                        {isLoading ? 'Assigning...' : 'Assign Product'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}