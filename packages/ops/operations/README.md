# Locusify 运营管理中心

本目录维护长期运营目标、Team 决策记录和每日进展。它是经过脱敏、可提交 Git 的运营管理层；平台原始数据、Cookie、Token 和未审核运行产物仍保存在被忽略的 `runtime/`。

## 目录

```text
operations/
├── charter.md             # Team 角色、权限与决策协议
├── goals.md               # 北极星、阶段目标、指标与护栏
├── context-index.md       # 每次分析优先读取的有界导航索引
├── rollup-policy.md       # 自动周/月/季汇总与归档、启动和多机策略
├── decisions/             # 重要决策记录（ADR 风格）
├── daily/                 # 当前开放周的每日进展（含模板）
├── weekly/                # 周报
├── monthly/               # 月报
├── quarterly/             # 季报
└── archive/               # 已被上级汇总覆盖的历史源文件
```

## 工作方式

1. “开始运营”默认运行一次完整流程，不启用 Cron；采集和评审只读，Team 决策与质量门禁通过后条件执行。持续运行需单独确认并通过 `rollup-policy.md` 的预检。
2. 每次分析开始时，按 `rollup-policy.md` 自动补齐已结束周期的周报、月报、季报并安全归档；不建立单独汇总 Cron。
3. Agent 按 `context-index.md` 加载有界上下文，禁止读取全部历史日报。
4. 每日巡检先只读采集事实，不直接下结论。
5. 三个角色基于同一 Evidence Pack 独立研判。
6. Team 按 `charter.md` 形成共同决策，保留分歧并对齐有效目标。
7. 当天进展写入 `daily/YYYY-MM-DD.md`；重大或跨日决策另写入 `decisions/`。
8. 发布、评论、回复、点赞和收藏在完整 Team 决策为 `approve` 且质量门禁通过后自动执行；账号/登录/Cookie/凭据、Cron/配置/Backup 变更仍需用户确认。

## 信息分层

- **事实**：可追溯到快照、运行记录或仓库资料。
- **分析**：角色基于事实作出的解释，必须标注数据限制。
- **提案**：尚未成为 Team 共识的动作。
- **共同决策**：通过决策协议、已对齐目标的下一步。
- **执行**：只有 Team 默认放行门禁通过，或用户对门禁外动作明确批准后才能发生。

每日文件不得包含 Cookie、`xsecToken`、OAuth、二维码 Base64、私钥、完整原始响应或个人敏感信息。
