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
 * Prefer `highlight image text.*` (hero includes headline copy), then
 * `highlight image.*`, then any `highlight*.{png,...}` except logo.
 */
function pickHighlightBasename(files: string[]): string | null {
  const withText = files.find((f) => /^highlight\s*image\s*text\./i.test(f));
  if (withText) return withText;
  const plain = files.find((f) => /^highlight\s*image\./i.test(f));
  if (plain) return plain;
  return (
    files.find(
      (f) =>
        /^highlight/i.test(f) &&
        !/logo/i.test(f) &&
        /\.(png|svg|webp|jpe?g)$/i.test(f),
    ) ?? null
  );
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

function syncHighlightBannerFromData(): string | null {
  if (!existsSync(dataDir)) return null;
  const imagesDir = join(dataDir, "images");
  if (!existsSync(imagesDir)) return null;
  const files = listImageBasenames(imagesDir);
  const name = pickHighlightBasename(files);
  if (name == null) return null;
  const src = join(imagesDir, name);
  const ext = extname(name).toLowerCase();
  const outExt = ext === ".jpeg" ? ".jpg" : ext;
  const destName = `mynextmount-highlight${outExt}`;
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(src, join(publicDir, destName));
  return `/${destName}`;
}

const brandLogoPublicUrl = syncBrandLogoFromData();
const highlightBannerPublicUrl = syncHighlightBannerFromData();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BRAND_LOGO_URL: brandLogoPublicUrl ?? "",
    NEXT_PUBLIC_HIGHLIGHT_BANNER_URL: highlightBannerPublicUrl ?? "",
  },
};

export default nextConfig;
