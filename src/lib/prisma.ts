import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

declare global {
  var __prisma: PrismaClient | undefined;
}

const SUPABASE_POOLER_HOST_MARKER = ".pooler.supabase.com";

export function buildPrismaPoolConfig(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (!url.hostname.includes(SUPABASE_POOLER_HOST_MARKER)) {
      return { connectionString };
    }

    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    return {
      connectionString: url.toString(),
      max: 1,
    };
  } catch {
    return { connectionString };
  }
}

function createAdapter() {
  return new PrismaPg(buildPrismaPoolConfig(env.DATABASE_URL));
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
