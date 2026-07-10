# v1.5.1

> 2026-03-06

## Features

### 移动端长按添加照片
- 在地图任意位置长按约 500ms 即可弹出快捷菜单（触屏设备）
- 支持触觉反馈，菜单弹出时设备会轻微振动
- 滑动或拖拽时自动取消长按，避免误触发
- 防止 Android 设备长按同时触发原生右键菜单导致重复弹出

## Refactor

- 将 MapContextMenu 中的 `document.addEventListener` 替换为 React 遮罩层和 `onKeyDown`，采用更符合 React 范式的关闭处理方式
- 提取可复用的 `useLongPress` Hook，用于触屏长按检测
