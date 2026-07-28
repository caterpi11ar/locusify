#!/usr/bin/env python3
"""Fetch a sanitized, read-only current-account summary from xiaohongshu-mcp.

This helper deliberately exposes no Cookie/xsecToken/raw response and performs no
platform write. It exists because upstream /api/v1/user/me is not an MCP tool.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

BASE_URL = os.environ.get("LOCUSIFY_XHS_HTTP_URL", "http://127.0.0.1:18060").rstrip("/")
LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}


def fail(code: str, message: str) -> None:
    print(json.dumps({"status": "failed", "code": code, "message": message}, ensure_ascii=False))
    raise SystemExit(1)


def integer(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def validate_base_url(value: str) -> None:
    """Reject remote or ambiguous endpoints before making any request."""
    parsed = urlsplit(value)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in LOOPBACK_HOSTS
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
    ):
        fail("unsafe_base_url", "LOCUSIFY_XHS_HTTP_URL must be a loopback HTTP origin")


validate_base_url(BASE_URL)

try:
    request = urllib.request.Request(f"{BASE_URL}/api/v1/user/me", method="GET")
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = json.load(response)
except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
    fail("current_account_unavailable", type(error).__name__)

if not isinstance(payload, dict) or not payload.get("success"):
    fail("current_account_failed", "upstream did not return success")

data = payload.get("data") or {}
if isinstance(data, dict):
    data = data.get("data") or data
if not isinstance(data, dict):
    fail("invalid_shape", "account data is not an object")

basic = data.get("userBasicInfo") or {}
if not isinstance(basic, dict):
    basic = {}

interactions = {}
for item in data.get("interactions") or []:
    if not isinstance(item, dict):
        continue
    key = str(item.get("type") or item.get("name") or "")
    interactions[key] = integer(item.get("count"))

feeds = data.get("feeds") or []
if not isinstance(feeds, list):
    feeds = []

result = {
    "schemaVersion": 1,
    "status": "ok",
    "capturedAt": datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(),
    "account": {
        "nickname": basic.get("nickname"),
        "redId": basic.get("redId"),
        "description": basic.get("desc") or basic.get("description"),
    },
    "metrics": {
        "following": interactions.get("follows", interactions.get("关注")),
        "followers": interactions.get("fans", interactions.get("粉丝")),
        "likesAndFavorites": interactions.get("interaction", interactions.get("获赞与收藏")),
        "publicNotes": len(feeds),
    },
    "notes": [
        {
            "noteId": feed.get("id"),
            "title": (feed.get("noteCard") or {}).get("displayTitle"),
            "type": (feed.get("noteCard") or {}).get("type"),
            "metrics": {
                "likes": integer(((feed.get("noteCard") or {}).get("interactInfo") or {}).get("likedCount")),
                "favorites": integer(((feed.get("noteCard") or {}).get("interactInfo") or {}).get("collectedCount")),
                "comments": integer(((feed.get("noteCard") or {}).get("interactInfo") or {}).get("commentCount")),
                "shares": integer(((feed.get("noteCard") or {}).get("interactInfo") or {}).get("sharedCount")),
            },
        }
        for feed in feeds
        if isinstance(feed, dict)
    ],
    "dataAvailability": {
        "exposure": False,
        "views": False,
        "watchTime": False,
        "clicks": False,
        "conversions": False,
    },
}

# Never add feed xsecToken, avatar URLs, Cookie, or the raw payload here.
json.dump(result, sys.stdout, ensure_ascii=False)
sys.stdout.write("\n")
