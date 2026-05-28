# 水印去除功能 · 原创演示素材

全部为 **AI 原创底图** + **程序合成演示水印**（斜向 repeating `Watermark` 字样），不含第三方版权图片或品牌 Logo。

## 资源一览

### 首页卡片封面

| 文件 | 说明 | 推荐场景 |
|------|------|----------|
| `cover/watermark-removal-cover.gif` | 循环动图：自左向右擦除水印并回环 | 支持 GIF 的首页卡片 |
| `cover/watermark-removal-cover.mp4` | 同上效果，体积更小 | **优先推荐**（`<video autoplay loop muted playsinline>`） |
| `cover/watermark-removal-cover.png` | 静态对比：左水印 / 右干净 | GIF/视频不可用时的兜底 |
| `cover/watermark-removal-cover-poster.webp` | 动图首帧 | 懒加载占位 |

### 功能详情页（替代左右拖动滑块）

| 文件 | 说明 |
|------|------|
| `detail/watermark-removal-demo-loop.gif` | 完整循环：水印 → 擦除过程 → 干净 → 回环 |
| `detail/watermark-removal-demo-loop.mp4` | **推荐**：同上，约 60KB，适合详情页主展示 |
| `detail/watermark-removal-demo-loop.webp` | 动图 WebP 备选 |

### 四张功能示例图

| 类型 | 干净版 | 带演示水印版 |
|------|--------|----------------|
| 人物 | `samples/sample-person.jpg` | `samples/sample-person-watermarked.jpg` |
| 风景 | `samples/sample-landscape.jpg` | `samples/sample-landscape-watermarked.jpg` |
| 美食静物 | `samples/sample-food.jpg` | `samples/sample-food-watermarked.jpg` |
| 建筑 | `samples/sample-architecture.jpg` | `samples/sample-architecture-watermarked.jpg` |

## 前端接入示例

**详情页：用循环视频替代 Compare Slider**

```html
<video
  class="watermark-demo"
  src="/assets/watermark-removal/detail/watermark-removal-demo-loop.mp4"
  poster="/assets/watermark-removal/cover/watermark-removal-cover-poster.webp"
  autoplay
  loop
  muted
  playsinline
/>
```

**首页卡片封面**

```html
<video
  src="/assets/watermark-removal/cover/watermark-removal-cover.mp4"
  autoplay
  loop
  muted
  playsinline
/>
```

## 重新生成

```bash
pip install Pillow
# 可选：ffmpeg（用于导出 mp4/webp）
python3 scripts/generate_watermark_assets.py
```

底图位于 `sources/`，可用环境变量 `WATERMARK_SRC` 指定其它目录。
