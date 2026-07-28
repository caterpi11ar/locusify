# Locusify Operations

本目录是提供给 AI Agent 的小红书账号运营与 OpenClaw 配置中心。用户通过自然语言提出目标；AI 必须选择对应 Skill 执行，不应要求用户记忆或手动输入内部命令。

## AI 必读：可用 Skills

| Skill | 路径 | 何时使用 |
|---|---|---|
| `openclaw-config-manager` | `skills/openclaw-config-manager/SKILL.md` | 安装、配置、校验、导出、同步或恢复 OpenClaw；维护 MCP、Skills、Agent、Cron 和仓库配置 |
| `locusify-xhs-daily-ops` | `skills/locusify-xhs-daily-ops/SKILL.md` | Coordinator：只读采集、冻结 Evidence Pack、派发三个独立 Agent、交叉质证、决策、审计和条件执行 |
| `locusify-growth-analyst` | `skills/locusify-growth-analyst/SKILL.md` | 独立增长评审；仅由 Coordinator 子 Agent 调用 |
| `locusify-product-value-analyst` | `skills/locusify-product-value-analyst/SKILL.md` | 独立产品价值评审；仅由 Coordinator 子 Agent 调用 |
| `locusify-brand-community-analyst` | `skills/locusify-brand-community-analyst/SKILL.md` | 独立品牌社区与风险评审；仅由 Coordinator 子 Agent 调用 |
| `xiaohongshu`（社区） | `openclaw/workspace/skills/xiaohongshu/SKILL.md` | 小红书搜索+推荐双引擎、内容漏斗诊断与合规方法论 |
| `analytics-and-reporting`（社区） | `openclaw/workspace/skills/analytics-and-reporting/SKILL.md` | METER 专业社媒指标映射、诚实评估和行动建议 |

此外，本项目使用上游 [`autoclaw-cc/xiaohongshu-mcp-skills`](https://github.com/autoclaw-cc/xiaohongshu-mcp-skills) 提供通用的小红书登录、搜索、浏览、发布和互动 Skills。版本来源见 `openclaw/desired/dependencies.lock.json`。

## AI 路由规则

### 使用 `openclaw-config-manager`

当用户表达以下意图时：

- “配置/安装 OpenClaw”
- “接入/检查小红书 MCP”
- “导出、备份、同步 OpenClaw 配置”
- “在另一台电脑恢复配置”
- “安装或更新 Skills”
- “创建、修改或检查每天的 Cron”
- “检查当前电脑和仓库配置是否一致”

### 使用 `locusify-xhs-daily-ops`

当用户表达以下意图时：

- “开始运营”（默认仅执行一次只读初始化/分析，不自动启用 Cron）
- “同步今天的小红书数据”
- “看看账号今天表现如何”
- “生成小红书日报”
- “根据运营数据规划下一步”
- OpenClaw Cron 发出每日巡检指令

### 使用上游通用 Skills

以下是锁定上游包提供的能力路由，**不代表当前电脑已经安装**；执行前必须用 `openclaw skills list/check` 核验：

- 登录、扫码、检查登录：`xhs-login`
- 搜索笔记：`xhs-search`
- 浏览推荐、详情、评论：`xhs-explore`
- 查看用户主页：`xhs-profile`
- 发布图文/视频：`post-to-xhs`
- 点赞、收藏、评论、回复：`xhs-interact`
- 热门、竞品和内容策划：`xhs-content-plan`

若通用 Skill 未安装，转用 `openclaw-config-manager` 按锁定版本安装并验证后再执行；不要临时复制未知版本的 Skill，也不要把“Lock 中已声明”当成“本机已就绪”。

## 首期权限规则

### 可自动执行

- 检查服务和登录状态
- 读取当前账号资料
- 读取账号公开笔记
- 读取公开笔记摘要指标
- 仅当同一安全工具链提供真实临时 `xsecToken` 时，读取逐篇互动指标和有限评论
- 保存快照、生成差异和报告
- 校验、脱敏导出以及创建并验证 OpenClaw Backup（不自动恢复覆盖）

### Team 决策通过后自动执行

- 发布或定时发布图文/视频
- 发表评论或回复评论
- 点赞、取消点赞、收藏、取消收藏

以上动作只有在三个角色完成评审、Team 决策为 `approve`、Brand 无高风险 blocking objection、参数完整且质量门禁为 `pass` 时才自动放行。`defer`、`escalate`、角色缺失、参数不完整或审计失败均不执行。

### 仍必须先获得用户确认

- 启用新电脑上的 Cron
- 恢复会覆盖现有 State/Workspace 的 Backup
- 切换小红书账号
- 登录/重新登录、清除登录状态、处理凭据或 Secret
- 修改 Cron、OpenClaw 主配置或 MCP 安全边界

### 默认禁止

- AI 自动调用 `delete_cookies`
- 绕过 Team 决策或质量门禁执行小红书写操作
- 执行未在 Team 共同决策中列明最终参数的动作
- 编造 `feed_id`、`user_id` 或 `xsec_token`
- 把 Cookie、Token、二维码、OAuth 或私钥写进报告
- 直接编辑 OpenClaw SQLite 数据库
- 未加密提交完整 OpenClaw Backup 或小红书 Cookie

## 每日任务摘要

每日任务的唯一标准流程定义在：

- `skills/locusify-xhs-daily-ops/SKILL.md`

流程概要：

```text
检查 MCP → 检查登录 → 获取当前账号 → 获取公开笔记
→ 条件允许时获取每篇详情 → 脱敏 → 保存快照 → 对比上一完整快照
→ 计算增长/深度互动/代理比率 → 用 METER 映射目标
→ 冻结带证据 ID 的 Evidence Pack
→ 3 个隔离 Agent 并行研判 → Coordinator 交叉质证与决策
→ 确定性质量审计 → Team-approved 动作自动执行 → 记录执行结果并复审
```

运营目标、角色章程、重大决策和分层进展维护在：

- `operations/goals.md`
- `operations/charter.md`
- `operations/context-index.md`
- `operations/rollup-policy.md`
- `operations/decisions/`
- `operations/daily/`、`weekly/`、`monthly/`、`quarterly/`
- `operations/archive/`

每次每日分析会先自动执行上下文维护：已结束周期按日报 → 周报 → 月报 → 季报逐级压缩，校验后归档下层文件，并通过索引限制日常加载范围。这是每日分析流程的一部分，不是一次性任务或独立汇总 Cron。

Coordinator 不得模拟缺失角色；任一角色失败则 `defer`。角色冲突必须保留，不能用平均分掩盖。通过完整 Team 决策和确定性质量门禁的发布、评论、回复、点赞及收藏动作默认自动放行；`xhs-ops` 只执行共同决策中列明的最终参数。默认 `main` Agent 仍在配置层拒绝小红书平台写操作，`delete_cookies`、账号/登录、凭据、Cron 和基础配置变更也不进入自动放行范围。

每日任务的采集、Evidence Pack 和角色评审阶段严格只读，只有 Team=`approve` 且质量门禁=`pass` 后才进入条件执行阶段。数据不完整时输出 `partial`，不得用不完整快照覆盖趋势基线。“开始运营”不等于启用长期自动化；只有用户明确要求持续运行并确认后，才由配置管理 Skill 启用 desired Cron。

## 原子操作文档

小红书 MCP 的 13 个原子操作、参数、风险和调用前置条件见：

- `skills/locusify-xhs-daily-ops/references/atomic-operations.md`

上游与部署信息见：

- `mcp/xiaohongshu/README.md`
- `mcp/xiaohongshu/upstream.lock.json`

## 仓库化 OpenClaw

项目配置目标路径：

```text
packages/ops/openclaw/config/openclaw.json5
packages/ops/openclaw/state/
```

AI 通过 `OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_STATE_DIR` 使用这些路径。配置管理细节见：

- `skills/openclaw-config-manager/references/repository-layout.md`
- `skills/openclaw-config-manager/references/official-apis.md`
- `skills/openclaw-config-manager/references/sync-policy.md`
- `skills/openclaw-config-manager/references/redaction-policy.md`

## 修改规范

AI 修改本目录时必须：

1. 先读本 README 和匹配的 `SKILL.md`；
2. 修改原子能力后同步更新 `atomic-operations.md`；
3. 修改每日流程后同步更新 Skill、Rollup Policy 和 Cron Prompt；
4. 修改依赖版本后同步更新 Lock 文件；
5. 不在文档中写入本机绝对 Home 路径；
6. 不自动提交 Git；
7. 最后报告修改文件、验证结果和仍需人工处理的事项。
