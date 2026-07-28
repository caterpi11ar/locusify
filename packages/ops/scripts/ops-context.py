#!/usr/bin/env python3
"""Deterministic context inspection for Locusify operations.

AI writes semantic weekly/monthly/quarterly summaries. This helper owns the
mechanical, bounded parts: period discovery, hashes, and context selection. It
never moves or deletes source files, so incomplete AI summaries cannot cause
loss. `maintain` emits a plan; the Skill applies it under rollup-policy.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})\.md$")
WEEK_RE = re.compile(r"^(\d{4})-W(\d{2})\.md$")
MONTH_RE = re.compile(r"^(\d{4})-(\d{2})\.md$")
QUARTER_RE = re.compile(r"^(\d{4})-Q([1-4])\.md$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def files(directory: Path, pattern: re.Pattern[str], recursive: bool = False) -> list[Path]:
    if not directory.exists():
        return []
    iterator = directory.rglob("*.md") if recursive else directory.glob("*.md")
    return sorted((path for path in iterator if path.name != "README.md" and pattern.match(path.name)))


def existing_keys(paths: list[Path]) -> set[str]:
    return {path.stem for path in paths}


def manifest(paths: list[Path], root: Path) -> list[dict[str, str]]:
    return [{"path": str(path.relative_to(root)), "sha256": sha256(path)} for path in paths]


def context(root: Path, today: date) -> dict:
    daily = files(root / "daily", DATE_RE)
    weekly = files(root / "weekly", WEEK_RE)
    monthly = files(root / "monthly", MONTH_RE)
    quarterly = files(root / "quarterly", QUARTER_RE)
    week_start = today - timedelta(days=today.weekday())
    current_daily = [path for path in daily if week_start <= date.fromisoformat(path.stem) <= today][-7:]
    decisions = sorted((root / "decisions").glob("DEC-*.md"))[-10:] if (root / "decisions").exists() else []
    selected = current_daily + weekly[-2:] + monthly[-2:] + quarterly[-1:] + decisions
    return {
        "generatedAt": datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(),
        "limits": {"daily": 7, "weekly": 2, "monthly": 2, "quarterly": 1, "decisions": 10},
        "files": [str(path.relative_to(root)) for path in selected],
    }


def plan(root: Path, today: date) -> dict:
    active_daily = files(root / "daily", DATE_RE)
    archived_daily = files(root / "archive" / "daily", DATE_RE, recursive=True)
    daily = sorted({path.resolve(): path for path in active_daily + archived_daily}.values())
    weekly = files(root / "weekly", WEEK_RE) + files(root / "archive" / "weekly", WEEK_RE, recursive=True)
    monthly = files(root / "monthly", MONTH_RE) + files(root / "archive" / "monthly", MONTH_RE, recursive=True)
    quarterly = files(root / "quarterly", QUARTER_RE)
    weekly_keys, monthly_keys, quarterly_keys = map(existing_keys, (weekly, monthly, quarterly))
    yesterday = today - timedelta(days=1)
    actions = []

    # Any ISO week whose Sunday has passed is closed. Backfill oldest missing
    # weeks first, but cap work so one daily run remains bounded.
    week_groups: dict[str, list[Path]] = {}
    week_ends: dict[str, date] = {}
    for path in daily:
        day = date.fromisoformat(path.stem)
        iso_year, iso_week, _ = day.isocalendar()
        key = f"{iso_year}-W{iso_week:02d}"
        week_groups.setdefault(key, []).append(path)
        week_ends[key] = day + timedelta(days=6 - day.weekday())
    for key in sorted(week_groups):
        if len([action for action in actions if action["kind"] == "weekly"]) >= 4:
            break
        if week_ends[key] <= yesterday and key not in weekly_keys:
            actions.append({"kind": "weekly", "key": key, "inputs": manifest(week_groups[key], root)})

    # Only summarize a month when every weekly summary overlapping that month
    # already exists. Newly planned weekly reports are intentionally consumed
    # by the next daily run, keeping writes and verification staged.
    weekly_by_key = {path.stem: path for path in weekly}
    first_this_month = today.replace(day=1)
    cursor = min((date.fromisoformat(path.stem) for path in daily), default=first_this_month).replace(day=1)
    ended_months = []
    while cursor < first_this_month:
        ended_months.append((cursor.year, cursor.month))
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    for year, month in ended_months:
        if len([action for action in actions if action["kind"] == "monthly"]) >= 3:
            break
        key = f"{year}-{month:02d}"
        if key in monthly_keys:
            continue
        month_start = date(year, month, 1)
        month_end = ((month_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1))
        week_keys = set()
        day = month_start
        while day <= month_end:
            iso_year, iso_week, _ = day.isocalendar()
            week_keys.add(f"{iso_year}-W{iso_week:02d}")
            day += timedelta(days=1)
        if week_keys and week_keys.issubset(weekly_by_key):
            inputs = [weekly_by_key[item] for item in sorted(week_keys)]
            actions.append({"kind": "monthly", "key": key, "coverage": [month_start.isoformat(), month_end.isoformat()], "inputs": manifest(inputs, root)})

    monthly_by_key = {path.stem: path for path in monthly}
    current_quarter = (today.year, (today.month - 1) // 3 + 1)
    quarter_candidates = sorted({(int(key[:4]), (int(key[5:7]) - 1) // 3 + 1) for key in monthly_by_key})
    for year, quarter in quarter_candidates:
        if len([action for action in actions if action["kind"] == "quarterly"]) >= 2:
            break
        key = f"{year}-Q{quarter}"
        month_keys = [f"{year}-{month:02d}" for month in range((quarter - 1) * 3 + 1, quarter * 3 + 1)]
        if (year, quarter) < current_quarter and key not in quarterly_keys and all(item in monthly_by_key for item in month_keys):
            actions.append({"kind": "quarterly", "key": key, "inputs": manifest([monthly_by_key[item] for item in month_keys], root)})

    pending = {
        "weekly": max(0, sum(week_ends[key] <= yesterday and key not in weekly_keys for key in week_groups) - 4),
        "note": "Newly generated rollups become inputs on the next daily run after verification.",
    }
    return {"schemaVersion": 1, "generatedAt": datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(), "through": yesterday.isoformat(), "actions": actions, "backlog": pending, "context": context(root, today)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("maintain", "context"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1] / "operations")
    parser.add_argument("--today", type=date.fromisoformat, default=datetime.now(ZoneInfo("Asia/Shanghai")).date())
    args = parser.parse_args()
    output = plan(args.root, args.today) if args.command == "maintain" else context(args.root, args.today)
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
