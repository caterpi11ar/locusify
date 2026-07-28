## Description: <br>
Analytics-and-reporting helps an agent turn user-provided native social platform and GA4/UTM metrics into goal-mapped, honest reports and next actions using the METER framework. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[social-media-skills](https://clawhub.ai/user/social-media-skills) <br>

### License/Terms of Use: <br>
MIT-0 <br>


## Use Case: <br>
External users and social media teams use this skill to interpret native platform analytics, GA4, and UTM data they provide, then produce goal-mapped reports with concrete next actions. It is suited for checking performance, choosing content winners, and connecting analytics to strategy without fabricating missing metrics. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: Users could paste sensitive individual-level analytics data when aggregate metrics are sufficient. <br>
Mitigation: Request aggregate metrics by default and use first-party, consented data sources such as native dashboards, GA4, and UTM reports. <br>
Risk: Benchmark or platform-metric guidance can become stale as platform dashboards and norms change. <br>
Mitigation: Treat benchmark claims as directional and re-verify volatile analytics references quarterly. <br>
Risk: Reports could become misleading if missing or weak metrics are filled in, inflated, or cherry-picked. <br>
Mitigation: Use only metrics supplied by the user from native dashboards or GA4/UTM data, cite the source, and flag gaps instead of estimating them as fact. <br>


## Reference(s): <br>
- [Analytics & reporting 2026 - verified](references/analytics-2026-reality.md) <br>
- [Metrics by goal, the report + two worked examples](references/metrics-by-goal-and-report.md) <br>
- [Scope, the keystone role + connections](references/scope-and-connections.md) <br>
- [The METER framework - measure what maps to goals, then act](references/the-meter-framework.md) <br>


## Skill Output: <br>
**Output Type(s):** [Text, Markdown, Guidance] <br>
**Output Format:** [Markdown report or structured narrative guidance] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [Uses user-provided aggregate analytics; missing metrics are flagged rather than estimated.] <br>

## Skill Version(s): <br>
1.0.0 (source: frontmatter and server release evidence) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
