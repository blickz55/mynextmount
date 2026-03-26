/**
 * Run Prisma CLI with the same env files as Next.js: `.env` then `.env.local`.
 * Prisma only loads `.env` by default, so `migrate` / `studio` miss `.env.local`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
loadProjectEnv(root);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-with-env.mjs <prisma args...>");
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(r.status ?? 1);
