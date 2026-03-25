import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/types";

type DefaultLoginAccount = {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  dailyClaimLimit: number;
};

const defaultLoginAccountSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  active: true,
  deletedAt: true,
  passwordHash: true,
  dailyClaimLimit: true,
} satisfies Prisma.UserSelect;

type LoginAccountClient = Pick<typeof prisma, "user">;

export const DEFAULT_LOGIN_ACCOUNTS: readonly DefaultLoginAccount[] = [
  {
    username: "admin",
    password: "admin123",
    displayName: "朝鑫",
    role: "ADMIN",
    dailyClaimLimit: 3,
  },
  {
    username: "ops.a",
    password: "ops123",
    displayName: "运营-A",
    role: "USER",
    dailyClaimLimit: 3,
  },
  {
    username: "design.c",
    password: "design123",
    displayName: "设计-C",
    role: "USER",
    dailyClaimLimit: 3,
  },
] as const;

function findDefaultLoginAccount(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  return DEFAULT_LOGIN_ACCOUNTS.find(
    (account) => account.username === normalizedUsername && account.password === normalizedPassword,
  );
}

async function resolvePasswordHash(password: string, currentHash: string | null) {
  if (currentHash && (await bcrypt.compare(password, currentHash))) {
    return currentHash;
  }

  return bcrypt.hash(password, 10);
}

export async function upsertDefaultLoginAccounts(client: LoginAccountClient = prisma) {
  const upsertedAccounts = [];

  for (const account of DEFAULT_LOGIN_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    const user = await client.user.upsert({
      where: { username: account.username },
      update: {
        displayName: account.displayName,
        role: account.role,
        active: true,
        deletedAt: null,
        passwordHash,
        dailyClaimLimit: account.dailyClaimLimit,
      },
      create: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        active: true,
        passwordHash,
        dailyClaimLimit: account.dailyClaimLimit,
        lastLoginAt: new Date(),
      },
      select: defaultLoginAccountSelect,
    });

    upsertedAccounts.push(user);
  }

  return upsertedAccounts;
}

export async function ensureDefaultLoginAccountForCredentials(
  username: string,
  password: string,
  client: LoginAccountClient = prisma,
) {
  const account = findDefaultLoginAccount(username, password);
  if (!account) {
    return null;
  }

  const existingUser = await client.user.findUnique({
    where: { username: account.username },
    select: defaultLoginAccountSelect,
  });

  if (existingUser?.deletedAt || (existingUser && !existingUser.active)) {
    return existingUser;
  }

  const passwordHash = await resolvePasswordHash(account.password, existingUser?.passwordHash ?? null);

  if (!existingUser) {
    return client.user.create({
      data: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        active: true,
        passwordHash,
        dailyClaimLimit: account.dailyClaimLimit,
        lastLoginAt: null,
      },
      select: defaultLoginAccountSelect,
    });
  }

  const needsUpdate =
    existingUser.passwordHash !== passwordHash ||
    existingUser.displayName !== account.displayName ||
    existingUser.role !== account.role ||
    existingUser.dailyClaimLimit !== account.dailyClaimLimit;

  if (!needsUpdate) {
    return existingUser;
  }

  return client.user.update({
    where: { id: existingUser.id },
    data: {
      displayName: account.displayName,
      role: account.role,
      passwordHash,
      dailyClaimLimit: account.dailyClaimLimit,
    },
    select: defaultLoginAccountSelect,
  });
}
