# v1.2.0

> 2026-03-03

## Refactor

### OAuth 登录迁移至 Supabase Auth
- 将 Google 和 GitHub OAuth 从自定义前端实现迁移至 Supabase Auth
- Google 登录不再加载 Identity Services SDK 或在客户端解析 JWT
- GitHub 登录不再需要 Cloudflare Worker 代理来交换 token
- 会话管理（持久化、刷新）现由 Supabase SDK 自动处理
- 环境变量从 3 个 OAuth 专用密钥简化为 2 个 Supabase 密钥
- 认证状态现通过 `onAuthStateChange` 监听器驱动，不再手动更新 store
