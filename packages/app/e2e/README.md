# Locusify E2E

用 [`anthropics/skills@webapp-testing`](../../../.agents/skills/webapp-testing/) 的 Playwright 驱动真实浏览器，
跑「上传 GPS 照片 → 解析 EXIF → 地图出点」主流程，并输出截图。

## 跑

```bash
pnpm e2e                 # 默认端口 1050
E2E_PORT=1051 pnpm e2e    # 换端口
python3 e2e/locusify-flow.e2e.py --headed --base http://localhost:1050   # 已有 dev server 时
```

脚本通过 `with_server.py` 自动起停 dev server，退出码非 0 表示有断言失败。截图默认落在 `e2e/shots/`（已 gitignore）。

## 套件

| 套件 | 内容 |
|---|---|
| `[0]-[5]` | 主流程：预置登录态 → 上传 GPS 照片 → EXIF → 地图出点 |
| `[6]` | 语言路由回归：`/en/`、`/zh-CN/` 必须由 URL 决定（每个用例独立 context 保证 localStorage 隔离）|
| `[7]` | 旧存储格式迁移：升级前的扁平 key 必须被搬进 persist 信封（搬不动 = 所有已登录用户被登出）|

三个套件跑在同一个 `with_server.py` 下，任一断言失败退出码非 0。
`[7]` 是过渡性 shim，等迁移代码下线后可一并删除。

## 为什么不能照抄 skill 的示例

这个项目有几个会让「标准 Playwright 脚本」直接翻车的地方，**改代码前先读这段**：

### 1. 绝对不能用 `wait_for_load_state('networkidle')`

skill 的 SKILL.md 核心指令就是 `networkidle`，但在 Locusify 上**必然超时**：

- MapLibre 持续请求 `tiles.basemaps.cartocdn.com`
- `/_vercel/speed-insights/script.js` 404 后不断重试

改用显式等待（等具体元素 / `data-testid`）。

另外 `wait_for_selector('canvas')` 默认等 `visible`，会被 Splash 挡住超时，要 `state='attached'`。

### 2. dev 模式下 `#react-scan-root` 会拦截所有点击

react-scan 的覆盖层让每次 `Locator.click()` 报
`<div id="react-scan-root"></div> intercepts pointer events`。脚本里已注入
`#react-scan-root{pointer-events:none!important}` 规避。

> 想彻底躲开 dev-only 噪音（react-scan 覆盖层、`Encountered a script tag while rendering React component`、
> 多出来的 canvas），应该跑 `vite preview` 的生产构建。

### 3. 登录门禁：只塞 localStorage 不够

- 上传入口被 `{!captureUiActive && !!user && ...}` 包着，匿名不可见
- `initializeAuth()` 启动时校验 token，**没有 token 就 `clearUser()`**，会把注入的用户清掉

所以必须：

1. 写入登录态（见下文「状态预置」）
2. `page.route` 拦截 API，否则 `/auth/me` 401 → `clearUser()`

### 4. 状态预置一律走 zustand persist 中间件，不要手写 localStorage

测试**不准**自己拼 localStorage 的 key 和 JSON 结构（也不准写 `{state, version}` 信封）。
那等于把 persist 的序列化格式复制到测试里，store 一旦改 `name` / `version` /
`partialize` / `migrate`，测试会**静默**失效。

所有持久化状态都收敛到 store，写入经 `setState`，由中间件落盘：

| store | key | 内容 |
|---|---|---|
| `tokenStore` | `locusify-tokens` | access / refresh token |
| `authStore` | `locusify-auth` | 用户 |
| `settingsStore` | `locusify-settings` | 主题 / 语言 / 头像源 |
| `uiStore` | `locusify-ui` | 公告已读版本 / 引导已看 / 反馈节流 |

测试入口是 `window.__locusify`（仅 dev，见 `src/lib/dev/testBridge.ts`）：

```python
def seed_via_stores(page, base):
    page.goto(f'{base}/zh-CN/')                      # 先要应用跑起来才有 store
    page.wait_for_function('() => !!window.__locusify')
    page.evaluate('() => { window.__locusify.dismissOverlays(); window.__locusify.signIn() }')
    page.reload()                                     # persist 已落盘，initializeAuth() 走真实 /auth/me
```

`signIn()` 同时写 token 和 user：`MapSection` 的 `useState(() => !user)` 在首屏取不到
user 就弹登录抽屉，而后即使 user 到位也没有任何逻辑会关掉它。

### 5. `page.route` 的 glob 不要用 `**/api/**`

`src/lib/api/auth.ts`、`client.ts` 的 URL 里也含 `/api/`，会被误判成接口返回 JSON，
触发 `Failed to fetch dynamically imported module`。**用 `/api/v1/` 精确匹配**。

### 6. 语言以 URL 为准，别用 `i18nextLng` 控制 locale

`/en/` 和 `/zh-CN/` 是真实路由，由 `routers/index.tsx` 的 loader 调 `i18n.changeLanguage()`。

**曾经** `settingsStore.onRehydrateStorage` 会无条件 `changeLanguage`，把路由 loader 顶掉，
导致两条语言路由形同虚设（全新访客访问 `/zh-CN/` 得到英文，带 zh-CN 偏好的老用户访问 `/en/` 得到中文）。
已修复：URL 带语言前缀时跳过持久化偏好的覆盖。

> 所以种 `localStorage['i18nextLng']` **没用**（会被 settingsStore 覆盖）。要测中文直接访问 `/zh-CN/`。

响应信封统一是 `{ success, data }`；需要 mock 的端点：`/api/v1/auth/me`、`/profile`、`/subscriptions`。

## 选择器

优先用 `data-testid`（已加在关键路径上）：

| testid | 位置 |
|---|---|
| `map-menu-upload` / `map-menu-toggle` | `pages/map/components/MapMenuButton.tsx` |
| `map-control-zoom-in` / `-zoom-out` / `-compass` / `-locate` | `pages/map/components/MapControls.tsx` |
| `photo-file-input` | `components/upload/PhotoSelector.tsx` |
| `route-create` / `route-cancel` | `components/upload/GPSInfoPanel.tsx` |

**别用按钮文案匹配**：抽屉里的按钮文案含不换行空格（U+00A0），`has_text='Create Route'`
匹配不上；而且 `title` 是 i18n 的，会随 locale 变。

## 测试图

`fixtures/` 下 4 张带 GPS + 拍摄时间的 JPEG（北京路线，用于生成轨迹）：

| 文件 | 坐标 | DateTimeOriginal |
|---|---|---|
| `01-tiananmen.jpg` | 39.9042, 116.4074 | 2025:05:01 09:00:00 |
| `02-gulou.jpg` | 39.9330, 116.3900 | 2025:05:01 10:15:00 |
| `03-olympic.jpg` | 40.0031, 116.3594 | 2025:05:01 11:30:00 |
| `04-mutianyu.jpg` | 40.4319, 116.5704 | 2025:05:01 13:45:00 |

重新生成（用仓库里已有的 exiftool-vendored）：

```bash
node_modules/.bin/exiftool -overwrite_original \
  -GPSLatitude=39.9042 -GPSLatitudeRef=N -GPSLongitude=116.4074 -GPSLongitudeRef=E \
  -DateTimeOriginal='2025:05:01 09:00:00' \
  e2e/fixtures/01-tiananmen.jpg
```

## 还没覆盖

- 轨迹回放 / 视频导出
- **定位降级路径**（`Geolocation error`，`MapLibre.tsx:120`、`MapControls.tsx:54`，当前零覆盖）
- 登录抽屉本身
- SEO meta / hreflang（`SeoManager.tsx`；语言路由本身已由 `[6]` 覆盖）
