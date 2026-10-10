# Locusify 对抗与边界验收 — 2026-10-10

- 被测地址: `http://localhost:1052`
- 后端: `https://api.locusify.cn`（无 mock）
- 素材: 无 GPS 图 / 非图片文件 / 30 张带 GPS 图
- 证据目录: `artifacts/20261010T100520Z`
- 结论: **PASS**（14/14 断言通过）

| 分组 | 断言 | 结果 | 证据 | 说明 |
|---|---|---|---|---|
| C2 | c2-no-gps: 明确提示「无可用的GPS数据」 | PASS | `artifacts/20261010T100520Z/c2-no-gps.png | 抽屉文案="查看您的照片 | 查看您的照片 |  | 已选择 1 张照片，其中 0 张包含 GPS 数据 |  | No GPS | 部分照片缺少GPS数据 | 1 张照片没有GPS信息，将被跳过。 | 无可用的GPS数据 | "` | 命中 photos.error.no.gps.title |
| C2 | c2b-no-gps-blocked: 「生成路线」被禁用 | PASS | `route-create count=1 disabled=True` | — |
| C2 | c2c-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| C3 | c3-non-image: 不进入路线预览态 | PASS | `artifacts/20261010T100520Z/c3-non-image.png | route-create 存在=False 抽屉文案="选择照片 | 选择您的照片 |  | 点击选择照片 |  | 选择文件 |  | 支持格式：JPG、PNG、HEIC、WebP、AVIF |  | DEV: Use mock "` | — |
| C3 | c3b-non-image-feedback: 给出明确反馈而不是静默忽略 | PASS | `[data-sonner-toast]=['已跳过 1 个文件：仅支持图片和视频']` | toasts=['已跳过 1 个文件：仅支持图片和视频'] |
| C3 | c3b-non-image-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| C4 | c4-many: 超量不崩溃且行为可观察 | PASS | `artifacts/20261010T100520Z/c4-many.png | 缩略图=3 有上限提示=False 抽屉文案="查看您的照片 | 查看您的照片 |  | 已选择 30 张照片，其中 30 张包含 GPS 数据 |  | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | GPS | "` | 缩略图=3 上限提示=False |
| C4 | c4b-many-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D1 | d1-double-submit: 连点 3 次后 marker 仍为 4（未重复累加） | PASS | `artifacts/20261010T100520Z/d1-double-submit.png | .maplibregl-marker=4` | 4（期望 4） |
| D1 | d1b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D2 | d2-rapid-toggle: 抽屉状态收敛（0 或 1 个，无残留） | PASS | `artifacts/20261010T100520Z/d2-rapid-toggle.png | .ant-drawer=1` | 1 |
| D2 | d2b-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| D3 | d3-api-down: 后端全挂时不白屏（仍有渲染内容） | PASS | `artifacts/20261010T100520Z/d3-api-down.png | body 文本长度=58 canvas=2` | 文本=58 canvas=2 |
| D3 | d3b-api-down-no-crash: 无未捕获异常 | PASS | `pageerror=0` | 无 |
