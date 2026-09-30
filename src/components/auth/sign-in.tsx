import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { useSignIn } from "#/lib/api/hooks"
import { setToken } from "#/lib/api/client"
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
import { PasswordInput } from "@/components/ui/password-input"
import { toast } from "sonner"

export function SigninForm({ ...props }: React.ComponentProps<typeof Card>) {
    const signInMutation = useSignIn()
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await signInMutation.mutateAsync({ email, password })
            setToken(result.token)
            router.navigate({ to: "/dashboard" })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invalid email or password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Sign in to your account</CardTitle>
                <CardDescription>
                    Enter your credentials below to access your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Field>
                        <Field>
                            <div className="flex items-center justify-between">
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <a
                                    href="#"
                                    className="text-sm text-muted-foreground hover:underline"
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Field>
                        <FieldGroup>
                            <Field>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Signing in…" : "Sign In"}
                                </Button>
                                <FieldDescription className="px-6 text-center">
                                    No account? Ask an administrator to create one for you.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}