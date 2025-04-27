import { authClient } from "@/lib/auth-client"

export function SignOut() {
    return (
        <form
            action={async () => {
                "use server"
                await authClient.signOut()
            }}
        >
            <button type="submit">Sign Out</button>
        </form>
    )
}