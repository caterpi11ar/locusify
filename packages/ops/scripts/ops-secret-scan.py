#!/usr/bin/env python3
"""Fail closed when managed OPS artifacts contain likely secret values.

Field names and policy prose such as "xsecToken must not be persisted" are safe;
this scanner only flags credential-shaped values. It is suitable for rollup and
report quality gates where grep would otherwise fail on harmless terminology.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

PATTERNS = {
    "cookie_value": re.compile(r"(?i)\b(?:cookie|web_session)\s*[:=]\s*[\"']?([^\s\"',}\]]{8,})"),
    "xsec_token_value": re.compile(r"(?i)\bxsec[_-]?token\s*[:=]\s*[\"']?([^\s\"',}\]]{8,})"),
    "authorization_value": re.compile(r"(?i)\bauthorization\s*[:=]\s*[\"']?(?:bearer|basic)\s+[^\s\"']{8,}"),
    "api_key_value": re.compile(r"(?i)\bapi[_-]?key\s*[:=]\s*[\"']?([^\s\"',}\]]{8,})"),
    "openai_style_key": re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    "qr_base64": re.compile(r"data:image/[^;]+;base64,"),
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
}


def scan(path: Path) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    text = path.read_text(encoding="utf-8")
    for line_number, line in enumerate(text.splitlines(), 1):
        for code, pattern in PATTERNS.items():
            if pattern.search(line):
                findings.append({"path": str(path), "line": line_number, "code": code})
    return findings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", type=Path, nargs="+")
    args = parser.parse_args()
    missing = [str(path) for path in args.paths if not path.is_file()]
    findings = [finding for path in args.paths if path.is_file() for finding in scan(path)]
    result = {
        "status": "fail" if missing or findings else "pass",
        "filesScanned": len(args.paths) - len(missing),
        "missing": missing,
        "findings": findings,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if missing or findings else 0)


if __name__ == "__main__":
    main()
