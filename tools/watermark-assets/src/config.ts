import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
export const REPO_ROOT = path.resolve(pkgRoot, "../..");

export const SRC_DIR =
  process.env.WATERMARK_SRC ??
  path.join(REPO_ROOT, "assets/watermark-removal/sources");

export const OUT_DIR = path.join(REPO_ROOT, "assets/watermark-removal");

/** Output dimensions (keep modest for web) */
export const COVER_SIZE = { width: 800, height: 534 } as const;
export const DETAIL_SIZE = { width: 960, height: 640 } as const;
export const SAMPLE_SIZE = { width: 720, height: 480 } as const;

export const JPEG_QUALITY = 82;
export const WEBP_QUALITY = 78;
export const FRAME_JPEG_QUALITY = 85;

export const SAMPLE_FILES = [
  { name: "person", file: "base-sample-person" },
  { name: "landscape", file: "base-sample-landscape" },
  { name: "food", file: "base-sample-food" },
  { name: "architecture", file: "base-sample-architecture" },
] as const;

export const COVER_BASE = "base-cover-product";
