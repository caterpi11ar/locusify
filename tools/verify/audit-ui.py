#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI 设计审计：对比度 / 触控目标 / 语义 / 反模式。

为什么要按「真实渲染像素」量对比度：
  抽屉是 bg-material-thick + backdrop-blur + bg-fill-* 多层半透明叠加，
  底色未知，用 computed style 算出来的背景是假的（实测把深色抽屉算成 #646464）。
  另外 Tailwind v4 的计算色是 oklch()，canvas.fillStyle 不接受它，正则也解析不了，
  所以这里直接解码截图、在元素包围盒内取色。

用法：
  python3 tools/verify/audit-ui.py --base http://localhost:1052 [--json out.json]
"""
import argparse
import collections
import json
import os
import re
import struct
import sys
import zlib
from collections import Counter

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ---------------------------------------------------------------- PNG 解码
def decode_png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos, idat, w, h, nch = 8, b'', 0, 0, 4
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, depth, color, _, _, inter = struct.unpack('>IIBBBBB', chunk)
            assert depth == 8 and inter == 0
            nch = {0: 1, 2: 3, 4: 2, 6: 4}[color]
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    stride = w * nch
    out, prev, p = bytearray(), bytearray(stride), 0
    for _ in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for i in range(nch, stride): line[i] = (line[i] + line[i - nch]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                b = prev[i]
                c = prev[i - nch] if i >= nch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out += line
        prev = line
    return w, h, nch, bytes(out)


def srgb_lum(rgb):
    f = []
    for v in rgb:
        v /= 255
        f.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]


def contrast(a, b):
    la, lb = srgb_lum(a), srgb_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def measure(w, h, nch, px, box):
    # 内缩 20%：圆角按钮的四角落在 bbox 内，会把外层底色带进来
    ix, iy = int(box['w'] * 0.2), int(box['h'] * 0.2)
    x0, y0 = max(0, box['x'] + ix), max(0, box['y'] + iy)
    x1, y1 = min(w, box['x'] + box['w'] - ix), min(h, box['y'] + box['h'] - iy)
    if x1 - x0 < 3 or y1 - y0 < 3:
        return None
    colors = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            o = (y * w + x) * nch
            colors.append((px[o], px[o + 1], px[o + 2]))
    q = Counter(((r >> 3) << 3, (g >> 3) << 3, (b >> 3) << 3) for r, g, b in colors)
    top = q.most_common(8)
    if len(top) < 2:
        return None
    bg = top[0][0]
    fg = max((c for c, _ in top[1:]), key=lambda c: contrast(c, bg))
    return bg, fg, contrast(fg, bg)


# ---------------------------------------------------------------- 采集
COLLECT = r"""
() => {
  const scope = document.querySelector('.ant-drawer') || document.body;
  const res = { contrast: [], targets: [], unlabeled: [], antipes: [], nested: [], headings: [], base: [] };

  // 基础元素一致性：按钮 / 输入框 / 下拉 应共享同一套高度与圆角
  for (const el of document.querySelectorAll('button, input:not([type=hidden]):not([type=checkbox]), select, textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 20) continue;      // 只比「横向填充型」控件
    const cs = getComputedStyle(el);
    res.base.push({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      h: Math.round(r.height),
      radius: Math.round(parseFloat(cs.borderTopLeftRadius)),
      fs: cs.fontSize,
      text: (el.innerText || el.value || el.placeholder || '').trim().slice(0, 20),
    });
  }

  for (const el of scope.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    const txt = own.map(n => n.textContent.trim()).join(' ');

    if (txt && r.width >= 4 && r.height >= 4) {
      const size = parseFloat(cs.fontSize);
      res.contrast.push({ text: txt.slice(0, 40), x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height), size: +size.toFixed(1),
        bold: +cs.fontWeight >= 700, cls: (el.className || '').toString().slice(0, 46) });
    }

    if (el.matches('button, a[href], input[type=checkbox], [role=button]')) {
      const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      const lr = lbl ? lbl.getBoundingClientRect() : null;
      const effW = lr ? r.width + lr.width : r.width;
      const effH = lr ? Math.max(r.height, lr.height) : r.height;
      res.targets.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
        effW: Math.round(effW), effH: Math.round(effH), hasLabel: !!lbl,
        ok: effW >= 44 && effH >= 44, text: txt.slice(0, 24),
        testid: el.getAttribute('data-testid') || '' });
      const name = el.getAttribute('aria-label') || el.getAttribute('title') || txt
        || (lbl && lbl.innerText) || el.closest('label');
      if (!name) res.unlabeled.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 50) });
    }

    // transition-property 的初始值就是 all，必须同时看 duration 才说明真有过渡
    const dur = parseFloat(cs.transitionDuration) || 0;
    const isAnt = (el.className || '').toString().includes('ant-');
    if (cs.transitionProperty === 'all' && dur > 0 && !isAnt)
      res.antipes.push({ what: '样式表 transition: all', cls: (el.className || '').toString().slice(0, 52) });
    if (el.tagName === 'DIV' && el.onclick && !isAnt)
      res.antipes.push({ what: 'div 带 onclick（应为 button）', cls: (el.className || '').toString().slice(0, 52) });
    if (/^H[1-6]$/.test(el.tagName) && txt)
      res.headings.push({ tag: el.tagName, size: cs.fontSize, text: txt.slice(0, 30) });
  }

  for (const b of scope.querySelectorAll('button')) {
    const p = b.parentElement;
    if (p && p.tagName === 'DIV' && p.onclick)
      res.nested.push({ button: (b.innerText || '').trim().slice(0, 20),
                        parentCls: (p.className || '').toString().slice(0, 46) });
  }
  return res;
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--json', default='/tmp/locusify-ui-audit.json')
    args = ap.parse_args()
    base = args.base.rstrip('/')

    shot = '/tmp/locusify-ui-audit.png'
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
        pg = ctx.new_page()
        # UI 审计不需要真实后端：只要求页面处于已登录的已渲染状态，
        # 所以这里 mock 掉 /api/v1/*（这是本地 UI 检测，不冒充真实后端验收）。
        # 注意：route 的字符串参数是 glob（只匹配精确路径），必须用正则
        pg.route(re.compile(r'/api/v1/'), lambda r: r.fulfill(
            status=200, content_type='application/json',
            body=json.dumps({'success': True, 'data': {'id': 'audit-user', 'email': 'audit@locusify.dev',
                                                       'created_at': 'x', 'last_sign_in_at': 'y'}})))
        pg.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        pg.wait_for_function('() => !!window.__locusify', timeout=45000)
        pg.evaluate('()=>{window.__locusify.dismissOverlays();window.__locusify.signIn()}')
        pg.reload(wait_until='domcontentloaded', timeout=60000)
        pg.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
        pg.wait_for_timeout(2500)
        pg.click('[data-testid="map-menu-upload"]')
        pg.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=shot)
        raw = pg.evaluate(COLLECT)
        b.close()

    w, h, nch, px = decode_png(open(shot, 'rb').read())
    scale = w / 390
    out = {'viewport': {'css_w': 390, 'px_w': w, 'scale': round(scale, 3)},
           'contrast': [], 'targets': raw['targets'], 'unlabeled': raw['unlabeled'],
           'antipes': raw['antipes'], 'nested': raw['nested'], 'headings': raw['headings']}

    print('=' * 68)
    print('文本对比度（真实渲染像素，WCAG AA：正文 4.5:1 / 大字 3:1）')
    print('=' * 68)
    bad = 0
    for it in raw['contrast']:
        box = {'x': int(it['x'] * scale), 'y': int(it['y'] * scale),
               'w': int(it['w'] * scale), 'h': int(it['h'] * scale)}
        m = measure(w, h, nch, px, box)
        if not m:
            continue
        bg, fg, cr = m
        need = 3.0 if (it['size'] >= 24 or (it['size'] >= 18.66 and it['bold'])) else 4.5
        ok = cr >= need
        if not ok:
            bad += 1
        row = {**it, 'fg': '#%02x%02x%02x' % fg, 'bg': '#%02x%02x%02x' % bg,
               'ratio': round(cr, 2), 'need': need, 'pass': ok}
        out['contrast'].append(row)
        print(f"  [{'OK  ' if ok else 'FAIL'}] {cr:6.2f} / 需 {need:<3} {it['size']:>4}px  「{it['text']}」")
        print(f"           文字{row['fg']} 底色{row['bg']}  {it['cls']}")
    print(f'  → {len(out["contrast"])} 段文本，{bad} 段不达标')

    out['contrast_failures'] = bad
    out['target_failures'] = 0  # 渲染完 target 段后回填

    print('\n' + '=' * 68)
    print('触控目标（WCAG 2.5.5 建议 ≥44×44）')
    print('=' * 68)
    targets_bad = 0
    for t in raw['targets']:
        if not t['ok']:
            targets_bad += 1
        extra = f"（含关联 label 有效区 {t['effW']}x{t['effH']}）" if t['hasLabel'] else ''
        print(f"  [{'OK  ' if t['ok'] else 'FAIL'}] 本体 {t['w']:>3}x{t['h']:<3} <{t['tag']}> "
              f"「{t['text']}」 testid={t['testid'] or '-'} {extra}")

    print(f'  → {len(raw["targets"])} 个交互元素，{targets_bad} 个不达标')
    out['target_failures'] = targets_bad

    print('\n' + '=' * 68)
    print('语义与反模式')
    print('=' * 68)
    for label, items, fmt in (
        ('缺可访问名', raw['unlabeled'], lambda x: f"<{x['tag']}> {x['cls']}"),
        ('反模式', raw['antipes'], lambda x: f"{x['what']}  {x['cls']}"),
        ('嵌套交互（button 在可点击 div 内）', raw['nested'],
         lambda x: f"button「{x['button']}」 父 {x['parentCls']}"),
    ):
        print(f'  {label}: ', end='')
        if not items:
            print('✓ 无')
        else:
            print(f'{len(items)} 项')
            for i in items:
                print(f'    [FAIL] {fmt(i)}')

    print('\n' + '=' * 68)
    print('基础元素一致性（按钮 / 输入框应同高同圆角）')
    print('=' * 68)
    base_els = raw.get('base', [])
    hs = collections.Counter(b['h'] for b in base_els)
    rs = collections.Counter(b['radius'] for b in base_els)
    print(f'  高度分布: {dict(hs)}')
    print(f'  圆角分布: {dict(rs)}')
    for b in base_els:
        print(f"  <{b['tag']}{(':' + b['type']) if b['type'] else ''}> {b['h']}px r={b['radius']}px "
              f"fs={b['fs']} 「{b['text'][:16]}」")
    out['base'] = base_els
    # 一致性判定：只看有填充的横向控件，允许 icon 按钮不同
    big = [b for b in base_els if b['h'] >= 32]
    consistent = len({b['h'] for b in big}) <= 1 and len({b['radius'] for b in big}) <= 1
    print(f"  → 横向量控件 {len(big)} 个，高度种类 {len({b['h'] for b in big})}、"
          f"圆角种类 {len({b['radius'] for b in big})} → {'✓ 一致' if consistent else '✗ 不一致'}")
    out['base_consistent'] = consistent

    print('\n标题层级:')
    for x in raw['headings']:
        print(f"  {x['tag']} {x['size']:>6}  「{x['text']}」")

    # ── 登录抽屉：输入框与按钮同屏，是检验「基础元素是否一套」的最佳场景
    print('\n' + '=' * 68)
    print('登录抽屉里的基础元素（输入框 vs 按钮）')
    print('=' * 68)
    with sync_playwright() as p2:
        b2 = p2.chromium.launch(headless=True)
        c2 = b2.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
        g2 = c2.new_page()
        g2.route(re.compile(r'/api/v1/'), lambda r: r.fulfill(
            status=200, content_type='application/json',
            body=json.dumps({'success': True, 'data': {'id': 'a', 'email': 'a@b.c',
                                                       'created_at': 'x', 'last_sign_in_at': 'y'}})))
        g2.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        g2.wait_for_timeout(6000)
        login = g2.evaluate(r"""() => {
          const out = [];
          const scope = document.querySelector('.ant-drawer') || document.body;
          for (const el of scope.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), button')) {
            const r = el.getBoundingClientRect();
            if (r.width < 60 || r.height < 24) continue;
            const cs = getComputedStyle(el);
            out.push({ tag: el.tagName.toLowerCase(), h: Math.round(r.height),
                       radius: Math.round(parseFloat(cs.borderTopLeftRadius)), fs: cs.fontSize,
                       text: (el.innerText || el.placeholder || '').trim().slice(0, 18) });
          }
          return out;
        }""")
        b2.close()
    for x in login:
        print(f"  <{x['tag']}> {x['h']}px r={x['radius']}px fs={x['fs']} 「{x['text']}")
    out['login_base'] = login
    if login:
        # 正确判据不是「唯一值」，而是「是否落在设计尺度上」：
        #   高度只允许 36 / 44 / 48（sm / md / lg）
        #   圆角只允许 12（文字控件）或 full（图标按钮）
        #   字号与高度档位对应：36→12px、44/48→14px
        ALLOWED_H = {36, 44, 48}
        ALLOWED_R = {12}
        bad = []
        for x in login:
            h, r, fs = x['h'], x['radius'], int(float(x['fs'].replace('px', '')))
            want_fs = 12 if h == 36 else 14
            if h not in ALLOWED_H or r not in ALLOWED_R or fs != want_fs:
                bad.append((x['tag'], h, r, fs))
        hs, rs = sorted({x['h'] for x in login}), sorted({x['radius'] for x in login})
        print(f"  → {len(login)} 个元素，高度 {hs}，圆角 {rs}")
        if bad:
            print(f"  [FAIL] 偏离尺度 {len(bad)} 个: {bad}")
        else:
            print('  → ✓ 全部落在设计尺度上（高度 36/44、圆角 12、字号随档位 12/14）')
        out['login_base_consistent'] = not bad

    json.dump(out, open(args.json, 'w'), ensure_ascii=False, indent=2)
    print(f'\n结果已写入 {args.json}')

    return 1 if (bad or targets_bad or raw['antipes'] or raw['nested'] or raw['unlabeled']) else 0


if __name__ == '__main__':
    sys.exit(main())
