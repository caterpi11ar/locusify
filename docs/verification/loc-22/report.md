# LOC-22 verification and recording investigation

2026-10-27，代码基线 `e2552238deeba9943b8cf3da72541277f9a217b8`；按钮修复及全部产品源码验证绑定 `72a893584f5f4b555c67c3b4e00b4b06d17c3e5a`。后续提交仅整理本报告及证据。LOC-20 的 PR #89 为独立分支，本次未改其文件；没有合并或部署生产。

## 按钮修复

原生按钮在 Tailwind 基础样式下没有 pointer 默认值；首次使用弹窗、登录和官网按钮实测为 default。另有菜单组件显式 cursor-default。修复在 app/web 的 base layer 为按钮语义提供 pointer，排除 disabled、aria-disabled=true、data-disabled 状态；菜单可用项显式 pointer，禁用项 default。保留原有 not-allowed、wait、pointer-events-none、focus、键盘及触屏事件。共享 App Button 补 disabled:cursor-default；不可用音乐选项补原生 disabled，原有处理函数保护继续保留。

规则不选择文本框、canvas、拖拽区域或 range，不使用全局 !important。录制隐藏光标规则优先级保持原样。

`control-inventory.md` 列出两端全部 61 个包含按钮/点击/role 声明的文件。基础组件、菜单、上传、导出、回放、设置、登录、定价、反馈、错误页及官网均纳入源码扫描。下面明确区分浏览器覆盖与仅源码检查，不能将扫描计数当作全状态 E2E 通过。

| 页面/控件/状态 | 浏览器验证结果 |
| --- | --- |
| 登录：语言、验证码/密码、OAuth、法律入口 | 可用按钮 pointer；原复现命令从失败转为通过 |
| 验证码发送中（本地拦截 `/auth/otp`） | disabled=true、default；连续原生 click 只产生 1 个请求；未发送真实邮件 |
| 文本输入 | text；输入和焦点可用 |
| 首次使用：选择照片、体验示例、关闭 | pointer；截图 onboarding.png |
| 上传抽屉、复选框 | pointer；Enter 打开 file chooser；没有导入真实用户文件 |
| 侧栏：上传、照片、分享、帮助、设置 | pointer；无照片的轨迹按钮 not-allowed，原生 click 事件数 0 |
| 设置加载完成 | 31 个可见按钮状态检查；兑换空值 disabled/default；主题、语言、头像、标签、法律入口可用 pointer |
| 地图右键菜单 | 添加照片 pointer；打开、Escape 关闭成功 |
| 合成路线回放 | 15 个控件检查；时间点、交通方式、编辑、模板、自定义、重置、播放、下一步、速度 pointer |
| 自定义音乐不可用 | 注入本地 probe=false 并重新挂载面板；disabled=true、default、click 事件数 0 |
| 录制布局 | 实际 app 在 1280×720/DPR 1 下 canvas CSS 1280×720、像素 1280×720，cursor=none |
| 390×844 移动视口 | 登录、地图 Menu、上传、官网菜单触发器均 pointer；响应式截图保留 |
| 官网首页桌面/移动 | 11/10 个可见按钮 pointer；生产预览 FAQ Enter 后 `+` 变 `−`，移动菜单展开后 nav 数量 2 |
| 未逐一交互的分支 | 真实 OAuth、付款/兑换成功、反馈提交、重置密码、所有模板组合、物理触屏及所有浏览器未实测；按原有原生 disabled/组件状态和共同 CSS 路径检查，不声称全量通过 |

原始 computed style 与操作结果见 `button-audit.json`、`button-audit-more.json`、`web-audit.json`。web-audit 中最早的 FAQ 文本仍为 `+`，该开发模式记录不是通过证据；Next HMR WebSocket 失败造成反复重载，改为成功构建后的 `next start --port 1148` 验证，上表采用生产预览的实际状态变化。开发页还存在外部网络/预览 iframe 错误，不以“控制台无错误”作为本次结论。

检查通过：app `tsc -b --noEmit`、web `tsc --noEmit`、9 个修改 TSX 文件 ESLint、web production build（81 个静态页面）、`git diff --check`。

## 图标候选（未替换）

截图箭头位置为 `packages/app/src/pages/map/components/FirstJourneyPrompt.tsx:57`：64px 容器、rounded-2xl、sky→violet 渐变、sky ring 与 shadow；图形是现有 `i-mingcute-route-line`，text-3xl=30px。MingCute 为 Iconify mask/path 图形，不通过 CSS strokeWidth 调描边。颜色用 sky-400，而非该区域常用 text-text-secondary。

| 方案 | 图形及尺寸/描边 | 容器/token 来源 |
| --- | --- | --- |
| 当前 | MingCute route-line，30px | 当前 64px 渐变、ring、光晕 |
| A，待确认 | 保留 MingCute route-line，22px，库内固有路径 | 复用 PhotoSelector.tsx:257 的 48px rounded-2xl、bg-fill-secondary、text-text-secondary |
| B，待确认 | 复用 MapSidebar.tsx:75 的 Lucide Route，候选按 22px/strokeWidth 1.6 展示 | 同上传容器；22px/1.6 对齐 PhotoSelector 的 Camera，侧栏当前 Route 本身为 16px/default stroke 2 |

`icon-review.png` 为真实浏览器内候选对比截图，未修改产品图标源码。MingCute route-line 也用于 MapMenuButton、ReplayStatsCard、TemplateCustomizer；Lucide 用于侧栏和上传。项目当前是混合体系，不能把“已使用图标库”误当作用户认可其容器风格。请 Product 将 A/B（或保留当前）交用户确认；不默认采用任何候选。

## 录制链路与配置

| 项目 | 代码配置 | 运行时/文件实测 |
| --- | --- | --- |
| 画布与裁剪 | MapSection.tsx:472 的 cropRef 包裹回放区域，aspect-video；width=min(100%,100vh×16/9)，height=min(100%,100vw×9/16)；MapLibre 未配置固定 pixelRatio | app 合成路线布局 1280×720 CSS/像素、DPR 1；并非固定 1080p 导出画布 |
| 捕获 | useVideoRecorder.ts:48，getDisplayMedia 当前标签页，随后 CropTarget.fromElement + track.cropTo | 合成测试捕获轨道 width=1920、height=1080、frameRate=30；这些是轨道设置，不是实测帧率 |
| 请求尺寸/帧率 | 没有 width/height/frameRate 约束；不是 canvas.captureStream 链路 | 浏览器/屏幕缩放和裁剪区域参与协商；用户原录制设备参数未知 |
| 初始编码 | useVideoRecorder.ts:89–92，VP9→VP8→WebM 支持检测，只传 mimeType，未请求码率 | Chrome 选 VP9/WebM；MediaRecorder.videoBitsPerSecond=2,500,000，audioBitsPerSecond=128,000 |
| 分片 | recorder.start(1000) | 1000 是数据分片毫秒数，不是帧率 |
| MP4 | lib/webm-to-mp4.ts:13，AVC + QUALITY_VERY_HIGH，AAC 128,000；失败保留原 WebM | 观察 VideoEncoder.configure：avc1.640028、1920×1080、12,000,000 bps |
| QUALITY_VERY_HIGH | 锁定 mediabunny 源码 encode.ts：factor=4；AVC 公式 ceil(3,000,000×(pixels/2,073,600)^0.95×4/1000)×1000 | 是按像素数推算的请求值，不是输出文件实测码率 |

实测环境：Windows x64，Chrome 155.0.0.0（有界面），AMD Ryzen 7 9800X3D；系统枚举 NVIDIA RTX 5070 Ti、AMD Radeon、GameViewer 虚拟显示适配器，未确认实际使用哪个编码设备。viewport 1280×720，浏览器 devicePixelRatio≈1.00000003；捕获输出与 CSS 尺寸比为 1.5。OS 显示缩放设置未直接读取，不能将这一比例断言为用户系统设置。

样片为十秒左右的本地网格、文字及移动色块：canvas 逻辑/像素均为 1280×720，未加载真实照片或 GPS。临时 React harness **直接调用生产 useVideoRecorder hook**，包括真实 getDisplayMedia、CropTarget、MediaRecorder 和原有 MP4 转码函数；它测量录制链路，不代表完整地图渲染负载。没有修改生产录制参数。

| 文件 | 尺寸 | 视频包数 | 文件时间终点 | 平均视频包率 | 实测视频轨码率 | 相邻 PTS 间隔 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 原始 WebM/VP9 | 1920×1080 | 302 | 9.947 s | 30.4866/s | 1,122,358 bps | 11–288 ms，可变 |
| 导出 MP4/AVC | 1920×1080 | 302 | 9.947014 s | 30.4866/s | 1,015,172 bps | 10.990–288.003 ms，可变 |

测量通过同版本 mediabunny Input/EncodedPacketSink 解复用**实际 Blob**。平均率=包数/(最后包 PTS+duration−首包 PTS)，码率=8×视频包字节和/该区间；它不是显示器实际呈现帧率。文件含音轨及封装，总字节分别 1,394,605/1,423,211，不能把视频轨码率和整个文件大小混用。原始 JSON 见 capture-evidence.json。没有 ffprobe 交叉测量，未评估 PSNR/SSIM 或手机硬件编码器。

第一轮测试页点击底部按钮使页面滚动，输出 1920×1018；该轮已排除。修正为固定位置开始按钮后重新录制，crop rect=(0,0,1280,720)，得到表中结果。这是测试页的边界问题，不归因于产品。

视频仅保存在本机，没有作为 PR/Multica 附件上传。SHA256：WebM `33F491F49390F1B602CDDB29B05D7C168131F459875064D017B320AECC7B0A78`；MP4 `B162C23908FDCD89FF0BA9CABC95686690F31BD153DFCB78675ADD78052A14A6`。

复现材料随 issue 附件提供：将 loc22-capture.html 和 loc22-capture.tsx.txt（去掉 .txt）临时复制到 packages/app，运行 Vite 1146；使用 capture.config.json 启动有界面 Playwright CLI，打开该 HTML；执行 record.js（先读快照）。它保存原始/输出视频及测量 JSON 到本地 output/playwright。完成后删除两个临时入口。无头 Chrome 的 getDisplayMedia 报 NotSupportedError；需要有界面标签页捕获。生产 hook 将该错误归类 permission-denied，记录该限制，不将失败视为已测量。

## 清晰度解释与可选改进

证据支持：当前分辨率取决于捕获区域/浏览器；初始阶段没有指定码率；先有损 VP9 再有损 AVC；样片帧间隔可变。即便后段请求 12 Mbps，也无法恢复前段已丢失的细节。不能仅凭这些事实确定用户截图场景的唯一模糊原因。

供 Product 选择后再实施：固定导出画布/目标分辨率（更稳定，但增加 GPU/内存且需完整 DOM/地图合成）；明确捕获帧率与码率并在低性能设备降级（更大文件、更高 CPU/编码负载）；提供原始 WebM 下载以减少二次压缩（兼容性取舍）；增加本地导出诊断信息显示实际尺寸、编码和轨道设置（不上传素材）。本轮均未实施。
