import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { updateUserDailyClaimLimit } from "@/lib/db/materials";
import { canRemoveActiveAdmin, deleteUserPermanently, getUserById } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z.string().min(6).max(100).optional(),
  dailyClaimLimit: z.number().int().min(0).max(100).optional(),
});

const deleteUserSchema = z.object({
  confirm: z.literal(true),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无访问权限。" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "用户更新参数不正确。" }, { status: 400 });
  }

  if (id === session.sub && (parsed.data.active !== undefined || parsed.data.role !== undefined)) {
    return NextResponse.json(
      { error: "不能修改当前登录账号的角色或启用状态。" },
      { status: 400 },
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      deletedAt: true,
      dailyClaimLimit: true,
    },
  });

  if (!currentUser || currentUser.deletedAt) {
    return NextResponse.json({ error: "用户不存在。" }, { status: 404 });
  }

  const normalizedUsername = parsed.data.username?.trim().toLowerCase();
  if (normalizedUsername && normalizedUsername !== currentUser.username) {
    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "用户名已存在。" }, { status: 409 });
    }
  }

  const willDemoteActiveAdmin =
    currentUser.role === "ADMIN" &&
    currentUser.active &&
    (parsed.data.role === "USER" || parsed.data.active === false);

  if (willDemoteActiveAdmin && !(await canRemoveActiveAdmin(id))) {
    return NextResponse.json({ error: "系统至少需要保留一个启用中的管理员账号。" }, { status: 400 });
  }

  const updateData: {
    username?: string;
    displayName?: string;
    active?: boolean;
    role?: "USER" | "ADMIN";
    passwordHash?: string;
  } = {};

  if (normalizedUsername !== undefined) updateData.username = normalizedUsername;
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName.trim();
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password.trim(), 10);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  if (
    parsed.data.dailyClaimLimit !== undefined &&
    parsed.data.dailyClaimLimit !== currentUser.dailyClaimLimit
  ) {
    await updateUserDailyClaimLimit({
      userId: id,
      limit: parsed.data.dailyClaimLimit,
      operatorId: session.sub,
    });
  }

  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "用户不存在。" }, { status: 404 });
  }

  const response = NextResponse.json({ item: user });

  if (id === session.sub) {
    const token = await createSessionToken(user);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无访问权限。" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.sub) {
    return NextResponse.json({ error: "不能删除当前登录账号。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请确认删除操作。" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      active: true,
      deletedAt: true,
    },
  });

  if (!currentUser || currentUser.deletedAt) {
    return NextResponse.json({ error: "用户不存在。" }, { status: 404 });
  }

  if (currentUser.role === "ADMIN" && currentUser.active && !(await canRemoveActiveAdmin(id))) {
    return NextResponse.json({ error: "系统至少需要保留一个启用中的管理员账号。" }, { status: 400 });
  }

  const result = await deleteUserPermanently(id);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        blockers: result.blockers ?? [],
      },
      { status: result.blockers ? 409 : 400 },
    );
  }

  return NextResponse.json({
    item: {
      id: result.deletedUser.id,
      username: result.deletedUser.username,
    },
  });
}
