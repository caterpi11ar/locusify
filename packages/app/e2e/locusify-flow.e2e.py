#!/usr/bin/env python3
"""Locusify 主流程 E2E（由 webapp-testing skill 的 with_server.py 托管 dev server）。

覆盖：预置登录态 → 打开地图 → 打开上传抽屉 → 选 4 张带 GPS 的图 → EXIF 解析 → 创建路线 → 地图出 4 个 marker

本项目的坑，脚本里都做了规避（详见 ./README.md）：
  1. 不能用 wait_for_load_state('networkidle') —— MapLibre 持续拉瓦片，必然超时
  2. dev 模式下 #react-scan-root 会拦截所有点击，必须禁掉其 pointer-events
  3. 匿名用户有登录门禁，且 initializeAuth() 会清掉没有 token 的本地登录态
     → 必须同时 page.route 拦截 /api/v1/*，否则 /auth/me 401 后 clearUser()

**状态预置不走手写 localStorage**：所有持久化都交给 zustand persist 中间件，
测试只调 `window.__locusify`（见 src/lib/dev/testBridge.ts）。
自己拼 localStorage 的 key 和 JSON 结构，等于把中间件的序列化格式复制到测试里，
store 一旦改 name / version / partialize / migrate，测试会静默失效。
"""
import argparse
import glob
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))

# E2E 身份：与 src/lib/dev/testBridge.ts 里的 E2E_USER 保持一致
E2E_USER = {
    'id': 'e2e-user-0001',
    'name': 'E2E Tester',
    'avatarUrl': '',
    'email': 'e2e@locusify.dev',
    'provider': 'email',
}

# 必须 mock 的端点（响应信封统一为 {success, data}）
API_MOCKS = {
    '/auth/me': {
        'id': E2E_USER['id'],
        'email': E2E_USER['email'],
        'created_at': '2026-01-01T00:00:00Z',
        'last_sign_in_at': '2026-05-01T00:00:00Z',
    },
    '/profile': {
        'id': E2E_USER['id'],
        'display_name': E2E_USER['name'],
        'avatar_url': None,
        'provider': 'email',
    },
    '/subscriptions': {'plan': 'free', 'status': 'active', 'is_pro': False},
}

# 注意是 /api/v1 —— 用 '**/api/**' 会连 src/lib/api/*.ts 一起拦掉，导致模块加载报 MIME 错误
API_RE = re.compile(r'/api/v1/')

# 禁掉 react-scan 覆盖层的指针事件（dev-only）。用 init script + 兜底，防止注入时序问题
NO_REACT_SCAN_JS = """
(() => {
  const inject = () => {
    if (!document.head || document.getElementById('e2e-no-react-scan')) return;
    const s = document.createElement('style');
    s.id = 'e2e-no-react-scan';
    s.textContent = '#react-scan-root{pointer-events:none !important}';
    document.head.appendChild(s);
  };
  inject();
  document.addEventListener('DOMContentLoaded', inject);
})();
"""


def on_api_request(route):
    """拦截 /api/v1/*。注意这是精确前缀 —— 用 '**/api/**' 会连 src/lib/api/*.ts 一起拦掉。"""
    url = route.request.url
    if not API_RE.search(url):
        return route.continue_()
    for path, data in API_MOCKS.items():
        if url.split('?')[0].endswith(path):
            return route.fulfill(status=200, content_type='application/json',
                                 body=json.dumps({'success': True, 'data': data}))
    return route.fulfill(status=200, content_type='application/json',
                         body=json.dumps({'success': True, 'data': {}}))


# 升级前的存储形态：token 是扁平对象，三个 UI 开关是裸 key
LEGACY_SEED_JS = """
localStorage.setItem('locusify-tokens', JSON.stringify({accessToken:'legacy-access', refreshToken:'legacy-refresh'}));
localStorage.setItem('locusify:version', 'legacy-version-sentinel');
localStorage.setItem('locusify:help-seen', 'true');
localStorage.setItem('locusify:feedback-last-shown', '1750000000000');
"""


def seed_via_stores(page, base: str, rep: 'Report') -> None:
    """把登录态与弹层开关写进去。

    分两步：先加载应用（需要它的 store 在运行），再调测试桥写入，
    然后 reload —— 此时 localStorage 里已有 persist 写下的信封，
    initializeAuth() 会走真实的 /auth/me + /profile（被 mock）。
    """
    page.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function('() => !!window.__locusify', timeout=40000)
    page.evaluate('''() => {
      window.__locusify.dismissOverlays();
      window.__locusify.signIn();
    }''')

    written = page.evaluate('''() => {
      const k = window.__locusify.storageKeys;
      return {
        tokens: !!localStorage.getItem(k.tokens),
        ui: !!localStorage.getItem(k.ui),
        auth: !!localStorage.getItem(k.auth),
      };
    }''')
    rep.check(written['tokens'], 'persist 中间件已写出 token')
    rep.check(written['ui'], 'persist 中间件已写出弹层开关')
    rep.check(written['auth'], 'persist 中间件已写出登录态')
    page.reload(wait_until='domcontentloaded', timeout=60000)


class Report:
    def __init__(self):
        self.failures = []
        self.checks = 0

    def check(self, ok: bool, label: str, detail: str = ''):
        self.checks += 1
        mark = 'PASS' if ok else 'FAIL'
        print(f'    [{mark}] {label}{f" — {detail}" if detail else ""}')
        if not ok:
            self.failures.append(label)
        return ok


def run(base: str, shots: str, fixtures: list[str], headed: bool) -> int:
    os.makedirs(shots, exist_ok=True)
    rep = Report()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        ctx = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            locale='zh-CN',
        )
        ctx.add_init_script(NO_REACT_SCAN_JS)
        page = ctx.new_page()

        console_errors, page_errors = [], []
        page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: page_errors.append(str(e)))

        # 记录矢量瓦片响应，用来判断地图加载已经在收敛
        tile_hits = []
        page.on('response', lambda r: tile_hits.append(r.url) if '.mvt' in r.url and r.ok else None)

        def on_request(route):
            return on_api_request(route)

        page.route(API_RE, on_request)

        # --- 0. 预置状态（全程走 zustand persist 中间件） ---
        print('\n[0] 预置登录态与弹层开关（经 store 写入，不手写 localStorage）')
        seed_via_stores(page, base, rep)

        # --- 1. 打开地图 ---（seed_via_stores 已 reload 到 /zh-CN/，不再重复导航）
        print('[1] 打开地图')
        # 不用 networkidle；且 canvas 要等 attached（默认 visible 会因 Splash 超时）
        page.wait_for_selector('canvas', state='attached', timeout=40000)
        page.wait_for_selector('[data-testid="map-menu-upload"]', timeout=30000)
        # 只等 canvas 挂上是不够的：MapLibre 异歩拉矢量瓦片 *并且异歩绘制*，
        # 刚拿到瓦片时截图会得到一张纯色空地图，而断言照样通过。
        # 等到 .mvt 响应数不再增长，说明这一轮加载已经稳定。
        waited, last_count, stable_ms = 0, 0, 0
        while waited < 45000 and stable_ms < 1500:
            page.wait_for_timeout(300)
            waited += 300
            count = len(tile_hits)
            stable_ms = stable_ms + 300 if count and count == last_count else 0
            last_count = count
        rep.check(bool(tile_hits), '地图已拉取矢量瓦片', f'{len(tile_hits)} 个 .mvt 响应，用时 {waited}ms')
        rep.check(page.locator('.ant-drawer').count() == 0, '未出现登录抽屉（登录态已注入）')

        # 回归：地图控件曾引用 locale 里不存在的 explory.controls.*，导致 title 漏出原始 key
        t = page.get_attribute('[data-testid="map-control-locate"]', 'title')
        rep.check(bool(t) and not t.startswith('explory.'), '地图控件 title 已翻译', t or '(空)')
        page.screenshot(path=f'{shots}/01-map.png')

        # --- 2. 打开上传抽屉 ---
        print('[2] 打开上传抽屉')
        page.click('[data-testid="map-menu-upload"]')
        page.wait_for_selector('[data-testid="photo-file-input"]', state='attached', timeout=20000)
        rep.check(page.locator('.ant-drawer').count() == 1, '上传抽屉已打开')
        page.screenshot(path=f'{shots}/02-upload-drawer.png')

        # --- 3. 选择 4 张带 GPS 的图 ---
        print(f'[3] 选择 {len(fixtures)} 张带 GPS 的测试图')
        page.set_input_files('[data-testid="photo-file-input"]', fixtures)
        page.wait_for_selector('[data-testid="route-create"]', timeout=30000)
        drawer_text = page.locator('.ant-drawer').inner_text().replace('\n', ' | ')
        n = len(fixtures)
        # 断言与语言无关：每张带 GPS 的图会渲染一个 GPS 徐标
        gps_badges = page.locator('.ant-drawer').get_by_text('GPS', exact=True).count()
        rep.check(gps_badges == n, f'抽屉内 GPS 标记数 == {n}', f'实际 {gps_badges} | {drawer_text[:100]}')
        rep.check(page.locator('[data-testid="route-create"]').is_enabled(), '“生成路线”按钮可用')
        page.screenshot(path=f'{shots}/03-gps-detected.png')

        # --- 4. 创建路线 ---
        print('[4] 创建路线')
        page.click('[data-testid="route-create"]')
        page.wait_for_selector('.maplibregl-marker', timeout=30000)
        page.wait_for_timeout(2000)

        # --- 5. 断言 ---
        print('[5] 校验')
        markers = page.locator('.maplibregl-marker').count()
        rep.check(markers == n, f'地图出点数量 == {n}', f'实际 {markers}')
        rep.check(page.locator('.ant-drawer').count() == 0, '抽屉已自动关闭')
        rep.check(not page_errors, '无未捕获异常', '; '.join(page_errors[:2]))
        page.screenshot(path=f'{shots}/04-route-on-map.png')

        browser.close()

    print(f'\n结果：{rep.checks - len(rep.failures)}/{rep.checks} 通过，截图见 {shots}')
    if rep.failures:
        print('失败项：' + '; '.join(rep.failures))
        return 1

    print('全部通过 ✓')
    return 0


def run_locale_routes(base: str, shots: str, headed: bool) -> int:
    """回归套件：语言路由 /en/ /zh-CN/ 必须以 URL 为准。

    曾经 settingsStore 的 onRehydrateStorage 会无条件 changeLanguage，
    把路由 loader 设的语言顶掉：全新访客访问 /zh-CN/ 得到英文，
    带 zh-CN 偏好的老用户访问 /en/ 又得到中文。这对 SEO/分享落地页是硬伤。
    """
    cases = [
        ('/zh-CN/', False, '定位到我的位置', 'zh-CN', '/zh-CN/ 全新访客'),
        ('/en/', False, 'Show my location', 'en', '/en/ 全新访客'),
        ('/zh-CN/', True, '定位到我的位置', 'zh-CN', '/zh-CN/ 偏好=zh-CN'),
        ('/en/', True, 'Show my location', 'en', '/en/ 偏好=zh-CN（URL 应优先）'),
    ]
    pref_js = """localStorage.setItem('locusify-settings', %s);""" % json.dumps(json.dumps({
        'state': {'language': 'zh-CN', 'theme': 'dark', 'avatarSource': {'type': 'profile'}},
        'version': 0,
    }))

    rep = Report()
    print('\n[6] 语言路由回归（每个用例独立 context，保证 localStorage 隔离）')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        for path, seed, expect_title, expect_html_lang, label in cases:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
            if seed:
                ctx.add_init_script(pref_js)
            page = ctx.new_page()
            page.goto(f'{base}{path}', wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('[data-testid="map-control-locate"]', timeout=40000)
            page.wait_for_timeout(int(os.environ.get('E2E_SETTLE_MS', '5000')))
            title = page.get_attribute('[data-testid="map-control-locate"]', 'title')
            html_lang = page.get_attribute('html', 'lang')
            rep.check(title == expect_title, f'{label} → 文案正确', f'得到 {title!r}')
            rep.check(html_lang == expect_html_lang, f'{label} → <html lang> 正确',
                      f'得到 {html_lang!r}')
            page.screenshot(path=f'{shots}/05-locale-{path.strip("/").lower()}.png')
            ctx.close()
        browser.close()
    return len(rep.failures)


def run_legacy_migration(base: str, shots: str, headed: bool) -> int:
    """升级兼容回归：旧版直接写在 localStorage 的形态必须被搬进 persist 信封。

    搬不动的后果：所有已登录用户升级后被登出，已关过的公告/引导重新弹出。
    等这个 shim 下线后可一并删除本套件。
    """
    rep = Report()
    print('\n[7] 旧存储格式迁移（升级兼容）')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN')
        ctx.add_init_script(LEGACY_SEED_JS)
        ctx.add_init_script(NO_REACT_SCAN_JS)
        page = ctx.new_page()
        page.route(API_RE, on_api_request)
        page.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        page.wait_for_selector('[data-testid="map-menu-upload"]', timeout=40000)
        page.wait_for_timeout(int(os.environ.get('E2E_SETTLE_MS', '4000')))

        got = page.evaluate('''() => {
          const legacy = ['locusify:version', 'locusify:help-seen', 'locusify:feedback-last-shown'];
          return {
            tokens: localStorage.getItem('locusify-tokens'),
            ui: localStorage.getItem('locusify-ui'),
            legacyLeft: legacy.filter(k => localStorage.getItem(k) !== null),
            drawers: document.querySelectorAll('.ant-drawer').length,
          };
        }''')

        tokens = json.loads(got['tokens'] or '{}')
        ui = json.loads(got['ui'] or '{}')
        rep.check(tokens.get('state', {}).get('accessToken') == 'legacy-access',
                  '旧的扁平 token 已搬进 persist 信封', got['tokens'] or '(空)')
        rep.check(ui.get('state', {}).get('helpSeen') is True, 'help-seen 已搬移')
        rep.check(ui.get('state', {}).get('announcementSeenVersion') == 'legacy-version-sentinel',
                  '公告已读版本已搬移', str(ui.get('state', {}).get('announcementSeenVersion')))
        rep.check(ui.get('state', {}).get('feedbackLastShown') == 1750000000000,
                  '反馈时间戳已搬移', str(ui.get('state', {}).get('feedbackLastShown')))
        rep.check(got['legacyLeft'] == [], '旧裸 key 已清理', str(got['legacyLeft']))
        rep.check(got['drawers'] == 0, '旧 token 生效，未弹登录抽屉', f"实际 {got['drawers']}")
        page.screenshot(path=f'{shots}/06-legacy-migration.png')
        browser.close()
    return len(rep.failures)


def main() -> int:
    ap = argparse.ArgumentParser(description='Locusify 主流程 E2E')
    ap.add_argument('--base', default=os.environ.get('BASE', 'http://localhost:1050'))
    ap.add_argument('--shots', default=os.environ.get('SHOT_DIR', os.path.join(HERE, 'shots')))
    ap.add_argument('--fixtures', default=os.path.join(HERE, 'fixtures'))
    ap.add_argument('--headed', action='store_true')
    args = ap.parse_args()

    fixtures = sorted(glob.glob(os.path.join(args.fixtures, '*.jpg')))
    if not fixtures:
        print(f'✗ 没有找到测试图: {args.fixtures}', file=sys.stderr)
        return 2

    os.makedirs(args.shots, exist_ok=True)
    failed = run(args.base, args.shots, fixtures, args.headed)
    failed += run_locale_routes(args.base, args.shots, args.headed)
    failed += run_legacy_migration(args.base, args.shots, args.headed)
    if failed:
        print(f'\n✗ 共 {failed} 项断言失败')
        return 1
    print('\n✓ 所有套件通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
