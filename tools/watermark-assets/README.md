# 水印素材生成（Node.js + TypeScript）

使用 **sharp** 合成水印与帧图，**ffmpeg** 导出 MP4。默认不生成体积较大的 GIF / 动图 WebP。

## 环境

- Node.js 18+
- ffmpeg（系统 PATH 可用）

## 使用

```bash
cd tools/watermark-assets
npm install
npm run generate
```

或在仓库根目录：

```bash
npm run generate:assets
```

可选：生成动图 WebP（体积较大）

```bash
GENERATE_WEBP=1 npm run generate
```

## 输出

写入 `assets/watermark-removal/`：

| 文件 | 约大小 | 用途 |
|------|--------|------|
| `cover/watermark-removal-cover.mp4` | ~50KB | 首页卡片循环演示 |
| `cover/watermark-removal-cover-static.webp` | ~17KB | 静态左右对比兜底 |
| `cover/watermark-removal-cover-poster.webp` | ~20KB | 视频 poster |
| `detail/watermark-removal-demo-loop.mp4` | ~75KB | 详情页循环（替代拖动滑块） |
| `samples/sample-*.jpg` | 27–66KB | 四张示例图 |

`sources/` 会在首次生成时自动压缩为 WebP 主图（最长边 1280px）。
