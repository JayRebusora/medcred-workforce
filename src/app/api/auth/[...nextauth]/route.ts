// src/app/api/auth/[...nextauth]/route.ts
// Auth.js needs a catch-all API route to handle sign-in, sign-out,
// session, and CSRF endpoints. Just re-export the handlers from auth.ts.

export { GET, POST } from "@/auth";
