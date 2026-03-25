import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      active: true,
      deletedAt: true,
    },
  });

  if (!user || !user.active || user.deletedAt) {
    return null;
  }

  return {
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}
