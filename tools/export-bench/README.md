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
