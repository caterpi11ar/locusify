#!/usr/bin/env python3
"""带鉴权的验收：真实账号 + 真实后端，浏览器里跑完整业务流程。

为什么跑 dev 而不是生产构建：
  生产 bundle 里**刻意没有**测试钩子（window.__locusify 仅 dev 注入），
  所以无法在不手写 localStorage 的前提下注入真实会话。
  这里用 dev server + 真实 token 走 bridge（bridge 内部走 zustand persist），
  被测的后端始终是 https://api.locusify.cn，没有任何 mock。

用法：
  python3 tools/verify/verify-auth.py --base http://localhost:1050 \
      --account ~/.locusify-test-account
"""
import argparse
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API_RE = re.compile(r'/api/v1/')
STATE = {'ev': None, 'art': None, 'base': None, 'results': {}}


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
    ap.add_argument('--base', required=True, help='dev server 地址，如 http://localhost:1050')
    ap.add_argument('--account', default=os.path.expanduser('~/.locusify-test-account'))
    ap.add_argument('--headed', action='store_true')
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    art = os.path.join(ROOT, 'artifacts', stamp)
    os.makedirs(art, exist_ok=True)
    ev = Evidence(art)
    base = args.base.rstrip('/')
    STATE.update(ev=ev, art=art, base=base)

    if not os.path.exists(args.account):
        print(f'✗ 找不到账号文件 {args.account}，跳过鉴权验收')
        return 2
    creds = json.load(open(args.account))

    print(f'\n被测地址: {base}（dev server，内置测试钩子）')
    print(f'后端:      https://api.locusify.cn（经 vite proxy，**无 mock**）')
    print(f'证据目录:  {rel(art)}\n')

    # ---------- A. 用真实账号换真 token（服务端，不经浏览器） ----------
    print('[A] 真实账号登录（服务端直连）')
    body = json.dumps({'email': creds['email'], 'password': creds['password']}).encode()
    req = urllib.request.Request(f'{base}/api/v1/auth/signin', data=body,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            payload = json.load(r)
        tokens = payload['data']
        ev.check('A', 'a1-signin: 真实账号登录成功（经 vite proxy → 真实后端）',
                 bool(tokens.get('access_token')),
                 f'POST {base}/api/v1/auth/signin → HTTP 200, success={payload.get("success")}, '
                 f'字段={sorted(tokens.keys())}',
                 f'user.id={str(tokens["user"]["id"])[:8]}… expires_in={tokens.get("expires_in")}')
    except urllib.error.HTTPError as e:
        ev.check('A', 'a1-signin: 真实账号登录成功', False,
                 f'POST {base}/api/v1/auth/signin → HTTP {e.code}', e.read().decode()[:160])
        return _finish(ev, art, base)

    results = STATE['results']
    results['signin'] = 200

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        # 移动视口：上传入口在移动布局里直接可见；桌面布局把它收进 map-menu-toggle
        # 的下拉里（MapMenuButton 的 sm:hidden 分支）。这也是产品的主要形态。
        ctx = browser.new_context(viewport={'width': 390, 'height': 844},
                                  device_scale_factor=3, locale='zh-CN')
        page = ctx.new_page()
        console, page_errors, net = [], [], []
        page.on('console', lambda m: console.append((m.type, m.text)))
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('response', lambda r: net.append((r.status, r.url)))
        page.add_init_script(
            "(()=>{const i=()=>{if(!document.head||document.getElementById('v-nrs'))return;"
            "const s=document.createElement('style');s.id='v-nrs';"
            "s.textContent='#react-scan-root{pointer-events:none !important}';"
            "document.head.appendChild(s);};i();document.addEventListener('DOMContentLoaded',i);})();")

        # ---------- 注入真实会话 ----------
        page.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        page.wait_for_function('() => !!window.__locusify', timeout=45000)
        page.evaluate(
            '([a, r]) => { window.__locusify.dismissOverlays(); window.__locusify.signIn(a, r) }',
            [tokens['access_token'], tokens['refresh_token']])
        # reload 后 initializeAuth() 会打**真实** /auth/me + /profile
        page.reload(wait_until='domcontentloaded', timeout=60000)

        page.wait_for_selector('[data-testid="map-menu-upload"]', timeout=45000)

        # fetchSubscription 是 fire-and-forget，会比首屏渲染晚一拍；
        # 直接读网络记录会 race，所以先等三个真实接口都回来。
        for _ in range(30):
            have = lambda kw: any(s == 200 and kw in u for s, u in net)  # noqa: E731
            if have('/auth/me') and have('/profile') and have('/subscriptions'):
                break
            page.wait_for_timeout(500)

        print('\n[A] 会话生效')
        me = [s for s, u in net if '/auth/me' in u]
        prof = [s for s, u in net if '/profile' in u]
        subs = [s for s, u in net if '/subscriptions' in u]
        ev.check('A', 'a2-session: 真实 /auth/me 返回 200',
                 me == [200] or (me and me[0] == 200),
                 f'GET /api/v1/auth/me → {me}', f'{me}')
        ev.check('A', 'a3-profile: 真实 /profile 返回 200', bool(prof) and prof[0] == 200,
                 f'GET /api/v1/profile → {prof}', f'{prof}')
        ev.check('A', 'a4-subscription: 真实 /subscriptions 返回 200', bool(subs) and subs[0] == 200,
                 f'GET /api/v1/subscriptions → {subs}', f'{subs}')
        drawers = page.locator('.ant-drawer').count()
        ev.check('A', 'a5-authenticated-ui: 已登录，无登录抽屉',
                 drawers == 0 and page.locator('[data-testid="map-menu-upload"]').count() == 1,
                 f'{ev.shot(page, "a5-authenticated")} | .ant-drawer={drawers}',
                 f'.ant-drawer={drawers}')

        # 等瓦片画完再截图，避免空白地图
        waited, last, stable = 0, 0, 0
        while waited < 45000 and stable < 1500:
            page.wait_for_timeout(300)
            waited += 300
            n = sum(1 for s, u in net if s == 200 and '.mvt' in u)
            stable = stable + 300 if n and n == last else 0
            last = n
        ev.check('G', 'g1-map-painted: 地图已绘制（.mvt 200）', last > 0,
                 f'{last} 个 .mvt 200（收敛于 {waited}ms）', f'{last} 个')

        # ---------- C. 上传 → EXIF → 路线（真实后端） ----------
        print('\n[C] 上传 → EXIF → 路线')
        fixtures = sorted(glob.glob(os.path.join(ROOT, 'packages/app/e2e/fixtures/*.jpg')))
        n = len(fixtures)
        page.click('[data-testid="map-menu-upload"]')
        page.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        ev.check('C', 'c1-upload-drawer: 上传抽屉打开',
                 page.locator('.ant-drawer').count() == 1, ev.shot(page, 'c1-upload-drawer'))

        page.set_input_files('[data-testid="photo-file-input"]', fixtures)
        page.wait_for_selector('[data-testid="route-create"]', timeout=45000)
        gps = page.locator('.ant-drawer').get_by_text('GPS', exact=True).count()
        ev.check('C', f'c2-exif-gps: {n} 张图全部解析出 GPS', gps == n,
                 f'{ev.shot(page, "c2-gps-detected")} | 抽屉内 GPS 标记={gps}',
                 f'{gps}/{n}')
        ev.check('C', 'c3-create-enabled: “生成路线”可用',
                 page.locator('[data-testid="route-create"]').is_enabled(),
                 f'button[data-testid="route-create"].disabled='
                 f'{page.locator("[data-testid=route-create]").is_disabled()}')

        page.click('[data-testid="route-create"]')
        page.wait_for_selector('.maplibregl-marker', timeout=45000)
        page.wait_for_timeout(2500)
        markers = page.locator('.maplibregl-marker').count()
        ev.check('C', f'c4-route: 地图出 {n} 个 marker', markers == n,
                 f'{ev.shot(page, "c4-route-on-map")} | .maplibregl-marker={markers}',
                 f'{markers}/{n}')
        ev.check('C', 'c5-drawer-closed: 抽屉自动关闭',
                 page.locator('.ant-drawer').count() == 0,
                 f'.ant-drawer={page.locator(".ant-drawer").count()}')

        # ---------- H. console 门禁 ----------
        print('\n[H] console 门禁')
        # 两类噪声都不算应用缺陷，且都要单独列出而不是默默丢掉：
        #  1) headless/SwiftShader 的 GPU 提示
        #  2) dev-only：react-scan 自身告警，以及 Vite dev 注入 script 引发的
        #     React「script tag while rendering」——生产构建下这两类均为 0，
        #     由 tools/verify/verify.py 的 h1 在生产产物上守。
        ENV_NOISE = ('GPU stall due to ReadPixels', 'GL Driver Message', 'WebGL-')
        DEV_ONLY = ('Encountered a script tag while rendering React component',
                    '[React Scan]', 'React Scan initialized')
        bad = [(t, m) for t, m in console if t in ('error', 'warning')]
        env = [(t, m) for t, m in bad if any(k in m for k in ENV_NOISE)]
        dev = [(t, m) for t, m in bad if any(k in m for k in DEV_ONLY)]
        real = [(t, m) for t, m in bad if (t, m) not in env and (t, m) not in dev]
        ev.check('H', 'h1-console-clean: 无应用侧 error/warning（排除已归因的噪声）', not real,
                 f'console 总数={len(console)} GPU噪声={len(env)} dev-only={len(dev)} 应用侧={len(real)}',
                 '; '.join(f'[{t}] {m[:80]}' for t, m in real) or '无')
        ev.check('H', 'h2-no-pageerror: 无未捕获异常', not page_errors,
                 f'pageerror={len(page_errors)}', '; '.join(page_errors[:2]) or '无')

        # ---------- 证据 ----------
        open(os.path.join(art, 'console.json'), 'w').write(
            json.dumps([{'type': t, 'text': m} for t, m in console], ensure_ascii=False, indent=2))
        open(os.path.join(art, 'network.json'), 'w').write(
            json.dumps([{'status': s, 'url': u} for s, u in net], ensure_ascii=False, indent=2))
        browser.close()

    return _finish(ev, art, base)


def _finish(ev, art, base):
    passed = len(ev.rows) - len(ev.failures)
    verdict = 'PASS' if not ev.failures else 'FAIL'
    print(f'\n{"=" * 72}\n结果: {passed}/{len(ev.rows)} 通过  →  {verdict}')
    if ev.failures:
        print('失败: ' + '; '.join(ev.failures))
    date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    path = os.path.join(ROOT, 'reports', f'{date}-auth-report.md')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = [
        f'# Locusify 鉴权验收报告 — {date}', '',
        f'- 被测地址: `{base}`（dev server，内置测试钩子）',
        '- 后端: `https://api.locusify.cn`，经 vite proxy；**测试期间无任何 mock**',
        f'- 证据目录: `{rel(art)}`',
        f'- 结论: **{verdict}**（{passed}/{len(ev.rows)} 断言通过）', '',
        '> 为什么用 dev 而非生产构建：生产 bundle 刻意不含测试钩子，',
        '> 无法在不手写 localStorage 的前提下注入真实会话。', '',
        '## 断言明细', '',
        '| 分组 | 断言 | 结果 | 证据 | 说明 |', '|---|---|---|---|---|',
    ]
    for r in ev.rows:
        lines.append(f'| {r["group"]} | {r["name"]} | {r["result"]} | `{r["evidence"]}` | {r["detail"] or "—"} |')
    lines += ['', '> 凭据来自仓库外文件，未写入本报告也未进入 git。', '']
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
            _finish(ev, art, base)
        sys.exit(1)
