
import { authClient } from "@/lib/auth-client"

export default function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await authClient.signIn.social({provider: "google"})
            }}
        >
            <button type="submit">Signin with Google</button>
        </form>
    )
} 