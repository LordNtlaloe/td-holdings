import { useState } from 'react';
import { useProductsSeeded, useSeedProducts } from '#/lib/api/hooks';
import { Button } from '#/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Id } from '#/types/entities';
import { Loader2, Database, AlertCircle } from 'lucide-react';
import { Badge } from '#/components/ui/badge';
import seedData from '#/data/products.json';

interface SeedProductsButtonProps {
    className?: string;
}

// products.json carries a placeholder `_id` per row and plain-string
// categoryId/departmentId. The REST API assigns its own primary keys and
// rejects unknown fields, so this strips `_id` and normalises the two id
// fields before sending the payload.
function toSeedPayload(rows: typeof seedData) {
    return rows.map(({ _id, categoryId, departmentId, ...rest }) => ({
        ...rest,
        categoryId: categoryId as Id<'categories'>,
        departmentId: departmentId as Id<'departments'>,
    }));
}

export function SeedProductsButton({ className }: SeedProductsButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);

    // Check if products are already seeded
    const seedingStatus = useProductsSeeded();
    const seedMutation = useSeedProducts();

    const totalProducts = seedingStatus?.count ?? 0;

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const result = await seedMutation({ products: toSeedPayload(seedData) });
            toast.success(result.message);
            setDialogOpen(false);
            setConfirmDialogOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to seed products');
        } finally {
            setIsSeeding(false);
        }
    };

    // Only hide while the seeding-status query is still loading
    if (!seedingStatus) {
        return null;
    }

    return (
        <>
            <Button
                onClick={() => setDialogOpen(true)}
                className={className}
                variant="default"
            >
                <Database className="mr-2 h-4 w-4" />
                Seed Products
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Seed Products
                        </DialogTitle>
                        <DialogDescription>
                            This will create {seedData.length} products in your database.
                            This action can only be performed once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Products to seed:</span>
                                <Badge variant="default" className="font-mono">{seedData.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Current products:</span>
                                <Badge variant="secondary" className="font-mono">{totalProducts}</Badge>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">Once seeded, this button will disappear</p>
                                    <p className="text-xs">You can modify individual products after seeding</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/10 dark:border-yellow-900 p-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                ⚠️ Make sure your categories and departments are already created before seeding.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                setConfirmDialogOpen(true);
                                setDialogOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            Confirm Seeding
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create {seedData.length} products. This action cannot be undone.
                            Make sure all required categories and departments exist.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSeeding ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Seeding...
                                </>
                            ) : (
                                <>
                                    <Database className="mr-2 h-4 w-4" />
                                    Seed Products
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}