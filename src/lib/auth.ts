import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { ensureDefaultLoginAccountForCredentials } from "@/lib/default-login-accounts";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { UserRecord } from "@/lib/types";

export const SESSION_COOKIE_NAME = "ai-workbench-session";

type SessionPayload = {
  sub: string;
  username: string;
  displayName: string;
  role: UserRecord["role"];
};

function getJwtSecret() {
  const secret = env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && secret === "local-dev-jwt-secret-please-change") {
    throw new Error("JWT_SECRET must be set to a secure value in production environments");
  }
  return new TextEncoder().encode(secret);
}

export async function authenticateMockUser(
  username: string,
  password: string,
): Promise<{ ok: true; user: UserRecord } | { ok: false; error: string }> {
  const normalized = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 6) {
    return { ok: false, error: "请输入至少 6 位密码。" };
  }

  const repairedDefaultUser = await ensureDefaultLoginAccountForCredentials(normalized, normalizedPassword);
  const dbUser =
    repairedDefaultUser ??
    (await prisma.user.findUnique({
      where: {
        username: normalized,
      },
    }));

  if (!dbUser || dbUser.deletedAt || !dbUser.active) {
    return { ok: false, error: "账号不存在或未启用。" };
  }

  // Verify password against stored hash
  if (dbUser.passwordHash) {
    const passwordValid = await bcrypt.compare(normalizedPassword, dbUser.passwordHash);
    if (!passwordValid) {
      return { ok: false, error: "密码错误。" };
    }
  } else {
    // Fallback: no password hash set, reject login for security
    return { ok: false, error: "账号未设置密码，请联系管理员。" };
  }

  // Update last login time
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { lastLoginAt: new Date() },
  });

  const user: UserRecord = {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName,
    role: dbUser.role,
    active: dbUser.active,
    lastLoginAt: new Date().toISOString(),
    dailyClaimLimit: dbUser.dailyClaimLimit,
  };

  return { ok: true, user };
}

export async function createSessionToken(user: UserRecord) {
  return new SignJWT({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.displayName !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
