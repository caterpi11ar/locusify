# Locusify 验收报告 — 2026-10-19

- 被测地址: `http://localhost:4173`（生产构建 `vite preview` + 真实后端 `api.locusify.cn`，无 mock）
- 证据目录: `artifacts/20261019T054245Z`
- 服务自检: `GET /api/v1/auth/me` → HTTP 401
- 结论: **PASS**（11/11 断言通过）

## 断言明细

| 分组 | 断言 | 结果 | 证据 | 说明 |
|---|---|---|---|---|
| A | a1-boot-health: /api/v1/auth/me 返回 401 | PASS | `HTTP 401 (GET http://localhost:4173/api/v1/auth/me)` | 实际 401（000=没起来, 404=未注册） |
| E | e1-locale-routes: /zh-CN/ 中文且 html lang 正确 | PASS | `artifacts/20261019T054245Z/e1-zh-CN.png | <html lang>=zh-CN | locate.title='定位到我的位置'` | lang=zh-CN title='定位到我的位置' |
| E | e2-seo-meta: canonical / hreflang / JSON-LD 齐全 | PASS | `canonical=https://app.locusify.cn/zh-CN/ hreflang=['en=https://app.locusify.cn/en/', 'zh-CN=https://app.locusify.cn/zh-CN/', 'x-default=https://app.locusify.cn/en/'] jsonld=2239B` | hreflang=3 jsonld=2239B |
| B | b1-anonymous-gate: 匿名访问弹出登录抽屉 | PASS | `artifacts/20261019T054245Z/b1-anonymous-gate.png | .ant-drawer=1` | .ant-drawer=1 |
| B | b2-no-auth: 匿名不可见上传入口（门禁生效） | PASS | `map-menu-upload 节点数=0` | 0 |
| G | g0-tiles-fetched: MapLibre 成功拉取矢量瓦片 | PASS | `12 个 .mvt 200（例: 395.mvt）` | 12 个 |
| G | g1-visual-map: 地图中段有真实内容（非空白 canvas） | PASS | `artifacts/20261019T054245Z/g1-map-area.png | 2560x1800 mean=37.9 std=29.8 色桶=90` | std=29.8 色桶=90 |
| H | h1-console-clean: 无应用侧 error/warning | PASS | `console 总数=4 环境噪声=4 应用侧=0` | 无 |
| H | h2-no-pageerror: 无未捕获异常 | PASS | `pageerror=0` | 无 |
| B | b4-geo-denied: 拒绝定位时给出可读反馈 | PASS | `artifacts/20261019T054245Z/b4-geo-denied.png | [data-sonner-toast]="定位权限被拒绝。请在浏览器设置中开启后重试。"` | toast='定位权限被拒绝。请在浏览器设置中开启后重试。' |
| B | b4b-geo-silent: 不再向 console 输出 geolocation warning | PASS | `含 Geolocation 的 console 消息=0` | [] |

## 证据文件

```
artifacts/20261019T054245Z/b1-anonymous-gate.png
artifacts/20261019T054245Z/b4-geo-denied.png
artifacts/20261019T054245Z/console.json
artifacts/20261019T054245Z/e1-zh-CN.png
artifacts/20261019T054245Z/g1-map-area.png
artifacts/20261019T054245Z/network.json
```

## 覆盖范围与缺口

本链路验证的是：**生产构建 + 真实后端**（经 vite preview 代理，无 mock）。

| 已覆盖 | 说明 |
|---|---|
| 服务自检 | `/api/v1/auth/me` → 401（在跑且路由已注册）|
| 匿名门禁 | 登录抽屉弹出、上传入口不可见 |
| i18n / SEO | `<html lang>`、canonical、hreflang×3、JSON-LD |
| 地图渲染 | `.mvt` 网络级 + 像素方差（防「canvas 已挂载但一片空白」）|
| 定位降级 | 拒绝授权 → toast；不污染 console |
| console 门禁 | 应用侧 error/warning = 0 |

| 未覆盖 | 原因 |
|---|---|
| 登录后功能（上传→EXIF→路线）| 验收构建无 dev 测试桥；已在 `packages/app/e2e/` 用 mock 后端覆盖 |
| 真实账号登录（OTP / signin）| 无可用的测试账号与邮箱验证码通道 |
| 写操作（signup / feedback / redeem）| `api.locusify.cn` 疑为生产环境，未获授权不做写入 |
| 越权 / 角色差异 | 后端只有单一 free 计划，无多角色模型 |
| 轨迹回放 / MP4 导出 | 依赖 headless 下能力不确定的编码器 |

## 纳入 CI

```bash
pnpm verify            # 全链路；退出码 0 = 通过，2 = 环境不可用
VERIFY_PORT=4300 pnpm verify
pnpm verify --vision   # 额外跑 Midscene 多模态断言（需 .env 里的 MIDSCENE_MODEL_*）
```

- 耗时：typecheck+lint+test ≈ 40s，build ≈ 20s，验收 ≈ 90s；给 10 分钟余量。
- artifacts：`artifacts/<UTC 时间戳>/`，含截图与 console/network JSON，可直接上传为 CI artifact。
- `reports/<date>-test-report.md` 每次覆盖写入，可当流水线摘要。
- 前置：`python3` 带 `playwright` + chromium（与 `packages/app/e2e` 共用同一套运行时）。
- 已内置防误判：启动前清理端口残留（否则 `--strictPort` 静默失败会让验收打到旧服务），
  单次导航（否则会 abort MapLibre 在途请求、被记成 console error 而误判为应用缺陷）。

