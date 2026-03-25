import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL?.trim() || requireEnv("DATABASE_URL"),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const username = requireEnv("BOOTSTRAP_ADMIN_USERNAME");
    const password = requireEnv("BOOTSTRAP_ADMIN_PASSWORD");
    const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME?.trim() || username;
    const dailyClaimLimit = Number(process.env.BOOTSTRAP_ADMIN_DAILY_CLAIM_LIMIT ?? "3");

    const existingAdmins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (existingAdmins.length > 0) {
      const exactMatch = existingAdmins.find((admin) => admin.username === username);
      console.log(
        JSON.stringify(
          {
            ok: true,
            created: false,
            reason: exactMatch ? "admin-already-exists" : "another-admin-already-exists",
            admin: exactMatch ?? existingAdmins[0],
          },
          null,
          2,
        ),
      );
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true },
    });

    if (existingUser) {
      throw new Error(
        `User "${username}" already exists but is not an ADMIN. Refusing to overwrite an existing account during bootstrap.`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        username,
        displayName,
        role: "ADMIN",
        active: true,
        passwordHash,
        dailyClaimLimit: Number.isFinite(dailyClaimLimit) ? dailyClaimLimit : 3,
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          created: true,
          admin,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
