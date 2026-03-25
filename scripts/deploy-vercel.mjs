import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  BOOTSTRAP_ENV_KEYS,
  LOCAL_PRECHECK_ENV_KEYS,
  OPTIONAL_RUNTIME_ENV_KEYS,
  buildProjectLinkPayload,
  normalizeTarget,
  parseEnvFile,
  validateDeploymentEnv,
  validateLocalPreflightEnv,
} from "../src/lib/vercel-deploy.mjs";

function parseArgs(argv) {
  const args = {
    target: "preview",
    envFile: ".env.vercel",
    skipTests: false,
    skipBuild: false,
    skipMigrate: false,
    skipBootstrap: false,
    skipEnvSync: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--target") {
      args.target = argv[index + 1] ?? args.target;
      index += 1;
      continue;
    }
    if (current === "--env-file") {
      args.envFile = argv[index + 1] ?? args.envFile;
      index += 1;
      continue;
    }
    if (current === "--skip-tests") {
      args.skipTests = true;
      continue;
    }
    if (current === "--skip-build") {
      args.skipBuild = true;
      continue;
    }
    if (current === "--skip-migrate") {
      args.skipMigrate = true;
      continue;
    }
    if (current === "--skip-bootstrap") {
      args.skipBootstrap = true;
      continue;
    }
    if (current === "--skip-env-sync") {
      args.skipEnvSync = true;
      continue;
    }
    if (current === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (current === "--help" || current === "-h") {
      args.help = true;
      continue;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run deploy:vercel -- --target preview --env-file .env.vercel
  npm run deploy:vercel -- --target production --env-file .env.vercel.production

Options:
  --target preview|production   Deployment target. Defaults to preview.
  --env-file <path>             Path to the local env file. Defaults to .env.vercel.
  --skip-tests                  Skip local npm test before deploy.
  --skip-build                  Skip local npm run build before deploy.
  --skip-migrate                Skip local npm run prisma:migrate:deploy before deploy.
  --skip-bootstrap              Skip local npm run bootstrap:admin before deploy.
  --skip-env-sync               Skip syncing env vars to Vercel.
  --dry-run                     Validate and print actions without changing Vercel.
`);
}

function resolveCommand(binaryName) {
  const detector = process.platform === "win32" ? "where.exe" : "which";
  const detection = spawnSync(detector, [binaryName], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (detection.status === 0) {
    return {
      command: process.platform === "win32" ? `${binaryName}.cmd` : binaryName,
      baseArgs: [],
    };
  }

  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    baseArgs: ["vercel@latest"],
  };
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });

  if (result.status !== 0) {
    const error = new Error(
      `Command failed: ${command} ${args.join(" ")}\n${result.stderr || result.stdout || ""}`.trim(),
    );
    error.stdout = result.stdout;
    error.stderr = result.stderr;
    throw error;
  }

  return result.stdout ?? "";
}

async function loadOptionalEnvFiles(rootDir) {
  const optionalPaths = [".env", ".env.local"].map((filename) => path.join(rootDir, filename));
  const collected = {};

  for (const filePath of optionalPaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    const contents = await readFile(filePath, "utf8");
    Object.assign(collected, parseEnvFile(contents));
  }

  return collected;
}

function collectDeploymentEnv(optionalLocalEnv, parsedFileEnv) {
  return {
    ...optionalLocalEnv,
    ...parsedFileEnv,
    ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)),
  };
}

function getEnvKeysToSync(validation, env) {
  const optionalKeys = OPTIONAL_RUNTIME_ENV_KEYS.filter((key) => String(env[key] ?? "").trim());
  return [...new Set([...validation.syncedKeys, ...optionalKeys])];
}

function buildVercelArgs(common, subcommandArgs) {
  return [...common.baseArgs, ...subcommandArgs, ...common.globalArgs];
}

async function ensureProjectLink(rootDir, env) {
  const vercelDir = path.join(rootDir, ".vercel");
  await mkdir(vercelDir, { recursive: true });
  await writeFile(
    path.join(vercelDir, "project.json"),
    buildProjectLinkPayload({
      orgId: env.VERCEL_ORG_ID,
      projectId: env.VERCEL_PROJECT_ID,
    }),
    "utf8",
  );
}

function extractUrls(output) {
  const matches = output.match(/https:\/\/[^\s"]+/g) ?? [];
  return [...new Set(matches)];
}

function logMessages(label, messages, method = "warn") {
  if (messages.length === 0) {
    return;
  }

  console[method](`${label}:`);
  for (const message of messages) {
    console[method](`- ${message}`);
  }
}

function tryRemoveExistingEnv(common, key, target) {
  const result = spawnSync(
    common.command,
    buildVercelArgs(common, ["env", "rm", key, target, "--yes"]),
    {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  return result.status === 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = process.cwd();
  const envFilePath = path.resolve(rootDir, args.envFile);

  if (!existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath}`);
  }

  const envFile = await readFile(envFilePath, "utf8");
  const optionalLocalEnv = await loadOptionalEnvFiles(rootDir);
  const parsedFileEnv = parseEnvFile(envFile);
  const deploymentEnv = collectDeploymentEnv(optionalLocalEnv, parsedFileEnv);
  const normalizedTarget = normalizeTarget(args.target);
  const validation = validateDeploymentEnv({
    target: normalizedTarget,
    env: deploymentEnv,
  });
  const localValidation = validateLocalPreflightEnv({
    env: deploymentEnv,
    runTests: !args.skipTests,
    runBootstrap: !args.skipBootstrap,
  });

  if (!validation.ok) {
    logMessages("Deployment preflight failed", validation.errors, "error");
    process.exitCode = 1;
    return;
  }

  if (!localValidation.ok) {
    logMessages("Local preflight failed", localValidation.errors, "error");
    process.exitCode = 1;
    return;
  }

  logMessages("Deployment warnings", validation.warnings);
  logMessages("Local warnings", localValidation.warnings);

  const vercel = resolveCommand("vercel");
  const globalArgs = ["--token", deploymentEnv.VERCEL_TOKEN];
  if (String(deploymentEnv.VERCEL_SCOPE ?? "").trim()) {
    globalArgs.push("--scope", deploymentEnv.VERCEL_SCOPE.trim());
  }
  const common = {
    ...vercel,
    globalArgs,
  };
  const commandEnv = {
    ...process.env,
    ...optionalLocalEnv,
    ...parsedFileEnv,
  };

  const envKeysToSync = getEnvKeysToSync(validation, deploymentEnv);

  console.log(`Target: ${validation.target}`);
  console.log(`Env file: ${envFilePath}`);
  console.log(`Vercel project: ${deploymentEnv.VERCEL_PROJECT_ID}`);
  console.log(`Local tests: ${args.skipTests ? "skip" : "run"}`);
  console.log(`Local build: ${args.skipBuild ? "skip" : "run"}`);
  console.log(`Database migrate: ${args.skipMigrate ? "skip" : "run"}`);
  console.log(`Bootstrap admin: ${args.skipBootstrap ? "skip" : "run"}`);

  if (args.dryRun) {
    console.log("Dry run only. Planned env sync keys:");
    for (const key of envKeysToSync) {
      console.log(`- ${key}`);
    }
    if (!args.skipTests) {
      for (const key of LOCAL_PRECHECK_ENV_KEYS) {
        console.log(`- local precheck requires ${key}`);
      }
    }
    if (!args.skipBootstrap) {
      for (const key of BOOTSTRAP_ENV_KEYS) {
        console.log(`- local bootstrap requires ${key}`);
      }
    }
    return;
  }

  await ensureProjectLink(rootDir, deploymentEnv);

  console.log("Linking local directory to the target Vercel project...");
  runCommand(
    common.command,
    buildVercelArgs(common, ["pull", "--yes", "--environment", validation.target]),
  );

  if (!args.skipTests) {
    console.log("Running local test precheck...");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    runCommand(npmCommand, ["test"], { env: commandEnv });
  }

  if (!args.skipBuild) {
    console.log("Running local build precheck...");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    runCommand(npmCommand, ["run", "build"], { env: commandEnv });
  }

  if (!args.skipMigrate) {
    console.log("Running Prisma migrate deploy...");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    runCommand(npmCommand, ["run", "prisma:migrate:deploy"], { env: commandEnv });
  }

  if (!args.skipBootstrap) {
    console.log("Bootstrapping admin account...");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    runCommand(npmCommand, ["run", "bootstrap:admin"], { env: commandEnv });
  }

  if (!args.skipEnvSync) {
    console.log("Syncing environment variables to Vercel...");
    for (const key of envKeysToSync) {
      const value = String(deploymentEnv[key] ?? "");
      tryRemoveExistingEnv(common, key, validation.target);
      runCommand(
        common.command,
        buildVercelArgs(common, ["env", "add", key, validation.target, "--force", "--yes", "--value", value]),
      );
    }
  }

  console.log("Starting Vercel deploy...");
  const deployOutput = runCommand(
    common.command,
    buildVercelArgs(
      common,
      validation.target === "production" ? ["deploy", "--prod", "--yes"] : ["deploy", "--yes"],
    ),
  );

  const urls = extractUrls(deployOutput);
  console.log("Deploy finished.");
  if (urls.length > 0) {
    console.log("Detected URLs:");
    for (const url of urls) {
      console.log(`- ${url}`);
    }

    if (
      validation.target === "preview" &&
      String(deploymentEnv.APP_URL ?? "").trim() &&
      !urls.includes(String(deploymentEnv.APP_URL).trim())
    ) {
      console.warn(
        `Preview deploy URL differs from APP_URL (${deploymentEnv.APP_URL}). If this environment needs real RunningHub webhooks, bind a stable preview domain or update APP_URL before using it.`,
      );
    }
  } else {
    console.log(deployOutput);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
