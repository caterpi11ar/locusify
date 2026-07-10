# v2.0.0

> 2026-03-06

## Features

### Pro 订阅与定价
- 基于 Stripe 的订阅系统，支持月付和年付 Pro 套餐
- 全新定价抽屉，支持计费周期切换和套餐对比
- 集成 Stripe Customer Portal，便于管理现有订阅
- 兑换码系统，可赠送 Pro 权限，支持配置有效期和使用次数
- 管理员 Edge Function，可批量生成兑换码

### AI 智能功能（Pro）
- AI 模板推荐 — 分析旅程数据，自动推荐最佳回放模板
- AI 字幕生成 — 为每个路径点生成简短而富有表现力的描述
- AI 功能用量追踪，支持按用户限流

### 回放模板与自定义
- 模板系统，内置五种风格：极简、Vlog、电影感、旅行日记、夜间模式
- 模板选择器 UI，配置阶段支持实时预览
- 完整自定义选项：滤镜、转场、音乐、片头样式、文字叠加
- CSS 滤镜引擎，支持强度调节（复古、暖色调、冷色调、黑白、胶片、电影感）
- 转场引擎，支持淡入淡出、滑动、缩放、翻转效果
- 统计卡片叠加层，展示旅程距离、时长和照片数量
- 文字叠加层，支持为每个路径点自定义字幕

### Supabase 后端
- 完整数据库架构：用户资料、订阅、订阅提供商、兑换码、兑换记录、用量追踪
- 所有表均配置行级安全策略
- Stripe Webhook 处理器，覆盖订阅全生命周期事件
- 七个 Edge Function：结账、门户、Webhook、兑换码、AI 字幕、AI 推荐、管理员代码生成

## Bug Fixes

- 修复 `usage_tracking` 因缺少 RLS INSERT 策略导致插入静默失败的问题
- 修复 `ReplayIntroOverlay` 在 `introStyle` 为 `'none'` 时渲染阶段产生副作用的问题
- 修复 `AudioManager.pause()` / `fadeOutAndStop()` 竞态条件，新的 `play()` 调用可能被过期的定时器终止
- 修复兑换码因非原子递增导致可重复兑换的问题 — 现使用 Postgres RPC 实现行级锁定
- 修复 `VITE_DEBUG_PRO` 缺少生产环境保护 — 现仅在 `import.meta.env.DEV` 下生效
- 修复 Stripe Webhook HMAC 验证使用易受时序攻击的 `===` — 已替换为 `crypto.subtle.timingSafeEqual()`
- 修复 `confirmConfig()` 中 `loadTrack()` 未等待完成导致音频静默失败的问题
- 为 `subscriptions.user_id` 添加 `UNIQUE` 约束，防止重复行
- 将所有 Edge Function 的 CORS 从通配符 `*` 限制为允许的域名列表
- 修复 `subscription.ts` 绕过已验证 `env` 对象直接读取 `import.meta.env` 的问题
- 为 `fetchProfileAndSubscription` 的异步调用添加 `.catch()` 防止未处理的 Promise 拒绝
- 修复 CSS 滤镜强度因正则不完整导致忽略 `hue-rotate(Xdeg)` 值的问题
- 在结账函数中添加 Stripe `priceId` 与配置价格 ID 的验证
- 当 Stripe 价格 ID 未配置时，向用户显示错误提示
- 修复 Stripe Portal URL 被无限期缓存的问题 — 现每次获取新会话
- 在两个 AI Edge Function 中添加 OpenAI 响应验证
- 修复 `AudioManager.dispose()` 未清除单例实例的问题
- 修复 `useVideoRecorder` 中自动停止定时器在清理时未被取消的问题
- 修复兑换码输入框按 Enter 键绕过加载状态检查的问题
- 将脆弱的 `plan.startsWith('pro')` 替换为显式套餐列表匹配
- 在管理员代码生成中添加 `duration_days`、`max_uses` 和 `plan` 的输入验证
