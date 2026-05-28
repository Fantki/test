import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { FRAME_JPEG_QUALITY } from "./config.js";
import { blendProgress } from "./image.js";
import type { Size } from "./image.js";
import { easeInOut, runFfmpeg } from "./utils.js";

export type FramePlan = { hold: number; sweep: number; reverse?: boolean };

export async function buildWipeFrames(
  clean: Buffer,
  marked: Buffer,
  size: Size,
  plan: FramePlan,
): Promise<Buffer[]> {
  const frames: Buffer[] = [];
  const { hold, sweep, reverse = true } = plan;

  for (let i = 0; i < hold; i++) {
    frames.push(await blendProgress(clean, marked, size, 0));
  }
  for (let i = 0; i < sweep; i++) {
    const t = easeInOut(i / Math.max(1, sweep - 1));
    frames.push(await blendProgress(clean, marked, size, t));
  }
  for (let i = 0; i < hold; i++) {
    frames.push(await blendProgress(clean, marked, size, 1));
  }
  if (reverse) {
    for (let i = 0; i < sweep; i++) {
      const t = 1 - easeInOut(i / Math.max(1, sweep - 1));
      frames.push(await blendProgress(clean, marked, size, t));
    }
  }
  return frames;
}

export async function exportMp4(frames: Buffer[], dest: string, fps = 14): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wm-frames-"));
  try {
    let i = 0;
    for (const frame of frames) {
      const name = `frame_${String(i).padStart(4, "0")}.jpg`;
      await fs.writeFile(path.join(tmp, name), frame);
      i++;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await runFfmpeg([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(tmp, "frame_%04d.jpg"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-crf",
      "30",
      "-preset",
      "slow",
      dest,
    ]);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export async function exportAnimatedWebp(
  frames: Buffer[],
  dest: string,
  fps = 14,
): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wm-webp-"));
  try {
    let i = 0;
    for (const frame of frames) {
      await fs.writeFile(path.join(tmp, `frame_${String(i).padStart(4, "0")}.jpg`), frame);
      i++;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const delay = Math.round(1000 / fps);
    await runFfmpeg([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(tmp, "frame_%04d.jpg"),
      "-c:v",
      "libwebp",
      "-lossless",
      "0",
      "-q:v",
      "60",
      "-loop",
      "0",
      "-an",
      dest,
    ]);
    // ffmpeg webp mux may ignore delay; patch via sharp fallback not needed if mp4 primary
    void delay;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export { FRAME_JPEG_QUALITY };
