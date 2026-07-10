---
name: release
description: 发版流程。当用户说"发版"、"release"、"bump version"、"新版本"时触发。自动创建双语 release notes 并更新版本号。
---

# Release Workflow

Automate the release process: bump version, generate bilingual release notes, and write files.

## Steps

### 1. Read current version

Read `package.json` and extract the current `version` field.

### 2. Confirm new version number

Use **AskUserQuestion** to let the user pick the next version. Calculate patch / minor / major bumps from the current version and present them as options. Example for current `1.1.0`:

| Option | Version |
|--------|---------|
| Patch  | 1.1.1   |
| Minor  | 1.2.0   |
| Major  | 2.0.0   |

### 3. Collect changes

Ask the user what changed in this release. Offer two approaches:
- **Auto-summarize**: Generate a summary from `git log` since the last version tag or recent commits.
- **Manual input**: Let the user describe changes directly.

### 4. Generate bilingual release notes

Create **two** Markdown files following this exact template format:

**English (`en.md`):**
```markdown
# v{VERSION}

> {YYYY-MM-DD}

## Features

### {Feature Title}
- {Description}

## Bug Fixes

- {Description}

## Refactor

- {Description}
```

**Chinese (`zh-CN.md`):**
Same structure, with content translated to Chinese. Section headers stay in English (`## Features`, `## Bug Fixes`, `## Refactor`). Only include sections that have content.

### 5. Write files

- Create directory `public/releases/v{newVersion}/`
- Write `public/releases/v{newVersion}/en.md`
- Write `public/releases/v{newVersion}/zh-CN.md`

### 6. Update package.json

Update the `version` field in `package.json` to the new version number. Do **not** modify any other fields.

### 7. Verify

- Confirm both `en.md` and `zh-CN.md` exist under `public/releases/v{newVersion}/`
- Confirm `package.json` version matches the new version
- Show a summary of what was created

### 8. Create git tag and trigger CI/CD

After all files are committed, create an annotated git tag and push it to trigger the Android build workflow:

```bash
git tag -a v{newVersion} -m "Release v{newVersion}"
git push origin v{newVersion}
```

This will automatically trigger the GitHub Actions workflow to build and publish the signed Android APK to GitHub Releases.

## Reference: Existing release notes style

Below is an example from v1.1.0 for tone and formatting reference:

**en.md:**
```markdown
# v1.1.0

> 2026-02-27

## Features

### Gallery Drawer
- New photo management panel (Gallery Drawer) for browsing and managing uploaded photos
- Deep integration with the map page — click to locate the corresponding photo position

### Privacy Settings
- New privacy section in the settings panel
- Localized display of data collection and privacy policies in Chinese and English

## Refactor

- Extracted shared formatting utilities to `lib/formatters.ts`, eliminating duplicate logic
- Unified GPS type naming to `GPSCoordinates`
```

**zh-CN.md:**
```markdown
# v1.1.0

> 2026-02-27

## Features

### Gallery Drawer
- 新增照片管理面板（Gallery Drawer），可浏览和管理已上传的照片
- 与地图页面深度集成，点击即可定位到对应照片位置

### Privacy Settings
- 设置面板新增隐私说明区域
- 支持中英文本地化展示数据收集与用户隐私政策

## Refactor

- 提取通用格式化工具函数至 `lib/formatters.ts`，消除重复逻辑
- 统一 GPS 类型命名为 `GPSCoordinates`
```
