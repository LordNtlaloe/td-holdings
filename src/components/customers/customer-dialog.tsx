import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Customer, CustomerWithStats } from '#/types/customers'

interface CustomerFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer?: Customer | null
    onSubmit: (data: { name: string; email?: string; phone?: string }) => Promise<void>
    isLoading: boolean
    error?: string | null
    mode: 'create' | 'edit'
}

export function CustomerFormDialog({
    open,
    onOpenChange,
    customer,
    onSubmit,
    isLoading,
    error,
    mode,
}: CustomerFormDialogProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [localError, setLocalError] = useState<string | null>(null)

    useEffect(() => {
        if (open && customer && mode === 'edit') {
            setName(customer.name)
            setEmail(customer.email || '')
            setPhone(customer.phone || '')
        } else if (open && mode === 'create') {
            setName('')
            setEmail('')
            setPhone('')
        }
        setLocalError(null)
    }, [open, customer, mode])

    const handleSubmit = async () => {
        if (!name.trim()) {
            setLocalError('Name is required')
            return
        }
        setLocalError(null)
        await onSubmit({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined })
    }

    const displayError = localError || error

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Edit Customer' : 'Create Customer'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? `Update customer details for ${customer?.name || 'Unknown'}`
                            : 'Add a new customer to the system.'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {displayError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{displayError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn('col-span-3', displayError && !name.trim() && 'border-destructive')}
                            placeholder="Enter customer name"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter email (optional)"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                            Phone
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter phone (optional)"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface DeleteCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: CustomerWithStats | null
    onConfirm: () => Promise<void>
    isLoading: boolean
    error?: string | null
}

export function DeleteCustomerDialog({
    open,
    onOpenChange,
    customer,
    onConfirm,
    isLoading,
    error,
}: DeleteCustomerDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete "{customer?.name}"?
                        {customer?.salesCount && customer.salesCount > 0 ? (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 rounded-md">
                                This customer has {customer.salesCount} order{customer.salesCount !== 1 ? 's' : ''} in their history.
                                Deleting them will remove all associated sales data.
                            </div>
                        ) : (
                            ' This action cannot be undone.'
                        )}
                        {error && (
                            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? 'Deleting...' : 'Delete Customer'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}