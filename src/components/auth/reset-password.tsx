import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function PasswordResetForm({ ...props }: React.ComponentProps<typeof Card>) {
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                    Enter your email address and we will send you a link to reset your password
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                            />
                            <FieldDescription>
                                We&apos;ll email you a secure link to reset your password.
                            </FieldDescription>
                        </Field>
                        <FieldGroup>
                            <Field>
                                <Button type="submit">Send Reset Link</Button>
                                <FieldDescription className="px-6 text-center">
                                    Remember your password? <a href="#">Sign in</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}