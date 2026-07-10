# v1.4.0

> 2026-03-05

## Features

### Screen Capture 录制
- 使用浏览器 Screen Capture API (`getDisplayMedia`) 替代 Canvas 手动绘制录制
- 录制内容直接捕获浏览器标签页，回放与录制视频完美一致，彻底消除双渲染不一致问题
- 删除约 900 行 Canvas 手动绘制代码（intro、photo card、avatar、watermark、transport badge）
- 录制期间自动屏蔽系统声音、隐藏鼠标光标，输出更干净
- 录制期间禁止切换共享标签页，防止误操作

### 录制 UI 优化
- 录制期间自动隐藏菜单按钮和回放控制栏，视频画面无干扰
- 录制期间显示 DOM 水印（"Powered by Locusify"），被自然捕获进视频
- 回放结束后 2 秒自动停止录制

## Refactor

- 移除 `mediabunny` 依赖（WebCodecs MP4 编码）——不再需要
- 移除 `iconPaths.ts` Canvas SVG 渲染数据——不再被引用
- 新增 `recordingActive` 状态到 replay store，统一管理录制期间的 UI 显隐
