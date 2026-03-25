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

function listImageBasenames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(
    (f) => /\.(png|svg|webp|jpe?g)$/i.test(f) && !f.startsWith("."),
  );
}

/** Prefer `mynextmount-logo.*`, then any basename containing `logo`. */
function pickLogoBasename(files: string[]): string | null {
  const preferred = files.find((f) => /^mynextmount-logo\./i.test(f));
  if (preferred) return preferred;
  const anyLogo = files.find((f) => /logo/i.test(f));
  return anyLogo ?? null;
}

/**
 * Copies one file from `data/images/` (preferred) or `data/` into `public/`
 * as `mynextmount-brand.<ext>` and returns its URL for SiteBrand.
 * Drop `data/images/mynextmount-logo.png` (or svg/webp) to override.
 */
function syncBrandLogoFromData(): string | null {
  if (!existsSync(dataDir)) return null;
  const imagesDir = join(dataDir, "images");
  const inImages = pickLogoBasename(listImageBasenames(imagesDir));
  const inRoot = pickLogoBasename(listImageBasenames(dataDir));
  const picked =
    inImages != null
      ? { src: join(imagesDir, inImages), name: inImages }
      : inRoot != null
        ? { src: join(dataDir, inRoot), name: inRoot }
        : null;
  if (!picked) return null;
  const { src, name } = picked;
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
