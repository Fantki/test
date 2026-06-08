import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { FRAME_JPEG_QUALITY } from "./config.js";
import { blendProgress } from "./image.js";
import type { Size } from "./image.js";
import { easeInOut, runFfmpeg } from "./utils.js";

/** 擦除动效帧计划：hold=停留帧，sweep=过渡帧，reverse=是否回播 */
export type FramePlan = { hold: number; sweep: number; reverse?: boolean };

/** 合成水印擦除动画帧序列（带水印 → 干净 → 回环） */
export async function buildWipeFrames(  clean: Buffer,
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

/** 导出 MP4 循环视频（体积小，推荐用于 <video> 标签） */
export async function exportMp4(frames: Buffer[], dest: string, fps = 14): Promise<void> {  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wm-frames-"));
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

/**
 * 导出循环 GIF（用于 <img> 标签，兼容性好）
 * 使用调色板压缩，在画质和体积之间折中
 */
export async function exportGif(frames: Buffer[], dest: string, fps = 8): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wm-gif-"));
  try {
    let i = 0;
    for (const frame of frames) {
      await fs.writeFile(path.join(tmp, `frame_${String(i).padStart(4, "0")}.jpg`), frame);
      i++;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await runFfmpeg([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(tmp, "frame_%04d.jpg"),
      "-vf",
      `fps=${fps},split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
      "-loop",
      "0",
      dest,
    ]);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/** 导出动图 WebP（需设置环境变量 GENERATE_WEBP=1 才生成） */
export async function exportAnimatedWebp(
  frames: Buffer[],
  dest: string,
  fps = 14,
): Promise<void> {  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wm-webp-"));
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
