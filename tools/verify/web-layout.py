"""Regression checks for LOC-44 (requires the existing Python Playwright setup).

Run against a running web server:
  python tools/verify/web-layout.py --base http://localhost:3052 --channel msedge
"""
import argparse
import json

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', default='http://localhost:3052')
parser.add_argument('--channel', default='chromium')
args = parser.parse_args()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel=args.channel)
    try:
        for width, height, mobile in [(1440, 900, False), (390, 844, True)]:
            context = browser.new_context(
                viewport={'width': width, 'height': height},
                screen={'width': width, 'height': height},
                device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
            )
            page = context.new_page()
            for home in ['/', '/en']:
                context.clear_cookies()
                context.add_cookies([{'name': 'NEXT_LOCALE', 'value': 'zh' if home == '/' else 'en', 'url': args.base}])
                context.set_extra_http_headers({'Accept-Language': 'zh-CN' if home == '/' else 'en'})
                page.goto(args.base + home, wait_until='networkidle')
                assert page.locator('html').get_attribute('lang') == ('zh-CN' if home == '/' else 'en')
                page.add_style_tag(content='html { scroll-behavior: auto !important; }')
                for section in ['features', 'technology', 'gallery']:
                    top = page.locator('#' + section).evaluate('(el) => el.getBoundingClientRect().top + scrollY')
                    page.evaluate('(y) => scrollTo(0, y)', top + 500)
                    page.wait_for_timeout(300)
                    actual = page.locator('#' + section + ' .sticky').evaluate('(el) => el.getBoundingClientRect().top')
                    assert abs(actual) < 2, (width, home, section, actual)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, section, 'overflow')
                # Same-page anchors must still resolve and scroll.
                page.locator('footer a[href$="#features"]').click()
                page.wait_for_timeout(500)
                assert page.url.endswith('#features')
                assert page.locator('#features').evaluate('(el) => Math.abs(el.getBoundingClientRect().top)') < 2
                for content in ['blog', 'privacy']:
                    path = home.rstrip('/') + '/' + content
                    page.goto(args.base + path, wait_until='networkidle')
                    links = page.locator('[data-site-header] a, main footer a').evaluate_all('(els) => els.map(e => e.getAttribute("href")).filter(h => h?.includes("#"))')
                    assert links and all(h.startswith(home + '#') for h in links), (path, links)
                    page.locator('footer a[href$="#features"]').click()
                    page.wait_for_timeout(700)
                    assert page.locator('#features').count() == 1
                    assert page.evaluate('scrollY > 0'), (width, path, 'did not scroll')
                print(json.dumps({'width': width, 'height': height, 'locale': home, 'result': 'passed'}))
            context.close()
    finally:
        browser.close()
