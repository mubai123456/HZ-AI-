import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserById, getUsers } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100).optional(),
  password: z.string().min(6).max(100),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  dailyClaimLimit: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无访问权限。" }, { status: 403 });
  }

  const users = await getUsers();

  return NextResponse.json({ items: users });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无访问权限。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "用户信息不完整。" }, { status: 400 });
  }

  const normalizedUsername = parsed.data.username.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "用户名已存在。" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      displayName: parsed.data.displayName?.trim() || parsed.data.username.trim(),
      passwordHash,
      role: parsed.data.role,
      active: true,
      dailyClaimLimit: parsed.data.dailyClaimLimit ?? 3,
    },
    select: { id: true },
  });

  const createdUser = await getUserById(user.id);
  return NextResponse.json({ item: createdUser }, { status: 201 });
}
