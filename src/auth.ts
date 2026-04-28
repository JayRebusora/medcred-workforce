import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import authConfig from "./auth.config";
import { prisma } from "@/lib/prisma";

// Validate the shape of login form input before we hit the database
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // The fields Auth.js auto-renders on its default sign-in page.
      // We use a custom /login page, so these are only semantic.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      // The heart of auth: verify the credentials and return a User,
      // or return null to signal "invalid credentials".
      async authorize(credentials) {
        // 1. Validate input shape
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // 2. Look up the user (but only active, non-deleted accounts)
        const user = await prisma.user.findFirst({
          where: {
            email,
            deletedAt: null,
            isActive: true,
          },
        });
        if (!user) return null;

        // 3. Verify the password against the bcrypt hash
        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        // 4. Return the user shape Auth.js expects. Fields here get
        //    passed to the jwt() callback in auth.config.ts.
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          // `name` is what Auth.js uses by default for display
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
  ],
});
