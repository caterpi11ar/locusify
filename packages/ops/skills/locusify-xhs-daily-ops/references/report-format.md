# 小红书运营日报格式

```markdown
# Locusify 小红书运营日报 — YYYY-MM-DD

> 状态：complete / partial / auth_required / failed
> 采集时间：ISO 8601
> 对比基线：ISO 8601 / 无可用基线

## 1. 今日摘要

- 账号阶段：new_account_bootstrap / validation / mature / paused
- 登录与采集状态
- 成功同步笔记数 / 目标数
- 一句话说明最重要变化

## 2. 账号指标

| 指标 | 当前 | 较基线变化 |
|---|---:|---:|
| 关注 | | |
| 粉丝 | | |
| 获赞与收藏 | | |
| 公开笔记 | | |

## 3. 专业运营指标

- 粉丝增长率（有可靠基线时）
- 互动增量与深度互动增量
- 收藏/点赞、评论/点赞、分享/点赞代理比率
- 发布频率与距上次发布天数
- 数据缺口：曝光、阅读/播放、观看时长、点击、转化

> 没有 Reach/曝光时，不得输出互动率；代理比率必须明确标注不是 Engagement Rate。

## 4. 笔记表现

| 笔记 | 发布时间 | 点赞 Δ | 收藏 Δ | 评论 Δ | 分享 Δ | 状态 |
|---|---|---:|---:|---:|---:|---|

最多优先展示 10 条；其余给出汇总。没有基线时显示 `—`，不能显示虚假 0。

## 5. 新增评论与待处理事项

- 新增评论数量
- 最多 5 条必要摘要
- 是否建议人工回复及原因

不得在日报中代表用户回复。

## 6. 小红书漏斗诊断

只在对应数据可用时判断：

- 曝光低：关键词/标签/账号权重或合规问题（当前 MCP 通常无曝光数据，应标记未知）
- 曝光高点击低：标题/封面问题（无曝光和点击则不可判断）
- 点击高互动低：正文价值或钩子承接问题（无点击则不可判断）
- 点赞多收藏少：情绪价值高、留存价值可能不足
- 收藏多但涨粉弱：单篇有用，账号定位/系列预期可能不足

## 7. 异常与数据质量

- 失败笔记
- 缺失字段
- 指标异常下降
- 登录或风控提示
- Partial 状态对结论的限制

## 8. Evidence Pack

- Evidence Pack ID：
- 证据条目：`E-001 ...`
- 数据截止时间：
- 数据缺口：
- 输入汇总：

## 9. 三角色独立研判

### Growth Lead

- 诊断：
- 证据：
- 候选动作：
- 风险/数据缺口：

### Product / Customer Value Lead

- 诊断：
- 证据：
- 候选动作：
- 风险/数据缺口：

### Brand / Community Lead

- 诊断：
- 证据：
- 候选动作：
- 风险/数据缺口：

## 10. 交叉质证

- 共同支持：
- 关键冲突：
- 无证据主张：
- Blocking objection：
- 缺失/失败角色：

## 11. Team 共同决策

- 决策：approve / defer / escalate
- 对齐目标：O1 / O2 / O3
- 下一步：
- Owner：
- 支持意见：
- 分歧/异议：
- 成功信号：
- 停止条件：
- 需要用户确认：是/否
- teamComplete：true / false
- brandBlockingObjection：none / 阻断说明
- approvedActions：逐项列出 actionId、tool、目标、最终参数摘要、Owner；仅 blocked/defer/escalate 时可为 none
- dailyActionStatus：executed / partial / blocked
- publishWindow：eligible / capped / unknown / not_applicable
- rolling7dPublished：数量 / unknown
- nextPublishAt：ISO 8601 / unknown / not_applicable
- 成本：low / medium / high
- 质量门禁：pass / fail
- executionGate：pass / fail / not_applicable
- executionResult：executed / partial / not_executed / not_applicable
- 下次复盘：YYYY-MM-DD

只有 Team 共识可以出现在“下一步”和 `approvedActions`；角色候选动作不得自动成为最终建议。发布、评论、回复、点赞和收藏在 `teamComplete=true`、Team=`approve`、Brand 无高风险 blocking objection 且质量门禁通过后自动放行。正常完成的每日 Run 必须至少执行一个有意义的平台动作，不允许以 `approve + approvedActions:none` 结束；无法形成安全动作时改为 `defer` 并标记 `dailyActionStatus: blocked`。

## 12. 目标与执行进展

- 对 KR 的贡献：
- 已完成：
- 进行中：
- 阻塞：
- 次日输入：

## 13. 质量审计

- 审计工具：`ops-report-audit.py`
- 结果：pass / fail
- Warnings：

## 14. 执行准出与结果

- 执行门禁：pass / fail / not_applicable
- 执行结果：executed / partial / not_executed / not_applicable
- 逐项结果：actionId、tool、状态、执行时间、脱敏结果或跳过/失败原因
- 明确声明：本任务未调用 `delete_cookies`，未处理账号/登录/Cookie/凭据，未修改 Cron/配置/Backup。
```

## 写作规则

- 区分事实、角色分析、提案、Team 共同决策和执行。
- 不承诺增长结果。
- 每个 Team 决策必须映射一个有效目标 ID，并保留分歧。
- 不输出 Token、Cookie、二维码、绝对用户 Home 路径。
- `partial` 时把数据质量放到摘要首位。
- 没有上一份完整快照时只报告当前值，不生成趋势判断，但仍可执行低成本单变量实验。
- 当日动作根据真实信号从评论回复、单条非批量互动和内容实验中选择；每天有动作不等于每天发帖。
- `new_account_bootstrap` 阶段不得把粉丝少、单日无增长或产品侧历史数据缺失当作发布硬阻塞；必须区分评估缺口与发布窗口、素材、最终参数、隐私/真实性等硬门禁。
- 发布/定时发布遵守滚动 7 天最多 3 条、任意两条实际发布时间至少间隔 48 小时、同日最多 1 条，并计入已知待发布任务。
- 当日决策需包含可执行的最终动作，不得为了满足动作要求刷量或制造无意义互动。
- 非幂等写操作结果不明确时不得写成成功或盲目重试；执行后必须再次审计并做 Secret 扫描。
