#!/usr/bin/env python3
"""Deterministic quality gate for Locusify operations Markdown reports."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

SECRET_PATTERNS = {
    "cookie": re.compile(r"(?i)(cookie\s*[:=]\s*[^`\s]+|web_session\s*[:=])"),
    "xsec_token": re.compile(r"(?i)xsec[_-]?token\s*[:=]\s*[^`\s]+"),
    "qr_base64": re.compile(r"data:image/[^;]+;base64,"),
    "private_key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
}
FORBIDDEN_METRICS = {
    "engagement_rate": re.compile(r"(?i)(互动率|engagement\s*rate)"),
    "ctr": re.compile(r"(?i)(点击率|\bCTR\b)"),
    "cvr": re.compile(r"(?i)(转化率|\bCVR\b)"),
}
REQUIRED = {
    "growth": re.compile(r"Growth Lead"),
    "product": re.compile(r"Product / Customer Value Lead"),
    "brand": re.compile(r"Brand / Community Lead"),
    "team_decision": re.compile(r"Team 共同决策"),
    "decision": re.compile(r"(?i)(decision|决策)[：:]\s*(approve|defer|escalate)"),
    "objective": re.compile(r"(?i)(objective|对齐目标)[：:]\s*O\d+"),
    "owner": re.compile(r"(?i)owner[：:]"),
    "dissent": re.compile(r"(?i)(dissent|分歧|异议)[/：:]"),
    "success_signal": re.compile(r"(?i)(successSignal|成功信号)[：:]"),
    "stop_condition": re.compile(r"(?i)(stopCondition|停止条件)[：:]"),
    "approval": re.compile(r"(?i)(requiresUserApproval|需要用户确认)[：:]"),
    "team_complete": re.compile(r"(?i)teamComplete[：:]\s*(true|false)"),
    "brand_blocker": re.compile(r"(?i)brandBlockingObjection[：:]"),
    "approved_actions": re.compile(r"(?i)approvedActions[：:]"),
    "quality_gate": re.compile(r"(?i)(qualityGate|质量门禁)[：:]\s*(pass|fail)"),
    "execution_gate": re.compile(r"(?i)(executionGate|执行门禁)[：:]\s*(pass|fail|not_applicable)"),
    "execution_result": re.compile(
        r"(?i)(executionResult|执行结果)[：:]\s*(executed|partial|not_executed|not_applicable)"
    ),
}

ALLOWED_AUTO_TOOLS = {
    "publish_content",
    "publish_with_video",
    "post_comment_to_feed",
    "reply_comment_in_feed",
    "like_feed",
    "favorite_feed",
}
FORBIDDEN_AUTO_TOOLS = {
    "delete_cookies",
    "get_login_qrcode",
    "cron",
    "gateway",
    "config",
    "backup",
}


def field_value(text: str, names: str, values: str) -> str | None:
    match = re.search(rf"(?im)^\s*(?:-\s*)?(?:{names})[：:]\s*({values})\s*$", text)
    return match.group(1).lower() if match else None


def audit(text: str) -> dict:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []

    for name, pattern in SECRET_PATTERNS.items():
        if pattern.search(text):
            errors.append({"code": f"secret.{name}", "message": "发现疑似敏感值"})
    for name, pattern in REQUIRED.items():
        if not pattern.search(text):
            errors.append({"code": f"missing.{name}", "message": "缺少必填报告字段"})

    unavailable = bool(re.search(r"(?i)(exposure|曝光).{0,30}(false|不可用|unknown|unavailable)", text))
    unavailable = unavailable or bool(re.search(r"数据缺口[^\n]*(曝光|阅读|点击|转化)", text))
    if unavailable:
        for name, pattern in FORBIDDEN_METRICS.items():
            matches = [match.group(0) for match in pattern.finditer(text)]
            # Policy phrases such as “不得输出互动率” are allowed.
            unsafe = [item for item in matches if not re.search(rf"(不得|不计算|不可用|没有).{{0,12}}{re.escape(item)}", text, re.I)]
            if unsafe:
                warnings.append({"code": f"metric.{name}", "message": "数据分母缺失时出现该指标，请人工确认未误算"})

    decision = field_value(text, r"decision|决策", r"approve|defer|escalate")
    team_complete = field_value(text, r"teamComplete", r"true|false")
    quality_gate = field_value(text, r"qualityGate|质量门禁", r"pass|fail")
    execution_gate = field_value(text, r"executionGate|执行门禁", r"pass|fail|not_applicable")
    execution_result = field_value(
        text,
        r"executionResult|执行结果",
        r"executed|partial|not_executed|not_applicable",
    )
    requires_approval = field_value(text, r"requiresUserApproval|需要用户确认", r"true|false|是|否")
    approved_actions = re.search(r"(?im)^\s*(?:-\s*)?approvedActions[：:]\s*(.*)$", text)
    has_approved_actions = bool(
        approved_actions and approved_actions.group(1).strip().lower() not in {"none", "无", "not_applicable"}
    )
    brand_blocker = re.search(r"(?im)^\s*(?:-\s*)?brandBlockingObjection[：:]\s*(.*)$", text)
    has_brand_blocker = bool(
        brand_blocker and brand_blocker.group(1).strip().lower() not in {"", "none", "无", "false"}
    )

    if execution_gate == "pass":
        if decision != "approve":
            errors.append({"code": "gate.decision", "message": "执行门禁通过但 Team 决策不是 approve"})
        if team_complete != "true":
            errors.append({"code": "gate.team_incomplete", "message": "执行门禁通过但三个角色未全部完成"})
        if quality_gate != "pass":
            errors.append({"code": "gate.quality", "message": "执行门禁通过但质量门禁未通过"})
        if requires_approval not in {"false", "否"}:
            errors.append({"code": "gate.user_approval", "message": "仍需用户确认的动作不能自动放行"})
        if has_brand_blocker:
            errors.append({"code": "gate.brand_blocker", "message": "存在 Brand blocking objection 时不能自动放行"})
        if not has_approved_actions:
            errors.append({"code": "gate.no_actions", "message": "执行门禁通过但 approvedActions 为空"})

    if decision in {"defer", "escalate"} and execution_gate == "pass":
        errors.append({"code": "gate.non_approve", "message": "defer/escalate 决策不得执行"})
    if execution_result in {"executed", "partial"} and execution_gate != "pass":
        errors.append({"code": "execution.without_gate", "message": "记录了平台执行但执行门禁未通过"})
    if has_approved_actions and decision == "approve" and requires_approval in {"false", "否"} and execution_gate != "pass":
        errors.append({"code": "gate.approved_not_released", "message": "Team 已批准的自动动作未进入执行门禁"})

    tool_lines = re.findall(r"(?im)^\s*(?:-\s*)?tool[：:]\s*([a-zA-Z0-9_]+)\s*$", text)
    for tool_name in tool_lines:
        if tool_name in FORBIDDEN_AUTO_TOOLS:
            errors.append({"code": "tool.forbidden", "message": f"自动放行清单包含禁止 Tool: {tool_name}"})
        elif tool_name not in ALLOWED_AUTO_TOOLS:
            errors.append({"code": "tool.unknown", "message": f"自动放行清单包含未授权 Tool: {tool_name}"})

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    if not args.report.is_file():
        raise SystemExit(f"report not found: {args.report}")
    result = audit(args.report.read_text(encoding="utf-8"))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "pass" else 1)


if __name__ == "__main__":
    main()
