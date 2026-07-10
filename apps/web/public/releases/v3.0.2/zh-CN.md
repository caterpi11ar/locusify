# v3.0.2

> 2026-03-08

## Features

### 自建 API 后端
- 认证系统从 Supabase 迁移至自建 API 后端，采用 JWT + refresh token 机制
- 新增邮箱 OTP 登录，支持 6 位验证码和冷却计时器
- 新增 OAuth 回调页面，支持 Google 和 GitHub 登录跳转
- Token 持久化存储至 localStorage，401 时自动刷新

### 三级订阅套餐
- 全新定价体系：Free、Pro、Max 三档套餐
- 重新设计定价抽屉，Free 横幅 + Pro/Max 并排对比
- 基于 `Plan` 联合类型的功能门控

### 后端国际化错误消息
- API 错误现携带后端提供的本地化消息（`en`/`zh`）
- 兑换码错误根据用户语言自动展示对应文案

## Bug Fixes

- 修复刷新页面后登录状态丢失 —— 仅在 UNAUTHORIZED 时清除认证，网络错误或 5xx 不再误清
- 移除 `initializeAuth` 中重复的 profile 请求，减少页面加载时的 API 调用

## Refactor

- 移除 `@supabase/supabase-js` 依赖和 `src/lib/supabase.ts`
- 新增 `ApiError` 类，支持 `getLocalizedMessage()` 国际化错误处理
- 移除前端维护的兑换码错误翻译（改由后端提供）
- 清理环境变量验证中的 `console.log`
