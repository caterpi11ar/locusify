# v3.0.6

> 2026-03-11

## Features

### Android Release Pipeline
- Gradle 自动从 `package.json` 读取版本号，单一数据源，无需手动同步
- 新增 `build:android` 脚本，一条命令完成签名 APK 构建
- 新增 GitHub Actions 工作流：推送 `v*` tag 自动构建并发布签名 APK 到 GitHub Releases
- 启用 R8 代码压缩和资源优化，减小 APK 体积
- 添加 Capacitor 专用 ProGuard keep 规则

### App Icon
- 替换默认 Android 机器人图标为 Locusify 品牌 logo，覆盖所有密度
- Adaptive icon foreground 按安全区域规范居中放置

## Bug Fixes

- 升级 AGP 至 8.9.1，compileSdk 至 36，修复 `androidx.browser` 兼容性问题
