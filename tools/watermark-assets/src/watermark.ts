import sharp from "sharp";

import type { Size } from "./image.js";

const WATERMARK_TEXT = "Watermark";

export function watermarkSvg(size: Size, opacity = 0.42): Buffer {
  const fontSize = Math.max(18, Math.floor(size.width / 38));
  const spacing = 110;
  return Buffer.from(`<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="wm" width="${fontSize * 4 + spacing}" height="${fontSize + spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
      <text x="0" y="${fontSize}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" fill-opacity="${opacity}">${WATERMARK_TEXT}</text>
      <text x="${spacing / 2}" y="${fontSize + spacing / 2}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" fill-opacity="${opacity}">${WATERMARK_TEXT}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`);
}

export async function applyWatermark(cleanBuffer: Buffer, size: Size): Promise<Buffer> {
  return sharp(cleanBuffer)
    .composite([{ input: watermarkSvg(size), blend: "over" }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
