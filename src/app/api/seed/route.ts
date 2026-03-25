import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed endpoint disabled in production" }, { status: 403 });
  }

  try {
    const adminPassword = await bcrypt.hash("admin123", 10);
    const opsPassword = await bcrypt.hash("ops123", 10);
    const designPassword = await bcrypt.hash("design123", 10);

    const admin = await prisma.user.upsert({
      where: { username: "admin" },
      update: { passwordHash: adminPassword },
      create: {
        username: "admin",
        displayName: "朝鑫",
        role: "ADMIN",
        active: true,
        passwordHash: adminPassword,
        lastLoginAt: new Date(),
      },
    });

    const ops = await prisma.user.upsert({
      where: { username: "ops.a" },
      update: { passwordHash: opsPassword },
      create: {
        username: "ops.a",
        displayName: "运营-A",
        role: "USER",
        active: true,
        passwordHash: opsPassword,
        lastLoginAt: new Date(),
      },
    });

    const design = await prisma.user.upsert({
      where: { username: "design.c" },
      update: { passwordHash: designPassword },
      create: {
        username: "design.c",
        displayName: "设计-C",
        role: "USER",
        active: true,
        passwordHash: designPassword,
        lastLoginAt: new Date(),
      },
    });

    const imageTag = await prisma.appTag.upsert({
      where: { name: "图片生成" },
      update: {},
      create: {
        name: "图片生成",
        color: "#2563EB",
        sortOrder: 1,
      },
    });

    const ecommerceTag = await prisma.appTag.upsert({
      where: { name: "电商" },
      update: {},
      create: {
        name: "电商",
        color: "#0F766E",
        sortOrder: 2,
      },
    });

    const existingApp = await prisma.app.findUnique({ where: { code: "all-in-one-image-2" } });
    if (existingApp) {
      await prisma.syncLog.deleteMany({ where: { task: { appId: existingApp.id } } });
      await prisma.taskAsset.deleteMany({ where: { task: { appId: existingApp.id } } });
      await prisma.task.deleteMany({ where: { appId: existingApp.id } });
      await prisma.app.delete({ where: { code: "all-in-one-image-2" } });
    }

    const app = await prisma.app.create({
      data: {
        id: "app-all-in-one-image-2",
        code: "all-in-one-image-2",
        name: "全能图片 2.0",
        description: "上传 1 到 3 张图片并输入提示词后，统一进入任务流并同步飞书。",
        provider: "RUNNINGHUB",
        providerAppId: "2027211316242423809",
        enabled: true,
        category: "图片",
        formSchemaJson: [
          { key: "image1", label: "参考图 1", type: "image", description: "最多上传 3 张产品参考图。", maxItems: 1 },
          { key: "image2", label: "参考图 2", type: "image", maxItems: 1 },
          { key: "image3", label: "参考图 3", type: "image", maxItems: 1 },
          { key: "prompt", label: "创作 Prompt", type: "textarea", required: true, description: "描述希望生成的图片效果。" },
        ],
        requestMappingJson: {
          prompt: "9.text",
          image1: "2.image",
          image2: "3.image",
          image3: "4.image",
        },
        defaultParamsJson: {
          instanceType: "default",
          usePersonalQueue: "false",
        },
        syncMappingJson: {
          taskNo: "任务号",
          status: "任务状态",
          providerStatus: "Provider 状态",
          providerResultUrl: "结果链接",
          ownerName: "创建人",
        },
        iconBgColor: "blue",
        tags: {
          create: [
            { tag: { connect: { id: imageTag.id } } },
            { tag: { connect: { id: ecommerceTag.id } } },
          ],
        },
      },
    });

    return NextResponse.json({ ok: true, admin: admin.id, ops: ops.id, design: design.id, app: app.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
