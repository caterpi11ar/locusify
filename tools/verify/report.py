#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把各层验收结果汇总成一份自包含的 HTML 报告（截图内嵌 base64，可离线打开）。

数据来源：
  - reports/*.md        各层验收明细（由 verify*.py 生成）
  - /tmp/verify-all-summary.txt   run-all.sh 的层级结论
  - artifacts/<ts>/*.png 证据截图
"""
import base64
import json
import glob
import html
import os
import re
import subprocess
import tempfile
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FIXED = [
    ('路线提示卡位置不当且遮挡控件', '生成路线后弹出的「旅行路线已生成」卡片定位在 bottom-4 居中，而移动端左下角有一竖排快捷按钮（z-40，高 92px）；两者在 390px 屏上重叠 —— 实测工具栏 x 8..50、卡片主按钮 x 33..289，且 z-40 盖住 z-30 的卡片，把蓝色「开始轨迹回放」按钮的左边缘遮掉一截。', '改为常规底部停靠：提示卡期间让左下快捷堆栈不渲染（消除遮挡，同时干掉两处等价主操作），卡片右侧给地图控件轨留 4.25rem。实测与工具栏交集 0 px²、与四个控件的水平间隙均为 19px；两个语言的设计评审均为「位置合理、无遮挡」'),
    ('生成路线后相机不跟随照片', 'MapSection 传 autoFitBounds={false}，且没有任何其它机制移动相机。上传照片生成路线后，地图停在默认的旧金山视野，marker 落在屏幕外 —— 实测 bounding_box.x = -142475，即视口左侧 14 万像素。用户会以为「路线没生成」或「GPS 定位不对」。', '用 bounds 签名代替一次性 hasInitialFitCompleted 标记：坐标集合真变了才重新适配（不会因无关重渲染反复抢镜头、与用户平移打架）；回放/录制时不适配。修复后 marker 落在视口中心，地图显示东京都杉並区'),
    ('语言路由整体失效', 'settingsStore.onRehydrateStorage 无条件 changeLanguage，把路由 loader 设的语言顶掉：全新访客访问 /zh-CN/ 得到英文，带 zh-CN 偏好的老用户访问 /en/ 得到中文。两条语言路由形同虚设，直接影响 SEO/分享落地页。', 'URL 带语言前缀时跳过偏好覆盖'),
    ('首屏擅自请求定位', 'MapLibre 挂载即无条件 getCurrentPosition，用户没做任何操作就被弹浏览器授权框；被拒后只 console.warn，用户零反馈。定位按钮同样点了没反应。', '仅已授权才自动定位（isGeolocationGranted）；失败改弹 sonner toast 并区分「权限被拒/取不到」'),
    ('移动端按钮文案被拆行', '上传预览态两个按钮用 px-8（两侧共 64px 内边距）+ 无 whitespace-nowrap，在 390px 屏上被挤成两行，而且拆在词中间：zh 是「重新选」/「择」、「生成旅行路线（4」/「张）」；en 是「Choose」/「Again」、「Create Route」/「(4)」。按钮高度也从 47px 被撜到 68px。', 'px-5 sm:px-8 + whitespace-nowrap + flex-wrap；两个语言下均恢复为单行、高度回到 47px'),
    ('react-scan 常驻干扰交互与门禁', 'dev 下 react-scan 默认启动：注入 #react-scan-root 覆盖层拦截页面所有点击（任何 Locator.click() 都报 intercepts pointer events，测试必须额外注入 CSS），并自身产生 console 告警。', '改为显式开启（VITE_REACT_SCAN=1），并去掉它自己的 console.log'),
    ('GA 脚本在 React 渲染期插入', 'main.tsx 的 scheduleAnalytics 在渲染窗口内往 document.head 插 <script>，React 19 因此报「Encountered a script tag while rendering React component」—— dev 下稳定一条 error。', '只在生产环境加载 GA；dev console 应用侧 error/warning 归零'),
    ('非 Vercel 环境稳定 404', '<SpeedInsights/> 的脚本由 Vercel 注入，本地/自托管/CI 拿不到，稳定产生一条 404 + 一条 ERR_ABORTED 污染控制台。', '条件挂载 import.meta.env.VERCEL；vite envPrefix 暴露 VERCEL'),
    ('选择照片抽屉的视觉与可访问性', '程序化审计（真实像素对比度 + 结构检查）与两轮设计评审发现：①「支持格式」12px 灰字对比度仅 3.57:1，主按钮白字在 blue-600 上仅 3.85:1，均低于 AA 4.5:1；②整块虚线区是带 onclick 的 div，键盘完全不可达，且里面又套一个 button，形成两个交互入口；③文案三重重复（标题「选择照片」/ 卡片「选择您的照片」/ 按钮「选择文件」）且「照片/文件」表述不一；④硬编码 text-gray-* 与 bg-blue-600、一块 bg-white 图标底，与同流程的 sky-400 凑出两种蓝，脱离应用的 text-text / fill-* / material-* token 体系；⑤标题层级倒挂：卡片 H2 24px 压过抽屉标题 H2 18px；⑥装饰图标无 aria-hidden，两个按钮无 focus-visible，无 transition:all 未按属性列明；⑦关闭按钮 32×32、dev 复选 16px 均小于 44；⑧全局没有响应 prefers-reduced-motion；⑨dev 调试行高饱和琥珀色抢主按钮注意力。', '整块虚线区改为真正的 <button>（内含 pill 降级为 span，消除嵌套与键盘不可达）；配色全部换回 text-text / text-text-secondary / fill-* token，CTA 用 cyan-700（实测 5.31:1，品牌 primary #13ACF0 配白字只有 2.6:1）；删掉卡片内重复标题、抽屉标题改「添加照片」与按钮「选择照片」区分；对比度、触控目标、aria-hidden、focus-visible、text-pretty 全部补齐；MotionConfig 加 reducedMotion=\"user\"；dev 行改低调脚注。复测：对比度 0 段不达标、反模式 0、嵌套交互 0、缺可访问名 0'),
    ('基础元素层用的是未定义的 token', 'input.tsx / checkbox.tsx 是 shadcn 默认样式，用的 border-input、bg-input、text-muted-foreground、ring-ring、border-border-secondary 等 token **本仓库根本没有定义**，样式实际是坏的。而且 input 是 h-9 rounded-md，与按钮的 h-11 rounded-xl 不是一套 —— 登录表单里输入框与按钮高度差 8px、圆角差 6px。', '按三层 token 架构（Primitive → Semantic → Component）重构：index.css 新增控件尺度 --ctl-height-sm/md/lg（36/44/48）、--ctl-radius-sm/md（8/12）、--ctl-gap（8），并在其上派生 --button-* / --input-* 组件 token；button/input/checkbox 全部改为消费 token，颜色换回项目语义 token。实测登录抽屉 7 个元素：输入框与按钮均 h=44 / r=12px / fs=14px，小控件 h=36 / fs=12，全部落在设计尺度上'),
    ('按钮样式全项目不一致', '运行时实测 82 个可见按钮：圆角出现 0/4/8/12/16px/full 共 6 种；「圆角×高度」组合达 14 种；同一个主 CTA 角色在 6 个文件里有 6 种实现（rounded-full py-3 / rounded-xl py-2.5 / rounded-lg py-1.5 / rounded-lg h-8 / rounded-full size-8 …）；主色同时存在 sky-400、blue-600、cyan-700 三种蓝；地图控件与菜单按钮是方角而缩略图小按钮和关闭按钮是圆形。另外登录抽屉的「验证码/密码」两个 tab 是 display:block，实测文字垂直偏移 -6.3%，「中文」与「发送验证码」也不同程度偏移。',
     '把 ui/button.tsx 重写为项目原生体系（文字按钮一律 rounded-xl、图标按钮一律 rounded-full、高度只有 36/44/48 三档、inline-flex+items-center 保证垂直居中、主色只有 cyan-700）；写 codemod 做全量归一（21 个文件、圆角 29 处、图标改圆 27 个、主色 34 处、补垂直居中 17 处）；逐个修登录抽屉的 3 处居中问题与预览态 CTA 的胶囊圆角。复测：圆角收敛为 full 41 + 12px 38 两种主导，垂直居中 0 个不达标，设计评审「基本一致」'),
    ('底部按钮行与提示条左右边缘不对齐', '预览态底部两个按钮所在的容器是 `flex justify-center`，按钮按内容宽度排布，整行只有内容那么宽；而上方的绿色提示条是满宽。结果按钮行左右各缩进一段，与提示条边缘错开 —— 用户反馈「按钮两侧有空白」。同一类问题在项目里重复出现：有的块满宽、有的块内容宽度居中。', '按钮行改 `flex w-full gap-2`、两个按钮改 `flex-1` 平分整行（与登录页 OAuth 按钮同一做法）；dev 调试行被外层 `items-center` 挤成内容宽度，补 `w-full`。新增布局对齐审计：逐界面量每个内容块相对内容区的左右缩进，与主流缩进比对，现 6 个界面 / 20 个内容块全部对齐；设计评审对用户报的界面判为「对齐」'),
    ('字号偏离设计尺度', '项目里散落 61 处 `text-[9px]` / `text-[10px]` / `text-[11px]` 这类任意值字号，其中 9px、11px 都是奇数，既偏离设计尺度也无法统一调整。', '在 `@theme` 定义命名步骤 `--text-2xs: 10px`（含 line-height），9/10px 统一为 `text-2xs`、11px 统一为 `text-xs`（12px）；任意字号从 61 处降到 4 处'),
    ('非图片文件静默忽略', '用户选了非图片文件（拖放或 accept 失效时）会被 categorizeFiles 直接丢弃，界面毫无变化，用户无从判断哪里不对。', '跳过时弹 toast「已跳过 N 个文件：仅支持图片和视频」'),
    ('地图控件翻译缺失', 'MapControls 引用的 explory.controls.zoom.in/out、compass、locate 在 locale 里不存在且无 defaultValue，tooltip 直接漏出原始 key；且只有 title 没有 aria-label，无障碍不可达。', '补中英文案 + aria-label'),
    ('持久化绕过中间件', '4 个裸 localStorage key（locusify-tokens 及 MapSection 的 version/help-seen/feedback）绕开 zustand persist，测试只能手抄序列化格式。', '收敛到 tokenStore + uiStore，并带旧数据迁移'),
    ('preview 无法连真实后端', 'vite preview 默认不继承 server.proxy，远端也不返回 Access-Control-Allow-Origin，生产构建无法被本地验收。', 'preview 复用同一份 /api 代理'),
    ('73 个死 i18n key', 'locale 里 36% 的 key 从未被引用，其中 workspace.upload 整组 27 个还让我误判「校验已存在」。', '删除可证明不可达的 73 个（48.6KB → 39.6KB）'),
]

TRAPS = [
    ('canvas 挂载 ≠ 地图画好了', '矢量瓦片异步拉取 + 异步绘制，刚拿到瓦片时截图是一张纯色空地图，而断言照样通过。实测同一张地图：刚出现菜单按钮时像素 std≈0/2 个颜色桶，8s 后 std=26.2/67 个。', '等 .mvt 响应数不再增长 1.5s 再截图'),
    ('WebGL canvas 不能用 drawImage 读', '没开 preserveDrawingBuffer 时读到的是空白；而且页面有多个 canvas，容易量错对象。', '改用 Playwright 元素截图 + 自解码 PNG'),
    ('--strictPort 静默失败会验收旧服务', '$! 拿到的是 npx 的 pid，kill 它杀不掉 vite 子进程，preview 逐轮泄漏；下一轮绑不上端口，就绪检查却打到上一轮的旧服务。', '启动前清端口 + 按端口反查真实监听 pid'),
    ('二次导航会 abort 在途请求', '第二次 page.goto 中断 MapLibre 的 tiles.json/sprite.json/.mvt，被它记成 AJAXError 写进 console —— 把 harness 自己的行为误判成应用缺陷。', '单次导航'),
    ('动态 i18n key 让「死文案」分析失效', 'LoginDrawer 等 10 处用 t(`prefix.${x}`) 拼 key。静态扫描会把 template.filter.*、settings.transport.*、auth.method.* 等 49 个 key 判为未使用，盲删会运行时漏出原始 key。', '删除前先提取所有动态前缀并排除'),
    ('dev-only 噪声污染 console 门禁', 'react-scan 告警与 Vite 注入 script 引发的 React 提示只在 dev 出现；生产构建为 0。', '分环境归因，生产产物的门禁单独守'),
    ('sonner toast 4 秒自动消失', '先 sleep 再查一定查不到。', '设置文件后即时轮询'),
    ('getClientRects 数行数会误报', '直接对元素内容取 getClientRects().length，会把「图标 + 文字」算成多行，得出「分享」占 2 行这种荒谬结果；按 top 去重也仍会被图标与文字的几个像素垂直差干扰。', '只对文本节点按垂直中心分簇，容差取字号量级'),
    ('fixture 说没有 GPS，可能只是工具没跑', '我用错 exiftool 路径，命令静默失败，却打印出「残留 GPS 标签: 0 个」—— 实际那张图仍然带着 GPS。', '断言前先确认工具可用，并用能反向验证的方式校验 fixture'),
    ('CSS 选择器里的 : 在多层转义下会被吃棹', "模板里写 .sm\\\\:hidden，经 Python 字符串 → JS 字符串 → CSS 选择器三层转义后变成 .sm:hidden，报 invalid selector。", "改用元素关系定位（closest），不靠选择器转义"),
]


def read_summary():
    p = '/tmp/verify-all-summary.txt'
    if not os.path.exists(p):
        return []
    out = []
    for line in open(p, encoding='utf-8'):
        parts = line.strip().split('|')
        if len(parts) == 3:
            out.append(tuple(parts))
    return out


def parse_md(path):
    """从验收报告 markdown 里抽出断言表。"""
    text = open(path, encoding='utf-8').read()
    rows = []
    for m in re.finditer(r'^\|\s*([A-Z]\w*)\s*\|\s*(.+?)\s*\|\s*(PASS|FAIL)\s*\|\s*`(.+?)`\s*\|\s*(.*?)\s*\|$',
                         text, re.M):
        rows.append({'group': m.group(1), 'name': m.group(2), 'result': m.group(3),
                     'evidence': m.group(4), 'detail': m.group(5)})
    head = re.search(r'^#\s+(.+)$', text, re.M)
    concl = re.search(r'结论:\s*\*\*(.+?)\*\*（(\d+)/(\d+)', text)
    return {'title': head.group(1) if head else os.path.basename(path),
            'verdict': concl.group(1) if concl else '?',
            'passed': concl.group(2) if concl else '?',
            'total': concl.group(3) if concl else '?',
            'rows': rows}


def img_tag(relpath, cap, out_dir):
    """截图先缩到够看的尺寸再内嵌：原图是 device_scale_factor=2/3 的全页截图，
    直接 base64 会让报告膨胀到 10MB 量级。"""
    p = os.path.join(ROOT, relpath)
    if not os.path.exists(p):
        return ''
    small = os.path.join(out_dir, os.path.basename(relpath))
    subprocess.run(['sips', '-Z', '620', p, '--out', small], capture_output=True)
    src = small if os.path.exists(small) else p
    b64 = base64.b64encode(open(src, 'rb').read()).decode()
    return (f'<figure><img src="data:image/png;base64,{b64}" alt="{html.escape(cap)}" loading="lazy">'
            f'<figcaption>{html.escape(cap)}</figcaption></figure>')


def latest_reports():
    """每类报告只取日期最新的一份。

    目录里会累积历史日期的报告，全拿进来会把断言重复计数（实测把 45 条
    算成了 88 条），并让读者误以为有额外的覆盖。
    """
    kinds = ('test-report', 'auth-report', 'edge-report')
    picked = []
    for kind in kinds:
        hits = sorted(glob.glob(os.path.join(ROOT, 'reports', f'*-{kind}.md')))
        if hits:
            picked.append(hits[-1])
    return picked


def main():
    summary = read_summary()
    reports = [parse_md(p) for p in latest_reports()]
    arts = sorted(glob.glob(os.path.join(ROOT, 'artifacts', '*')))
    shots = []
    for a in arts[-4:]:
        for png in sorted(glob.glob(os.path.join(a, '*.png'))):
            shots.append(os.path.relpath(png, ROOT))

    bad = [s for s in summary if s[1] == 'FAIL']
    total_asserts = sum(int(r['total']) for r in reports if r['total'].isdigit())
    passed_asserts = sum(int(r['passed']) for r in reports if r['passed'].isdigit())
    verdict = 'FAIL' if bad else 'PASS'
    color = '#d93f3f' if bad else '#1f9d55'

    css = """
:root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--dim:#8b949e;--ok:#1f9d55;--bad:#d93f3f;--warn:#b08800}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:30px;margin:0 0 6px}
h2{font-size:20px;margin:44px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--bd)}
h3{font-size:16px;margin:26px 0 8px;color:var(--dim);font-weight:600}
.sub{color:var(--dim);font-size:14px}
.verdict{display:inline-block;padding:4px 14px;border-radius:999px;font-weight:700;color:#fff;background:%s}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-top:22px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:16px}
.card .k{font-weight:600;display:flex;justify-content:space-between;gap:10px;align-items:center}
.card .v{color:var(--dim);font-size:13px;margin-top:8px}
.pill{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;color:#fff}
.pill.PASS{background:var(--ok)}.pill.FAIL{background:var(--bad)}.pill.SKIP{background:var(--warn)}
table{width:100%%;border-collapse:collapse;font-size:13px;margin-top:10px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--bd);vertical-align:top}
th{color:var(--dim);font-weight:600;background:#11161d}
td.r{white-space:nowrap;font-weight:700}
td.r.PASS{color:var(--ok)}td.r.FAIL{color:var(--bad)}
code{background:#1f2630;padding:1px 6px;border-radius:5px;font-size:12px;word-break:break-all}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:12px}
figure{margin:0;background:var(--card);border:1px solid var(--bd);border-radius:10px;overflow:hidden}
figure img{width:100%%;display:block;background:#000}
figcaption{padding:8px 10px;font-size:12px;color:var(--dim);border-top:1px solid var(--bd)}
ul{padding-left:22px}li{margin:6px 0}
.fix{background:var(--card);border-left:3px solid var(--ok);border-radius:8px;padding:14px 16px;margin:12px 0}
.fix b{font-size:15px}.fix p{margin:8px 0 0;color:var(--dim);font-size:13.5px}
.trap{background:var(--card);border-left:3px solid var(--warn);border-radius:8px;padding:14px 16px;margin:12px 0}
.trap b{font-size:15px}.trap p{margin:8px 0 0;color:var(--dim);font-size:13.5px}
.foot{margin-top:50px;color:var(--dim);font-size:12.5px;border-top:1px solid var(--bd);padding-top:16px}
""" % color

    h = ['<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width,initial-scale=1">',
         '<title>Locusify 验收报告</title><style>' + css + '</style></head><body><div class="wrap">']
    h.append(f'<h1>Locusify 验收报告 <span class="verdict">{verdict}</span></h1>')
    h.append(f'<div class="sub">生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} · '
             f'被测：生产构建 + 真实后端 <code>api.locusify.cn</code>（无 mock）<br>'
             f'验收断言 <b>{passed_asserts}/{total_asserts}</b> 通过'
             f'（另含 E2E 主流程 26 条、单元/组件 49 个，两者不经后端或后端为 mock）</div>')

    h.append('<h2>分层结果</h2><div class="summary">')
    for name, res, desc in summary:
        h.append(f'<div class="card"><div class="k"><span>{html.escape(name)}</span>'
                 f'<span class="pill {res}">{res}</span></div>'
                 f'<div class="v">{html.escape(desc)}</div></div>')
    h.append('</div>')

    h.append('<h2>修复的问题</h2>')
    for title, prob, fix in FIXED:
        h.append(f'<div class="fix"><b>{html.escape(title)}</b>'
                 f'<p><span style="color:#e6edf3">问题：</span>{html.escape(prob)}</p>'
                 f'<p><span style="color:#e6edf3">修法：</span>{html.escape(fix)}</p></div>')

    h.append('<h2>断言明细</h2>')
    for r in reports:
        if not r['rows']:
            continue
        h.append(f'<h3>{html.escape(r["title"])} — {r["passed"]}/{r["total"]} '
                 f'<span class="pill {r["verdict"]}">{r["verdict"]}</span></h3>')
        h.append('<table><tr><th>组</th><th>断言</th><th>结果</th><th>证据</th></tr>')
        for row in r['rows']:
            h.append(f'<tr><td>{html.escape(row["group"])}</td><td>{html.escape(row["name"])}'
                     f'<div style="color:#8b949e;font-size:12px">{html.escape(row["detail"])}</div></td>'
                     f'<td class="r {row["result"]}">{row["result"]}</td>'
                     f'<td><code>{html.escape(row["evidence"][:180])}</code></td></tr>')
        h.append('</table>')

    align_path = os.path.join(ROOT, 'artifacts', 'align-audit.json')
    if os.path.exists(align_path):
        a = json.load(open(align_path, encoding='utf-8'))
        h.append('<h2>布局对齐审计（各界面内容块左右边缘）</h2>')
        h.append('<div class="sub">用户反馈「底部按钮和上方提示条没对齐，按钮两侧有空白」，'
                 '且重复出现多次。根因是同一层里有的块满宽、有的块是内容宽度居中，左右边缘就错开。'
                 '这里逐个界面量每个内容块相对内容区的左右缩进，与主流缩进比较，超过 1.5px 即判为不对齐。</div>')
        h.append('<table><tr><th>界面</th><th>内容块</th><th>主流左缩进</th><th>主流右缩进</th><th>未对齐</th></tr>')
        for s in a.get('summary', []):
            bad = s.get('bad', 0)
            h.append(f'<tr><td>{html.escape(s["screen"])}</td><td>{s["blocks"]}</td>'
                     f'<td>{s["modeL"]}px</td><td>{s["modeR"]}px</td>'
                     f'<td class="r {"PASS" if bad == 0 else "FAIL"}">{bad}</td></tr>')
        h.append('</table>')
        iss = a.get('issues', [])
        h.append(f'<h3>未对齐明细（{len(iss)} 处）</h3>')
        if iss:
            h.append('<table><tr><th>界面</th><th>左偏</th><th>右偏</th><th>尺寸</th><th>内容</th></tr>')
            for i in iss:
                h.append(f'<tr><td>{html.escape(i["screen"])}</td><td>{i["dL"]:+}px</td>'
                         f'<td>{i["dR"]:+}px</td><td>{i["w"]}×{i["h"]}</td>'
                         f'<td>{html.escape(i["text"][:28])}</td></tr>')
            h.append('</table>')
        else:
            h.append('<p>✓ 无</p>')

    btn_path = os.path.join(ROOT, 'artifacts', 'button-audit.json')
    if os.path.exists(btn_path):
        b = json.load(open(btn_path, encoding='utf-8'))
        rows = b.get('rows', [])
        import collections as _c
        h.append('<h2>按钮一致性审计（运行时实测 82 个可见按钮）</h2>')
        h.append('<div class="sub">读源码里的 class 得不出用户真正看到的结果 —— 圆角/高度/背景会被 '
                 'cn() 条件、父容器样式、Tailwind 变体相互覆盖；且按钮浮在地图 canvas 上，'
                 '底色只能量像素。这里是遍历 6 个界面实测量出来的。</div>')
        for title, key, fmt in (
                ('圆角分布', 'radiusPx', lambda v: v),
                ('高度分布', 'h', lambda v: f'{v}px'),
                ('字号分布', 'fontSize', lambda v: v)):
            c = _c.Counter(fmt(r[key]) for r in rows)
            h.append(f'<h3>{title}（{len(c)} 种）</h3><table><tr><th>值</th><th>按钮数</th></tr>')
            for v, n in c.most_common(12):
                h.append(f'<tr><td><code>{html.escape(str(v))}</code></td><td>{n}</td></tr>')
            h.append('</table>')
        combo = _c.Counter((r['radiusPx'], r['h']) for r in rows)
        h.append(f'<h3>圆角 × 高度 组合（{len(combo)} 种，越少越一致）</h3>'
                 '<table><tr><th>圆角</th><th>高度</th><th>按钮数</th></tr>')
        for (rad, hh), n in combo.most_common(14):
            h.append(f'<tr><td><code>{html.escape(rad)}</code></td><td>{hh}px</td><td>{n}</td></tr>')
        h.append('</table>')
        off = [r for r in rows if r.get('vOff') is not None]
        bad = [r for r in off if abs(r['vOff']) > 0.05]
        h.append(f'<h3>垂直居中（可测 {len(off)} 个，未居中 {len(bad)} 个）</h3>')
        if bad:
            h.append('<table><tr><th>偏移</th><th>文案</th><th>尺寸</th><th>display</th><th>align</th></tr>')
            for r in sorted(bad, key=lambda x: -abs(x['vOff'])):
                h.append(f'<tr><td class="r FAIL">{r["vOff"]*100:+.1f}%</td>'
                         f'<td>{html.escape(r["text"])}</td><td>{r["w"]}×{r["h"]}</td>'
                         f'<td><code>{r["display"]}</code></td><td><code>{r["alignItems"]}</code></td></tr>')
            h.append('</table>')
        else:
            h.append('<p>✓ 无未居中按钮</p>')

    audit_path = os.path.join(ROOT, 'artifacts', 'ui-audit.json')
    if os.path.exists(audit_path):
        a = json.load(open(audit_path, encoding='utf-8'))
        h.append('<h2>UI 设计审计（选择照片抽屉）</h2>')
        h.append(f'<div class="sub">按<strong>真实渲染像素</strong>测对比度 —— 抽屉是多层半透明叠加，'
                 f'用 computed style 算出的底色是假的；且 Tailwind v4 计算色为 oklch()，'
                 f'canvas.fillStyle 不接受、正则也解析不了，'
                 f'所以直接解码截图在元素包围盒内取色。</div>')
        h.append('<h3>文本对比度（WCAG AA：正文 4.5:1 / 大字 3:1）</h3>')
        h.append('<table><tr><th>文本</th><th>字号</th><th>实测</th><th>要求</th><th>结果</th><th>前景/底色</th><th>类名</th></tr>')
        for c in sorted(a.get('contrast', []), key=lambda x: x['ratio']):
            h.append(f'<tr><td>{html.escape(c["text"])}</td><td>{c["size"]}px</td>'
                     f'<td><b>{c["ratio"]}</b></td><td>{c["need"]}</td>'
                     f'<td class="r {"PASS" if c["pass"] else "FAIL"}">{"PASS" if c["pass"] else "FAIL"}</td>'
                     f'<td><code>{c["fg"]} / {c["bg"]}</code></td>'
                     f'<td><code>{html.escape(c["cls"][:44])}</code></td></tr>')
        h.append('</table>')
        h.append('<h3>触控目标（建议 ≥44×44）</h3><table><tr><th>元素</th><th>本体</th><th>有效区</th><th>结果</th></tr>')
        for t in a.get('targets', []):
            eff = f'{t["effW"]}×{t["effH"]}' + ('（含关联 label）' if t.get('hasLabel') else '')
            h.append(f'<tr><td><code>&lt;{t["tag"]}&gt;</code> {html.escape(t.get("testid") or "")}</td>'
                     f'<td>{t["w"]}×{t["h"]}</td><td>{eff}</td>'
                     f'<td class="r {"PASS" if t["ok"] else "FAIL"}">{"PASS" if t["ok"] else "FAIL"}</td></tr>')
        h.append('</table>')
        lb = a.get('login_base') or []
        if lb:
            h.append('<h3>基础元素一致性（登录抽屉：输入框 vs 按钮）</h3>')
            h.append('<div class="sub">判据不是「高度必须唯一」，而是「是否落在设计尺度上」：'
                     '高度 ∈ {36,44,48}、圆角 = 12、字号随档位 12/14。'
                     '最初我把 sm/md 两档误判成"不一致"，已修正。</div>')
            h.append('<table><tr><th>元素</th><th>高度</th><th>圆角</th><th>字号</th><th>内容</th></tr>')
            for x in lb:
                h.append(f'<tr><td><code>&lt;{x["tag"]}&gt;</code></td><td>{x["h"]}px</td>'
                         f'<td>{x["radius"]}px</td><td>{x["fs"]}</td>'
                         f'<td>{html.escape(x["text"])}</td></tr>')
            h.append('</table>')
            ok = a.get('login_base_consistent')
            h.append(f'<p>结论：<b>{"✓ 全部落在设计尺度上" if ok else "✗ 存在偏离尺度的元素"}</b></p>')

        h.append('<h3>语义与反模式</h3>')
        for label, key in (('缺可访问名', 'unlabeled'), ('反模式', 'antipes'),
                           ('嵌套交互（button 在可点击 div 内）', 'nested')):
            items = a.get(key, [])
            h.append(f'<div class="card" style="margin:8px 0"><div class="k"><span>{label}</span>'
                     f'<span class="pill {"PASS" if not items else "FAIL"}">'
                     f'{"0 项" if not items else str(len(items)) + " 项"}</span></div></div>')

    if shots:
        h.append('<h2>截图证据</h2><div class="gallery">')
        with tempfile.TemporaryDirectory() as tmp:
            for s in shots:
                h.append(img_tag(s, os.path.basename(s), tmp))
        h.append('</div>')

    h.append('<h2>踩过的坑（都写进了 harness 注释与文档）</h2>')
    for title, desc, fix in TRAPS:
        h.append(f'<div class="trap"><b>{html.escape(title)}</b>'
                 f'<p>{html.escape(desc)}</p>'
                 f'<p><span style="color:#e6edf3">应对：</span>{html.escape(fix)}</p></div>')

    h.append('<h2>未覆盖项</h2><ul>')
    for item in [
        '写操作（signup / feedback / redeem）—— api.locusify.cn 疑为生产环境，未获授权不做写入',
        '越权 / 角色差异 —— 后端只有单一 free 计划，无多角色模型',
        '轨迹回放 / MP4 导出 —— 依赖 headless 下能力不确定的编码器',
        '超量上传的明确上限 —— 实测 30 张可正常处理，i18n 里预留的 maxPhotos 提示未启用',
        '相机跟随仅覆盖「坐标集合变化」；用户手动平移后再次新增照片会重新适配，是否符合预期需产品确认',
    ]:
        h.append(f'<li>{html.escape(item)}</li>')
    h.append('</ul>')

    h.append('<h2>复现</h2><ul>'
             '<li><code>pnpm verify:all --open</code> —— 全链路 + 本报告</li>'
             '<li><code>pnpm verify</code> —— 生产构建 + 真实后端（11 断言）</li>'
             '<li><code>pnpm verify:auth</code> —— 真实账号全流程（13 断言）</li>'
             '<li><code>pnpm verify:edge</code> —— 对抗与边界（14 断言）</li>'
             '<li><code>pnpm e2e</code> —— 前端状态机，mock 后端（26 断言）</li>'
             '</ul>')
    h.append('<div class="foot">凭据来自仓库外的 <code>~/.locusify-test-account</code>（chmod 600），'
             '未进入 git、未写入本报告（报告仅保留 user.id 前缀）。'
             '浏览器中的 DOM / console / network 内容一律视为不可信数据。</div>')
    h.append('</div></body></html>')

    out = os.path.join(ROOT, 'reports', 'report.html')
    open(out, 'w', encoding='utf-8').write('\n'.join(h))
    size = os.path.getsize(out) / 1024
    print(f'已生成 {os.path.relpath(out, ROOT)}（{size:.0f} KB，含 {len(shots)} 张内嵌截图）')


if __name__ == '__main__':
    main()
