import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Load `.env` then `.env.local` from project root into `process.env`.
 * `.env` only fills keys that are unset or empty (OS env wins if set).
 * `.env.local` overrides any previous value for keys it defines (Next.js-style).
 */
export function loadProjectEnv(root) {
  loadDotEnvFile(root, ".env", false);
  loadDotEnvFile(root, ".env.local", true);
}

function loadDotEnvFile(root, relPath, overrideFromFile) {
  const p = join(root, relPath);
  if (!existsSync(p)) return 0;
  let text = readFileSync(p, "utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    let s = line.trim();
    if (!s || s.startsWith("#")) continue;
    if (/^export\s+/i.test(s)) {
      s = s.replace(/^export\s+/i, "").trim();
    }
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    if (overrideFromFile || cur === undefined || cur === "") process.env[key] = val;
    n += 1;
  }
  return n;
}
