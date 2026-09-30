import { useEffect, useState } from 'react'
import { AlertCircle, KeyRound } from 'lucide-react'
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

interface SetPasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Who the password is for — only used for the description text. */
    subjectName?: string | null
    subjectEmail?: string | null
    /** Resets the password. Throw to have the message shown in the dialog. */
    onSubmit: (password: string) => Promise<unknown>
    onSuccess?: () => void
    title?: string
}

/**
 * Shared "set a new password for someone else" dialog.
 *
 * Used by the admin-only flows (Employees and Users pages). No current password
 * is asked for, because the admin managing the account does not know it — the
 * server enforces admin/super_admin on those routes. A user changing their OWN
 * password goes through Settings → Password, which does require the old one.
 */
export function SetPasswordDialog({
    open,
    onOpenChange,
    subjectName,
    subjectEmail,
    onSubmit,
    onSuccess,
    title = 'Set password',
}: SetPasswordDialogProps) {
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

    const who = subjectName || 'this account'

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

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
            await onSubmit(password)
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
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            Choose a new password for {who}
                            {subjectEmail ? ` (${subjectEmail})` : ''}. They sign in with that
                            email and this password.
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
                            <Label htmlFor="new-password">New password</Label>
                            <PasswordInput
                                id="new-password"
                                value={password}
                                autoComplete="new-password"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                At least 8 characters.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm password</Label>
                            <PasswordInput
                                id="confirm-password"
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
