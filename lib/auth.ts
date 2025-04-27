import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
 
const prisma = new PrismaClient();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {  
        enabled: true,
        // async sendResetPassword(data, request) {
        //     // Send an email to the user with a link to reset their password
        // },
    },
    socialProviders: { 
        google: { 
           clientId: process.env.AUTH_GOOGLE_ID as string, 
           clientSecret: process.env.AUTH_GOOGLE_SECRET as string, 
        }, 
    }, 
    
});