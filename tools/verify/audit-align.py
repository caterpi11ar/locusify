# -*- coding: utf-8 -*-
"""布局对齐审计：检查同一个界面里各个内容块的左右边缘是否对齐。

用户反馈「底部按钮和上方的 alert 提示没有对齐，按钮两侧有空白」，且这个问题
重复出现多次。根因是同一层里有的块是满宽、有的块是「内容宽度 + 居中」，
左右边缘就错开了。

做法：对每个界面，取滚动容器的直接子元素（=用户眼里的内容块），
量它们的 left/right，与「最常见的边缘」比较，超过 1px 就算没对齐。

用法：
  python3 tools/verify/audit-align.py --base http://localhost:1052 [--json out.json]
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
TOL = 1.5      # 允许的像素差
MIN_W = 40     # 太窄的元素不算内容块


PROBE = r"""
() => {
  const out = { blocks: [], container: null, vw: window.innerWidth };

  // 找「内容容器」：抽屉的滚动区 / 页面主体
  // 必须取「真正带 padding 的滚动内容区」。.ant-drawer-body 的唯一子元素
  // 是整个抽屉面板，拿它做容器只会得到一个块，什么都比不出来。
  let box = document.querySelector('.ant-drawer .flex-1.overflow-y-auto')
    || document.querySelector('.flex-1.overflow-y-auto')
    || document.querySelector('.ant-drawer-body')
    || document.querySelector('main')
    || document.body;
  const cr = box.getBoundingClientRect();
  out.container = { left: Math.round(cr.left), right: Math.round(cr.right), w: Math.round(cr.width) };

  // 面板常常只有一个 .w-full 包裹层，下钻一层才能真正比到内容块
  if (box.children.length === 1 && box.children[0].children.length >= 2)
    box = box.children[0];

  const cs0 = getComputedStyle(box);
  const pl = parseFloat(cs0.paddingLeft) || 0;
  const pr = parseFloat(cs0.paddingRight) || 0;
  const inner = { left: cr.left + pl, right: cr.right - pr };

  const seen = new Set();
  for (const el of box.children) {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 8) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') continue;
    if (cs.display === 'contents') continue;
    const key = `${Math.round(r.left)}:${Math.round(r.right)}:${Math.round(r.height)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const txt = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    out.blocks.push({
      left: Math.round(r.left), right: Math.round(r.right),
      w: Math.round(r.width), h: Math.round(r.height),
      // 左/右相对内容区两侧的缩进
      insetL: Math.round(r.left - inner.left),
      insetR: Math.round(inner.right - r.right),
      cls: (el.className || '').toString().slice(0, 52),
      text: txt,
      hasButtons: !!el.querySelector('button'),
      tag: el.tagName.toLowerCase(),
    });
  }
  out.inner = { left: Math.round(inner.left), right: Math.round(inner.right) };
  return out;
}
"""


def screens(base):
    """返回 [(label, page)] 的采集流程。"""
    results = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)

        def fresh(path='zh-CN', authed=True):
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
            pg = ctx.new_page()
            pg.route(re.compile(r'/api/v1/'), lambda r: r.fulfill(
                status=200, content_type='application/json',
                body=json.dumps({'success': True, 'data': {'id': 'a', 'email': 'a@b.c',
                                                           'created_at': 'x', 'last_sign_in_at': 'y'}})))
            pg.goto(f'{base}/{path}/', wait_until='domcontentloaded', timeout=60000)
            if authed:
                pg.wait_for_function('() => !!window.__locusify', timeout=45000)
                pg.evaluate('()=>{window.__locusify.dismissOverlays();window.__locusify.signIn()}')
                pg.reload(wait_until='domcontentloaded', timeout=60000)
                pg.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)
            pg.wait_for_timeout(2500)
            return ctx, pg

        def snap(label, pg):
            try:
                safe = re.sub(r"[^\w-]", "_", label)
                path = f'/tmp/locusify-align-{safe}.png'
                pg.screenshot(path=path)
                results.append((label, pg.evaluate(PROBE), path))
            except Exception as e:  # noqa: BLE001
                results.append((label, None, None))
                print(f'  ! {label}: {type(e).__name__}')

        # 登录抽屉（匿名）
        ctx, pg = fresh(authed=False); pg.wait_for_timeout(3500)
        snap('登录抽屉', pg); ctx.close()

        # 已登录各界面
        ctx, pg = fresh()
        pg.click('[data-testid="map-menu-toggle"]'); pg.wait_for_timeout(1200)
        snap('菜单展开', pg)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(800)

        pg.click('[data-testid="map-menu-upload"]')
        pg.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        pg.wait_for_timeout(2000)
        snap('上传-选择态', pg)

        pg.set_input_files('[data-testid="photo-file-input"]',
                           sorted(glob.glob(os.path.join(ROOT, 'packages/app/e2e/fixtures/*.jpg'))))
        pg.wait_for_selector('[data-testid="route-create"]', timeout=45000)
        pg.wait_for_timeout(3000)
        snap('上传-预览态', pg)

        pg.click('[data-testid="route-create"]')
        pg.wait_for_selector('.maplibregl-marker', timeout=45000)
        pg.wait_for_timeout(3500)
        snap('路线提示卡', pg)
        ctx.close()

        # 设置抽屉
        ctx, pg = fresh()
        try:
            pg.click('[data-testid="map-menu-toggle"]'); pg.wait_for_timeout(1000)
            pg.get_by_text('设置', exact=True).first.click(); pg.wait_for_timeout(3000)
            snap('设置抽屉', pg)
        except Exception:  # noqa: BLE001
            pass
        ctx.close()
        b.close()
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--json', default='/tmp/locusify-align-audit.json')
    args = ap.parse_args()
    base = args.base.rstrip('/')

    data = screens(base)
    all_issues = []
    summary = []

    for label, res, shot in data:
        if not res or not res['blocks']:
            print(f'{label}: 无可测内容块')
            continue
        blocks = res['blocks']
        print(f'\n{"=" * 72}\n{label}  （内容区 {res["inner"]["left"]}..{res["inner"]["right"]}）\n{"=" * 72}')
        # 最主流的左右缩进
        mode_l = collections.Counter(b['insetL'] for b in blocks).most_common(1)[0][0]
        mode_r = collections.Counter(b['insetR'] for b in blocks).most_common(1)[0][0]
        print(f'  主流缩进: 左 {mode_l}px / 右 {mode_r}px')
        for b in blocks:
            dL = b['insetL'] - mode_l
            dR = b['insetR'] - mode_r
            bad = abs(dL) > TOL or abs(dR) > TOL
            mark = 'FAIL' if bad else 'OK  '
            flag = f'  ← 左偏 {dL:+}px 右偏 {dR:+}px' if bad else ''
            print(f"  [{mark}] {b['w']:>3}x{b['h']:<3} 缩进L={b['insetL']:>3} R={b['insetR']:>3}{flag}")
            print(f"         <{b['tag']}> 「{b['text'][:26]}」 {b['cls'][:44]}")
            if bad:
                all_issues.append({
                    'screen': label, 'shot': shot, 'dL': dL, 'dR': dR,
                    'w': b['w'], 'h': b['h'], 'insetL': b['insetL'], 'insetR': b['insetR'],
                    'text': b['text'], 'cls': b['cls'], 'hasButtons': b['hasButtons'],
                })
        summary.append({'screen': label, 'blocks': len(blocks),
                        'modeL': mode_l, 'modeR': mode_r,
                        'bad': sum(1 for b in blocks
                                   if abs(b['insetL'] - mode_l) > TOL or abs(b['insetR'] - mode_r) > TOL)})

    print(f'\n{"=" * 72}\n汇总\n{"=" * 72}')
    for s in summary:
        print(f"  {s['screen']:<14} 内容块 {s['blocks']:>2} 个，未对齐 {s['bad']} 个")
    print(f'\n共 {len(all_issues)} 处边缘不对齐')
    for i in all_issues:
        print(f"  [FAIL] {i['screen']} · 左偏 {i['dL']:+}px 右偏 {i['dR']:+}px  "
              f"{i['w']}x{i['h']} 「{i['text'][:22]}」")

    json.dump({'issues': all_issues, 'summary': summary}, open(args.json, 'w'),
              ensure_ascii=False, indent=2)
    print(f'\n结果写入 {args.json}')
    print(f'截图: /tmp/locusify-align-*.png')
    return 1 if all_issues else 0


if __name__ == '__main__':
    sys.exit(main())
