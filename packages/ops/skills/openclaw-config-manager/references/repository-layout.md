# 仓库化 OpenClaw 布局

## 路径

从 Git 仓库根目录计算：

```text
Config:    packages/ops/openclaw/config/openclaw.json5
State:     packages/ops/openclaw/state
Workspace: packages/ops/openclaw/workspace
Agent Dir: packages/ops/openclaw/agent
```

Agent 每次执行时在子进程环境设置：

```text
OPENCLAW_CONFIG_PATH=<absolute repo root>/packages/ops/openclaw/config/openclaw.json5
OPENCLAW_STATE_DIR=<absolute repo root>/packages/ops/openclaw/state
LOCUSIFY_OPENCLAW_WORKSPACE=<absolute repo root>/packages/ops/openclaw/workspace
LOCUSIFY_OPENCLAW_AGENT_DIR=<absolute repo root>/packages/ops/openclaw/agent
```

绝对路径仅存在于进程环境，不写进受版本控制文件。

## 配置拆分

```text
config/openclaw.json5  入口，Gateway 基础设置及 Top-level Include
config/agents.json5    Agent 和 Workspace
config/mcp.json5       MCP Server 与 Tool Filter
config/skills.json5    Skill 设置
```

入口建议：

```json5
{
  gateway: {
    mode: "local",
    reload: { mode: "hybrid" },
  },
  agents: { $include: "./agents.json5" },
  mcp: { $include: "./mcp.json5" },
  skills: { $include: "./skills.json5" },
}
```

在创建实际配置前使用当前 OpenClaw Schema 验证字段名称，不能仅照抄示例。

## `$include` 约束

- 相对当前文件解析。
- 默认只能位于主配置目录下。
- 单文件 Top-level Include 支持 OpenClaw 安全写回。
- 避免 Root Include、数组 Include 和 Sibling Override。
- 最多嵌套 10 层。
- 跨目录时使用 `OPENCLAW_INCLUDE_ROOTS`，并限制为仓库内必要目录。

## Workspace 隔离

OpenClaw Workspace 必须使用 `packages/ops/openclaw/workspace`，不得指向仓库根目录。配置必须启用 `skipBootstrap: true`，避免在仓库根目录或业务源码目录生成 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`USER.md`、`IDENTITY.md`、`HEARTBEAT.md` 等 OpenClaw Bootstrap 文件。

如果 OpenClaw 仍需要内部 Workspace 文件，只能写入上述专用 Workspace。Agent 在启动后应检查仓库根目录没有新增这些文件。

## State

State 可能包含：

- SQLite
- Cron State
- Agent Auth Profiles
- Credentials/OAuth
- Sessions
- Plugin State
- Logs 和临时文件

Git 不负责合并多台机器的 SQLite。通过官方 Backup 和脱敏 Export 做显式状态同步。
