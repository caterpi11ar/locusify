# 浏览器统一画布导出迭代验证

2026-11-12，Windows，Chrome 156（Playwright headless）。这是本机测试结果，不代表所有硬件的速度。

## 已实现

- MapLibre 地图 + PixiJS 8.13.0 合成唯一可见的 1920×1080 画布；React 保留设置、编辑、进度与退出操作。
- 显示与编码使用同一画布。照片滚动、摆动、转场、圆形头像、文字、地图背景模糊、统计和片头均由共同场景绘制。
- VideoFrame 转移到 Dedicated Worker 中的 WebCodecs/Mediabunny，输出 H.264 MP4。最多三个未确认帧，背压暂停时间轴推进，不丢帧赶进度。
- 删除隐藏导出页、iframe 重演、帧时钟全局覆盖、逐帧 DOM/SVG 栅格化和 html-to-image 依赖。
- 资源在配置阶段准备；优先读取原图，无法解码时回退到已有缩略图。视频素材顺序解码，音乐按共同时间轴编码；关闭/刷新/退出终止 Worker。

## 实测

| 场景 | 成片 | 完成耗时 | 验证 |
| --- | --- | --- | --- |
| 生产构建，三张 GPS 测试 JPEG、公共测试头像 | 10.1 秒，606 帧，1920×1080，60 FPS | 点击开始至收到 MP4 11.0435 秒 | 无编码错误，无 iframe，鼠标为 auto；录制期间未观察到 >50ms 主线程长任务 |
| 开发构建，同一路线，第二张为动态测试视频，模糊转场和测试音轨 | 11.2167 秒，673 帧，1920×1080，60 FPS | 12.3343 秒 | 视频内容随时间变化；AAC 音轨可解码且非静音，音频时长 11.2213 秒 |

生产构建抽查第 0、240、300、360、420 帧：将直接送入 Worker 的原始帧与对应 MP4 解码帧比较，RGB 平均绝对误差分别为 0.0124、0.4117、0.4180、0.3940、0.4113（0–255 量程）。这是 H.264 有损压缩后的比较，不宣称逐像素无损。

人工查看了首帧 loading、地图/照片/文字、圆形头像，以及动态视频的两个时间点。测试头像使用公共 Octocat，照片和音轨也是测试素材，未读取用户私人照片或修改真实账户。

浏览器内另测 pagehide：编码 Worker 被终止，无 iframe 遗留。在已提交 61 帧后点击退出，也成功终止 Worker、移除回放画布，鼠标保持可见，未调用屏幕共享。单元回归覆盖帧来源、60 FPS 时间戳、三帧背压、转移失败释放、取消与编码错误。

## 检查与产物

- 97 个测试通过；TypeScript、生产构建、针对修改文件的 ESLint、bundle budget 与 frozen lockfile 安装通过。
- 照片测试视频：`packages/app/output/playwright/canvas-1080p60.mp4`
- 动态视频和音轨测试视频：`packages/app/output/playwright/canvas-with-video-audio.mp4`
- 照片测试数据：`packages/app/output/playwright/canvas-verification.json`
- 动态媒体测试数据：`packages/app/output/playwright/canvas-media-verification.json`

上述产物位于 Git 忽略的 output/playwright。临时驱动脚本不进入提交，回归测试保留在 test/lib/live-encoder.test.ts。

## 实际边界

地图仍在主线程，地图纹理到合成画布存在每帧更新；并非所有渲染都在 Worker，也不承诺零复制。网络瓦片、设备编码能力、素材格式和后台标签页调度仍会影响速度。仅实测上述 Chrome 与素材；所有模板、移动设备、HEIC/Live Photo 的完整组合尚未遍历。远程头像/图片仍需允许 CORS，编码器仍需支持 H.264。

## 字体回归修正

后续对照原 DOM 样式发现：Canvas 标签写死为 system-ui，标题省略了完整 serif 回退列表和字距，坐标省略了 mono 回退列表，片头和统计值遗漏字重；长标题通过 fillText 的 maxWidth 压缩了字形。这是字体迁移遗漏，并非 Canvas 必然无法使用原字体。

现于配置阶段读取原 UI 对应 CSS 类和继承样式，等待实际字体/字重加载后再创建文字纹理。Canvas 与 Pixi 使用该样式快照，长标题改为省略号截断。没有新增逐帧 DOM 测量或截图。

Chrome 回归脚本 `packages/app/test/replay-browser/verify-typography.cjs` 对照八类原 DOM 字体样式，检查实际 caption/metadata 绘制参数、完整场景中的片头和统计文字，以及延迟字体加载时首帧必须等待；全部通过。另检查了中英文混排和长标题。运行方式：前端启动后，用 Playwright CLI 打开页面，再执行 `run-code --filename test/replay-browser/verify-typography.cjs`。截图保存在 `output/playwright/typography-scene.png` 和 `typography-intro.png`。这验证了字体配置和加载时序，不表示 DOM 与 Canvas 抗锯齿逐像素相同。

字距使用 Canvas `letterSpacing`，该 API 自 2025 年 3 月起已跨主流浏览器可用，未引入最近三个月的新特性：[MDN 兼容性说明](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing)。

## 轨迹工作区尺寸修正

原先进入配置阶段就把整个工作区限制为 16:9：1920×800 窗口中的轨迹容器仅约 1422×800，右侧空出约 498 像素。现将比例限制只用于实际录制阶段；浏览阶段根据容器大小扩展同一个场景，照片、字体与头像保持等比缩放，地图背景铺满，设置面板与相机避让同步调整。尺寸更新由 ResizeObserver 驱动，不轮询、不重建录制场景。

`test/replay-browser/verify-layout.cjs` 在隔离 Chrome 测试配置中点击真实“查看轨迹”按钮，验证 1920×800、1280×900、1440×900 和 1920×1080 四种窗口下预览铺满；开始录制后在宽屏和较高窗口之间切换，视频取景居中，编码器收到的 34 帧均为 1920×1080；退出后重新进入轨迹恢复铺满。该测试检查录制启动和取消，不另作整段成片性能测试。97 项单元测试、ESLint、类型检查、生产构建及 bundle budget 通过。

## 底部卡片、版权与绘制稳定性

底部卡片改用 CSS 行框、文字 advance width 与共用 baseline 排版；保留原字体，避免把 Pixi 字形外扩边界当成文本排版宽度。统计数字变化才更新对应小纹理。`verify-footer.cjs` 对照实际 `TrajectoryStatsBar`，检查中英文、0/0.00 和 123/1234.56 的字体、文字宽度、水平位置和数字/单位基线；卡片逻辑高度与原版同为 106px。版权徽标右边距为 16px，与卡片间距为 8px，不再用固定的文字起点定位。

用户反馈闪屏后，先监测完整编码帧及 Canvas 尺寸写入，没有在该测试素材中复现连续整帧闪黑，但确认并修复了两处绘制问题：

- 输出 WebGL 在浏览器呈现后清空绘制缓冲，之后读取画布全黑。开启 preserveDrawingBuffer 后，呈现间隔和结束后的画布读取保留完整帧。新增回归在修复前明确失败，修复后通过。
- 宽屏配置进入 1080p 录制时，地图纹理尺寸变化，静态 Sprite 的缓存几何仍可能沿用旧尺寸。实测成片底部出现黑带；调用 onViewUpdate 后，同一像素从 `[5,5,9]` 恢复地图颜色 `[44,53,60]`。正式修复将地图 Texture 标记为 dynamic，并在源尺寸改变时重新应用场景布局。回归检查地图源在 800/1080 高度之间切换后，下方像素仍正确。

最终 Chrome 实录 458 帧、7.633333 秒、1920×1080、60 FPS，无全黑帧/透明帧和捕获到的运行时错误，录制中未持续改尺寸；已查看 MP4 解码后的画面，原黑带消失。用户设备上所述严重闪屏的完整触发条件仍未确认，不将本机验证等同于所有 GPU/素材均无闪屏。

- 最终测试视频：`packages/app/output/playwright/footer-fixed.mp4`
- MP4 解码帧：`packages/app/output/playwright/footer-video-frame.png`
- 原版/Canvas 中英文卡片对照截图：`output/playwright/footer-{dom,canvas}-{en,zh-CN}.png`。

97 项测试、ESLint、类型检查和生产构建通过。回归脚本保留，临时诊断脚本清理。

## 提交前复核

审查补齐了准备阶段的不透明片头遮罩、图片解码取消和失败期限、途中瓦片缺失的可取消等待与失败处理，并恢复普通预览的音乐状态同步。移除未约定的两分钟导出硬限制。期限只用于失败处理，图片解码与地图事件决定就绪，无固定延时轮询。

最终 101 项单元测试、ESLint、类型检查、生产构建与 bundle budget 通过。Chrome 重新通过字体/保留缓冲/地图纹理尺寸回归和中英文底部卡片回归；布局脚本使用开发测试 bridge 初始化状态，验证四种窗口尺寸、1080p 编码帧，以及人工阻塞图片解码时立即点击开始仍显示不透明遮罩，释放解码后恢复编码。规范与需求两项代码复审未发现遗留阻塞。
