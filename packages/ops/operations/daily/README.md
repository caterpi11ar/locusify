# 每日运营进展

这是唯一的周期模板文件；周报、月报、季报复用 `../rollup-policy.md` 的最小结构，不再为每个周期维护重复 README。

文件命名：`YYYY-MM-DD.md`，以 `Asia/Shanghai` 为运营日期。

每日文件是管理进展，不是原始数据仓库。原始脱敏快照和机器生成报告位于 `packages/ops/runtime/xiaohongshu/`，默认不提交 Git。

本目录只保留开放周所需的活跃日报。每次每日分析开始时，会按 `../rollup-policy.md` 自动把已经结束的日报汇总为周报；周报校验成功后，日报移动到 `../archive/daily/YYYY/MM/`。正常分析不得读取所有历史日报。

## 每日模板

```markdown
# 运营进展 — YYYY-MM-DD

> 状态：complete / partial / auth_required / failed
> 当前目标：O1 / O2 / O3
> 数据截止：ISO 8601

## 1. 今日事实
- 仅写可验证事实和数据来源

## 2. Evidence Pack
- Pack ID：
- `E-001`：
- 数据缺口：

## 3. 三角色独立研判
### Growth Lead
- 诊断：
- 证据：
- 候选动作：
- 风险/缺口：

### Product / Customer Value Lead
...

### Brand / Community Lead
...

## 4. 交叉质证
- 共识：
- 冲突：
- 无证据主张：
- Blocking objection：
- 失败角色：

## 5. Team 共同决策
- decision：approve / defer / escalate
- objective：
- proposal：
- owner：
- support：
- dissent：
- successSignal：
- stopCondition：
- requiresUserApproval：
- teamComplete：true / false
- brandBlockingObjection：none / 阻断说明
- approvedActions：带 actionId、tool、最终参数摘要和 owner 的清单；仅 blocked/defer/escalate 时可为 none
- dailyActionStatus：executed / partial / blocked
- publishWindow：eligible / capped / unknown / not_applicable
- rolling7dPublished：数量 / unknown
- nextPublishAt：ISO 8601 / unknown / not_applicable
- nextReviewDate：

- qualityGate：pass / fail
- executionGate：pass / fail / not_applicable
- executionResult：executed / partial / not_executed / not_applicable

## 6. 执行进展
| 动作 | Owner | 状态 | 证据/产物 | 阻塞 |

## 7. 学习与目标进度
- 对 KR 的贡献：
- 新发现：
- 假设变化：

## 8. 质量审计
- 结果：
- Warnings：

## 9. 次日输入
- 待采集：
- 待 Team 决策：
- 门禁外待用户确认：
- 待复盘：
```

规则：保留角色分歧；不能把任一角色的提案伪装成 Team 共识；没有足够证据时必须 `defer`。只有 `teamComplete=true`、Team=`approve`、无高风险 blocking objection 且 `qualityGate=pass` 时才可 `executionGate=pass` 并自动执行 `approvedActions`。每个正常完成的每日 Run 必须至少执行一个有意义动作，不允许 `approve + approvedActions:none`；无法安全执行时标记 `dailyActionStatus=blocked`。
