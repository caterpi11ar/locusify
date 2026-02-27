# v1.1.0

> 2026-02-27

## Features

### Gallery Drawer
- 新增照片管理面板（Gallery Drawer），可浏览和管理已上传的照片
- 与地图页面深度集成，点击即可定位到对应照片位置

### Privacy Settings
- 设置面板新增隐私说明区域
- 支持中英文本地化展示数据收集与用户隐私政策

### SEO
- 全面优化站点 SEO（meta 标签、结构化数据等）
- 新增 llms.txt，更新 robots.txt 与 sitemap.xml
- 针对 AI 搜索引擎优化内容可见性

### Documentation
- 重写中英文 README，补充完整产品介绍
- 新增移动端体验二维码入口

## Refactor

- 提取通用格式化工具函数至 `lib/formatters.ts`，消除重复逻辑
- 统一 GPS 类型命名为 `GPSCoordinates`
- 抽取 `SettingOptionGroup` 共享组件，减少设置面板重复代码
- 提取 `glassPanel` 样式常量至 `utils.ts`
