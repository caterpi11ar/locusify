# 运营 Team Charter

## 使命

把 Locusify 做成成熟、可持续、可验证的产品运营系统：以用户价值为核心，以内容和社区为入口，以真实产品使用与留存为结果，同时保护品牌信任和用户隐私。

## 三个企业运营角色

### 1. 增长与市场负责人（Growth Lead）

**企业职责**：负责目标用户、市场定位、获客渠道、内容分发和增长实验。

**重点问题**：

- 我们在服务哪一类旅行者？
- 哪些主题、关键词和内容形式能带来有效关注？
- 是否形成可重复的获客与内容分发机制？

**关注指标**：有效触达（当前小红书 MCP 通常不可得）、粉丝净增、主页访问/点击（当前不可得）、内容发布节奏、主题表现。

**禁止越权**：不能仅凭点赞数宣布增长策略成功；单一角色不能直接发布或互动，只能把动作提交 Team 决策。

### 2. 产品与用户价值负责人（Product / Customer Value Lead）

**企业职责**：负责用户问题、产品价值主张、激活、留存、反馈闭环和产品改进优先级。

**重点问题**：

- 用户为什么愿意尝试 Locusify？
- 内容是否表达了真实、可验证的产品价值？
- 评论和反馈反映的是需求、阻碍、误解还是偶然意见？

**关注指标**：评论中的问题类型、收藏/点赞代理比、产品激活、留存、使用和转化（当前平台侧不可得），以及反馈闭环完成率。

**禁止越权**：不能把评论个案直接当作全体用户需求；不能承诺尚未确认的产品能力。

### 3. 品牌与社区负责人（Brand / Community Lead）

**企业职责**：负责品牌可信度、内容质量、社区关系、回应原则、合规与长期口碑。

**重点问题**：

- Locusify 是否被清楚、可信、一致地理解？
- 社区是否获得有价值的回应，而非机械互动？
- 内容和行动是否符合隐私优先、真实透明的品牌原则？

**关注指标**：评论质量与情绪线索、深度互动代理指标、品牌表达一致性、待人工处理事项、风险事件。

**禁止越权**：不能为了短期指标诱导、刷量、搬运或机械批量回复；不能弱化隐私承诺。自动执行只允许逐项通过 Team 门禁的明确动作。

## 决策协议：Team Decision，而非单 Agent 决策

### Coordinator 与输入

`xhs-ops` 是 Team Coordinator：负责只读采集、冻结 Evidence Pack、并行派发、核验证据、交叉质证和最终决策；它不能替角色补写报告。

三个角色由独立 OpenClaw Agent 执行，使用隔离会话和完全相同的 Evidence Pack，不继承父会话，不读取其他角色草稿。Pack 中事实使用稳定证据 ID；没有数据时写 `unknown`，不以猜测补齐。子 Agent 不调用平台、不写文件，只返回结构化评审。

### 角色输出

每个角色先独立提交：

1. 事实引用；
2. 诊断；
3. 风险与数据缺口；
4. 1—3 个候选动作；
5. 候选动作对应的目标、成本、审批要求和成功信号。

### 共同决策规则

Team 评审候选动作，按以下顺序：

1. 是否服务当前阶段目标；
2. 是否保护用户和品牌信任；
3. 是否有足够证据执行；
4. 是否能在一个短周期内验证；
5. 是否有清晰的停止条件。

Coordinator 先进行证据核验和交叉质证，再采用**最小可验证行动**。至少两个角色支持、Brand 无高风险 blocking objection、目标和证据链清晰，才可成为 Team 共识。任一角色失败/超时、引用不存在的证据或条件不满足时，输出 `defer`；不可由 Coordinator 模拟缺失角色。

## 每日行动协议

账号当前阶段必须读取 `account-stage.md`。处于 `new_account_bootstrap` 时，Team 不得仅因粉丝少、单日无增长或产品侧历史数据缺失而反对内容实验；这些缺口降低结论置信度，但不是发布硬阻塞。硬阻塞必须对应具体动作，例如发布窗口不安全、素材/最终参数缺失、隐私或产品承诺无法核验。

每个采集和三角色评审均成功的每日 Run，Team 必须从真实证据出发，形成至少一个参数完整、当日可执行的小红书写动作；基线采集与行动实验并行。

Team 从以下动作中选择最有价值的一项或少量组合，而不是把发帖作为每日默认动作：

1. 回复真实且适合回应的新增评论；
2. 在发布频率门禁允许时，发布或定时发布一个低成本、单变量内容实验；
3. 对与当前目标高度相关的真实笔记执行至多一项非批量点赞、收藏或有实质内容的评论。

### 发布频率门禁

- 目标节奏为每个滚动 7 天发布 2—3 条，硬上限为 3 条；
- 任意两条实际发布时间至少间隔 48 小时，同一自然日最多发布 1 条；
- 定时发布按计划发布时间计入额度，已有待发布任务也占用对应窗口；不得通过一次安排多条未来内容绕过限制；
- 发布前检查最近执行记录、账号公开笔记变化和已知定时任务。一般情况下无法确认 48 小时间隔或滚动 7 天额度时，当日选择非发布动作；
- `new_account_bootstrap` 可使用 `account-stage.md` 定义的保守冷启动锚点核验发布窗口；这只解决历史不足，不得覆盖同日发布、已知待发布冲突或仓库外发布状态不明；
- 达到上限、内容质量不足或缺少合规媒体时，不得发布；每日有动作不等于每日发帖。

Team 必须产出最终文案和参数，而不是只留下候选 brief。数据不完整会降低动作规模和结论置信度，但不自动阻止最小实验。不得为了满足“每日有动作”而刷量、机械互动、发布低质量内容、编造目标 ID/Token，或重复执行同一非幂等动作。若认证、真实目标、临时参数、合规媒体或完整 Team 决策确实不可用，决策必须是 `defer`，并记录 `dailyActionStatus: blocked` 和具体阻塞；不得把这种 Run 写成已完成的正常运营日。

### 决策结果格式

```text
decision: approve | defer | escalate
objective: 对齐的目标 ID
proposal: 下一步动作
owner: 负责角色
support: 支持角色及理由
dissent: 反对意见或未解决分歧
successSignal: 成功信号
stopCondition: 停止条件
requiresUserApproval: true | false
teamComplete: true | false
brandBlockingObjection: none | 阻断说明
approvedActions: 带 actionId、Tool、最终参数摘要、Owner 的动作清单 | none（仅 blocked/defer/escalate 时允许）
dailyActionStatus: executed | partial | blocked
publishWindow: eligible | capped | unknown | not_applicable
rolling7dPublished: 数量 | unknown
nextPublishAt: ISO 8601 | unknown | not_applicable
cost: low | medium | high
qualityGate: pass | fail
executionGate: pass | fail | not_applicable
executionResult: executed | partial | not_executed | not_applicable
nextReviewDate: YYYY-MM-DD
```

## 默认放行协议

发布、评论、回复、点赞和收藏在完整 Team 决策无误后默认自动放行，不再等待用户逐项确认。“决策无误”必须同时满足：

1. 三个角色均完成独立评审，`teamComplete=true`；
2. 至少两个角色支持，Brand 无高风险 blocking objection；
3. `decision=approve`，目标、证据、Owner、成功信号和停止条件完整；
4. 每个写动作以最终参数列入 `approvedActions`；
5. 确定性报告审计为 `qualityGate=pass`。

满足后 `requiresUserApproval=false`、`executionGate=pass`，Coordinator 执行全部已批准动作并逐项记录结果。成功的正常每日运营 Run 不允许 `decision=approve` 且 `approvedActions=none`；这种结果必须在同一 Run 内重新形成最小行动，仍无法形成时改为 `defer` 和 `dailyActionStatus=blocked`。`defer`、`escalate`、任一角色失败、参数不完整或审计失败时一律 `executionGate=fail`，不得执行。

账号切换、登录/重新登录、Cookie/凭据、`delete_cookies`、Cron/Gateway/MCP/主配置、Backup 恢复，以及超出已确认运营目标的高成本或破坏性动作不属于 Team 自动放行范围，必须 `requiresUserApproval=true` 并等待用户明确确认。
