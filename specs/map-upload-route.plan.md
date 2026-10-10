# 应用概述

Locusify(`packages/app`)是一个浏览器端 GPS 照片地图工具:读取照片 EXIF 中的坐标,
生成互动路线地图、轨迹回放与 MP4 旅行视频。照片与 EXIF 全程在浏览器本地处理。

- 技术栈:React 19 + Vite(Rolldown)+ MapLibre GL + Zustand + i18next + antd/sonner
- 后端:`https://api.locusify.cn`(dev/preview 经 vite proxy 转发 `/api` → 同源,无 CORS)
- 语言路由:`/en/`、`/zh-CN/`,**URL 是语言的唯一事实来源**
- 鉴权:`window.__locusify` 测试桥(仅 dev)写入 token,再由真实 `/auth/me` 拉用户

# 分层策略

| 层 | 工具 | 是否 mock 后端 | 说明 |
|---|---|---|---|
| 单元/组件 | Vitest | 是 | 纯逻辑,已在 `packages/app/test/` |
| E2E 主流程 | Python Playwright | **是**(mock `/api/v1/`) | 只验前端行为,快速稳定 |
| 验收链路 | Python Playwright + Midscene | **否,打真实后端** | 本计划的重点 |

> E2E 那层 mock 是**刻意**的:它验的是 UI 状态机,不该受后端波动影响。
> 但按验收规则,mock 的层不能当"真实后端验收",所以单独有验收链路。

# 分组与场景

命名 kebab-case,与文件/断言一一对应。每个场景从独立 seed 状态开始。

## A. 环境与鉴权

### a1-boot-health — 服务自检
- 步骤:请求 `GET /api/v1/auth/me`(无 token)
- expect: 401(服务在跑且路由已注册;000=没起来,404=未注册)

### a2-anonymous-gate — 匿名门禁
- 步骤:清空存储后打开 `/zh-CN/`
- expect: 出现登录抽屉;不出现 `map-menu-upload`

### a3-auth-bridge — 登录态注入
- 步骤:经 `window.__locusify.signIn()` 写入 token 后 reload
- expect: `map-menu-upload` 可见;`.ant-drawer` 数量为 0

### a4-real-signin — 真实账号登录
- 步骤:`POST /auth/signin`(真凭据,经 vite proxy → 真实后端),token 经 bridge 写入后 reload
- expect: `/auth/me`、`/profile`、`/subscriptions` 均 200;无登录抽屉
- 工具:`pnpm verify:auth`(凭据从仓库外 `~/.locusify-test-account` 读)

## B. 状态矩阵(每个页面/组件四态)

### b1-map-loading — 地图 loading
- expect: canvas 已挂载但瓦片未到齐时,页面不报错

### b2-map-empty — 无照片
- expect: 无 marker;上传入口可见

### b3-map-error — 瓦片/接口失败
- 步骤:abort `tiles.basemaps.cartocdn.com`
- expect: 页面不崩溃、无未捕获异常

### b4-map-no-permission — 定位无权限
- 步骤:`permissions=[]`,点击定位按钮
- expect: 弹 toast「定位权限被拒绝…」;**不产生 console warning**;不静默失败

## C. 上传 → 路线主流程

### c1-upload-happy — 4 张带 GPS 图
- 步骤:打开上传抽屉 → 选 4 张带 GPS 的 jpg → EXIF 解析 → 生成路线
- expect: 抽屉出现 4 个 GPS 标记;「生成路线」可用;地图出 4 个 marker;抽屉自动关闭

### c2-upload-no-gps — 无 GPS 图片
- 步骤:选一张被剥掉 EXIF 的图
- expect: 明确提示缺少 GPS;「生成路线」保持 disabled

### c3-upload-non-image — 非图片文件
- 步骤:选 `.txt`
- expect: 不崩溃;不进入预览态

### c4-upload-many — 超量
- 步骤:一次选 30 张
- expect: 不卡死;给出数量上限提示(或有明确行为)

## D. 边界与对抗

### d1-double-click-route — 重复提交
- 步骤:连续快速点「生成路线」3 次
- expect: 只创建一条路线;marker 数不重复累加

### d2-rapid-menu-toggle — 快速连点菜单
- expect: 抽屉状态不残留;无未捕获异常

### d3-offline-api — 接口失败
- 步骤:abort `/api/v1/**`
- expect: 不白屏;错误可观察

## E. i18n / SEO

### e1-locale-routes — 语言路由
- expect: `/zh-CN/` 中文且 `<html lang>=zh-CN`;`/en/` 英文;持久化偏好不覆盖 URL

### e2-seo-meta — SEO meta
- expect: canonical / hreflang(en, zh-CN, x-default) / og:* / JSON-LD 齐全且与语言一致

## F. 无障碍

### f1-a11y-controls — 地图控件可达性
- expect: 每个交互控件有可访问名;无空按钮;有 `title`/`aria-label`

### f2-heading-order — 标题层级
- expect: 标题不跳级

## G. 视觉验证(截图 + 多模态)

### g1-visual-map — 地图真的画出来了
- expect: 像素方差 > 阈值(排除"canvas 挂载但空白"),且多模态断言认得街道/地名

### g2-visual-no-drawer — 无遮挡
- expect: 多模态断言「没有登录抽屉遮挡地图」

## H. console 门禁

### h1-console-clean — 生产构建零 error/warning
- expect: error=0 且 warning=0(WebGL/GPU 环境噪声单独归类并说明)

# 未覆盖项及原因

| 项 | 原因 |
|---|---|
| 写操作(signup/feedback/redeem) | `api.locusify.cn` 疑为生产环境,未获授权不做写入 |
| 越权 / 角色差异 | 后端只有单一 free 计划,无多角色模型 |
| 轨迹回放 / MP4 导出 | 依赖 headless 下能力不确定的编码器 |
| 超量上传 / 非图片 / 重复提交 | 计划中已列出(d1/d2/c3/c4),尚未实现 |

> 真实账号登录已于本轮补齐:`pnpm verify:auth` 13/13 通过。
