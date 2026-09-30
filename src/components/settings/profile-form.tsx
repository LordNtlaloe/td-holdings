import { useState } from 'react'
import { useUserProfile, useUpdateProfile } from '#/lib/api/hooks'
import { useForm } from '@tanstack/react-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { useInitials } from '#/hooks/use-initials'
import { LoaderCircle, CheckCircle } from 'lucide-react'
import { Card } from '../ui/card'

export function ProfileForm() {
    const user = useUserProfile()
    const updateProfile = useUpdateProfile()
    const getInitials = useInitials()
    const [success, setSuccess] = useState(false)

    const form = useForm({
        defaultValues: {
            name: user?.name ?? '',
        },
        onSubmit: async ({ value }) => {
            try {
                await updateProfile({ name: value.name })
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            } catch {
                // handle error
            }
        },
    })

    if (!user) return null

    const validateName = ({ value }: { value: string }) => {
        if (!value) return 'Name is required'
        if (value.length < 2) return 'Name must be at least 2 characters'
        return undefined
    }

    return (
        <Card className="space-y-6 p-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
                <Avatar className="size-16">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-lg bg-neutral-200 dark:bg-neutral-700">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
            </div>

            {/* Form */}
            <form
                onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
                className="space-y-4"
            >
                <form.Field
                    name="name"
                    validators={{ onChange: validateName, onBlur: validateName }}
                >
                    {(field) => (
                        <div className="grid gap-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                placeholder="Your name"
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
                            {isSubmitting ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </Card>
    )
}