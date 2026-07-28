# 快照 Schema

建议结构：

```json
{
  "schemaVersion": 1,
  "runId": "uuid-or-stable-run-id",
  "reportDate": "2026-07-26",
  "capturedAt": "2026-07-26T09:02:31+08:00",
  "timezone": "Asia/Shanghai",
  "status": "complete",
  "account": {
    "nickname": "Locusify",
    "redId": "redacted-or-public-red-id",
    "description": null
  },
  "metrics": {
    "following": 0,
    "followers": 0,
    "likesAndFavorites": 0,
    "publicNotes": 0
  },
  "delta": {
    "baselineCapturedAt": null,
    "following": null,
    "followers": null,
    "likesAndFavorites": null,
    "publicNotes": null,
    "followerGrowthRate": null
  },
  "derivedMetrics": {
    "interactionDelta": null,
    "deepInteractionDelta": null,
    "medianNoteInteractions": null,
    "medianNoteEngagementProxy": null,
    "contentFrequency": null,
    "daysSinceLastPublish": null,
    "dataAvailability": {
      "exposure": false,
      "views": false,
      "watchTime": false,
      "clicks": false,
      "conversions": false
    }
  },
  "notes": [
    {
      "noteId": "public-note-id",
      "title": "title",
      "type": "normal",
      "publishedAt": "2026-07-25T10:00:00+08:00",
      "state": "existing",
      "metrics": {
        "likes": 0,
        "favorites": 0,
        "comments": 0,
        "shares": 0
      },
      "delta": {
        "likes": null,
        "favorites": null,
        "comments": null,
        "shares": null
      },
      "ratios": {
        "favoriteLikeRatio": null,
        "commentLikeRatio": null,
        "shareLikeRatio": null,
        "engagementRate": null,
        "engagementRateStatus": "unavailable_without_reach"
      },
      "recentComments": [],
      "syncStatus": "success",
      "error": null
    }
  ],
  "recommendations": [],
  "errors": []
}
```

## 规则

- `schemaVersion` 必填。
- 所有时间使用 ISO 8601 并包含时区。
- 没有可靠基线时 Delta 使用 `null`，不用 0。
- 计数无法解析时可增加 `<field>Raw`，数值字段设为 `null`。
- `noteId` 是公开资源 ID；不得保存对应 `xsecToken`。
- `recentComments` 只保留：Comment ID、创建时间、内容摘要、是否需要人工查看；不保存头像和访问 Token。
- `error` 不含完整响应、Cookie、HTML 或 Token。
- `partial` 快照不能成为后续基线。
