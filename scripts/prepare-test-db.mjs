import "dotenv/config";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

const { Client } = pg;
const TEST_DATABASE_NAME_PATTERN = /test/i;
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "postgres-migrations");

function getDatabaseNameFromUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, "");

  if (!databaseName) {
    throw new Error("TEST_DATABASE_URL must include a database name.");
  }

  return decodeURIComponent(databaseName);
}

function buildAdminDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

function resolveTestDatabaseUrl(env = process.env) {
  const databaseUrl =
    env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/ai_workbench_test";
  const databaseName = getDatabaseNameFromUrl(databaseUrl);
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `TEST_DATABASE_URL must point to a dedicated test database. Received database "${databaseName}".`,
    );
  }

  return databaseUrl;
}

async function createClient(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: false,
  });

  await client.connect();
  return client;
}

async function ensureDatabaseExists(databaseUrl) {
  const databaseName = getDatabaseNameFromUrl(databaseUrl);
  const adminClient = await createClient(buildAdminDatabaseUrl(databaseUrl));

  try {
    const result = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (result.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${databaseName.replace(/"/g, "\"\"")}"`);
    }
  } finally {
    await adminClient.end().catch(() => undefined);
  }
}

async function getMigrationSqlPaths() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, "migration.sql"))
    .sort();
}

async function resetDatabaseSchema(client) {
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("CREATE SCHEMA public");
}

async function applyMigrationFiles(client) {
  const migrationSqlPaths = await getMigrationSqlPaths();
  for (const migrationSqlPath of migrationSqlPaths) {
    const migrationSql = await readFile(migrationSqlPath, "utf8");
    await client.query(migrationSql);
  }
}

async function main() {
  const databaseUrl = resolveTestDatabaseUrl();
  await ensureDatabaseExists(databaseUrl);
  const client = await createClient(databaseUrl);

  try {
    await resetDatabaseSchema(client);
    await applyMigrationFiles(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
