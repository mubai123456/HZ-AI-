import { buildPrismaPoolConfig } from "@/lib/prisma";

describe("buildPrismaPoolConfig", () => {
  it("adds safe pooler params for Supabase session-mode URLs", () => {
    const config = buildPrismaPoolConfig(
      "postgresql://user:secret@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres",
    );

    const connectionUrl = new URL(config.connectionString);

    expect(connectionUrl.searchParams.get("pgbouncer")).toBe("true");
    expect(connectionUrl.searchParams.get("connection_limit")).toBe("1");
    expect(config.max).toBe(1);
  });

  it("preserves existing pooler params when they are already set", () => {
    const config = buildPrismaPoolConfig(
      "postgresql://user:secret@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=3",
    );

    const connectionUrl = new URL(config.connectionString);

    expect(connectionUrl.searchParams.get("pgbouncer")).toBe("true");
    expect(connectionUrl.searchParams.get("connection_limit")).toBe("3");
    expect(config.max).toBe(1);
  });

  it("leaves non-pooler URLs unchanged", () => {
    const input = "postgresql://user:secret@db.example.com:5432/postgres?schema=public";
    const config = buildPrismaPoolConfig(input);

    expect(config.connectionString).toBe(input);
    expect(config.max).toBeUndefined();
  });
});
