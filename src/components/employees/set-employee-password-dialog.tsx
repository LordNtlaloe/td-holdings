import { useEffect, useState } from 'react'
import { AlertCircle, KeyRound } from 'lucide-react'
import { useSetEmployeePassword } from '#/lib/api/hooks'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '#/components/ui/dialog'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { PasswordInput } from '#/components/ui/password-input'
import type { EmployeeWithDetails } from '#/types/employees'

interface SetEmployeePasswordDialogProps {
    employee: EmployeeWithDetails | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

/**
 * Lets an admin set (or reset) an employee's sign-in password.
 *
 * No current password is required: an admin managing staff credentials does not
 * know them. The server enforces super_admin/admin for this route — a user
 * changing their OWN password goes through Settings → Password, which does ask
 * for the current one.
 */
export function SetEmployeePasswordDialog({
    employee,
    open,
    onOpenChange,
    onSuccess,
}: SetEmployeePasswordDialogProps) {
    const applyPassword = useSetEmployeePassword()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Clear on open so a previous attempt never lingers.
    useEffect(() => {
        if (open) {
            setPassword('')
            setConfirm('')
            setError(null)
        }
    }, [open])

    const displayName = employee?.user?.name || 'this employee'
    const email = employee?.user?.email

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!employee) return

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError(null)
        try {
            await applyPassword({ id: employee._id, password })
            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set the password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Set password</DialogTitle>
                        <DialogDescription>
                            Choose a new password for {displayName}
                            {email ? ` (${email})` : ''}. They sign in with that email
                            and this password.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="employee-new-password">New password</Label>
                            <PasswordInput
                                id="employee-new-password"
                                value={password}
                                autoComplete="new-password"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                At least 8 characters.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="employee-confirm-password">Confirm password</Label>
                            <PasswordInput
                                id="employee-confirm-password"
                                value={confirm}
                                autoComplete="new-password"
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={loading}
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="gap-2">
                            {!loading && <KeyRound className="h-4 w-4" />}
                            {loading ? 'Saving...' : 'Set password'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
