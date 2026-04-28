// Note: Auth.js needs a catch-all API route to handle sign-in, sign-out,
// session, and CSRF endpoints. Just re-export the handlers from auth.ts.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
