# 浏览器内 1080p60 MP4 导出方案调研

调研日期：2026-11-12。功能选型截止：2026-08-12；仅 Chrome；页面生命周期内完成；不调用屏幕共享、不依赖 Node 渲染服务。本文是设计与验证计划，未实施迁移、未实测导出速度。

后续进展：已完成第一轮统一画布与 Worker 编码迭代，实际实现、测试结果及限制见[迭代验证报告](../verification/browser-canvas-export/report.md)。下文保留调研时的设计依据。

## 建议

采用**预览和导出共用的 Canvas/WebGL 场景、统一 60 Hz 时间轴、Dedicated Worker 内 WebCodecs 编码与 MP4 封装**。保留 MapLibre 地图能力，把当前视频画面里的 React/Motion/CSS 动画迁到这个公共场景；预览真正显示该场景的 canvas，导出从同一 canvas 的同一帧创建 VideoFrame。不保留一套 DOM 视频预览，再另外画一套近似导出画面。

GPU 图形层候选为固定版本 PixiJS **8.13.0 WebGL**。官方发布日期为 2025-09-05，早于限制日期；标签源码已包含 canvas 纹理、模糊滤镜、外部 WebGL context。无需引入 WebGPU 或较新的 HTML-in-Canvas。现有 MapLibre/Mediabunny 依赖可先保留，但实施前必须核对实际锁定版本、发布日期和用到的 API；本文不把当前最新文档当作这些依赖均满足日期限制的证据。[Pixi 发布记录](https://pixijs.com/blog/8.13.0)、[8.13 CanvasSource](https://raw.githubusercontent.com/pixijs/pixijs/v8.13.0/src/rendering/renderers/shared/texture/sources/CanvasSource.ts)、[8.13 BlurFilter](https://raw.githubusercontent.com/pixijs/pixijs/v8.13.0/src/filters/defaults/blur/BlurFilter.ts)、[8.13 外部 context](https://raw.githubusercontent.com/pixijs/pixijs/v8.13.0/src/rendering/renderers/gl/context/GlContextSystem.ts)。

这里需要一次公共渲染层迁移，无法仅把现有编码器换成 WASM，就消除逐帧 DOM 序列化成本。对当前视觉效果的保真需要逐项验收；“使用相同渲染器”保证迁移后的预览/导出一致，不自动保证 Pixi 的字体、滤镜与原浏览器 CSS 像素一致。

## 当前代码的成本与一致性问题

以下是本地源码观察，不是性能采样结论：

- [`dom-snapshot.ts`](../../packages/app/src/lib/replay/dom-snapshot.ts) 每帧遍历 DOM、读取 computed style、调用 html-to-image `toSvg`、解析与重写 XML、创建 data URL、解码图片，再创建 canvas 绘制。缓存字体 CSS 并没有去掉上述逐帧工作。
- [`export.tsx`](../../packages/app/src/export.tsx) 挂载独立 ExportScene，在每帧等待动画、图片、视频 seek、地图瓦片，随后截图并编码。这些等待和渲染都有可能占主要耗时，需要分别测量。
- [`background-encoder.ts`](../../packages/app/src/lib/replay/background-encoder.ts) 已使用 Mediabunny/AVC；`BackgroundEncoder` 是类名，文件本身没有创建 Dedicated Worker。它把 canvas 再转 ImageBitmap 后提交样本；仅换编码库不能修复上游截图成本。
- [`frame-clock.ts`](../../packages/app/src/lib/replay/frame-clock.ts) 接管 iframe 的 rAF、performance.now 和 DOM animation，仍要协调多套动画时钟。
- [`TrajectoryController.tsx`](../../packages/app/src/pages/map/components/TrajectoryController.tsx) 在 Zustand 订阅回调中递推 camera damping。更新次数会改变相机轨迹；共享状态不等于共享动画。预览和导出必须执行相同固定步长、相同初始状态的更新，或统一采用按时间求值的解析函数。
- [`MapLibre.tsx`](../../packages/app/src/pages/map/MapLibre.tsx) 当前开启 preserveDrawingBuffer。去掉它可能改善性能，但应先验证同步捕获时机，不能直接删除后假设不会出现空白帧。

## 地图与合成器的两种连接方式

独立合成 canvas 作为较容易落地的基线；共享 GL 作为值得同步验证的性能优化，不能把尚未证实的集成当作实施前提。

### A. 共享 WebGL context 的性能优化原型

保留主线程上的 MapLibre Map，在顶层 custom layer 绘制屏幕空间的照片、字幕、头像和统计条；Pixi 使用该 GL context，最终直接显示并捕获 MapLibre canvas。这样避免每帧把整张地图复制到另一个 WebGL context 的纹理。

MapLibre custom layer 允许在地图 GL context 内绘制。Pixi 有外部 context 接口及与 Three.js 共享 context 的官方示例；这些支持“值得验证”，**不是现成 MapLibre + Pixi 兼容性保证**。必须验证两边 GL 状态缓存、framebuffer、viewport、blend/depth/stencil、清屏、context loss、样式重载，以及 globe/terrain 下 custom layer 的位置与调用方式。屏幕 UI 不能意外参与地图深度遮挡。尤其 backdrop blur 需要先取得地图背景到纹理/FBO，不能对正在写入的 framebuffer 直接反馈采样；共享 context 也不意味着没有中间渲染或复制。[MapLibre CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/)、[Pixi 官方共享 context 示例](https://pixijs.com/8.x/guides/third-party/mixing-three-and-pixi)。

### B. 独立合成 canvas 是集成风险较低的基线

MapLibre 在自己的 DOM canvas 渲染，合成器把这张 canvas 更新为地图底纹理，再叠加其余场景。**用户看到的是最终合成 canvas**，不是旁边一份 DOM 预览。地图仍只运行一份；交互坐标需要映射到地图实例，编辑控件可以保留普通 DOM。

Pixi CanvasSource 可以使用 canvas，但其构造/resize 行为可能改写来源 canvas 尺寸。集成时要固定与 MapLibre drawing buffer 一致的尺寸和 resolution，并明确由 MapLibre 管理尺寸，不要让纹理包装器重置地图 canvas。[8.13 源码](https://raw.githubusercontent.com/pixijs/pixijs/v8.13.0/src/rendering/renderers/shared/texture/sources/CanvasSource.ts)。

这条路径每帧涉及跨 context 纹理更新；可能有复制、同步等待或格式转换，不能承诺 zero-copy。它与 A 必须通过同一性能门槛。Canvas2D 也能用作合成基线，减少库引入；复杂全屏 blur、遮罩、颜色滤镜的 1080p60 表现仍需测量，不能仅因 API 简单就推断更快。

### MapLibre 不直接迁到 Worker

OffscreenCanvas 能让兼容的渲染代码离开主线程，但不自动让依赖 HTMLElement/document 的库可在 Worker 运行。MapLibre 的 Map 创建 DOM 容器/canvas，并管理尺寸、事件和 WebGL context；内部使用 workers 不表示 Map 渲染器可直接接收 OffscreenCanvas。首阶段让 MapLibre 留在主线程，编码进 Worker；必要时再单独验证合成器 Worker 化，不能以其为既成能力。[MapLibre v5.6.0 Map 源码](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/v5.6.0/src/ui/map.ts)、[Chrome OffscreenCanvas 说明](https://web.dev/articles/offscreen-canvas)。

## 帧调度与编码契约

以下是建议实施的契约。边播放边编码时，显示和送入编码器的是同一帧，不再另外运行隐藏的 export replay。编码背压导致暂停推进时，可听音频必须跟随权威时间轴暂停/校准；不能只冻结画面却让音乐按墙钟继续播放。最终文件音频也使用相同的时间轴位置。

1. 固定输出逻辑尺寸 1920×1080（竖屏则 1080×1920），固定 drawing buffer；预览只做 CSS 等比缩放。字体、换行、布局断点、颜色空间、缩放与主题由同一个场景输入决定，不依赖设备 DPR 或 iframe 视口差异。
2. 预先解码照片/头像、加载字体与音频，并预热路线相关瓦片；相机变化后仍检查实际所需资源。不得把持续动画的 `idle` 事件当作每帧唯一同步机制。瓦片缺失时冻结模拟时间并等待，有超时与取消。无网络条件下不能承诺任意路线全部预加载成功。
3. 第 n 帧取共同时间轴 `n / 60`。实时预览可以少呈现帧，但状态推进必须经过同样固定步长；导出依次消费所有帧，不以机器快慢改变视频时间。相机、照片切换、轨迹、弹簧、滚动、数值、片头/片尾与音乐起点均归该时钟所有。
4. 设置本帧地图与场景状态，等待地图完成对应渲染；在已验证的 render 回调/同一渲染任务中完成合成与 `new VideoFrame(canvas, ...)`，避免默认 drawing buffer 被清除后才读取。不同版本的事件顺序必须用集成检查确认；仅调用 `jumpTo` 后立即读取不够。
5. 用 `timestamp = round(n * 1_000_000 / 60)` 和相邻时间戳之差定义 duration，transfer VideoFrame 到 Dedicated Worker。Worker 持有编码器与 muxer；主线程最多保留 2–3 个未确认提交，Worker 消费后确认，背压阻止继续生成帧。成功、取消和失败都关闭 frame/sample，释放资源。
6. WebCodecs 输出 AVC，Mediabunny 封装 MP4。开始前检查实际 width/height/framerate/bitrate/codec 配置，存在音乐时也检查音频编码支持。`prefer-hardware` 只是偏好，不能保证硬件编码或特定吞吐；运行时编码错误仍需处理。音频 PCM 可在主线程准备后转移，不能假设 OfflineAudioContext 可直接搬到 Worker。
7. 写完源、flush/finalize 后生成下载；录制 600 帧时不得把全部 raw frames 留在内存。一个 1920×1080 RGBA 帧约 7.91 MiB，600 帧约 4.63 GiB，实际 GPU/编码器资源还会有额外开销。MP4 成品缓存应单独计量。

WebCodecs 已随 Chrome 94 发布。Chrome 官方文档说明可从 canvas 构造 VideoFrame、在 Worker 编码并 transfer VideoFrame；它还强调关闭帧及处理编码队列。这些能力不等于保证 canvas→frame→encoder 全链路无复制。[Chrome 94](https://developer.chrome.com/blog/new-in-chrome-94/)、[Chrome WebCodecs 指南](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)。Mediabunny 的 source.add Promise 传播背压；应按锁定版本实现并 await，而不是无限提交。[Mediabunny media sources](https://mediabunny.dev/guide/media-sources)。

## 迁移映射：只保留一个视频画面实现

| 现有部分 | 公共场景职责 |
| --- | --- |
| PhotoPanel / PolaroidLineCarousel | 照片纹理、纸张、文字、夹子/绳索、裁切、位置、摆动和入退场；布局与动画共享 |
| PhotoPanelBackground / 统计条 backdrop blur | 对实际下层画面采样再模糊，不能用静态黑色透明块代替 |
| WaypointDot | 用真实 map.project 结果定位头像/交通图标/脉冲；处理 globe 遮挡与离屏情况 |
| TrajectoryStatsBar / AnimatedNumber | 标志、二维码、计数、弹簧、字幕和来源署名统一绘制；静态文字缓存纹理 |
| EarthZoom / TrajectoryController / 路线 | 同一地图实例、同一相机时间轴，地图符号渐变与瓦片就绪也纳入确定性验收 |
| 片头、片尾及视频素材 | 统一场景状态；视频帧按共同时间获取，不能各自实时播放 |
| React DOM | 模板编辑、按钮、进度和无障碍操作；不承担另一份视频画面动画 |
| export.tsx / FrameClock / dom-snapshot | 替换为共同场景的录制生命周期与帧提交；播放时直接编码当前显示的帧，不再另开隐藏场景重演，迁移完成后退出逐帧 DOM 截图链路 |

DOM 静态内容可在准备期栅格化为纹理，内容变化时重建，用同一 GPU 场景完成移动/缩放/透明度。这是渐进迁移策略；它不能自动保留 backdrop-filter、动态换行、CSS layout animation 或不断变化的 DOM 子树。若预览继续让 DOM 独立动画、导出用缓存图片近似，会违反一致性要求。

## 其他方案的边界

| 路径 | 判断 |
| --- | --- |
| canvas.captureStream + MediaRecorder | 不需要屏幕共享，但只捕获 canvas/media 的内容，不包含覆盖其上的任意 DOM。请求 60 fps 不保证负载下得到 600 个均匀帧；requestFrame 也不提供 WebCodecs 那样的显式输出时间戳控制。不适合作为本任务精确逐帧导出的主路径。 |
| ffmpeg.wasm / 自定义 WASM 编码 | 能处理已经得到的像素，不能直接渲染网页 DOM/CSS/MapLibre。官方性能样例中 WASM 明显慢于 native FFmpeg，多线程也有 CPU/内存成本；这不证明所有 WASM 工作负载都慢，但不足以支持其替代浏览器原生编码的加速承诺。 |
| OffscreenCanvas + Worker | 适用于兼容的 canvas 工作，不会替代 DOM、绕过 CORS，也不会自动解决 MapLibre 主线程依赖。 |
| 优化 html-to-image 缓存 | 可做短期减负，但仍有逐帧布局读取/序列化/图片解码，不能据此保证 1080p60 导出接近实时。 |

依据：[Chrome captureStream 文档](https://developer.chrome.com/blog/capture-stream/)、[元素捕获规范](https://w3c.github.io/mediacapture-fromelement/)、[ffmpeg.wasm 官方性能样例](https://ffmpegwasm.netlify.app/docs/performance/)、[ffmpeg.wasm FAQ](https://ffmpegwasm.netlify.app/docs/faq/)。跨域媒体必须可合法读取并保持 canvas origin-clean；换 Worker/WASM 不能消除浏览器的这个约束。

## 必须先通过的验证门槛

先做代表性 10 秒/600 帧性能原型：地图相机移动、轨迹、三张照片摆动切换、动态背景模糊、头像脉冲、数字和字体；验证共享 GL 方式的完整渲染状态，再决定 A 或 B。不要先完整迁移所有模板再发现地图合成环节不满足要求。

- **速度目标（未达成、不是保证）**：用户目标机器、资源 ready 后，1920×1080、60 fps、600 帧含 encode flush 与 MP4 finalize ≤15 秒；记录冷启动总耗时、资源预热耗时和暖运行分别结果，多次运行报告中位数与最差值。
- **定位瓶颈**：分别统计地图等待、主线程帧提交、GPU 合成/复制、VideoFrame 构造、Worker 编码等待、音频和 finalize。记录主线程任务/frame p95、long tasks、交互输入延迟、内存峰值和取消响应；不能用平均导出速度掩盖页面卡顿。暖运行逐帧主线程预算以 16.7 ms 为目标，超出时定位而非推断由编码器导致。
- **一致性**：相同帧编号的预览 raw canvas 与编码输入应来源于同一帧；测试字体换行、照片裁切、旋转、滤镜、地图位置、头像、署名和二维码。H.264 是有损编码，解码结果按预先约定的视觉/像素容差验收，不宣称编码后逐像素相同。
- **时间正确性**：10 秒严格 600 帧，检查单调时间戳、帧间隔、首尾帧、切换关键帧、音画同步；分别在 60/120 Hz 显示器和人为降速下验证共同固定步长，不因 rAF 频率改变相机/弹簧。
- **资源与生命周期**：测试照片/地图资源失败、CORS、WebGL context loss、编码器不支持、取消以及连续导出；页面离开后任务结束。Chrome 后台标签页会有调度限制，Worker 不构成后台吞吐保证；前台性能和后台行为单独验收。
- **准备与首帧**：进入配置阶段就开始资源准备；loading 在场景第一帧即存在，所需地图与素材未 ready 时不能结束。首个编码帧也包含约定片头，不能靠延迟几帧补上。资源事件和编码背压驱动等待，不使用固定 30 ms 轮询推进。

满足这些门槛后才逐模板迁移。若共享 GL 集成不稳定而独立合成 canvas 又未达速度目标，需要调整渲染成本或约束，不能以文档支持相关 API 为由宣布性能已解决。
