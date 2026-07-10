# v0.1.0 — Initial Release

> 2026-02-21

## Features

### Photo Upload
- 拖拽上传照片，自动提取 EXIF / GPS 信息
- 支持批量导入，自动按拍摄时间排序

### Interactive Map
- 基于 MapLibre GL 的交互式地图
- 照片自动聚合为 Cluster 标记，点击展开
- 上传后自动适配地图视野范围

### Trajectory Replay
- 时间轴驱动的轨迹动画回放
- 支持播放 / 暂停 / 跳转 / 倍速控制
- 回放时镜头跟随当前位置飞行
- 右上角实时展示当前照片卡片

### Video Recording
- 回放同时录制为 MP4（H.264，WebCodecs）
- 不支持 WebCodecs 时自动降级为 WebM（MediaRecorder）
- 开场 Locusify Logo 动画融入视频片头
- 录制分辨率自适应限制在 1280px 以内，码率 4 Mbps
- 回放结束后弹出保存 / 丢弃面板

### i18n
- 支持中文 / 英文多语言，自动检测浏览器语言
