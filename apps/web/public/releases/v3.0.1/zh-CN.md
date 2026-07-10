# v3.0.1

> 2026-03-08

## Features

### Replay Stats Bar
- 新增轨迹回放底部动态统计栏，显示历时、点亮国家、点亮城市和总里程
- 到达新 waypoint 时数字以 spring 动画实时递增
- 包含品牌 Logo、产品名称和二维码，视觉效果对标高德分享页
- 录屏模式下统计栏依然可见，确保导出视频完整

### Globe Orbit Mode
- 新增地球轨道模式，含星空背景画布和轨道控制器
- 新增地球轨道可视化叠加层组件

### Reverse Geocoding
- 新增离线国家检测，基于 NaturalEarth 边界数据 + 点包含多边形算法
- 新增城市检测，查询 MapLibre CARTO 矢量瓦片，50km 阈值内取最近城市

## Bug Fixes

- 移除录屏时隐藏光标的 hack，修复视觉闪烁问题
- 修复碎片模式初始缩放，保留用户当前地图中心而非重置到 (0, 20)

## Refactor

- 将 "Powered by Locusify" 水印整合进回放统计栏，消除重复品牌元素
- 简化 RegionFillLayer，移除 canvas 裁剪照片逻辑，改用高亮填充
- 将录制流程提取为独立的 `useRecordingFlow` hook，关注点分离
- 将回放开场动画提升至 MapSection 层级，供轨迹回放和地球轨道共享
- 移除未使用的 `image-processing.ts` 工具模块
