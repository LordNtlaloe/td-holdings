import { DefaultSession } from "better-auth"

declare module "better-auth" {
    interface Session{
        user: User & DefaultSession["user"]
    }
    interface User {
        role: string | null
    }
}