# Locusify 鉴权验收报告 — 2026-10-19

- 被测地址: `http://localhost:1052`（dev server，内置测试钩子）
- 后端: `https://api.locusify.cn`，经 vite proxy；**测试期间无任何 mock**
- 证据目录: `artifacts/20261019T053148Z`
- 结论: **PASS**（13/13 断言通过）

> 为什么用 dev 而非生产构建：生产 bundle 刻意不含测试钩子，
> 无法在不手写 localStorage 的前提下注入真实会话。

## 断言明细

| 分组 | 断言 | 结果 | 证据 | 说明 |
|---|---|---|---|---|
| A | a1-signin: 真实账号登录成功（经 vite proxy → 真实后端） | PASS | `POST http://localhost:1052/api/v1/auth/signin → HTTP 200, success=True, 字段=['access_token', 'expires_in', 'refresh_token', 'user']` | user.id=d5ccfe74… expires_in=3600 |
| A | a2-session: 真实 /auth/me 返回 200 | PASS | `GET /api/v1/auth/me → [200]` | [200] |
| A | a3-profile: 真实 /profile 返回 200 | PASS | `GET /api/v1/profile → [200]` | [200] |
| A | a4-subscription: 真实 /subscriptions 返回 200 | PASS | `GET /api/v1/subscriptions → [200]` | [200] |
| A | a5-authenticated-ui: 已登录，无登录抽屉 | PASS | `artifacts/20261019T053148Z/a5-authenticated.png | .ant-drawer=0` | .ant-drawer=0 |
| G | g1-map-painted: 地图已绘制（.mvt 200） | PASS | `6 个 .mvt 200（收敛于 1800ms）` | 6 个 |
| C | c1-upload-drawer: 上传抽屉打开 | PASS | `artifacts/20261019T053148Z/c1-upload-drawer.png` | — |
| C | c2-exif-gps: 4 张图全部解析出 GPS | PASS | `artifacts/20261019T053148Z/c2-gps-detected.png | 抽屉内 GPS 标记=4` | 4/4 |
| C | c3-create-enabled: “生成路线”可用 | PASS | `button[data-testid="route-create"].disabled=False` | — |
| C | c4-route: 地图出 4 个 marker | PASS | `artifacts/20261019T053148Z/c4-route-on-map.png | .maplibregl-marker=4` | 4/4 |
| C | c5-drawer-closed: 抽屉自动关闭 | PASS | `.ant-drawer=0` | — |
| H | h1-console-clean: 无应用侧 error/warning（排除已归因的噪声） | PASS | `console 总数=22 GPU噪声=4 dev-only=2 应用侧=0` | 无 |
| H | h2-no-pageerror: 无未捕获异常 | PASS | `pageerror=0` | 无 |

> 凭据来自仓库外文件，未写入本报告也未进入 git。

