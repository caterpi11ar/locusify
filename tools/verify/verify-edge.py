#!/usr/bin/env python3
"""对抗与边界验收：空值 / 非法输入 / 超量 / 重复提交 / 接口故障。

对应 specs/map-upload-route.plan.md 的 C(c2-c4) 与 D(d1-d3) 组，
这些用例在计划里已列但此前未实现。

用法：
  python3 tools/verify/verify-edge.py --base http://localhost:1052 \
      --account ~/.locusify-test-account --edge-dir /tmp/locusify-edge
"""
import argparse
import glob
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API_RE = re.compile(r'/api/v1/')
STATE = {'ev': None, 'art': None, 'base': None}

NO_REACT_SCAN = (
    "(()=>{const i=()=>{if(!document.head||document.getElementById('v-nrs'))return;"
    "const s=document.createElement('style');s.id='v-nrs';"
    "s.textContent='#react-scan-root{pointer-events:none !important}';"
    "document.head.appendChild(s);};i();document.addEventListener('DOMContentLoaded',i);})();"
)

# 只对文本节点按垂直中心分簇统计行数：
# 直接对元素内容取 getClientRects() 会把「图标 + 文字」算成两行，产生误报。
WRAP_DETECT = """
() => {
  const linesOf = (el) => {
    let max = 0;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rects = [...rg.getClientRects()].filter(r => r.width > 0);
      if (rects.length < 2) continue;
      const fs = parseFloat(getComputedStyle(n.parentElement).fontSize) || 14;
      const cs = rects.map(r => r.top + r.height / 2).sort((a, b) => a - b);
      let k = 1;
      for (let i = 1; i < cs.length; i++) if (cs[i] - cs[i-1] > fs * 0.7) k++;
      max = Math.max(max, k);
    }
    return max;
  };
  const out = [];
  for (const el of document.querySelectorAll('button, a, [role="button"], .ant-btn, h1, h2, h3, p')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || el.children.length > 2) continue;
    const t = (el.innerText || '').replace(/\\s+/g, ' ').trim();
    if (!t || t.length > 70) continue;
    const L = linesOf(el);
    if (L > 1) out.push({ lines: L, w: Math.round(r.width), testid: el.getAttribute('data-testid') || '', text: t.slice(0, 60) });
  }
  return out;
}
"""


class Evidence:
    def __init__(self, art):
        self.art, self.rows, self.failures = art, [], []

    def check(self, group, name, ok, evidence, detail=''):
        self.rows.append({'group': group, 'name': name, 'result': 'PASS' if ok else 'FAIL',
                          'evidence': evidence, 'detail': detail})
        if not ok:
            self.failures.append(f'{group}/{name}')
        print(f'  [{"PASS" if ok else "FAIL"}] {name}{f" — {detail}" if detail else ""}')
        print(f'         证据: {evidence}')

    def shot(self, page, name):
        p = os.path.join(self.art, f'{name}.png')
        page.screenshot(path=p)
        return os.path.relpath(p, ROOT)


def rel(p):
    return os.path.relpath(p, ROOT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--account', default=os.path.expanduser('~/.locusify-test-account'))
    ap.add_argument('--edge-dir', default='/tmp/locusify-edge')
    ap.add_argument('--headed', action='store_true')
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    art = os.path.join(ROOT, 'artifacts', stamp)
    os.makedirs(art, exist_ok=True)
    ev = Evidence(art)
    base = args.base.rstrip('/')
    STATE.update(ev=ev, art=art, base=base)

    missing = [p for p in ('no-gps.jpg', 'not-an-image.txt', 'many') if not os.path.exists(os.path.join(args.edge_dir, p))]
    if missing:
        print(f'✗ 缺少边界素材 {missing}，请先构造（见脚本头部注释）')
        return 2

    creds = json.load(open(args.account))
    body = json.dumps({'email': creds['email'], 'password': creds['password']}).encode()
    req = urllib.request.Request(f'{base}/api/v1/auth/signin', data=body,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=45) as r:
        tokens = json.load(r)['data']

    print(f'\n被测地址: {base}')
    print('后端:      https://api.locusify.cn（经 vite proxy，无 mock）')
    print(f'素材:      {args.edge_dir}')
    print(f'证据目录:  {rel(art)}\n')

    good = sorted(glob.glob(os.path.join(ROOT, 'packages/app/e2e/fixtures/*.jpg')))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)

        def fresh():
            """每个用例从独立的已登录页面开始，不串场景。"""
            ctx = browser.new_context(viewport={'width': 390, 'height': 844},
                                      device_scale_factor=2, locale='zh-CN')
            pg = ctx.new_page()
            pg.add_init_script(NO_REACT_SCAN)
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
            pg.wait_for_function('() => !!window.__locusify', timeout=45000)
            pg.evaluate('([a, r]) => { window.__locusify.dismissOverlays(); window.__locusify.signIn(a, r) }',
                        [tokens['access_token'], tokens['refresh_token']])
            pg.reload(wait_until='domcontentloaded', timeout=60000)
            pg.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
            return ctx, pg, errs

        def open_drawer(pg):
            pg.click('[data-testid="map-menu-upload"]')
            pg.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)

        # ---------- C2. 无 GPS 的图 ----------
        print('[C2] 选择的照片全部没有 GPS')
        ctx, pg, errs = fresh()
        open_drawer(pg)
        pg.set_input_files('[data-testid="photo-file-input"]',
                           os.path.join(args.edge_dir, 'no-gps.jpg'))
        pg.wait_for_timeout(6000)
        body_text = pg.locator('.ant-drawer').inner_text() if pg.locator('.ant-drawer').count() else ''
        has_err_title = '无可用的GPS数据' in body_text
        create = pg.locator('[data-testid="route-create"]')
        create_ok = create.count() == 1
        ev.check('C2', 'c2-no-gps: 明确提示「无可用的GPS数据」', has_err_title,
                 f'{ev.shot(pg, "c2-no-gps")} | 抽屉文案="{body_text[:90].replace(chr(10), " | ")}"',
                 '命中 photos.error.no.gps.title')
        ev.check('C2', 'c2b-no-gps-blocked: 「生成路线」被禁用',
                 create_ok and create.is_disabled(),
                 f'route-create count={create.count()} disabled='
                 f'{create.is_disabled() if create_ok else "N/A"}')
        ev.check('C2', 'c2c-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- C3. 非图片文件 ----------
        print('\n[C3] 选择非图片文件')
        ctx, pg, errs = fresh()
        open_drawer(pg)
        pg.set_input_files('[data-testid="photo-file-input"]',
                           os.path.join(args.edge_dir, 'not-an-image.txt'))
        # sonner 的 toast 约 4s 自动消失，必须即时轮询，不能先 sleep 再查
        toasts = []
        for _ in range(25):
            pg.wait_for_timeout(300)
            found = pg.locator('[data-sonner-toast]').all_inner_texts()
            if found:
                toasts = found
                break
        pg.wait_for_timeout(2000)
        entered_preview = pg.locator('[data-testid="route-create"]').count() == 1
        body_text = pg.locator('.ant-drawer').inner_text() if pg.locator('.ant-drawer').count() else ''
        ev.check('C3', 'c3-non-image: 不进入路线预览态', not entered_preview,
                 f'{ev.shot(pg, "c3-non-image")} | route-create 存在={entered_preview} '
                 f'抽屉文案="{body_text[:70].replace(chr(10), " | ")}"')
        ev.check('C3', 'c3b-non-image-feedback: 给出明确反馈而不是静默忽略',
                 any('跳过' in x for x in toasts),
                 f'[data-sonner-toast]={toasts}',
                 f'toasts={toasts or "（无，用户无从判断哪里不对）"}')
        ev.check('C3', 'c3b-non-image-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- C4. 超量 ----------
        print('\n[C4] 一次选择 30 张')
        ctx, pg, errs = fresh()
        open_drawer(pg)
        many = sorted(glob.glob(os.path.join(args.edge_dir, 'many/*.jpg')))
        pg.set_input_files('[data-testid="photo-file-input"]', many)
        pg.wait_for_timeout(15000)
        body_text = pg.locator('.ant-drawer').inner_text() if pg.locator('.ant-drawer').count() else ''
        thumbs = pg.locator('.ant-drawer img').count()
        limit_msg = '最多' in body_text
        ev.check('C4', 'c4-many: 超量不崩溃且行为可观察',
                 (not errs) and (thumbs > 0 or limit_msg or 'GPS' in body_text),
                 f'{ev.shot(pg, "c4-many")} | 缩略图={thumbs} 有上限提示={limit_msg} '
                 f'抽屉文案="{body_text[:80].replace(chr(10), " | ")}"',
                 f'缩略图={thumbs} 上限提示={limit_msg}')
        ev.check('C4', 'c4b-many-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- D1. 重复提交 ----------
        print('\n[D1] 快速连点「生成路线」3 次')
        ctx, pg, errs = fresh()
        open_drawer(pg)
        pg.set_input_files('[data-testid="photo-file-input"]', good)
        pg.wait_for_selector('[data-testid="route-create"]', timeout=45000)
        pg.wait_for_timeout(1500)
        btn = pg.locator('[data-testid="route-create"]')
        for _ in range(3):  # 不等响应，连点
            try:
                btn.click(timeout=2000)
            except Exception:  # noqa: BLE001
                pass
        pg.wait_for_timeout(6000)
        markers = pg.locator('.maplibregl-marker').count()
        ev.check('D1', f'd1-double-submit: 连点 3 次后 marker 仍为 {len(good)}（未重复累加）',
                 markers == len(good),
                 f'{ev.shot(pg, "d1-double-submit")} | .maplibregl-marker={markers}',
                 f'{markers}（期望 {len(good)}）')
        ev.check('D1', 'd1b-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- D2. 快速连点菜单 ----------
        print('\n[D2] 快速连点上传入口 6 次')
        ctx, pg, errs = fresh()
        for _ in range(6):
            try:
                pg.click('[data-testid="map-menu-upload"]', timeout=1500)
            except Exception:  # noqa: BLE001
                pass
        pg.wait_for_timeout(4000)
        drawers = pg.locator('.ant-drawer').count()
        ev.check('D2', 'd2-rapid-toggle: 抽屉状态收敛（0 或 1 个，无残留）',
                 drawers in (0, 1),
                 f'{ev.shot(pg, "d2-rapid-toggle")} | .ant-drawer={drawers}', f'{drawers}')
        ev.check('D2', 'd2b-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- D3. 接口全挂 ----------
        print('\n[D3] 拦截所有 /api/v1/** 请求（模拟后端故障）')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
        pg = ctx.new_page()
        pg.add_init_script(NO_REACT_SCAN)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route(API_RE, lambda route: route.abort())
        pg.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        pg.wait_for_timeout(12000)
        text_len = pg.evaluate('() => document.body.innerText.trim().length')
        canvases = pg.evaluate("() => document.querySelectorAll('canvas').length")
        ev.check('D3', 'd3-api-down: 后端全挂时不白屏（仍有渲染内容）',
                 text_len > 20 and canvases >= 1,
                 f'{ev.shot(pg, "d3-api-down")} | body 文本长度={text_len} canvas={canvases}',
                 f'文本={text_len} canvas={canvases}')
        ev.check('D3', 'd3b-api-down-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- D4. 相机是否跟随照片（曾整批落在视野外） ----------
        print('\n[D4] 生成路线后相机是否跟随照片')
        ctx, pg, errs = fresh()
        # 用 dev 的 mock GPS 开关，保证不依赖 EXIF 也能拿到确定坐标
        open_drawer(pg)
        pg.wait_for_selector('[data-testid="mock-metadata-toggle"]', timeout=20000)
        pg.locator('[data-testid="mock-metadata-toggle"]').check()
        pg.set_input_files('[data-testid="photo-file-input"]',
                           os.path.join(args.edge_dir, 'no-gps.jpg'))
        pg.wait_for_selector('[data-testid="route-create"]', timeout=30000)
        pg.wait_for_timeout(1500)
        mock_gps = pg.locator('.ant-drawer').get_by_text('GPS', exact=True).count()
        ev.check('D4', 'd4-mock-gps: dev mock 开关能让无 GPS 图拿到坐标',
                 mock_gps >= 1,
                 f'mock 开启后 GPS 标记={mock_gps}（基线：关闭时为 0，见 c2）', f'{mock_gps}')
        pg.click('[data-testid="route-create"]')
        pg.wait_for_selector('.maplibregl-marker', timeout=30000)
        pg.wait_for_timeout(6000)  # fitBounds 动画 800ms，留足余量
        box = pg.locator('.maplibregl-marker').first.bounding_box()
        vp = pg.viewport_size
        inside = bool(box) and 0 <= box['x'] + box['width'] / 2 <= vp['width'] \
            and 0 <= box['y'] + box['height'] / 2 <= vp['height']
        ev.check('D4', 'd4-camera-follows: marker 落在视口内（相机已跟随）', inside,
                 f'{ev.shot(pg, "d4-camera-follows")} | viewport={vp} marker={box}',
                 f'box={box}')
        ev.check('D4', 'd4b-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        # ---------- D5. 移动端文案换行（曾把词拆成两行） ----------
        print('\n[D5] 移动端按钮文案换行')
        for loc in ('zh-CN', 'en'):
            ctx2 = browser.new_context(viewport={'width': 390, 'height': 844}, locale=loc)
            pg2 = ctx2.new_page()
            pg2.add_init_script(NO_REACT_SCAN)
            pg2.goto(f'{base}/{loc}/', wait_until='domcontentloaded', timeout=60000)
            pg2.wait_for_function('() => !!window.__locusify', timeout=45000)
            pg2.evaluate('([a, r]) => { window.__locusify.dismissOverlays(); window.__locusify.signIn(a, r) }',
                         [tokens['access_token'], tokens['refresh_token']])
            pg2.reload(wait_until='domcontentloaded', timeout=60000)
            pg2.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
            pg2.wait_for_timeout(3000)
            open_drawer(pg2)
            pg2.set_input_files('[data-testid="photo-file-input"]', good)
            pg2.wait_for_selector('[data-testid="route-create"]', timeout=45000)
            pg2.wait_for_timeout(2500)
            wrapped = pg2.evaluate(WRAP_DETECT)
            ev.check('D5', f'd5-no-text-wrap[{loc}]: 上传预览态无文案换行', not wrapped,
                     f'{ev.shot(pg2, f"d5-no-wrap-{loc}")} | 换行元素={len(wrapped)}',
                     '; '.join(f'{w["lines"]}行「{w["text"]}」' for w in wrapped[:3]) or '无')
            ctx2.close()

        # ---------- D6. 提示卡与底部工具栏是否重叠 ----------
        print('\n[D6] 路线提示卡与移动端底部工具栏是否重叠')
        ctx, pg, errs = fresh()
        open_drawer(pg)
        pg.set_input_files('[data-testid="photo-file-input"]', good)
        pg.wait_for_selector('[data-testid="route-create"]', timeout=45000)
        pg.wait_for_timeout(1200)
        pg.click('[data-testid="route-create"]')
        pg.wait_for_selector('.maplibregl-marker', timeout=45000)
        pg.wait_for_timeout(4000)  # 等入场动画结束
        geom = pg.evaluate("""() => {
          const btn = [...document.querySelectorAll('button')]
            .find(b => (b.innerText || '').includes('开始轨迹回放') || (b.innerText || '').includes('Start'));
          const sec = btn && btn.closest('section');
          // 用上传按钮向上找定位祖先，避开 CSS 选择器里转义冒号的坑
          const up = document.querySelector('[data-testid="map-menu-upload"]');
          const stack = up && up.closest('div.absolute');
          const box = el => { if (!el) return null; const r = el.getBoundingClientRect();
            return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
          const a = box(sec), b = box(stack);
          let overlap = 0;
          if (a && b) {
            const x = Math.max(0, Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]));
            const y = Math.max(0, Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]));
            overlap = x * y;
          }
          return { section: a, stack: b, overlap };
        }""")
        ev.check('D6', 'd6-prompt-not-covered: 提示卡与左下工具栏交集为 0',
                 geom['section'] is not None and geom['overlap'] == 0,
                 f'{ev.shot(pg, "d6-prompt-overlap")} | 提示卡={geom["section"]} 工具栏={geom["stack"]} 交集={geom["overlap"]}px²',
                 f'交集={geom["overlap"]}px²')
        ev.check('D6', 'd6b-no-crash: 无未捕获异常', not errs, f'pageerror={len(errs)}',
                 '; '.join(errs[:2]) or '无')
        ctx.close()

        browser.close()

    passed = len(ev.rows) - len(ev.failures)
    verdict = 'PASS' if not ev.failures else 'FAIL'
    print(f'\n{"=" * 72}\n结果: {passed}/{len(ev.rows)} 通过  →  {verdict}')
    if ev.failures:
        print('失败: ' + '; '.join(ev.failures))

    date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    path = os.path.join(ROOT, 'reports', f'{date}-edge-report.md')
    lines = [
        f'# Locusify 对抗与边界验收 — {date}', '',
        f'- 被测地址: `{base}`', '- 后端: `https://api.locusify.cn`（无 mock）',
        f'- 素材: 无 GPS 图 / 非图片文件 / 30 张带 GPS 图',
        f'- 证据目录: `{rel(art)}`',
        f'- 结论: **{verdict}**（{passed}/{len(ev.rows)} 断言通过）', '',
        '| 分组 | 断言 | 结果 | 证据 | 说明 |', '|---|---|---|---|---|',
    ]
    for r in ev.rows:
        lines.append(f'| {r["group"]} | {r["name"]} | {r["result"]} | `{r["evidence"]}` | {r["detail"] or "—"} |')
    open(path, 'w').write('\n'.join(lines) + '\n')
    print(f'报告: {rel(path)}')
    return 0 if not ev.failures else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except BaseException:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        ev, art, base = STATE['ev'], STATE['art'], STATE['base']
        if ev is not None:
            ev.check('Z', 'z1-harness-completed', False, 'harness 异常中断',
                     traceback.format_exc().strip().splitlines()[-1][:160])
        sys.exit(1)
