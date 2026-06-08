import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { JPEG_QUALITY, SRC_DIR, WEBP_QUALITY } from "./config.js";

export const FRAME_JPEG_QUALITY = 85;

export type Size = { width: number; height: number };

export async function resolveSourceBase(name: string): Promise<string> {
  for (const ext of [".webp", ".png", ".jpg"]) {
    const p = path.join(SRC_DIR, `${name}${ext}`);
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Source not found: ${name} in ${SRC_DIR}`);
}

export function fitCover(input: sharp.Sharp, size: Size): sharp.Sharp {
  return input.resize(size.width, size.height, {
    fit: "cover",
    position: "centre",
  });
}

export async function loadFittedRgb(
  sourcePath: string,
  size: Size,
): Promise<{ pipeline: sharp.Sharp; buffer: Buffer }> {
  const pipeline = fitCover(sharp(sourcePath), size);
  const buffer = await pipeline.clone().jpeg({ quality: FRAME_JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return { pipeline, buffer };
}


export async function saveJpeg(img: sharp.Sharp, dest: string, quality = JPEG_QUALITY): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await img.jpeg({ quality, mozjpeg: true }).toFile(dest);
}

export async function saveWebp(img: sharp.Sharp, dest: string, quality = WEBP_QUALITY): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await img.webp({ quality }).toFile(dest);
}

/** Shrink source masters for repo size (optional, run once). */
export async function compressSourceFile(srcPath: string): Promise<void> {
  const meta = await sharp(srcPath).metadata();
  const maxEdge = 1280;
  const w = meta.width ?? maxEdge;
  const h = meta.height ?? maxEdge;
  if (w <= maxEdge && h <= maxEdge && srcPath.endsWith(".webp")) return;

  const webpPath = srcPath.replace(/\.(png|jpe?g)$/i, ".webp");
  await sharp(srcPath)
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(webpPath);

  if (webpPath !== srcPath && /\.(png|jpe?g)$/i.test(srcPath)) {
    await fs.unlink(srcPath).catch(() => undefined);
  }
}

export async function compressAllSources(): Promise<void> {
  const entries = await fs.readdir(SRC_DIR);
  for (const f of entries) {
    if (/\.(png|jpe?g|webp)$/i.test(f)) {
      await compressSourceFile(path.join(SRC_DIR, f));
    }
  }
}

export async function blendProgress(
  clean: Buffer,
  marked: Buffer,
  size: Size,
  t: number,
): Promise<Buffer> {
  const progress = Math.max(0, Math.min(1, t));
  const split = Math.floor(size.width * progress);

  const composites: sharp.OverlayOptions[] = [];

  if (split > 0) {
    composites.push({
      input: await sharp(clean).extract({ left: 0, top: 0, width: split, height: size.height }).toBuffer(),
      left: 0,
      top: 0,
    });
  }

  if (split < size.width) {
    composites.push({
      input: await sharp(marked)
        .extract({ left: split, top: 0, width: size.width - split, height: size.height })
        .toBuffer(),
      left: split,
      top: 0,
    });
  }

  if (split > 0 && split < size.width) {
    const lineSvg = Buffer.from(
      `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
        <line x1="${split}" y1="0" x2="${split}" y2="${size.height}" stroke="white" stroke-width="3" opacity="0.9"/>
        <circle cx="${split}" cy="${size.height / 2}" r="10" fill="white"/>
      </svg>`,
    );
    composites.push({ input: lineSvg, left: 0, top: 0 });
  }

  return sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  })
    .composite(composites)
    .jpeg({ quality: FRAME_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}
