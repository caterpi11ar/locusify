# 脱敏与 Secret 策略

Policy Version: 1

## 可以明文提交

- OpenClaw JSON5 结构配置
- SecretRef 和环境变量名称
- MCP Endpoint（本地/非敏感）
- Skill、Prompt、Cron 期望值
- Commit/Release Lock
- 脱敏运行状态
- 聚合运营指标

## 不可明文提交

- API Key
- Gateway Token/Password
- OAuth Access/Refresh Token
- Channel Credential
- Cookie、Session Cookie
- `xsecToken`
- 登录二维码/Base64
- 私钥、证书私钥
- 未脱敏 Session/Transcript
- 未加密完整 Backup

## Secret 表达方式

优先：

1. OpenClaw SecretRef
2. `${ENV_VAR}`
3. SOPS + age 加密文件
4. 外部 1Password/Bitwarden/Vault/云 Secret Manager

不要在 JSON5 中留下真实值后再依赖 Git Ignore。

## 扫描模式

导出后检查：

- `Authorization: Bearer`
- `access_token`, `refresh_token`, `api_key`, `secret`, `password`
- `cookie`, `cookies`, `sessionid`
- `xsecToken`, `xsec_token`
- PEM Private Key Header
- 长 Base64/Hex 高熵字段
- QR Code Data URL
- 用户 Home 绝对路径
- `.tar.gz` 等明文完整 Backup

匹配并不总表示泄漏；但在确认前必须阻止同步完成。

## 加密 Backup

加密文件允许进入仓库，例如：

```text
*.tar.gz.age
*.sops.yaml/json
```

加密后：

- 验证原 Archive 成功；
- 验证加密文件非空；
- 删除工作区中的明文临时 Archive；
- 不在日志显示解密 Key；
- 解密仅写入受限临时目录，结束后清理。

## 报告脱敏

- 使用仓库相对路径而非 `/Users/<name>` 或 `/home/<name>`。
- 不复制完整 MCP 原始响应。
- 错误只保留 Code 和安全摘要。
- 小红书评论仅保留必要摘要。
