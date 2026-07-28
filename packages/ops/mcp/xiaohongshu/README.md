# Xiaohongshu MCP

本项目采用 [`xpzouying/xiaohongshu-mcp`](https://github.com/xpzouying/xiaohongshu-mcp)。固定版本见 `upstream.lock.json`。

## 能力

当前审核版本包含 13 个 MCP Tools：

- 登录：检查状态、获取二维码、删除 Cookie
- 内容：发布图文、发布视频
- 发现：推荐 Feed、搜索
- 详情：笔记详情、用户主页
- 互动：评论、回复、点赞、收藏

完整参数与风险分类见：

```text
../../skills/locusify-xhs-daily-ops/references/atomic-operations.md
```

## Agent 使用要求

- 配置/部署/升级由 `openclaw-config-manager` Skill 处理。
- 每日运营由 `locusify-xhs-daily-ops` Skill 处理。
- 首次登录和 Cookie 失效需要人工扫码。
- 每日 Agent 只能连接只读 Tool 集。
- `delete_cookies` 不允许自动调用。

## 运行注意事项

- 默认 MCP：`http://127.0.0.1:18060/mcp`
- 默认 HTTP API：`http://127.0.0.1:18060`
- 同一账号不应同时登录多个网页端。
- Cookie 属于敏感凭据；如需随仓库同步必须加密。
- 页面变化和平台风控可能造成工具失败；不要通过加速请求规避。
- 调研时上游仓库未发现明确 LICENSE，正式使用前需完成许可证审核。
