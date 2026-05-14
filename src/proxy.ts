// Note: Runs on every matching request BEFORE the page renders.
// Reads the session cookie, runs the `authorized` callback from
// auth.config.ts, and either allows the request through, redirects
// to /login, or returns a custom response.
//
// This file uses the EDGE runtime — it must only import from
// auth.config.ts, never from auth.ts (which uses bcrypt/Prisma).

import NextAuth from "next-auth";
import authConfig from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // auth.config's `authorized` callback does the real work.
  // This function body is intentionally empty — it lets the callback
  // decide what to do with the request.
});

// Don't run middleware on static assets, Next.js internals, or favicons
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
