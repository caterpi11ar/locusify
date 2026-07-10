# v1.3.1

> 2026-03-05

## Features

### 每次播放展示 Logo 动画
- 每次点击播放（恢复、重播）都会触发 Logo 开场动画和 fitBounds，与初次进入轨迹回放体验一致
- `ReplayIntroOverlay` 重构为受控组件，通过 `visible` / `onExitComplete` props 灵活控制显隐
- `TrajectoryController` 在每次进入播放状态时重新执行地图全景适配，确保缩放级别一致

### 浮动照片卡片
- 轨迹回放时新增浮动照片卡片，通过虚线连接到当前路径点
- 响应式偏移定位，适配移动端和桌面端
- 照片卡片样式常量提取至 `waypointStyle.ts` 统一管理

## Refactor

- `LazyImage` 组件新增 `objectFit` 属性，支持灵活的图片填充模式
- `ReplayControls` 播放按钮统一使用 `onPlayClick` 回调处理所有非播放状态
- 视频录制器开场绘制逻辑优化，改进 Canvas 渲染
