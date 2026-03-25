type PrismaErrorLike = Error & {
  code?: unknown;
  meta?: Record<string, unknown> | undefined;
};

const PRISMA_SCHEMA_MISMATCH_CODES = new Set(["P2021", "P2022"]);

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function isPrismaSchemaMismatchError(error: unknown): error is PrismaErrorLike {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaCode = (error as PrismaErrorLike).code;
  if (typeof prismaCode === "string" && PRISMA_SCHEMA_MISMATCH_CODES.has(prismaCode)) {
    return true;
  }

  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes("no such table") ||
    message.includes("does not exist") ||
    (message.includes("column") && message.includes("not found"))
  );
}

export function getPrismaSchemaMismatchTarget(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const meta = (error as PrismaErrorLike).meta;
  if (!meta || typeof meta !== "object") {
    return null;
  }

  const table = meta.table;
  if (typeof table === "string" && table.trim()) {
    return table;
  }

  const column = meta.column;
  if (typeof column === "string" && column.trim()) {
    return column;
  }

  const modelName = meta.modelName;
  if (typeof modelName === "string" && modelName.trim()) {
    return modelName;
  }

  return null;
}

export function buildSchemaMismatchUserMessage(scope: string) {
  return `${scope} 当前依赖的数据库结构还没有同步到线上环境。请先执行 prisma migrate deploy，再重新触发 Vercel 部署。`;
}

export function logPrismaRuntimeDiagnostic(scope: string, error: unknown) {
  if (isPrismaSchemaMismatchError(error)) {
    console.error(
      `[prisma] ${scope} failed because the deployed database schema is behind the current code.`,
      {
        code: (error as PrismaErrorLike).code ?? "unknown",
        target: getPrismaSchemaMismatchTarget(error) ?? "unknown",
        guidance: 'Run "prisma migrate deploy" before serving this build, then redeploy on Vercel.',
        error,
      },
    );
    return;
  }

  console.error(`[prisma] ${scope} failed.`, error);
}
