# Locusify 对抗与边界验收 — 2026-10-19

- 被测地址: `http://localhost:1052`
- 后端: `https://api.locusify.cn`（无 mock）
- 素材: 无 GPS 图 / 非图片文件 / 30 张带 GPS 图
- 证据目录: `artifacts/20261019T054433Z`
- 结论: **PASS**（22/22 断言通过）

| 分组 | 断言 | 结果 | 证据 | 说明 |
|---|---|---|---|---|
| C2 | c2-no-gps: 明确提示「无可用的GPS数据」 | PASS | `artifacts/20261019T054433Z/c2-no-gps.png | 抽屉文案="查看您的照片 |  | 点击下方按钮生成路线，或重新选择照片 |  | No GPS | 部分照片缺少GPS数据 | 1 张照片没有GPS信息，将被跳过。 | 无可用的GPS数据 | 所有选择的照片都没有 GPS"` | 命中 photos.error.no.gps.title |
| C2 | c2b-no-gps-blocked: 「生成路线」被禁用 | PASS | `route-create count=1 disabled=True` | — |
| C2 | c2c-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| C3 | c3-non-image: 不进入路线预览态 | PASS | `artifacts/20261019T054433Z/c3-non-image.png | route-create 存在=False 抽屉文案="添加照片 | 需要包含 GPS 位置信息，用于生成路线 | 选择照片 | 支持格式：JPG、PNG、HEIC、WebP、AVIF | DEV: Use mo"` | — |
| C3 | c3b-non-image-feedback: 给出明确反馈而不是静默忽略 | PASS | `[data-sonner-toast]=['已跳过 1 个文件：仅支持图片和视频']` | toasts=['已跳过 1 个文件：仅支持图片和视频'] |
| C3 | c3b-non-image-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| C4 | c4-many: 超量不崩溃且行为可观察 | PASS | `artifacts/20261019T054433Z/c4-many.png | 缩略图=3 有上限提示=False 抽屉文案="查看您的照片 |  | 点击下方按钮生成路线，或重新选择照片 |  | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | "` | 缩略图=3 上限提示=False |
| C4 | c4b-many-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D1 | d1-double-submit: 连点 3 次后 marker 仍为 4（未重复累加） | PASS | `artifacts/20261019T054433Z/d1-double-submit.png | .maplibregl-marker=4` | 4（期望 4） |
| D1 | d1b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D2 | d2-rapid-toggle: 抽屉状态收敛（0 或 1 个，无残留） | PASS | `artifacts/20261019T054433Z/d2-rapid-toggle.png | .ant-drawer=1` | 1 |
| D2 | d2b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D3 | d3-api-down: 后端全挂时不白屏（仍有渲染内容） | PASS | `artifacts/20261019T054433Z/d3-api-down.png | body 文本长度=58 canvas=1` | 文本=58 canvas=1 |
| D3 | d3b-api-down-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D4 | d4-mock-gps: dev mock 开关能让无 GPS 图拿到坐标 | PASS | `mock 开启后 GPS 标记=1（基线：关闭时为 0，见 c2）` | 1 |
| D4 | d4-camera-follows: marker 落在视口内（相机已跟随） | PASS | `artifacts/20261019T054433Z/d4-camera-follows.png | viewport={'width': 390, 'height': 844} marker={'x': 175, 'y': 402, 'width': 40, 'height': 40}` | box={'x': 175, 'y': 402, 'width': 40, 'height': 40} |
| D4 | d4b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D5 | d5-no-text-wrap[zh-CN]: 上传预览态无文案换行 | PASS | `artifacts/20261019T054433Z/d5-no-wrap-zh-CN.png | 换行元素=0` | 无 |
| D5 | d5-no-text-wrap[en]: 上传预览态无文案换行 | PASS | `artifacts/20261019T054433Z/d5-no-wrap-en.png | 换行元素=0` | 无 |
| D6 | d6-prompt-not-covered: 提示卡与左下工具栏交集为 0 | PASS | `artifacts/20261019T054433Z/d6-prompt-overlap.png | 提示卡=[16, 675, 306, 153] 工具栏=[0, 0, 0, 0] 交集=0px²` | 交集=0px² |
| D6 | d6-controls-clear: 提示卡不遮挡右侧地图控件 | PASS | `map-control-zoom-in 水平间隙=19px; map-control-zoom-out 水平间隙=19px; map-control-compass 水平间隙=19px; map-control-locate 水平间隙=19px` | map-control-zoom-in=19px; map-control-zoom-out=19px; map-control-compass=19px; map-control-locate=19px |
| D6 | d6b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
