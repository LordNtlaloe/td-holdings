import { auth } from "@/lib/auth" // Referring to the auth.ts we just created
import { toNextJsHandler } from "better-auth/next-js";
 
export const { POST, GET } = toNextJsHandler(auth);