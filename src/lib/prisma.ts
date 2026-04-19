// src/lib/prisma.ts
// Prisma Client singleton — survives Next.js hot reloads in dev,
// runs as a fresh instance per serverless invocation in prod.
//
// Prisma 7 note: the Client no longer bundles a DB driver. We construct
// a @prisma/adapter-pg adapter from a pg Pool and pass it to PrismaClient.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Attach the instance to globalThis in dev so hot reload reuses it.
// In prod (Vercel), each serverless function gets its own module scope
// and this branch never runs.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
