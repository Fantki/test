# 水印去除功能 · 原创演示素材

全部为 **AI 原创底图** + **程序合成演示水印**，无第三方版权图片。

## 资源一览

### 首页卡片

| 文件 | 说明 |
|------|------|
| `cover/watermark-removal-cover.mp4` | **推荐** — 循环擦除动效（~50KB） |
| `cover/watermark-removal-cover-static.webp` | 静态：左水印 / 右干净 |
| `cover/watermark-removal-cover-poster.webp` | `<video poster>` 占位 |

### 功能详情页（替代左右拖动）

| 文件 | 说明 |
|------|------|
| `detail/watermark-removal-demo-loop.mp4` | **推荐** — 水印 → 擦除 → 干净 → 回环（~75KB） |

### 示例图

| 类型 | 干净 | 带水印 |
|------|------|--------|
| 人物 | `samples/sample-person.jpg` | `sample-person-watermarked.jpg` |
| 风景 | `samples/sample-landscape.jpg` | `sample-landscape-watermarked.jpg` |
| 美食 | `samples/sample-food.jpg` | `sample-food-watermarked.jpg` |
| 建筑 | `samples/sample-architecture.jpg` | `sample-architecture-watermarked.jpg` |

## 前端接入

```html
<!-- 详情页 -->
<video
  src="/assets/watermark-removal/detail/watermark-removal-demo-loop.mp4"
  poster="/assets/watermark-removal/cover/watermark-removal-cover-poster.webp"
  autoplay loop muted playsinline
/>

<!-- 首页卡片 -->
<video
  src="/assets/watermark-removal/cover/watermark-removal-cover.mp4"
  poster="/assets/watermark-removal/cover/watermark-removal-cover-poster.webp"
  autoplay loop muted playsinline
/>
```

## 重新生成（TypeScript）

```bash
npm run generate:assets
```

详见 [`tools/watermark-assets/README.md`](../../tools/watermark-assets/README.md)。
