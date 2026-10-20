# export-bench — 视频导出方案试验台

对比三条 Chrome-only 的导出路线，并把「离线合成帧」与真实 UI 逐帧对照。评测结论见
`reports/export-bench/report.md`，效果图见 `reports/export-bench/fig-*.png`。

```bash
node run.mjs            # 完整：10 s 时间线 / 300 帧（约 3 分钟）
node run.mjs --quick    # 快速：3 s 时间线 / 90 帧
python figures.py       # 从 artifacts 生成数值与效果图到 reports/export-bench
```

`run.mjs` 会自己起 Vite（:1060）、用 Playwright 的 `channel: 'chrome'` 打开 1920×1080 页面、
跑完四条路线并把 PNG/MP4/WebM 写进 `artifacts/`（已 gitignore）。

三条路线：

| 文件 | 路线 |
|---|---|
| `src/encoders.ts` → `encodeWebCodecs` | WebCodecs `VideoEncoder`（`avc1.640028`）+ mediabunny 封装 MP4 |
| `src/encoders.ts` → `encodeMediaRecorder` | `canvas.captureStream()` + MediaRecorder（VP9/WebM） |
| `src/encoders.ts` → `encodeFfmpegWasm` | ffmpeg.wasm 单线程 `@ffmpeg/core` + libx264 |

`src/scene.ts` 复刻回放 UI（CARTO 底图 + 玻璃统计卡 + 照片卡 + 图钉 + 底部统计栏），
`src/composite.ts` 负责 DOM 快照与逐帧合成，`src/main.ts` 把能力探测和入口暴露成 `window.__bench`。

首次运行前，`@ffmpeg/core` 的 `ffmpeg-core.js/.wasm` 需要复制到 `public/ffmpeg-core/`
（`run.mjs` 会自动做，目录已 gitignore，约 31 MB）。

---

## 真实 app 基准（`real/`）

`real/` 下这一套跑的是**仓库里的真实 app**，不是上面的复刻场景：真实 dev server、真实上传
抽屉、真实 EXIF、真实 `replayStore` 回放，抓取 app 自己录屏用的 16:9 `cropRef` 容器。

```bash
# 先起真实 app（另开一个终端）
cd packages/app && npx vite --port 1070 --strictPort

# 真实 app 的导出基准：5 个冻结状态 + 90 帧 WebCodecs 成片（约 3 分钟）
cd tools/export-bench/real && node run-real.mjs

# 只重算指标和四张图（不需要浏览器）
python tools/export-bench/real/figures-real.py
```

| 文件 | 作用 |
|---|---|
| `real/flow.mjs` | 启动 app、`__locusify` 登录、真实上传 4 张 fixtures、`route-create`、`prepareReplay`、时钟冻结 |
| `real/composer.ts` | 页面内合成器：整帧光栅 / 分层合成 / 玻璃手工 blur / 文字补丁 / WebCodecs 编码，打包成 IIFE 注入 |
| `real/bundle.mjs` | 用 esbuild 把 `composer.ts` 打成单文件 IIFE |
| `real/run-real.mjs` | 主基准脚本，产物写 `shots/real/` |
| `real/figures-real.py` | 从 PNG 反推 PSNR/SSIM/差异聚类并生成四张图 |
| `src/webcodecs.ts`、`src/decode.ts` | 编码/解码工具，复刻场景基准与真实 app 基准共用 |

注意事项（都是实际踩到的）：

- `node run-real.mjs` 需要 app 已经在 `:1070` 跑着；端口可用 `BENCH_BASE` 覆盖。
- 侧栏有重复的 `aria-label` 按钮（浮动菜单 + 桌面侧栏），必须用 `:visible` 过滤。
- 16:9 抓取框只有 `recordingActive` 打开后才存在，因此在它出现之前取不到 `cropRef` 尺寸。
- 抓取框自身带 `bg-black`（16:9 信箱底），做「地图 + 静态层」分层合成时必须把克隆根节点
  的背景强制透明，否则会把地图盖黑（这一条踩了很久）。
- `html-to-image` 的 `filter` 只能排除节点，不能保留背景；玻璃 blur 必须自己在画布上做。

报告出图/截图：

```bash
cd tools/export-bench/real && node shoot-report.mjs
```

用 Playwright（`channel: 'chrome'`，1240×1000、2x）把 `reports/export-bench/report.html`
按 `h2` 切片截成 `shots/report/report-real-*.png`，同时产出一份把图片 base64 内联的
单文件 HTML（原版引用相对路径，单独发出去会缺图）。
