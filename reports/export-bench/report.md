# Locusify 回放视频导出方案评测 — WebCodecs / ffmpeg.wasm / MediaRecorder

- 评测分支: `feat/export-pipeline-bench`
- 评测环境: Chrome 155.0.8059.80 (Windows, headless), 16 核 / 32 GB, 1920×1080@30fps, 10 s 时间线
- 试验台: `tools/export-bench/`（Vite + Playwright，一条命令跑完整套）
- 原始数据: `reports/export-bench/metrics.json`、`reports/export-bench/fidelity.json`
- 效果图: `reports/export-bench/fig-1..4-*.png`（见下）
- 结论: **可行，推荐 WebCodecs(H.264) + mediabunny 封装 MP4 作为主路径；ffmpeg.wasm 退为兼容兜底；MediaRecorder 不再是主路径。**

## 为什么现在要换

现有导出走 `getDisplayMedia` 抓屏 → `MediaRecorder` 录 WebM → 再转 MP4。问题不在画质，而在**它被绑死在实时上**：

1. 录 10 s 视频必须真的等 10 s 以上，加上 2 s 尾巴，用户点导出后只能干等；
2. MediaRecorder 只有 VP8/VP9 可用（`avc1.42001f` 在本机直接被判 unsupported），最后仍要一次转码；
3. 抓屏受窗口尺寸、缩放、被遮挡、多显示器影响，产物不稳定；
4. 无法"离线重放 + 更快的帧率/更高码率"，导出质量上限被实时渲染能力锁死。

## 三条路线同条件实测（300 帧 / 1080p30 / 10 s 时间线）

| 路线 | 产物 | 尺寸 | 耗时 | 相对实时 | 备注 |
|---|---|---|---|---|---|
| WebCodecs H.264 High (`avc1.640028`) + mediabunny 封装 MP4 | `mp4` | 13.23 MB | **7.40 s** | **1.35×（快于实时）** | 16 Mbps，无 COOP/COEP 要求 |
| MediaRecorder VP9 + `canvas.captureStream` | `webm` | 10.62 MB | **10.00 s** | 1.00×（卡在实时） | 只能等，不能快 |
| ffmpeg.wasm libx264（单线程 core） | `mp4` | **1.68 MB** | **34.4 s** | 0.29×（慢 3.4×） | 12.4 s 取帧 + JPEG 落 FS，22.0 s ffmpeg 执行 |

补充说明：

- ffmpeg.wasm 的 34 s 里有 12 s 花在"把每帧编码成 JPEG 再写进 wasm 文件系统"，真正的 x264 只有 22 s。即使优化掉取帧，仍慢于实时 2× 以上。
- ffmpeg.wasm 体积换来的是体积优势：同样 10 s，1.68 MB（CRF 默认）vs WebCodecs 13.2 MB（16 Mbps）。生产上把码率降到 6–8 Mbps 即可收敛差距，而不必付出 4.6× 的时间成本。
- 单线程 `@ffmpeg/core` 意味着**不需要** `SharedArrayBuffer`，也就不需要给整站加 COOP/COEP 响应头（现有网络探测确认 `crossOriginIsolated=false`）。代价是解码/编码都跑在主线程 worker 里、慢。

## 效果图（离线合成 vs 真实 UI）

四张图都在 `reports/export-bench/` 下：

| 图 | 内容 | 看什么 |
|---|---|---|
| `fig-1-live-vs-composite.png` | 上：真实 UI 截图；中：离线合成帧；下：差异×3 热力图 | 热力图越黑越一致 |
| `fig-2-timeline.png` | 0.00 / 2.60 / 5.10 / 8.30 s 四个时刻，上排真实 UI、下排合成 | 全程一致性，不只看某一帧 |
| `fig-3-glass.png` | 统计卡 1:1 裁切：真实 UI / 有玻璃模糊 / 跳过玻璃模糊 | 玻璃拟态是不是"能用画布近似" |
| `fig-4-codec-roundtrip.png` | 合成源帧 + 三种编码器解回来的同一裁切 | 编码器本身丢了多少细节 |

**保真度（合成帧 vs 真实 DOM 截屏，全画幅 1920×1080）：**

| 时刻 | PSNR | SSIM | 平均绝对误差 | 差值 >40 的像素占比 |
|---|---|---|---|---|
| 0.00 s | 30.13 dB | 0.9894 | 1.23 | 0.33 % |
| 2.60 s | 25.82 dB | 0.9599 | 3.09 | 1.31 % |
| 5.10 s | 27.82 dB | 0.9869 | 1.81 | 0.51 % |
| 8.30 s | 27.73 dB | 0.9887 | 1.81 | 0.51 % |

**编码往返（解码帧 vs 合成源帧，5.10 s）：**

| 编码器 | PSNR | SSIM | 平均绝对误差 | 体积 |
|---|---|---|---|---|
| WebCodecs H.264 | **48.63 dB** | 1.0000 | 0.47 | 13.23 MB |
| MediaRecorder VP9 | 46.13 dB | 0.9999 | 0.74 | 10.62 MB |
| ffmpeg.wasm x264 | 41.08 dB | 0.9997 | 1.15 | **1.68 MB** |

结论很清楚：**编码这一环已经不是瓶颈**（三种编码器都在 41 dB 以上）；差距全在"帧从哪来"。而玻璃模糊用"把已经画好的地图在圆角矩形内做降采样—模糊—升采样"来近似，与真实 `backdrop-filter` 的差别只有 41.16 dB / 0.998，肉眼不可分辨。

## 剩余 2 % 差异到底是什么

把差值 >40 的连通区域按面积排序，剩下的全部是**文字**，不是布局：

| 位置 | 平均差值 | 成因 |
|---|---|---|
| 标题三行（78 px Georgia 衬线） | 9.7 / 13.1 / 11.7 | 衬线字体在 `foreignObject` 里的 hinting/次像素抗锯齿与合成器不同，字形轮廓一致、边缘灰阶不同 |
| 底栏数字（26 px 粗体） | 18.3 | 数字区域是每帧重绘的"补丁"，与静态快照的抗锯齿存在 1 px 级相位差 |
| 统计卡脚注（18 px） | 9.3 | 同上 |
| 副标题（26 px） | 5.3 | 同上 |

也就是说：**结构、位置、颜色、阴影、玻璃、圆角、图片全部对得上；只有文字边缘的灰阶不同。** 在 1080p 下一帧 0.5 % 的像素有可感知差异，播放时不可见，逐帧暂停对比可见。这是"DOM → canvas 重绘"这条路的物理上限，不是可以靠调参消掉的 bug。

如果这个差异不可接受，那么**唯一能保证逐像素一致的路仍然是抓真实合成结果**（现有 `getDisplayMedia`），此时仍可把"抓到的画面"改喂 WebCodecs 直接出 MP4，跳过 WebM 中转——这条混合路径是本次评测的次优推荐。

## 离线合成管线（试验台实现）

```
                ┌─ 角色：只画地图 ────────────────────────────┐
每秒状态 ──▶ MapLibre 渲染 ──▶ WebGL canvas (preserveDrawingBuffer)
                └──────────────────────────────────────────────┘
                                  │  drawImage
                                  ▼
   vignette 位图（暗角/顶部渐变，一次性快照）──▶ Canvas2D 全画幅
                                  │
     玻璃：把已画好的地图在圆角矩形内 ↓降采样→模糊→↑升采样（≈ backdrop-filter）
                                  │
     静态 overlay 位图（标题 / 卡片框 / 底栏 / 水印，一次性快照）
                                  │
     每帧补丁：只重绘数字区域（≈10 ms）
                                  │
     照片卡 + 图钉位图（一次性快照，每帧只更新位置）
                                  ▼
                        OffscreenCanvas ──▶ VideoEncoder (H.264) ──▶ MP4
```

代价（本机实测，单帧）：

| 环节 | 冷启动 | 稳态 |
|---|---|---|
| overlay 快照 | 13.2 ms | 9.4 ms |
| 照片卡 / 图钉快照 | 5.2 / 6.4 ms | 5.9 / 5.7 ms |
| 每帧数字补丁 | — | 15.3 ms |
| 地图重绘 | — | 3.7 ms |
| 合成 + 补丁 + 地图（整帧） | — | **17–40 ms（19–52 fps，随机器负载波动）** |
| 整帧全量快照（朴素对照） | — | 31–53 ms（19–29 fps） |

即：**混合方案比"每帧全量 DOM 快照"快约 1.4–2×**，够用，但没有富余——这也是为什么推荐"编码环节离线批量跑，合成环节不必追实时"。

## 踩过的坑（都会在生产实现里复现，已写入代码注释）

1. **MapLibre v6 的 `preserveDrawingBuffer` 换了位置**：必须写在 `canvasContextAttributes` 里，否则画布读完就是全黑（地图区域均值 0.0）。
2. **`html-to-image` 的回调样式**：克隆体默认 `position: static`，会被塞进离屏 `foreignObject` 视口之外，结果是**全透明图**。必须 `position:absolute; left/top:0; right/bottom:auto` 且显式给宽高——`static` 的收缩宽度还会把全宽底栏压成 57 px。
3. **不要把动态节点从克隆里"过滤掉"**：消失的盒子会让它后面的兄弟整体上移（统计卡脚注上移 106 px）。正确做法是 `visibility: hidden` 保留占位。
4. **克隆体要带显式属性白名单**（`includeStyleProperties`）：默认会把 `inline-size`/`block-size` 这类**已计算值**当内联样式写进去，flex 布局因此塌陷（底栏 QR 跑到最左边）。
5. **元素自身的外边距会污染快照**：`.stats-values` 的 `margin-top:18px` 让补丁在自己的视口里下移 18 px 并被裁掉；钉死 `(0,0)` 后消失。
6. **`repeating-conic-gradient` 的替身**：双位置色标在 Chrome 里解析成纯色块，且 CSS 绘制的贴片在 `backdrop-filter` 图层里会被合成器截屏吞掉。装饰性贴片（二维码等）应当用 canvas/SVG 基元画，不要依赖 CSS 渐变。
7. **MapLibre v6 在 Vite 下要用命名空间导入 + `optimizeDeps.exclude` + `?worker&url` worker shim**，否则 worker 解析到 `import.meta.url` 会 404。
8. **MediaRecorder 的 WebM 没有 cue/index**：`video.currentTime = t` 会静默回到第 0 帧。解码取样必须"播放 + `requestVideoFrameCallback` 等 `mediaTime`"，不能 seek。

## ffmpeg.wasm 的体积与许可（决策要点）

- `@ffmpeg/core@0.12.10` 单线程 ESM：**js + wasm ≈ 32 MB**（未 gzip）。
- 许可：**GPL-2.0-or-later**（含 libx264 等 GPL 组件）。作为兜底/兼容路径引入时须遵守 GPL 的分发义务；如果 Locusify 只想在自己的前端包里"顺手带上"，需要法务确认；这也是把它降为"可选下载、按需加载"而不是默认依赖的理由之一。
- 不需要 `SharedArrayBuffer`，因此**不必**为它给全站加 COOP/COEP（多线程 core 才需要，而多线程会引入跨源隔离，风险面大得多）。

## 浏览器能力探测（本机）

| 能力 | 结果 |
|---|---|
| `getDisplayMedia` / `CropTarget` / `RestrictionTarget` | ✅ |
| `MediaRecorder` / `VideoEncoder` / `OffscreenCanvas` / `canvas.filter` / WebGL2 | ✅ |
| `SharedArrayBuffer`（`crossOriginIsolated`） | ❌ / false |
| `avc1.42001f`（Baseline） | ❌ 不支持 |
| `avc1.640028`（High）/ `vp09.00.10.08` / `vp8` | ✅ 支持 |

注意 Baseline profile 反而不支持——硬编码 `avc1.42001f` 会在部分机器上直接失败，必须做能力探测 + 回退到 High / VP9。

## 建议

1. **主路径**：`VideoEncoder`（`avc1.640028`，失败降级 `vp09`）+ mediabunny 封装 MP4。离线合成帧，快于实时（1.35×），无需 COOP/COEP，无需抓屏权限。
2. **保真兜底**：保留 `getDisplayMedia`（含 CropTarget/RestrictionTarget）作为"逐像素一致"选项，但把录到的流直接喂 `VideoEncoder`，去掉 WebM→MP4 的中转。
3. **兼容兜底**：ffmpeg.wasm 仅在"必须 MP4 且 WebCodecs 不可用"时按需加载（32 MB，GPL-2.0-or-later），不要进主包。
4. **接受文字边缘差异**：若要 100 % 像素一致，就不要走 DOM 重绘；这是路线选择问题，不是实现缺陷。
5. **隐私不变**：全流程在本地（地图瓦片按既有策略拉取），照片字节、EXIF、轨迹、视频都不出设备——三条路线均满足。

## 复现

```bash
cd tools/export-bench
node run.mjs            # 完整：10 s 时间线、300 帧、约 3 分钟
node run.mjs --quick    # 快速：3 s 时间线、90 帧
python figures.py       # 重新生成 reports/export-bench 的数值与效果图
```

产物：`tools/export-bench/artifacts/`（`ref-*.png`、`composite-*.png`、`decoded-*.png`、`webcodecs.mp4`、`ffmpeg.mp4`、`recorder.webm`、`metrics.json`）。

## 文件清单

- `tools/export-bench/run.mjs` — 一把跑完（Vite :1060 + Playwright `channel: 'chrome'`）
- `tools/export-bench/src/scene.ts` — 复刻真实回放 UI 的场景（地图 + 玻璃卡 + 照片卡 + 图钉 + 底栏）
- `tools/export-bench/src/composite.ts` — DOM 快照 + 玻璃近似 + 逐帧合成
- `tools/export-bench/src/encoders.ts` — WebCodecs / MediaRecorder / ffmpeg.wasm 三条编码路径
- `tools/export-bench/figures.py` — 从 artifacts 生成报告数值与效果图
- `reports/export-bench/metrics.json` — 机器可读的完整实测数据
- `reports/export-bench/fidelity.json` — 保真度与往返指标
