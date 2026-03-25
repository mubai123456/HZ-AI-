import { execSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

export default async function globalSetup() {
  const cwd = path.resolve(__dirname);
  const templateDb = path.join(cwd, "dev.db");
  const testDbBase = path.join(cwd, "test.db");

  for (const suffix of ["", "-shm", "-wal"]) {
    const target = `${testDbBase}${suffix}`;
    if (existsSync(target)) {
      rmSync(target, { force: true });
    }
  }

  copyFileSync(templateDb, testDbBase);

  execSync("bunx prisma db push --accept-data-loss", {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./test.db",
    },
  });
}
