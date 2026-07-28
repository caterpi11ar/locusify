# OpenClaw 导出、导入与冲突策略

## 导出产物

### 声明式配置

直接维护：

- `openclaw/config/*.json5`
- `openclaw/desired/*.json`
- `skills/**`
- `mcp/**/upstream.lock.json`

### 脱敏清单

通过官方接口导出并保存：

- MCP
- Skills
- Cron
- Status
- Manifest

清单用于 Review 和 Diff，不替代完整 State。

### 完整 Backup

1. `backup create --dry-run --json` 检查范围。
2. `backup create --verify --output openclaw/backups`。
3. 再调用 `backup verify`。
4. 若进入 Git，先加密，明文 Archive 不可保留在待提交变更中。

## Manifest

至少记录：

```text
schemaVersion
exportedAt
openclawVersion
platform
configRelativePath
stateRelativePath
backupFile
backupVerified
mcpLock
skillsLock
redactionPolicyVersion
```

不记录用户名、绝对 Home、Token 或 Cookie。

## 导入优先级

1. 仓库声明式期望配置
2. 当前机器已有安全凭据和 SecretRef
3. 脱敏 Export 仅用于比较
4. 完整 Backup 仅在明确恢复请求时使用

不使用其他机器的绝对路径、Cron ID 或 PID。

## Cron Upsert

- 稳定键：Job Name
- 不存在：Add
- 存在：比较并 Edit
- 多个同名：停止并要求处理冲突
- 新电脑：默认 Disabled
- 启用前：人工确认

## 冲突处理

以下情况停止自动应用：

- Git 工作区目标文件已有不明改动
- 当前配置和仓库均有不同修改且无法安全合并
- State 目标目录非空而恢复将覆盖
- 多个同名 Cron
- MCP 连接名称相同但 Endpoint 不同
- 上游 Lock 版本与实际来源不一致
- Backup 未通过验证
- 出现明文 Secret

Agent 展示 Base/Current/Desired 差异，等待用户选择。禁止自行丢弃一方。

## 多电脑

每台电脑有独立 State 副本。Git 同步配置与显式快照，不实时合并数据库。多机可各自运行，但同一小红书账号的多网页端登录和重复 Cron 风险必须在启用时提示。
