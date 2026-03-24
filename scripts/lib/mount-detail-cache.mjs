import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";

export function mountDetailCachePath(root, mountNumericId) {
  return join(
    root,
    "data",
    "build",
    "cache",
    "blizzard",
    "mount",
    `${mountNumericId}.json`,
  );
}

export function readMountDetailCache(path, ttlSec, forceRefresh) {
  if (forceRefresh || !existsSync(path)) return null;
  try {
    const st = statSync(path);
    const ageSec = (Date.now() - st.mtimeMs) / 1000;
    if (ageSec > ttlSec) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function writeMountDetailCache(path, detail) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(detail, null, 2) + "\n", "utf8");
}
