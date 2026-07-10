# v3.0.4

> 2026-03-10

## Features

### Custom Caption in Text Overlay
- 文字标签设置中新增自定义说明文字输入框
- 用户手动输入的文字优先于 AI 生成的标题在回放中显示

### Music Unavailability Indicator
- 音乐曲目加载失败时不再静默无响应，改为显示「即将推出」标签
- 暂不可用的曲目以灰显样式展示，且不可点击，用户状态一目了然
- `AudioManager` 新增 `probeTrack()` 与 `isUnavailable()` 方法用于可用性检测

### Replay Config Flow
- 操作栏优先显示，点击播放按钮时才展开模板选择面板
- 回放配置入口体验更流畅

## Bug Fixes

- 修复滤镜、转场、文字样式、位置标签直接显示原始英文字符串的问题，现已正确走 i18n 流程，中文下显示正常
- 修复 `ReplayTextOverlay` 从未挂载到页面的问题，回放过程中文字叠层现在可以正常显示在地图上
- 修复移动端地球缩放响应式问题，iPhone 尺寸下现可完整显示地球
