import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const dbUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54329/ai_workbench_local";
const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function seed() {
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

  const app = await prisma.app.upsert({
    where: { code: "all-in-one-image-2" },
    update: {
      estimatedPriceFen: 1290,
      tags: {
        deleteMany: {},
        create: [
          { tag: { connect: { id: imageTag.id } } },
          { tag: { connect: { id: ecommerceTag.id } } },
        ],
      },
    },
    create: {
      id: "app-all-in-one-image-2",
      code: "all-in-one-image-2",
      name: "全能图片 2.0",
      description: "上传 1 到 3 张图片并输入提示词后，统一进入任务流并同步飞书。",
      provider: "RUNNINGHUB",
      providerAppId: "2027211316242423809",
      enabled: true,
      estimatedPriceFen: 1290,
      category: "图片",
      formSchemaJson: [
        { key: "image1", label: "参考图 1", type: "image", description: "最多上传 3 张产品参考图。", maxItems: 1 },
        { key: "image2", label: "参考图 2", type: "image", maxItems: 1 },
        { key: "image3", label: "参考图 3", type: "image", maxItems: 1 },
        { key: "prompt", label: "创作 Prompt", type: "textarea", required: true, description: "描述希望生成的图片效果。" },
        {
          key: "aspectRatio",
          label: "比例",
          type: "select",
          options: [
            { label: "1:1", value: "1:1" },
            { label: "3:4", value: "3:4" },
            { label: "16:9", value: "16:9" },
          ],
        },
        {
          key: "resolution",
          label: "分辨率",
          type: "select",
          options: [
            { label: "1024 x 1024", value: "1024x1024" },
            { label: "1536 x 1536", value: "1536x1536" },
            { label: "2048 x 2048", value: "2048x2048" },
          ],
        },
        {
          key: "channel",
          label: "渠道",
          type: "select",
          options: [
            { label: "电商通用", value: "ecommerce" },
            { label: "社媒封面", value: "social" },
            { label: "详情页视觉", value: "detail" },
          ],
        },
      ],
      requestMappingJson: {
        prompt: "input.prompt",
        aspectRatio: "params.aspect_ratio",
        resolution: "params.resolution",
        channel: "params.channel",
        image1: "input.images[0]",
        image2: "input.images[1]",
        image3: "input.images[2]",
      },
      defaultParamsJson: {
        aspectRatio: "1:1",
        resolution: "1536x1536",
        channel: "ecommerce",
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
      tags: {
        create: [
          { tag: { connect: { id: imageTag.id } } },
          { tag: { connect: { id: ecommerceTag.id } } },
        ],
      },
    },
  });

  const otherApps = [
    {
      id: "app-qushuiyin",
      code: "qushuiyin",
      name: "去水印",
      description: "上传图片后，AI 自动移除图片水印，还原干净画面。",
      provider: "RUNNINGHUB",
      providerAppId: "",
      enabled: false,
      estimatedPriceFen: 990,
      category: "图片",
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
    {
      id: "app-nano1-pro",
      code: "nano1-pro",
      name: "全能图片 1 Pro",
      description: "基于全能图片 2.0 升级的高分辨率图片生成应用。",
      provider: "RUNNINGHUB",
      providerAppId: "",
      enabled: false,
      estimatedPriceFen: 1590,
      category: "图片",
      formSchemaJson: [],
      requestMappingJson: {},
      defaultParamsJson: {},
      syncMappingJson: {},
    },
  ];

  for (const appData of otherApps) {
    await prisma.app.upsert({
      where: { code: appData.code },
      update: {
        description: appData.description,
        category: appData.category,
        estimatedPriceFen: appData.estimatedPriceFen,
      },
      create: appData,
    });
  }

  console.log("Seeded:", { admin: admin.id, ops: ops.id, design: design.id, app: app.id });
}

seed()
  .catch((e) => console.log("SEED ERROR:", e.message))
  .finally(() => prisma.$disconnect());
