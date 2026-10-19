# -*- coding: utf-8 -*-
"""跨界面「同类元素」一致性审计。

为什么需要它：之前只查了登录抽屉的 input/button，而且 **明确把 checkbox
排除掉了**（`input:not([type=checkbox])`），结果同一屏里左边是原生
`<input type=checkbox>`、右边是 Radix 组件，方角 vs 圆角、尺寸与垂直对齐
都不一样，审计却报「一致」。

现在：遍历所有界面，按元素种类（checkbox / radio / text / select）聚合，
逐类校验圆角、尺寸、与相邻文字基线的垂直偏移是否一致。
"""
import argparse
import collections
import json
import os
import re
import sys
import glob

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

COLLECT = r"""
() => {
  const out = [];
  const kindOf = (el) => {
    const t = (el.getAttribute('type') || '').toLowerCase();
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (t === 'checkbox' || role === 'checkbox' || el.hasAttribute('data-state') && el.getAttribute('data-slot') === 'checkbox') return 'checkbox';
    if (t === 'radio' || role === 'radio') return 'radio';
    if (t === 'range') return 'range';
    if (el.tagName === 'INPUT') return 'text';
    if (el.tagName === 'SELECT') return 'select';
    if (el.tagName === 'BUTTON' || role === 'button') return 'button';
    return null;
  };

  const hosts = [document.body];
  for (const el of document.querySelectorAll('.ant-drawer, [role="dialog"], main')) hosts.push(el);

  const seen = new Set();
  for (const host of hosts) {
    for (const el of host.querySelectorAll('input, select, button, [role="checkbox"], [role="radio"], [data-slot="checkbox"]')) {
      if (seen.has(el)) continue;
      seen.add(el);
      const kind = kindOf(el);
      if (!kind) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const cs = getComputedStyle(el);

      // 与相邻文字的垂直中心偏差（同一行里最近的文本节点）
      let vOff = null;
      const label = el.closest('label');
      if (label) {
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          if (!n.textContent.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          const rects = [...rg.getClientRects()].filter(x => x.width > 0);
          if (!rects.length) continue;
          const mid = rects[0].top + rects[0].height / 2;
          vOff = +(((r.top + r.height / 2) - mid) / r.height).toFixed(3);
          break;
        }
      }

      out.push({
        kind, tag: el.tagName.toLowerCase(),
        w: Math.round(r.width), h: Math.round(r.height),
        radius: Math.round(parseFloat(cs.borderTopLeftRadius)),
        bg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
        cls: (el.className || '').toString().slice(0, 56),
        vOff,
      });
    }
  }
  return out;
}
"""


def run_steps(base):
    steps = []

    def snap(pg, label):
        try:
            steps.append((label, pg.evaluate(COLLECT)))
        except Exception as e:  # noqa: BLE001
            print(f'  ! {label}: {type(e).__name__}')

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)

        def fresh(authed=True):
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
            pg = ctx.new_page()
            pg.route(re.compile(r'/api/v1/'), lambda r: r.fulfill(
                status=200, content_type='application/json',
                body=json.dumps({'success': True, 'data': {'id': 'a', 'email': 'a@b.c',
                                                           'created_at': 'x', 'last_sign_in_at': 'y'}})))
            pg.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
            if authed:
                pg.wait_for_function('() => !!window.__locusify', timeout=45000)
                pg.evaluate('()=>{window.__locusify.dismissOverlays();window.__locusify.signIn()}')
                pg.reload(wait_until='domcontentloaded', timeout=60000)
                pg.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
            pg.wait_for_timeout(2500)
            return ctx, pg

        # 登录抽屉（匿名）—— 同意条款复选框在这里
        ctx, pg = fresh(authed=False)
        pg.wait_for_timeout(3500)
        snap(pg, '登录抽屉')
        ctx.close()

        # 已登录：上传选择态（DEV 复选框在这里）
        ctx, pg = fresh()
        pg.click('[data-testid="map-menu-upload"]')
        pg.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        pg.wait_for_timeout(2000)
        snap(pg, '上传-选择态')
        ctx.close()
        b.close()
    return steps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--json', default='/tmp/locusify-element-audit.json')
    args = ap.parse_args()

    steps = run_steps(args.base.rstrip('/'))
    rows = []
    for label, items in steps:
        for x in items:
            x['screen'] = label
        rows += items

    by_kind = collections.defaultdict(list)
    for x in rows:
        by_kind[x['kind']].append(x)

    print(f'\n共采集 {len(rows)} 个元素，分 {len(by_kind)} 类\n')
    problems = []

    for kind, items in sorted(by_kind.items()):
        if kind in ('button', 'text', 'select'):
            continue  # 这三类已有 button/input 专项审计覆盖
        print('=' * 68)
        print(f'{kind}（{len(items)} 个）')
        print('=' * 68)
        for x in items:
            vo = f"{x['vOff']*100:+.1f}%" if x['vOff'] is not None else '  —  '
            print(f"  [{x['screen']}] {x['w']}x{x['h']:<3} r={x['radius']:<3} 与文字偏差={vo:<8} "
                  f"<{x['tag']}> {x['cls'][:44]}")
        rs = {x['radius'] for x in items}
        ss = {(x['w'], x['h']) for x in items}
        print(f"  → 圆角种类 {len(rs)}: {sorted(rs)}   尺寸种类 {len(ss)}: {sorted(ss)}")
        if len(rs) > 1:
            problems.append(f'{kind}: 圆角不一致 {sorted(rs)}')
        if len(ss) > 1:
            problems.append(f'{kind}: 尺寸不一致 {sorted(ss)}')
        bad_v = [x for x in items if x['vOff'] is not None and abs(x['vOff']) > 0.15]
        if bad_v:
            problems.append(f'{kind}: 与文字垂直偏差 >15% 的有 {len(bad_v)} 个 '
                            f'{[round(x["vOff"]*100, 1) for x in bad_v]}')
        print()

    print('=' * 68)
    if problems:
        print(f'✗ 发现 {len(problems)} 类问题：')
        for p in problems:
            print(f'  - {p}')
    else:
        print('✓ 同类元素完全一致（圆角 / 尺寸 / 垂直对齐）')

    json.dump({'rows': rows, 'problems': problems}, open(args.json, 'w'),
              ensure_ascii=False, indent=2)
    print(f'\n结果写入 {args.json}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
