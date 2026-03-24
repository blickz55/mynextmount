import type { NextConfig } from "next";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const configDir = dirname(__filename);
const dataDir = join(configDir, "data");
const publicDir = join(configDir, "public");

function pickLogoFile(files: string[]): string | null {
  const images = files.filter(
    (f) => /\.(png|svg|webp|jpe?g)$/i.test(f) && !f.startsWith("."),
  );
  const preferred = images.find((f) => /^mynextmount-logo\./i.test(f));
  if (preferred) return preferred;
  const anyLogo = images.find((f) => /logo/i.test(f));
  return anyLogo ?? null;
}

function syncBrandLogoFromData(): string | null {
  if (!existsSync(dataDir)) return null;
  const name = pickLogoFile(readdirSync(dataDir));
  if (!name) return null;
  const src = join(dataDir, name);
  const ext = extname(name).toLowerCase();
  const outExt = ext === ".jpeg" ? ".jpg" : ext;
  const destName = `mynextmount-brand${outExt}`;
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(src, join(publicDir, destName));
  return `/${destName}`;
}

const brandLogoPublicUrl = syncBrandLogoFromData();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BRAND_LOGO_URL: brandLogoPublicUrl ?? "",
  },
};

export default nextConfig;
