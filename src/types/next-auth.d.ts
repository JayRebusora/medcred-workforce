// src/types/next-auth.d.ts
// Extends NextAuth's Session and JWT types with our custom fields (id, role).
// Without this file, TypeScript will complain that session.user.role doesn't exist.

import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /** Returned by useSession, auth(), etc. */
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /** The user object returned by the authorize() callback */
  interface User {
    id: string;
    role: Role;
    firstName?: string;
    lastName?: string;
  }
}

declare module "next-auth/jwt" {
  /** The JWT token — contents of the session cookie */
  interface JWT {
    id: string;
    role: Role;
  }
}
