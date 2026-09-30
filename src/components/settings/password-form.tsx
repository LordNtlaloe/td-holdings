import { useState } from 'react'
import { useChangePassword } from '#/lib/api/hooks'
import { useForm } from '@tanstack/react-form'
import { Button } from '#/components/ui/button'
import { PasswordInput } from '#/components/ui/password-input'
import { Label } from '#/components/ui/label'
import { LoaderCircle, CheckCircle } from 'lucide-react'

export function PasswordForm() {
    const changePassword = useChangePassword()
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm({
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        onSubmit: async ({ value }) => {
            try {
                setError(null)
                await changePassword({
                    currentPassword: value.currentPassword,
                    newPassword: value.newPassword,
                })
                setSuccess(true)
                form.reset()
                setTimeout(() => setSuccess(false), 3000)
            } catch {
                setError('Current password is incorrect.')
            }
        },
    })

    const validateCurrent = ({ value }: { value: string }) => {
        if (!value) return 'Current password is required'
        return undefined
    }

    const validateNew = ({ value }: { value: string }) => {
        if (!value) return 'New password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value))
            return 'Password must contain uppercase, lowercase, and a number'
        return undefined
    }

    const validateConfirm = ({ value }: { value: string }) => {
        if (!value) return 'Please confirm your new password'
        if (value !== form.getFieldValue('newPassword')) return 'Passwords do not match'
        return undefined
    }

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
            className="space-y-4"
        >
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    {error}
                </div>
            )}

            <form.Field name="currentPassword" validators={{ onChange: validateCurrent, onBlur: validateCurrent }}>
                {(field) => (
                    <div className="grid gap-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <PasswordInput
                            id="currentPassword"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors?.length ? (
                            <p className="text-sm text-red-600">{field.state.meta.errors.join(', ')}</p>
                        ) : null}
                    </div>
                )}
            </form.Field>

            <form.Field name="newPassword" validators={{ onChange: validateNew, onBlur: validateNew }}>
                {(field) => (
                    <div className="grid gap-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <PasswordInput
                            id="newPassword"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors?.length ? (
                            <p className="text-sm text-red-600">{field.state.meta.errors.join(', ')}</p>
                        ) : null}
                    </div>
                )}
            </form.Field>

            <form.Field name="confirmPassword" validators={{ onChange: validateConfirm, onBlur: validateConfirm }}>
                {(field) => (
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <PasswordInput
                            id="confirmPassword"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        {field.state.meta.errors?.length ? (
                            <p className="text-sm text-red-600">{field.state.meta.errors.join(', ')}</p>
                        ) : null}
                    </div>
                )}
            </form.Field>

            <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting, isValid: s.isValid })}>
                {({ isSubmitting, isValid }) => (
                    <Button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                        className="w-full sm:w-auto"
                    >
                        {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                        {success && <CheckCircle className="mr-2 size-4" />}
                        {isSubmitting ? 'Updating...' : success ? 'Updated!' : 'Update Password'}
                    </Button>
                )}
            </form.Subscribe>
        </form>
    )
}