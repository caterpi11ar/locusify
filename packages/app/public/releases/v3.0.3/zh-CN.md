# v3.0.3

> 2026-03-09

## Features

### Forgot / Reset Password
- 新增忘记密码流程：输入邮箱接收 Supabase 发送的重置链接
- 新增独立的重置密码页面，解析 Supabase hash fragment 中的 recovery token
- 已登录用户可在账户抽屉中点击重置密码按钮，带 60 秒冷却
- 密码复杂度验证：8 位以上，需包含大小写字母和数字

### Password Login
- 新增密码登录和注册，与现有验证码登录并存
- 登录抽屉增加登录方式切换标签（验证码 / 密码）
- 忘记密码视图集成在密码登录表单中

### Privacy Consent
- 登录抽屉新增隐私政策与服务条款勾选框
- 所有提交操作在未同意时以 toast 提示拦截

## Bug Fixes

- 修复错误文字不可见的问题（`text-destructive` 未定义，改为 `text-red`）
- 修复注册时密码不匹配显示字段标签而非错误提示的问题
- 修复确认密码输入框输入时不清除错误状态的问题
- 修复 OAuth 回调页面白屏问题（并行请求与加载状态优化）

## Refactor

- 提取 `useCooldown` 通用 Hook，在 3 个组件间复用 60 秒冷却逻辑
- 新增 `Checkbox` UI 组件（基于 Radix）
