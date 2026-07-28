---
name: openclaw-config-manager
description: |
  维护 Locusify 仓库化 OpenClaw：配置路径、MCP、Skills、Agent、Cron、官方 Backup、导出、跨电脑同步、恢复和验证。当用户要求配置/备份/同步/恢复 OpenClaw，接入小红书 MCP，安装 Skills，或管理每日 Cron 时使用。用户只描述目标；Agent 应自行调用官方 OpenClaw CLI/API，不要求用户手动执行内部命令。
---

# OpenClaw Config Manager

## 开始前必须读取

1. `../../README.md`
2. `references/repository-layout.md`
3. 与任务匹配的参考文档：
   - 官方命令/API：`references/official-apis.md`
   - 导出、导入与冲突：`references/sync-policy.md`
   - Secret 和脱敏：`references/redaction-policy.md`
4. `../../openclaw/desired/dependencies.lock.json`
5. 涉及 Cron 时读取 `../../openclaw/desired/cron-jobs.json`

所有相对路径以本 Skill 所在目录为基准解析。

## 不可违反的原则

- 优先调用 OpenClaw 官方 CLI/API；禁止直接编辑 OpenClaw SQLite。
- 使用仓库内的 Config/State 路径，不误操作用户默认 `~/.openclaw`。
- 用户无需手动运行命令；Agent 自行执行并汇报结果。
- 配置可进入 Git；Secret 实值只能使用 SecretRef、环境变量或加密文件。
- 创建 Backup 后必须使用官方 `backup verify` 验证。
- 恢复、覆盖、启用/修改 Cron、账号切换、登录状态和凭据变更必须获得用户确认。
- `main` 默认在配置层拒绝小红书写操作；`xhs-ops` 仅允许在完整 Team 决策为 `approve` 且质量门禁通过后执行发布/互动。`delete_cookies`、登录二维码、账号/凭据、Cron 和配置变更始终不向每日 Agent 放行。
- 不自动执行 `git commit`、`push`、`pull` 或解决 Git 冲突。

## 统一前置检查

1. 定位仓库根目录，不使用写死的机器绝对路径。
2. 为本次调用设置：
   - `OPENCLAW_CONFIG_PATH=<repo>/packages/ops/openclaw/config/openclaw.json5`
   - `OPENCLAW_STATE_DIR=<repo>/packages/ops/openclaw/state`
   - `LOCUSIFY_OPENCLAW_WORKSPACE=<repo>/packages/ops/openclaw/workspace`
   - `LOCUSIFY_OPENCLAW_AGENT_DIR=<repo>/packages/ops/openclaw/agent`
3. 调用 `openclaw config file`，确认返回仓库路径。
4. 确认 Workspace 不是仓库根目录，并启用 `skipBootstrap`；不得在业务源码目录生成 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`USER.md`、`IDENTITY.md`、`HEARTBEAT.md` 等 Bootstrap 文件。
5. 检查 OpenClaw 版本是否满足 Lock 文件。
6. 若配置存在，调用 `openclaw config validate`。
7. 查看 Git 工作区已有改动，避免覆盖用户未提交内容。

如果任何路径仍指向 `~/.openclaw`，停止写操作并修正本次进程环境。

## 意图路由

| 意图 | 流程 |
|---|---|
| 初始化当前电脑 | 初始化流程 |
| 导出/备份/同步到仓库 | 导出流程 |
| 从仓库配置当前电脑 | 导入流程 |
| 从完整 Archive 恢复 | 恢复流程 |
| 检查配置 | 验证流程 |
| 接入/更新 MCP | MCP 流程 |
| 安装/更新 Skills | Skills 流程 |
| 创建/修改定时任务 | Cron 流程 |

## 初始化流程

1. 执行统一前置检查。
2. 缺少配置文件时，根据 `repository-layout.md` 创建最小合法 JSON5。
3. 通过 `config schema/get/patch/set` 维护配置，修改前先读取当前值。
4. 根据 Lock 文件安装固定版本依赖。
5. 配置 `xiaohongshu` 和 `xiaohongshu-readonly` MCP；前者供 Team 准出后的受控执行使用，后者供采集和研判阶段使用。
6. 安装上游 Skills，以及本仓库的 Coordinator、三个角色和配置管理 Skills。
7. 创建或更新 `xhs-ops` Coordinator 和三个只读 Analyst Agents。
8. 根据期望文件 Upsert Cron，但在新电脑保持 Disabled。
9. 执行验证流程。
10. 若小红书未登录，调用登录 Skill 引导人工扫码。

## 导出流程

完整步骤见 `references/sync-policy.md`。必须完成：

1. Config Validate。
2. 官方 `backup create --verify`。
3. 官方 `backup verify <archive>` 二次确认。
4. 导出 MCP、Skills、Cron、Status 清单。
5. 标准化机器相关路径并脱敏。
6. 更新 Export Manifest。
7. 按 `redaction-policy.md` 扫描新增文件。
8. 展示仓库 Diff 摘要；不自动提交 Git。

## 导入流程

1. 执行统一前置检查。
2. 校验仓库配置及 `$include`。
3. 对照 Lock 文件安装/更新依赖。
4. 对照声明配置同步 MCP 和 Skills。
5. 按名称 Upsert Agent 与 Cron；不要复用其他机器的 Cron ID。
6. 新建或导入的 Cron 默认 Disabled。
7. 检查 SecretRef 可解析性、模型认证和 MCP Probe。
8. 检查小红书登录状态。
9. 输出“仓库期望 / 当前机器 / 未解决事项”三段式结果。

## 恢复流程

OpenClaw 当前没有通用 `backup restore` 命令：

1. 先调用官方 `backup verify`。
2. 读取 Archive Manifest，生成源路径到当前路径映射。
3. 默认只输出恢复计划。
4. 展示会覆盖的 State、Credential、Session 和 Workspace。
5. 获得用户明确确认后，先备份当前状态。
6. 不覆盖未知非空目录；冲突时停止。
7. 恢复后运行 `openclaw doctor`、Config Validate、Status、MCP Probe 和 Skills Check。
8. 所有恢复出的 Cron 保持 Disabled，直到用户确认。

## MCP 流程

1. 读取 `../../mcp/xiaohongshu/upstream.lock.json`。
2. 检查服务 Health 和当前 MCP 配置。
3. 添加/更新完整连接 `xiaohongshu`。
4. 添加/更新只读连接 `xiaohongshu-readonly`，只包含：
   - `check_login_status`
   - `list_feeds`
   - `search_feeds`
   - `get_feed_detail`
   - `user_profile`
5. 明确排除 `delete_cookies` 和所有写操作。
6. Probe 并核对实际 Tools；不要只信配置文本。

## Skills 流程

1. 使用 Lock 文件中的仓库和 Commit。
2. 安装/更新上游 Skills。
3. 安装本仓库五个项目 Skills：配置管理、每日 Coordinator 和三个 Analyst。
4. 调用 `skills check/list`。
5. 检查 Coordinator Skill 对 `xhs-ops` 可见，三个角色 Skill 仅对对应 Analyst Agent 可见。
6. 验证 `xhs-ops` 可通过 allowlist 并行 spawn 三个 Analyst，Analyst 不能 spawn、写文件或调用 MCP。
7. 用 `skills list/check` 确认 Lock 中声明的上游通用 Skills 已真实安装；声明但未安装必须报告为未就绪，不能当作可用能力。
8. 未经评审不得静默升级上游 Commit。

## Cron 流程

1. 读取 `../../openclaw/desired/cron-jobs.json`。
2. 通过官方 `cron list` 按 Name 查找。
3. 不存在则 Add；存在则 Edit 到期望状态。
4. 不用机器生成的 ID 作为跨电脑标识。
5. 新电脑导入默认 Disabled。
6. 启用前验证 Coordinator 与三个 Analyst 的真实最小模型 Turn、subagent allowlist、只读采集 MCP、受控执行 MCP、Skill、登录状态、写权限和质量门禁。
7. 启用/禁用属于有外部影响的变更，先展示差异并确认。

## 验证流程

至少执行：

- Config File Path
- Config Validate
- OpenClaw Status/Health
- MCP Status + Probe + Tool 清单
- Skills Check/List
- Cron Status/List
- SecretRef 可解析性检查
- 明文 Secret 扫描
- Git Diff 检查

## 最终回复格式

```text
结果：成功 / 部分成功 / 失败
使用配置：<仓库相对路径>
变更：<文件和 OpenClaw 对象摘要>
验证：<通过/失败项>
安全检查：<Secret/权限/Cron 状态>
需要人工处理：<扫码、Secret、确认、冲突等>
```
