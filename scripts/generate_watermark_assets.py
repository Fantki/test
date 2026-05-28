#!/usr/bin/env python3
"""Generate original watermark-removal demo assets (no third-party imagery)."""

from __future__ import annotations

import math
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("WATERMARK_SRC", ROOT / "assets/watermark-removal/sources"))
OUT = ROOT / "assets" / "watermark-removal"

WATERMARK_TEXT = "Watermark"
COVER_SIZE = (960, 640)
DETAIL_SIZE = (1200, 800)
SAMPLE_SIZE = (960, 640)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    scale = max(tw / img.width, th / img.height)
    resized = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def add_diagonal_watermark(base: Image.Image, *, opacity: float = 0.42) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = load_font(max(18, base.width // 38))
    bbox = draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    step_x, step_y = tw + 110, th + 110
    diag = int(math.hypot(base.width, base.height))
    rgba = (255, 255, 255, int(255 * opacity))
    for y in range(-diag, diag, step_y):
        for x in range(-diag, diag, step_x):
            draw.text((x, y), WATERMARK_TEXT, font=font, fill=rgba)
    rotated = layer.rotate(-32, resample=Image.Resampling.BICUBIC, expand=True)
    ox = (rotated.width - base.width) // 2
    oy = (rotated.height - base.height) // 2
    rotated = rotated.crop((ox, oy, ox + base.width, oy + base.height))
    out = base.convert("RGBA")
    out.alpha_composite(rotated)
    return out


def blend_progress(clean: Image.Image, marked: Image.Image, t: float) -> Image.Image:
    t = max(0.0, min(1.0, t))
    clean_rgba, marked_rgba = clean.convert("RGBA"), marked.convert("RGBA")
    w, h = clean_rgba.size
    split = int(w * t)
    frame = marked_rgba.copy()
    if split > 0:
        frame.paste(clean_rgba.crop((0, 0, split, h)), (0, 0))
    if 0 < split < w:
        guide = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(guide)
        gd.line([(split, 0), (split, h)], fill=(255, 255, 255, 220), width=3)
        gd.ellipse([(split - 10, h // 2 - 10), (split + 10, h // 2 + 10)], fill=(255, 255, 255, 255))
        frame.alpha_composite(guide)
    return frame.convert("RGB")


def ease_in_out(t: float) -> float:
    return t * t * (3 - 2 * t)


def save_gif(frames: list[Image.Image], path: Path, *, duration_ms: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (frames[0].width, frames[0].height * 2))
    sheet.paste(frames[0], (0, 0))
    sheet.paste(frames[len(frames) // 2], (0, frames[0].height))
    pal = sheet.quantize(colors=80, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.FLOYDSTEINBERG) for f in frames]
    q[0].save(path, save_all=True, append_images=q[1:], duration=duration_ms, loop=0, optimize=True, disposal=2)


def build_cover_frames(clean: Image.Image, marked: Image.Image) -> list[Image.Image]:
    clean, marked = fit_cover(clean, COVER_SIZE), fit_cover(marked, COVER_SIZE)
    frames: list[Image.Image] = []
    for _ in range(6):
        frames.append(blend_progress(clean, marked, 0.0))
    for i in range(18):
        frames.append(blend_progress(clean, marked, ease_in_out(i / 17)))
    for _ in range(6):
        frames.append(blend_progress(clean, marked, 1.0))
    for i in range(18):
        frames.append(blend_progress(clean, marked, 1.0 - ease_in_out(i / 17)))
    return frames


def build_detail_frames(clean: Image.Image, marked: Image.Image) -> list[Image.Image]:
    clean, marked = fit_cover(clean, DETAIL_SIZE), fit_cover(marked, DETAIL_SIZE)
    frames: list[Image.Image] = []
    for _ in range(10):
        frames.append(blend_progress(clean, marked, 0.0))
    for i in range(24):
        frames.append(blend_progress(clean, marked, ease_in_out(i / 23)))
    for _ in range(8):
        frames.append(blend_progress(clean, marked, 1.0))
    for i in range(14):
        frames.append(blend_progress(clean, marked, 1.0 - (i / 13) ** 1.4))
    return frames


def save_split_poster(clean: Image.Image, marked: Image.Image, path: Path) -> None:
    clean, marked = fit_cover(clean, COVER_SIZE), fit_cover(marked, COVER_SIZE)
    w, h = clean.size
    out = Image.new("RGB", (w, h))
    out.paste(marked.crop((0, 0, w // 2, h)), (0, 0))
    out.paste(clean.crop((w // 2, 0, w, h)), (w // 2, 0))
    ImageDraw.Draw(out).line([(w // 2, 0), (w // 2, h)], fill=(255, 255, 255), width=4)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, quality=92, optimize=True)


def export_video(gif_path: Path, mp4_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(gif_path),
            "-movflags", "faststart", "-pix_fmt", "yuv420p",
            "-vf", "fps=14,scale=960:-1",
            "-c:v", "libx264", "-crf", "28", str(mp4_path),
        ],
        check=True,
        capture_output=True,
    )


def export_webp(gif_path: Path, webp_path: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(gif_path), "-loop", "0", "-quality", "82", str(webp_path)],
        check=True,
        capture_output=True,
    )


def main() -> None:
    cover_src = Image.open(SRC / "base-cover-product.png").convert("RGB")
    cover_marked = add_diagonal_watermark(cover_src)

    cover_frames = build_cover_frames(cover_src, cover_marked)
    cover_gif = OUT / "cover" / "watermark-removal-cover.gif"
    save_gif(cover_frames, cover_gif, duration_ms=55)
    save_split_poster(cover_src, cover_marked, OUT / "cover" / "watermark-removal-cover.png")
    cover_frames[0].save(OUT / "cover" / "watermark-removal-cover-poster.webp", quality=88)
    export_video(cover_gif, OUT / "cover" / "watermark-removal-cover.mp4")

    detail_frames = build_detail_frames(cover_src, cover_marked)
    detail_gif = OUT / "detail" / "watermark-removal-demo-loop.gif"
    save_gif(detail_frames, detail_gif, duration_ms=45)
    export_video(detail_gif, OUT / "detail" / "watermark-removal-demo-loop.mp4")
    export_webp(detail_gif, OUT / "detail" / "watermark-removal-demo-loop.webp")

    for name, filename in [
        ("person", "base-sample-person.png"),
        ("landscape", "base-sample-landscape.png"),
        ("food", "base-sample-food.png"),
        ("architecture", "base-sample-architecture.png"),
    ]:
        clean = fit_cover(Image.open(SRC / filename).convert("RGB"), SAMPLE_SIZE)
        marked = add_diagonal_watermark(clean).convert("RGB")
        d = OUT / "samples"
        d.mkdir(parents=True, exist_ok=True)
        clean.save(d / f"sample-{name}.jpg", quality=90, optimize=True)
        marked.save(d / f"sample-{name}-watermarked.jpg", quality=90, optimize=True)

    print(f"Done -> {OUT}")


if __name__ == "__main__":
    main()
