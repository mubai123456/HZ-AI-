"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authenticateMockUser, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const credentialsSchema = z.object({
  username: z.string().min(1, "请输入用户名。"),
  password: z.string().min(1, "请输入密码。"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "登录信息不完整。",
    };
  }

  const result = await authenticateMockUser(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return { error: result.error };
  }

  const token = await createSessionToken(result.user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}
