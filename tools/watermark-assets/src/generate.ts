#!/usr/bin/env node
/**
 * 生成水印去除演示素材（TypeScript + sharp + ffmpeg）
 * 输出：GIF / MP4 循环动图 + PNG 左右对比静图
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { buildWipeFrames, exportAnimatedWebp, exportGif, exportMp4 } from "./animation.js";
import {
  COMPARE_SIZE,
  COVER_ANIM,
  COVER_BASE,
  COVER_SIZE,
  DETAIL_ANIM,
  DETAIL_SIZE,
  OUT_DIR,
  SAMPLE_FILES,
  SAMPLE_SIZE,
} from "./config.js";
import {
  compressAllSources,
  loadFittedRgb,
  resolveSourceBase,
} from "./image.js";
import type { Size } from "./image.js";
import { applyWatermark } from "./watermark.js";
import { formatBytes } from "./utils.js";

/**
 * 生成左右对比静图（图4）
 * 左侧：带水印  |  右侧：干净  |  中间白色分隔线
 */
async function saveSplitComparePng(
  clean: Buffer,
  marked: Buffer,
  size: Size,
  dest: string,
): Promise<void> {
  const half = Math.floor(size.width / 2);
  const left = await sharp(marked).extract({ left: 0, top: 0, width: half, height: size.height }).toBuffer();
  const right = await sharp(clean)
    .extract({ left: half, top: 0, width: size.width - half, height: size.height })
    .toBuffer();
  const line = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${half}" y1="0" x2="${half}" y2="${size.height}" stroke="white" stroke-width="3"/>
      <circle cx="${half}" cy="${size.height / 2}" r="8" fill="white"/>
    </svg>`,
  );
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await sharp({
    create: { width: size.width, height: size.height, channels: 3, background: "#f0f0f0" },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: half, top: 0 },
      { input: line, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

async function logSize(file: string): Promise<void> {
  const st = await fs.stat(file);
  console.log(`  ${path.relative(OUT_DIR, file)} — ${formatBytes(st.size)}`);
}

async function main(): Promise<void> {
  console.log("压缩原始底图…");
  await compressAllSources();

  const coverPath = await resolveSourceBase(COVER_BASE);
  const { buffer: coverClean } = await loadFittedRgb(coverPath, COVER_SIZE);
  const coverMarked = await applyWatermark(coverClean, COVER_SIZE);

  const coverDir = path.join(OUT_DIR, "cover");
  const detailDir = path.join(OUT_DIR, "detail");

  // ── 图1：首页卡片循环动图 ──────────────────────────────
  console.log("首页卡片动效（图1）…");
  const coverFrames = await buildWipeFrames(coverClean, coverMarked, COVER_SIZE, {
    hold: COVER_ANIM.hold,
    sweep: COVER_ANIM.sweep,
  });
  await exportGif(
    coverFrames,
    path.join(coverDir, "watermark-removal-cover.gif"),
    COVER_ANIM.fps,
  );
  await exportMp4(
    coverFrames,
    path.join(coverDir, "watermark-removal-cover.mp4"),
    COVER_ANIM.fps,
  );
  if (process.env.GENERATE_WEBP === "1") {
    await exportAnimatedWebp(
      coverFrames,
      path.join(coverDir, "watermark-removal-cover.anim.webp"),
      COVER_ANIM.fps,
    );
  }
  await sharp(coverFrames[0]).webp({ quality: 80 }).toFile(path.join(coverDir, "watermark-removal-cover-poster.webp"));

  // ── 图4：左右对比 PNG（编辑器侧栏缩略图）──────────────
  console.log("左右对比静图（图4）…");
  const { buffer: compareClean } = await loadFittedRgb(coverPath, COMPARE_SIZE);
  const compareMarked = await applyWatermark(compareClean, COMPARE_SIZE);
  await saveSplitComparePng(
    compareClean,
    compareMarked,
    COMPARE_SIZE,
    path.join(coverDir, "watermark-removal-compare.png"),
  );

  // ── 图3：详情页循环动图 ────────────────────────────────
  console.log("详情页循环动效（图3）…");
  const { buffer: detailClean } = await loadFittedRgb(coverPath, DETAIL_SIZE);
  const detailMarked = await applyWatermark(detailClean, DETAIL_SIZE);
  const detailFrames = await buildWipeFrames(detailClean, detailMarked, DETAIL_SIZE, {
    hold: DETAIL_ANIM.hold,
    sweep: DETAIL_ANIM.sweep,
  });
  await exportGif(
    detailFrames,
    path.join(detailDir, "watermark-removal-demo-loop.gif"),
    DETAIL_ANIM.fps,
  );
  await exportMp4(
    detailFrames,
    path.join(detailDir, "watermark-removal-demo-loop.mp4"),
    DETAIL_ANIM.fps,
  );
  if (process.env.GENERATE_WEBP === "1") {
    await exportAnimatedWebp(
      detailFrames,
      path.join(detailDir, "watermark-removal-demo-loop.webp"),
      DETAIL_ANIM.fps,
    );
  }

  // ── 示例图 ─────────────────────────────────────────────
  console.log("示例图…");
  const samplesDir = path.join(OUT_DIR, "samples");
  for (const { name, file } of SAMPLE_FILES) {
    const src = await resolveSourceBase(file);
    const { buffer: clean } = await loadFittedRgb(src, SAMPLE_SIZE);
    const marked = await applyWatermark(clean, SAMPLE_SIZE);
    await fs.writeFile(path.join(samplesDir, `sample-${name}.jpg`), clean);
    await fs.writeFile(path.join(samplesDir, `sample-${name}-watermarked.jpg`), marked);
  }

  console.log("\n生成完成，文件大小：");
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (!e.name.startsWith(".")) await logSize(p);
    }
  };
  await walk(OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
