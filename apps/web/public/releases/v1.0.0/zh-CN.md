# v1.0.0

> 2026-02-22

## Features

### Settings
- 新增设置面板入口（地图右下角菜单 → Settings 齿轮图标）
- 底部 Drawer 滑出，与上传照片面板风格一致

### Theme
- 支持浅色 / 深色 / 跟随系统三档切换，默认深色
- 地图样式随主题同步切换（深色 Dark Matter / 浅色 Voyager 灰色系）
- 主题偏好持久化保存至 localStorage

### i18n
- 支持在设置面板内手动切换中文 / English
- 语言偏好持久化保存至 localStorage

### About
- 关于页面展示应用版本号与 GitHub 仓库链接
- 版本号与仓库地址从 `package.json` 动态读取

## Bug Fixes
- 修复亮色模式下回放进度条面板透明无法看清的问题
- 修复展开菜单的阴影在 `overflow-hidden` 裁切下溢出显示的问题
- 修复设置面板文字颜色在亮/暗模式下的适配问题
