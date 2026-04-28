import type { NextAuthConfig } from "next-auth";

export default {
  // Providers are added in auth.ts (Credentials needs bcrypt + Prisma)
  providers: [],

  // Use JWT-based sessions — the session lives in a signed cookie,
  // not a database row. Required for edge middleware to read the session
  // without a DB query.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },

  // Where Auth.js sends users for sign-in
  pages: {
    signIn: "/login",
    error: "/login", // Show auth errors on the login page
  },

  callbacks: {
    // Runs on every request to a protected route (via middleware)
    // Return true to allow, false to redirect to /login, or a Response
    // to redirect somewhere specific.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Public routes — anyone can access
      const publicPaths = ["/", "/login", "/apply", "/setup-password"];
      const isPublic =
        publicPaths.includes(path) ||
        path.startsWith("/apply/") ||
        path.startsWith("/setup-password/") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/applications") || // public submit + admin review (admin role check happens in route handler)
        path.startsWith("/api/setup-password"); // token-gated, no session expected

      if (isPublic) return true;

      // Everything else requires a session
      return isLoggedIn;
    },

    // Runs whenever a JWT is created or updated.
    // We copy our custom fields from `user` (set by authorize()) onto the token.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Runs whenever a session is checked.
    // We copy fields from the JWT onto the session object the app uses.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
