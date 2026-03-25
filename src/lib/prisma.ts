import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createAdapter() {
  return new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
