#!/usr/bin/env python3
"""Locusify 主流程 E2E（由 webapp-testing skill 的 with_server.py 托管 dev server）。

覆盖：打开地图 → 打开上传抽屉 → 选 4 张带 GPS 的图 → EXIF 解析 → 创建路线 → 地图出 4 个 marker

关于这个项目的三个坑，脚本里都做了规避（详见 ./README.md）：
  1. 不能用 wait_for_load_state('networkidle') —— MapLibre 持续拉瓦片，必然超时
  2. dev 模式下 #react-scan-root 会拦截所有点击，必须禁掉其 pointer-events
  3. 匿名用户有登录门禁，且 initializeAuth() 会清掉没有 token 的本地登录态
     → 必须同时 page.route 拦截 /api/v1/*，否则 /auth/me 401 后 clearUser()
"""
import argparse
import glob
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))

# 公告弹窗的开关是 `localStorage['locusify:version'] === pkg.version`（见 pages/map/constants.ts），
# 版本号从 package.json 读，避免硬编码后随发版失效。
with open(os.path.join(os.path.dirname(HERE), 'package.json'), encoding='utf-8') as f:
    APP_VERSION = json.load(f)['version']

# 登录态：/api/v1 会被 mock，localStorage 里预置一份以跳过首屏登录抽屉
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


def seed_storage(user: dict) -> str:
    return """
localStorage.setItem('locusify-tokens', JSON.stringify({accessToken:'e2e-token', refreshToken:'e2e-refresh'}));
localStorage.setItem('locusify-auth', JSON.stringify({state:{user:%s},version:0}));
localStorage.setItem('i18nextLng', 'zh-CN');
// 关掉三个会挡住点击的首屏弹层
localStorage.setItem('locusify:version', %s);   // 版本公告
localStorage.setItem('locusify:help-seen', 'true');
localStorage.setItem('locusify:feedback-last-shown', String(Date.now()));
""" % (json.dumps(user), json.dumps(APP_VERSION))


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
        ctx.add_init_script(seed_storage(E2E_USER))
        ctx.add_init_script(NO_REACT_SCAN_JS)
        page = ctx.new_page()

        console_errors, page_errors = [], []
        page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: page_errors.append(str(e)))

        def on_request(route):
            url = route.request.url
            if not API_RE.search(url):
                return route.continue_()
            for path, data in API_MOCKS.items():
                if url.split('?')[0].endswith(path):
                    return route.fulfill(status=200, content_type='application/json',
                                         body=json.dumps({'success': True, 'data': data}))
            return route.fulfill(status=200, content_type='application/json',
                                 body=json.dumps({'success': True, 'data': {}}))

        page.route(API_RE, on_request)

        # --- 1. 打开地图 ---
        print('\n[1] 打开地图')
        print(f'    (目标版本 {APP_VERSION}，已预置公告/帮助/反馈开关)')
        page.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        # 不用 networkidle；且 canvas 要等 attached（默认 visible 会因 Splash 超时）
        page.wait_for_selector('canvas', state='attached', timeout=40000)
        page.wait_for_selector('[data-testid="map-menu-upload"]', timeout=30000)
        rep.check(True, '地图与菜单已渲染')
        rep.check(page.locator('.ant-drawer').count() == 0, '未出现登录抽屉（鉴权绕过生效）')

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
    if failed:
        print(f'\n✗ 共 {failed} 项断言失败')
        return 1
    print('\n✓ 所有套件通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
