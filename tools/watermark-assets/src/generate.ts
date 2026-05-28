#!/usr/bin/env node
/**
 * Generate watermark-removal demo assets (TypeScript + sharp + ffmpeg).
 * Outputs small MP4 / WebP / JPEG — no large GIFs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { buildWipeFrames, exportAnimatedWebp, exportMp4 } from "./animation.js";
import {
  COVER_BASE,
  COVER_SIZE,
  DETAIL_SIZE,
  OUT_DIR,
  SAMPLE_FILES,
  SAMPLE_SIZE,
} from "./config.js";
import {
  blendProgress,
  compressAllSources,
  loadFittedRgb,
  resolveSourceBase,
} from "./image.js";
import { applyWatermark } from "./watermark.js";
import { formatBytes } from "./utils.js";

async function saveSplitPoster(
  clean: Buffer,
  marked: Buffer,
  size: typeof COVER_SIZE,
  dest: string,
): Promise<void> {
  const half = Math.floor(size.width / 2);
  const left = await sharp(marked).extract({ left: 0, top: 0, width: half, height: size.height }).toBuffer();
  const right = await sharp(clean)
    .extract({ left: half, top: 0, width: size.width - half, height: size.height })
    .toBuffer();
  const line = Buffer.from(
    `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${half}" y1="0" x2="${half}" y2="${size.height}" stroke="white" stroke-width="4"/>
    </svg>`,
  );
  await sharp({
    create: { width: size.width, height: size.height, channels: 3, background: "#f0f0f0" },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: half, top: 0 },
      { input: line, left: 0, top: 0 },
    ])
    .webp({ quality: 82 })
    .toFile(dest);
}

async function logSize(file: string): Promise<void> {
  const st = await fs.stat(file);
  console.log(`  ${path.relative(OUT_DIR, file)} — ${formatBytes(st.size)}`);
}

async function main(): Promise<void> {
  console.log("Compressing source masters…");
  await compressAllSources();

  const coverPath = await resolveSourceBase(COVER_BASE);
  const { buffer: coverClean } = await loadFittedRgb(coverPath, COVER_SIZE);
  const coverMarked = await applyWatermark(coverClean, COVER_SIZE);

  const coverDir = path.join(OUT_DIR, "cover");
  const detailDir = path.join(OUT_DIR, "detail");

  console.log("Cover animation…");
  const coverFrames = await buildWipeFrames(coverClean, coverMarked, COVER_SIZE, {
    hold: 5,
    sweep: 16,
  });
  await exportMp4(coverFrames, path.join(coverDir, "watermark-removal-cover.mp4"));
  // Animated WebP omitted — use MP4 (~50KB). Set GENERATE_WEBP=1 to enable.
  if (process.env.GENERATE_WEBP === "1") {
    await exportAnimatedWebp(coverFrames, path.join(coverDir, "watermark-removal-cover.anim.webp"));
  }
  await saveSplitPoster(
    coverClean,
    coverMarked,
    COVER_SIZE,
    path.join(coverDir, "watermark-removal-cover-static.webp"),
  );
  await sharp(coverFrames[0]).webp({ quality: 80 }).toFile(path.join(coverDir, "watermark-removal-cover-poster.webp"));

  console.log("Detail page loop…");
  const { buffer: detailClean } = await loadFittedRgb(coverPath, DETAIL_SIZE);
  const detailMarked = await applyWatermark(detailClean, DETAIL_SIZE);
  const detailFrames = await buildWipeFrames(detailClean, detailMarked, DETAIL_SIZE, {
    hold: 8,
    sweep: 22,
  });
  await exportMp4(detailFrames, path.join(detailDir, "watermark-removal-demo-loop.mp4"));
  if (process.env.GENERATE_WEBP === "1") {
    await exportAnimatedWebp(detailFrames, path.join(detailDir, "watermark-removal-demo-loop.webp"));
  }

  console.log("Sample images…");
  const samplesDir = path.join(OUT_DIR, "samples");
  for (const { name, file } of SAMPLE_FILES) {
    const src = await resolveSourceBase(file);
    const { buffer: clean } = await loadFittedRgb(src, SAMPLE_SIZE);
    const marked = await applyWatermark(clean, SAMPLE_SIZE);
    await fs.writeFile(path.join(samplesDir, `sample-${name}.jpg`), clean);
    await fs.writeFile(path.join(samplesDir, `sample-${name}-watermarked.jpg`), marked);
  }

  // Remove legacy huge GIFs if present
  for (const legacy of [
    path.join(coverDir, "watermark-removal-cover.gif"),
    path.join(coverDir, "watermark-removal-cover.png"),
    path.join(detailDir, "watermark-removal-demo-loop.gif"),
  ]) {
    await fs.unlink(legacy).catch(() => undefined);
  }

  console.log("\nDone. Output sizes:");
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
