# LOC-40 本地复用交付

本地开发分支，尚未获准分发。基线 Locusify `4c83fec43c32003a02a834300d9019a8972c8fb1`；上游 Afilmory `c392e065b03977fbe5fe256eb902121f0e4cdb30`。先完成 `docs/loc-40-design-handoff.md`，再实施。

## 实现

地图侧边栏照片入口现在进入 `/en/photos` 或 `/zh-CN/photos`；新页面含照片/地图切换、设备内导入、比例瀑布流、本地详情、浏览器返回关闭、无 GPS 状态、坏图移除、离线底图错误提示和 Afilmory 署名。地图复用上游渲染、聚合和锚定卡片源码，保留现有旅程工作区入口。

从 LOC-39 留存源码逐项复核 45 个候选文件 SHA-256。实际复制 11 个文件：全部因为 import、数据、状态、样式或仓库格式规则发生适配，**无最终字节完全不变文件**。详见 `source-manifest.json`、`CHANGES.md`、`adaptations.diff`，不宣称整页完全拷贝。未复制示例照片、公开 manifest、云配置或上游应用壳。

新增桥接：local-gallery 提供共享照片、滚动容器、查看器、本地配对视频和目标图标；local-map-action 将原照片 ID 链接变为内存详情操作；offline-map 提供固定低精度本地数据样式。没有引入 Jotai、远程 manifest、上游视频转换器或逆地理编码。上游 EXIF 格式化覆盖层未迁移，详情首版显示名称、日期与位置状态；Motion Photo 转换链未复制，已有旅程工作区能力保留。

本地 Photo 模型增加真实解码尺寸；无拍摄时间不再伪造当前时间。重复导入回收被拒绝的 blob URL，保留仍在使用的 URL。图片/视频 URL 仍由 photoStore 在删除/清空时回收。

新增依赖固定于锁文件：masonic 4.1.0、@essentials/request-timeout 1.3.0、@react-hook/window-size 3.1.1。没有整体升级 React/MapLibre/motion。

## 隐私与底图

新地图与原旅程地图均改用同一固定 GeoJSON；不再在这些渲染器使用 CARTO 样式。旧 CARTO JSON 留作仓库历史文件，运行入口不再导入。移除应用入口 GA/SpeedInsights 挂载及 EXIF 文件名控制台日志。新地图没有定位按钮；现有旅程地图的定位操作未扩展。

底图使用仓库已有 `packages/app/public/geo/ne_110m_admin_0_countries.geojson`，固定于上述 Locusify 基线。SHA-256：`d2aec98bfd1ffda2d8adea42b7ec473365eef38defc48e83afb7d58ae60bfe7c`。这是 Natural Earth 1:110m 国家轮廓，不含街道；没有根据照片区域下载。Natural Earth 官方说明其地图数据属于 public domain，可修改和分发，核对日期 2026-10-30：[Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/)。本记录固定现有资源字节，不宣称已追溯其最初下载版本。需要对地图数据来源做更严格版本追溯时，应在分发前补齐原始数据版本证据。

样式不含 glyph/sprite/瓦片 URL（不使用文字或精灵图层），因此无需在线字体或精灵；界面字体与 MapLibre worker 随构建同源打包。资源缺失显示错误且无在线回退。城市地名原本依赖 CARTO source features，离线概览下不能宣称仍有街道/城市级细节。

## 许可与阻塞

保留完整上游 ANL/AGPL/MIT 文本（`LICENSE`），新增直接依赖原始通知（`dependency-licenses/`），界面提供 Afilmory 版权、commit、许可链接、上游来源及“本地开发/分发待确认”状态。源文件的改动日期和理由位于 `CHANGES.md` 与机器清单。

**本次不 push、不创建包含复制代码的 PR、不合并、不部署、不发布源码附件**。具体门槛来自 LOC-40 当前描述：所有者未确认整体分发许可路线。GitHub PR 会把适配源码交给远端，故按任务明确约束暂停此步骤；根 LICENSE 和 app 的 ISC 元数据未擅自修改，也不能把本地组合版本作为 ISC-only 发行。

Masonic 内嵌 hook 注释没有准确原始 commit，已保留复制说明和当前依赖的 MIT 通知，仍未消除 LOC-39 的版本追溯缺口。最终完整传递依赖 notices/SBOM、组合应用许可元数据、对应源码发布地址/源码包，需要在确认分发路线后完成；目前 UI 上游链接不能替代适配版本的 Corresponding Source。此版本仅作为本地实现评审材料，不能作为可发行包。

## 重建与验证

使用仓库固定 pnpm 10.15.0；本机 Node 26.3.0。

```sh
pnpm install --frozen-lockfile --prod=false
pnpm --filter @locusify/app build
pnpm --filter @locusify/app exec vitest run
```

生产构建含 `tsc -b` 和本地 SEO 页面生成；构建通过，保留 MapLibre 大 chunk 的体积警告。9 个测试文件、68 项测试通过；其中新增照片 store 的 2 项及迁移上游地图的 3 项行为测试。所有改动 TS/TSX 文件运行 ESLint。

浏览器使用系统 Edge 156.0.4314.50（Chromium），1440×900 桌面及 390×844 手机布局模拟，DPR=1、缩放=1。通过 viewport 技能的实际 PNG 尺寸校验；不等于 Safari 或实机认证。仅使用生成的横竖 PNG、合成 GPS JPEG 和损坏文件。

已验证：空图库、导入、真实比例、无 GPS 地图动作禁用、浏览器返回关闭详情、GPS 详情到地图、锚定照片卡片、手机布局、坏图错误与移除、底图缺失状态。上述流程记录中没有外部资源请求或正常流程页面异常；底图缺失预期产生加载错误。JSON 与截图由 issue 附件交付。

**这不是独立隐私验收**。QA 仍需对固定 head 检查较大图库滚动/焦点、重复定位/聚合、完整回放/导出、长会话 URL 生命周期、登录状态的生产网络、首次离线启动、更多错误路径与响应式尺寸。保留现有回放代码及通过单元测试，不等于完整回放/导出浏览器回归已通过。
