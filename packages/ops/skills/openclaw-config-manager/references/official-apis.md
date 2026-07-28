# OpenClaw 官方 API/CLI 清单

本 Skill 应优先使用以下官方接口。执行时始终带仓库化 `OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_STATE_DIR` 环境。

## Config

- `openclaw config file`：确认活动配置路径
- `openclaw config validate`：Schema 和 SecretRef 校验
- `openclaw config schema`：完整 Schema
- `openclaw config get <path>`：读取配置
- `openclaw config patch --file/--stdin [--dry-run]`：原子 Patch
- `openclaw config set/unset`：设置或删除路径

写配置前先读取当前值，优先 Dry Run。复杂字段应通过 `config.schema.lookup` 确认。

## Backup

- `openclaw backup create --verify --output <path>`
- `openclaw backup create --dry-run --json`
- `openclaw backup verify <archive> --json`

Backup 包含活动 State、Config、Credentials、Auth Profiles 和配置中发现的 Workspace；会跳过活跃 Transcript、Cron Run Log、Rolling Log、Queue 和临时文件等易变内容。

当前没有通用 `openclaw backup restore`。

## MCP

- `openclaw mcp add`
- `openclaw mcp configure`
- `openclaw mcp set/unset`
- `openclaw mcp show/list/status`
- `openclaw mcp probe`
- `openclaw mcp tools`
- `openclaw mcp reload`

使用 Tool Include/Exclude 做能力隔离，并通过 Probe 核实实际结果。

## Skills

- `openclaw skills install`
- `openclaw skills update`
- `openclaw skills verify`
- `openclaw skills check`
- `openclaw skills list/info`

第三方 Git Skill 必须固定审核 Commit。

## Cron

- `openclaw cron status/list/show/get`
- `openclaw cron add/edit`
- `openclaw cron enable/disable/rm`
- `openclaw cron run/runs`

Cron 是运行状态，不直接编辑 SQLite。跨电脑按 Name Upsert，不同步机器生成 ID。

## Health

- `openclaw status`
- `openclaw health`
- `openclaw doctor`
- `openclaw gateway status/probe`

## 路径支持

官方环境变量：

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_HOME`
- `OPENCLAW_INCLUDE_ROOTS`

活动主配置必须是普通文件，不使用 Symlink。
