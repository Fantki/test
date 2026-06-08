import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
export const REPO_ROOT = path.resolve(pkgRoot, "../..");

/** 原始底图目录（可用环境变量 WATERMARK_SRC 覆盖） */
export const SRC_DIR =
  process.env.WATERMARK_SRC ??
  path.join(REPO_ROOT, "assets/watermark-removal/sources");

/** 生成产物输出目录 */
export const OUT_DIR = path.join(REPO_ROOT, "assets/watermark-removal");

// ── 输出尺寸 ──────────────────────────────────────────────

/** 首页卡片动图尺寸（图1） */
export const COVER_SIZE = { width: 800, height: 534 } as const;

/** 详情页循环动图尺寸（图3） */
export const DETAIL_SIZE = { width: 960, height: 640 } as const;

/** 左右对比静图尺寸（图4 编辑器侧栏缩略图） */
export const COMPARE_SIZE = { width: 400, height: 267 } as const;

/** 示例图尺寸 */
export const SAMPLE_SIZE = { width: 720, height: 480 } as const;

// ── 动效节奏（数值越大 / fps 越小 → 播放越慢）────────────

/**
 * 首页卡片擦除动效（图1）
 * - hold：开头和结尾各停留多少帧
 * - sweep：从左到右擦除用多少帧
 * - fps：每秒播放帧数，8 比默认 14 慢约一半
 */
export const COVER_ANIM = { hold: 10, sweep: 24, fps: 8 } as const;

/**
 * 详情页循环擦除动效（图3）
 * 参数含义同 COVER_ANIM
 */
export const DETAIL_ANIM = { hold: 12, sweep: 30, fps: 8 } as const;

// ── 图片质量 ──────────────────────────────────────────────

export const JPEG_QUALITY = 82;
export const WEBP_QUALITY = 78;
export const FRAME_JPEG_QUALITY = 85;

/** 示例图列表：name 为输出文件名，file 为 sources 下的底图基名 */
export const SAMPLE_FILES = [
  { name: "person", file: "base-sample-person" },
  { name: "landscape", file: "base-sample-landscape" },
  { name: "food", file: "base-sample-food" },
  { name: "architecture", file: "base-sample-architecture" },
] as const;

/** 首页 / 详情页共用的产品展示底图 */
export const COVER_BASE = "base-cover-product";
