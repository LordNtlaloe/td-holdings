'use client'

import { useState, useEffect } from 'react'
import { useAllStores, useCreateEmployeeWithUser, useUpdateEmployee } from '#/lib/api/hooks'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Switch } from '#/components/ui/switch'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { UserPlus, Pencil, AlertCircle } from 'lucide-react'
import type { Doc } from '#/types/entities'
import { toast } from "sonner"
import { cn } from '#/lib/utils'

type Store = Doc<"stores">
type Employee = Doc<"employees">
type User = Doc<"users">

interface EmployeeFormProps {
    mode?: 'create' | 'edit'
    employee?: Employee & { user: User | null; store: Store | null }
    onSuccess?: () => void
    onError?: (error: Error) => void
    error?: string | null
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function EmployeeForm({
    mode = 'create',
    employee,
    onSuccess,
    onError,
    error: externalError,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: EmployeeFormProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Create-only fields
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    // Shared fields
    const [selectedStoreId, setSelectedStoreId] = useState<string>('')
    const [selectedRole, setSelectedRole] = useState<'super_admin' | 'admin' | 'manager' | 'cashier'>('cashier')
    const [isActive, setIsActive] = useState(true)
    const [error, setError] = useState<string | null>(externalError || null)

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOnOpenChange || setInternalOpen

    const stores = useAllStores()
    const createEmployeeWithUser = useCreateEmployeeWithUser()
    const updateEmployee = useUpdateEmployee()

    useEffect(() => {
        if (externalError !== undefined) setError(externalError)
    }, [externalError])

    useEffect(() => {
        if (mode === 'edit' && employee && open) {
            setSelectedStoreId(employee.storeId)
            setSelectedRole(employee.role)
            setIsActive(employee.isActive)
            setError(null)
        }
    }, [mode, employee, open])

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setError(null)
            if (mode === 'create') {
                setName('')
                setEmail('')
                setSelectedStoreId('')
                setSelectedRole('cashier')
                setIsActive(true)
            }
        }
    }

    const handleSubmit = async () => {
        if (mode === 'create') {
            if (!name.trim()) {
                const msg = 'Please enter a name'
                setError(msg); toast.error(msg); return
            }
            if (!email.trim() || !email.includes('@')) {
                const msg = 'Please enter a valid email address'
                setError(msg); toast.error(msg); return
            }
        }

        if (!selectedStoreId) {
            const msg = 'Please select a store'
            setError(msg); toast.error(msg); return
        }

        setLoading(true)
        setError(null)

        try {
            if (mode === 'edit' && employee) {
                await updateEmployee({
                    id: employee._id,
                    role: selectedRole,
                    isActive,
                    storeId: selectedStoreId as any,
                })
                toast.success('Employee updated successfully')
                onSuccess?.()
                setOpen(false)
            } else {
                await createEmployeeWithUser({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    storeId: selectedStoreId as any,
                    role: selectedRole,
                    isActive,
                })
                toast.success(
                    `Employee created. They can sign in with "${email.trim().toLowerCase()}" and the default password "user123".`,
                    { duration: 6000 }
                )
                onSuccess?.()
                setOpen(false)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} employee`
            setError(msg)
            toast.error(msg)
            onError?.(err instanceof Error ? err : new Error(msg))
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = mode === 'create' ? (
        <Button className="gap-2">
            <UserPlus className="size-4" />
            Add Employee
        </Button>
    ) : (
        <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit Employee</span>
        </Button>
    )

    const isEditing = mode === 'edit'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Update details for ${employee?.user?.name || 'this employee'}`
                            : 'Create a new employee account. They will sign in with email and the default password "user123".'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Name — create only */}
                    {!isEditing && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                placeholder="Full name"
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (error) setError(null) }}
                                disabled={loading}
                                className={cn(
                                    "col-span-3",
                                    error && !name.trim() && 'border-destructive'
                                )}
                            />
                        </div>
                    )}

                    {/* Email — create only */}
                    {!isEditing && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="employee@example.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (error) setError(null) }}
                                disabled={loading}
                                className={cn(
                                    "col-span-3",
                                    error && !email.trim() && 'border-destructive'
                                )}
                            />
                        </div>
                    )}

                    {/* Show name/email read-only when editing */}
                    {isEditing && employee?.user && (
                        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                            <p className="font-medium">{employee.user.name}</p>
                            <p className="text-muted-foreground">{employee.user.email}</p>
                        </div>
                    )}

                    {/* Store */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="store" className="text-right">Store</Label>
                        <Select
                            value={selectedStoreId}
                            onValueChange={(value) => { setSelectedStoreId(value); if (error) setError(null) }}
                            disabled={!stores || loading}
                        >
                            <SelectTrigger className={cn(
                                "col-span-3",
                                error && !selectedStoreId && 'border-destructive'
                            )}>
                                <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores?.map((store: Store) => (
                                    <SelectItem key={store._id} value={store._id}>
                                        {store.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Role */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <Select
                            value={selectedRole}
                            onValueChange={(value: any) => setSelectedRole(value)}
                            disabled={loading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="cashier">Cashier</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Active */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="active" className="text-right">Active</Label>
                        <div className="col-span-3">
                            <Switch
                                id="active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Default password hint — create only */}
                    {!isEditing && (
                        <p className="text-xs text-muted-foreground text-center">
                            Default password: <span className="font-mono font-medium">user123</span> — advise the employee to change it after first login.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Employee'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}