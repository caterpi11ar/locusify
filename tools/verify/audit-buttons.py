# -*- coding: utf-8 -*-
"""按钮一致性审计（运行时实测，不是读源码）。

为什么测运行时：源码里的圆角/高度/背景会被 cn() 条件、父容器样式、
Tailwind 变体相互覆盖，读 class 字符串得不出用户真正看到的结果。
这里遍历各个界面，对每个可见 <button> 量：
  圆角(px) / 高度(px) / 字号 / 有效背景色 / 文字垂直居中偏移

用法：
  python3 tools/verify/audit-buttons.py --base http://localhost:1052 [--json out.json]
"""
import argparse
import collections
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verify import decode_png  # noqa: E402  复用已有的无依赖 PNG 解码


def inner_color(png, box, inset=0.22):
    """取按钮内部出现最多的颜色。

    按钮浮在地图 canvas 上，CSS 层推不出真实底色（层层半透明叠加 + 未知底图），
    所以只能量渲染出来的像素。
    """
    w, h, nch, px = png
    ix, iy = int(box['w'] * inset), int(box['h'] * inset)
    x0, y0 = max(0, box['x'] + ix), max(0, box['y'] + iy)
    x1, y1 = min(w, box['x'] + box['w'] - ix), min(h, box['y'] + box['h'] - iy)
    if x1 - x0 < 3 or y1 - y0 < 3:
        return None
    cnt = collections.Counter()
    for y in range(y0, y1):
        for x in range(x0, x1):
            o = (y * w + x) * nch
            cnt[((px[o] >> 3) << 3, (px[o+1] >> 3) << 3, (px[o+2] >> 3) << 3)] += 1
    c = cnt.most_common(1)[0][0]
    return '#%02x%02x%02x' % c

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PROBE = r"""
() => {
  const out = [];
  const cv = document.createElement('canvas').getContext('2d');
  const parse = c => {
    if (!c || c === 'transparent') return null;
    cv.fillStyle = '#000'; cv.fillStyle = c;
    const v = cv.fillStyle;
    if (v.startsWith('#')) {
      const h = v.length === 4 ? v.slice(1).split('').map(x => x + x).join('') : v.slice(1, 7);
      return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), a: 1 };
    }
    const m = v.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const hex = c => c ? `#${[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}` : '—';
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: fg.a + bg.a * (1 - fg.a),
  });
  // 逐层向上做 alpha 合成；只取「第一个不透明的祖先」会把半透明层丢掉，
  // 之前因此把 81 个按钮的底色全算成 #ffffff。
  const effBg = el => {
    let n = el, acc = null;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.99) return acc;
      }
      n = n.parentElement;
    }
    return acc ? over(acc, { r: 0, g: 0, b: 0, a: 1 }) : null;
  };

  // 盲区：项目里有「button 里的 span」被当成视觉按钮（如选择照片的胶囊），
  // 只查 <button> 会漏掉它们 —— 用户正是发现这种漏网的元素圆角不一致。
  const fakeBtns = [...document.querySelectorAll('span, div, a')].filter((el) => {

    const cs = getComputedStyle(el);
    if (!cs.backgroundColor || cs.backgroundColor === 'rgba(0, 0, 0, 0)') return false;
    if (parseFloat(cs.borderTopLeftRadius) === 0) return false;
    const px = parseFloat(cs.paddingLeft) || 0;
    const r = el.getBoundingClientRect();
    if (px < 8 || r.height < 20 || r.height > 80 || r.width < 40) return false;
    const t = (el.innerText || '').trim();
    return !!t;
  });
  for (const el of [...document.querySelectorAll('button'), ...fakeBtns]) {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    const cs = getComputedStyle(el);

    // 垂直居中：文字行盒的中心 vs 按钮内容区中心
    let off = null, hOff = null;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (own.length) {
      const rg = document.createRange();
      rg.selectNodeContents(own[0]);
      const rects = [...rg.getClientRects()].filter(x => x.width > 0);
      if (rects.length) {
        const txtMid = rects.reduce((s, x) => s + x.top + x.height / 2, 0) / rects.length;
        const pt = parseFloat(cs.paddingTop) || 0;
        const pb = parseFloat(cs.paddingBottom) || 0;
        const bt = parseFloat(cs.borderTopWidth) || 0;
        const bb = parseFloat(cs.borderBottomWidth) || 0;
        const inner = { top: r.top + bt + pt, bottom: r.bottom - bb - pb };
        off = +(((txtMid - (inner.top + inner.bottom) / 2)) * 2 / (inner.bottom - inner.top)).toFixed(3);
      }
      // 内容 = 文字节点 ∪ 所有非绝对的子元素（图标）。只量文字会把
      // 「图标+文字」居中排列的按钮误判成偏右。
      const parts = rects.slice();
      for (const ch of el.children) {
        const ccs = getComputedStyle(ch);
        if (ccs.position === 'absolute') continue;
        const cr = ch.getBoundingClientRect();
        if (cr.width > 0 && cr.height > 0) parts.push(cr);
      }
      if (parts.length) {
        const L = Math.min(...parts.map(x => x.left));
        const R = Math.max(...parts.map(x => x.right));
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        const bl = parseFloat(cs.borderLeftWidth) || 0;
        const br = parseFloat(cs.borderRightWidth) || 0;
        const innerL = r.left + bl + pl, innerR = r.right - br - pr;
        hOff = +((((L + R) / 2) - ((innerL + innerR) / 2)) * 2 / (innerR - innerL)).toFixed(3);
      }
    }

    out.push({
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 26),
      w: Math.round(r.width), h: Math.round(r.height),
      radius: cs.borderTopLeftRadius,
      radiusPx: (() => { const v = parseFloat(cs.borderTopLeftRadius); return v > 1000 ? 'full' : Math.round(v) + 'px'; })(),
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      bg: hex(effBg(el)),
      color: cs.color,
      display: cs.display, alignItems: cs.alignItems,
      px: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      testid: el.getAttribute('data-testid') || '',
      cls: (el.className || '').toString().slice(0, 70),
      vOff: off, hOff, justify: cs.justifyContent, isIcon: !own.length,
    });
  }
  return out;
}
"""


def screen_name(s):
    return re.sub(r'[^\w-]', '_', s)


def collect(base):
    """逐个界面采集按钮。每个界面独立 context，避免状态串场。"""
    steps = []

    shots = {}

    def add(pg, label):
        try:
            rows = pg.evaluate(PROBE)
            path = f'/tmp/locusify-btn-{screen_name(label)}.png'
            pg.screenshot(path=path)
            shots[label] = path
            steps.append((label, rows))
        except Exception as e:  # noqa: BLE001
            steps.append((label, []))
            print(f'  ! {label}: {type(e).__name__}')

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)

        def fresh(authed=True):
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
            pg = ctx.new_page()
            pg.route(re.compile(r'/api/v1/'), lambda r: r.fulfill(
                status=200, content_type='application/json',
                body=json.dumps({'success': True, 'data': {'id': 'audit', 'email': 'a@b.c',
                                                           'created_at': 'x', 'last_sign_in_at': 'y'}})))
            pg.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
            if authed:
                pg.wait_for_function('() => !!window.__locusify', timeout=45000)
                pg.evaluate('()=>{window.__locusify.dismissOverlays();window.__locusify.signIn()}')
                pg.reload(wait_until='domcontentloaded', timeout=60000)
                pg.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
            pg.wait_for_timeout(2500)
            return ctx, pg

        # 1 匿名：登录抽屉
        ctx, pg = fresh(authed=False)
        pg.wait_for_timeout(4000)
        add(pg, '登录抽屉')
        ctx.close()

        # 2 已登录：地图首屏
        ctx, pg = fresh()
        add(pg, '地图首屏')
        # 菜单展开
        try:
            pg.click('[data-testid="map-menu-toggle"]'); pg.wait_for_timeout(1200)
            add(pg, '菜单展开'); pg.keyboard.press('Escape'); pg.wait_for_timeout(800)
        except Exception:  # noqa: BLE001
            pass
        # 上传抽屉（选择态）
        pg.click('[data-testid="map-menu-upload"]')
        pg.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        pg.wait_for_timeout(2000)
        add(pg, '上传-选择态')
        # 预览态
        import glob
        pg.set_input_files('[data-testid="photo-file-input"]',
                           sorted(glob.glob(os.path.join(ROOT, 'packages/app/e2e/fixtures/*.jpg'))))
        pg.wait_for_selector('[data-testid="route-create"]', timeout=45000)
        pg.wait_for_timeout(3000)
        add(pg, '上传-预览态')
        # 路线提示卡
        pg.click('[data-testid="route-create"]')
        pg.wait_for_selector('.maplibregl-marker', timeout=45000)
        pg.wait_for_timeout(3500)
        add(pg, '路线提示卡')
        ctx.close()
        b.close()
    return steps, shots


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--json', default='/tmp/locusify-button-audit.json')
    args = ap.parse_args()

    steps, shots = collect(args.base.rstrip('/'))

    all_rows = []
    png_cache = {}
    for label, rows in steps:
        if label in shots and shots[label] not in png_cache:
            png_cache[shots[label]] = decode_png(open(shots[label], 'rb').read())
        png = png_cache.get(shots.get(label))
        for r in rows:
            if png and r.get('px'):
                c = inner_color(png, r['px'])
                if c:
                    r['bg'] = c
        for r in rows:
            r['screen'] = label
        all_rows += rows
        print(f'  {label}: {len(rows)} 个按钮')

    print(f'\n共 {len(all_rows)} 个可见按钮\n')

    def dist(key, fmt=lambda v: str(v), top=12):
        c = collections.Counter(fmt(r[key]) for r in all_rows)
        return c

    print('=' * 70)
    print('圆角分布')
    print('=' * 70)
    for v, n in dist('radiusPx').most_common(12):
        print(f'  {n:>3}  {v}')

    print('\n' + '=' * 70)
    print('高度分布（px）')
    print('=' * 70)
    for v, n in dist('h').most_common(14):
        print(f'  {n:>3}  {v}px')

    print('\n' + '=' * 70)
    print('字号分布')
    print('=' * 70)
    for v, n in dist('fontSize').most_common():
        print(f'  {n:>3}  {v}')

    print('\n' + '=' * 70)
    print('背景分布（主色）')
    print('=' * 70)
    for v, n in dist('bg').most_common(12):
        print(f'  {n:>3}  {v}')

    print('\n' + '=' * 70)
    print('圆角 × 高度 组合（越少越一致）')
    print('=' * 70)
    combo = collections.Counter((r['radiusPx'], r['h']) for r in all_rows)
    for (rad, h), n in combo.most_common(16):
        print(f'  {n:>3}  {rad:<10} {h}px')
    print(f'  → 共 {len(combo)} 种组合')

    print('\n' + '=' * 70)
    print('垂直居中偏移（|偏移| > 5% 视为未居中）')
    print('=' * 70)
    off = [r for r in all_rows if r['vOff'] is not None]
    bad_off = [r for r in off if abs(r['vOff']) > 0.05]
    print(f'  可测按钮 {len(off)} 个，未居中 {len(bad_off)} 个')
    for r in sorted(bad_off, key=lambda x: -abs(x['vOff']))[:10]:
        print(f"  [FAIL] 偏移 {r['vOff']*100:+.1f}%  「{r['text']}」 {r['w']}x{r['h']} "
              f"{r['fontSize']} display={r['display']} align={r['alignItems']}")
        print(f"         {r['screen']} · {r['cls'][:60]}")

    print('\n' + '=' * 70)
    print('内容水平居中（|偏移| > 8% 且有文字，视为未居中）')
    print('=' * 70)
    hb = [r for r in all_rows if r.get('hOff') is not None and abs(r['hOff']) > 0.08]
    print(f'  未水平居中 {len(hb)} 个')
    for r in sorted(hb, key=lambda x: -abs(x['hOff']))[:14]:
        print(f"  [FAIL] {r['hOff']*100:+6.1f}%  「{r['text'][:20]}」 {r['w']}x{r['h']} "
              f"justify={r['justify']}")
        print(f"         {r['screen']} · {r['cls'][:66]}")

    print('\n' + '=' * 70)
    print('同类角色但样式不同的按钮（按背景+文字分组）')
    print('=' * 70)
    groups = collections.defaultdict(list)
    for r in all_rows:
        if not r['text']:
            continue
        groups[(r['bg'], r['radiusPx'], r['h'])].append(r)
    for k, v in sorted(groups.items(), key=lambda x: -len(x[1])):
        if len(v) < 2:
            continue
        print(f"  bg={k[0]} radius={k[1]} h={k[2]}px  → {len(v)} 个:")
        for r in v[:4]:
            print(f"      「{r['text']}」 {r['screen']}")

    json.dump({'rows': all_rows,
               'summary': {'total': len(all_rows),
                           'radius_kinds': len(dist('radius')),
                           'height_kinds': len(dist('h')),
                           'combo_kinds': len(combo),
                           'vcenter_failures': len(bad_off),
                           'hcenter_failures': len(hb)}},
              open(args.json, 'w'), ensure_ascii=False, indent=2)
    print(f'\n结果写入 {args.json}')


if __name__ == '__main__':
    main()
