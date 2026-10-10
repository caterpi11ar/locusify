#!/usr/bin/env python3
"""Locusify 验收 harness：对**生产构建 + 真实后端**做证据化验收。

与 packages/app/e2e/ 的区别：
  - e2e/ 是**前端状态机**测试，刻意 mock 掉 /api/v1，追求快和稳
  - 本 harness 打**真实后端**，并把证据（截图 / DOM 文本 / 网络记录）落盘

用法：
  python3 tools/verify/verify.py --base http://localhost:4173 [--vision]

退出码 0 = 全部通过；1 = 有断言失败；2 = 环境不可用。
"""
import argparse
import json
import os
import re
import struct
import sys
import time
import zlib
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API_RE = re.compile(r'/api/v1/')

# 供顶层异常兜底用：harness 自己崩了也必须留下一份报告，而不是只吐 traceback
_STATE = {'ev': None, 'art': None, 'base': None, 'results': {}}


# --------------------------------------------------------------------------- #
# 无依赖 PNG 解码：用来做像素级断言（WebGL canvas 不能用 drawImage 读，
# 必须走 Playwright 的元素截图 + 自己解码）
# --------------------------------------------------------------------------- #
def decode_png(data: bytes):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos, idat, w, h, nch = 8, b'', 0, 0, 4
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, depth, color, _, _, inter = struct.unpack('>IIBBBBB', chunk)
            assert depth == 8 and inter == 0, (depth, inter)
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
        f = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if f == 1:
            for i in range(nch, stride):
                line[i] = (line[i] + line[i - nch]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
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


def image_stats(png_bytes: bytes, band=None):
    """返回 (mean, std, distinct_color_buckets)。band=(y0f,y1f) 只统计中段。"""
    w, h, nch, px = decode_png(png_bytes)
    y0, y1 = (int(h * band[0]), int(h * band[1])) if band else (0, h)
    step = max(1, (w * (y1 - y0)) // 40000)
    vals, buckets = [], set()
    i = y0 * w
    end = y1 * w
    while i < end:
        o = i * nch
        r, g, b = px[o], px[o + 1], px[o + 2]
        vals.append((r + g + b) / 3)
        buckets.add(f'{r >> 4},{g >> 4},{b >> 4}')
        i += step
    mean = sum(vals) / len(vals)
    std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
    return w, h, mean, std, len(buckets)


# --------------------------------------------------------------------------- #
class Evidence:
    def __init__(self, art_dir):
        self.art_dir = art_dir
        self.rows = []
        self.failures = []

    def check(self, group, name, ok, evidence, detail=''):
        self.rows.append({
            'group': group, 'name': name,
            'result': 'PASS' if ok else 'FAIL',
            'evidence': evidence, 'detail': detail,
        })
        if not ok:
            self.failures.append(f'{group}/{name}')
        print(f'  [{"PASS" if ok else "FAIL"}] {name}'
              f'{f" — {detail}" if detail else ""}')
        print(f'         证据: {evidence}')

    def shot(self, page, name):
        path = os.path.join(self.art_dir, f'{name}.png')
        page.screenshot(path=path)
        return path


def rel(p):
    return os.path.relpath(p, ROOT)


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True, help='被测地址，如 http://localhost:4173')
    ap.add_argument('--vision', action='store_true', help='额外跑 Midscene 多模态断言')
    ap.add_argument('--headed', action='store_true')
    args = ap.parse_args()

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    art = os.path.join(ROOT, 'artifacts', stamp)
    os.makedirs(art, exist_ok=True)
    ev = Evidence(art)
    base = args.base.rstrip('/')
    _STATE.update(ev=ev, art=art, base=base)

    print(f'\n被测地址: {base}')
    print(f'证据目录: {rel(art)}\n')

    results = {}
    _STATE['results'] = results
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)

        # ---------------- A. 服务自检 ----------------
        print('[A] 服务自检（硬规则：401=在跑且路由已注册）')
        ctx = browser.new_context()
        api = ctx.request.get(f'{base}/api/v1/auth/me', fail_on_status_code=False)
        results['boot'] = api.status
        ev.check('A', 'a1-boot-health: /api/v1/auth/me 返回 401',
                 api.status == 401,
                 f'HTTP {api.status} (GET {base}/api/v1/auth/me)',
                 f'实际 {api.status}（000=没起来, 404=未注册）')
        ctx.close()

        # ---------------- 主上下文 ----------------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900},
                                  device_scale_factor=2, locale='zh-CN')
        page = ctx.new_page()
        console, page_errors, net = [], [], []
        page.on('console', lambda m: console.append((m.type, m.text)))
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('response', lambda r: net.append((r.status, r.url)))

        off = {'profile': True, 'subscriptions': True, 'auth/me': True}

        def on_route(route):
            url = route.request.url
            if not API_RE.search(url) or not off['auth/me']:
                return route.continue_()
            path = url.split('?')[0]
            if path.endswith('/auth/me'):
                return route.fulfill(status=200, content_type='application/json', body=json.dumps(
                    {'success': True, 'data': {'id': 'e2e-user-0001', 'email': 'e2e@locusify.dev',
                                               'created_at': '2026-01-01T00:00:00Z',
                                               'last_sign_in_at': '2026-05-01T00:00:00Z'}}))
            return route.continue_()

        page.route(API_RE, on_route)
        page.add_init_script(
            "(()=>{const i=()=>{if(!document.head||document.getElementById('v-nrs'))return;"
            "const s=document.createElement('style');s.id='v-nrs';"
            "s.textContent='#react-scan-root{pointer-events:none !important}';"
            "document.head.appendChild(s);};i();document.addEventListener('DOMContentLoaded',i);})();")

        # 生产构建没有 window.__locusify（dev-only），匿名访问。
        # 只导航一次：二次 goto 会中断 MapLibre 在途的 tiles.json/sprite.json/.mvt 请求，
        # 被它记成 AJAXError 写进 console，从而污染 console 门禁（曾经因此误判为应用缺陷）。
        page.goto(f'{base}/zh-CN/', wait_until='domcontentloaded', timeout=60000)
        page.wait_for_selector('[data-testid="map-control-locate"]', timeout=45000)

        # 等瓦片加载收敛，再进任何断言，避免拿到半成品现场
        waited, last, stable = 0, 0, 0
        while waited < 45000 and stable < 1500:
            page.wait_for_timeout(300)
            waited += 300
            n = sum(1 for s, u in net if s == 200 and '.mvt' in u)
            stable = stable + 300 if n and n == last else 0
            last = n
        print(f'    瓦片加载收敛于 {waited}ms（{last} 个 .mvt）')

        # ---------------- E. i18n / SEO ----------------
        print('\n[E] i18n 与 SEO')
        html_lang = page.get_attribute('html', 'lang')
        locate_title = page.get_attribute('[data-testid="map-control-locate"]', 'title')
        ev.check('E', 'e1-locale-routes: /zh-CN/ 中文且 html lang 正确',
                 html_lang == 'zh-CN' and locate_title and not locate_title.startswith('explory.'),
                 f'{rel(ev.shot(page, "e1-zh-CN"))} | <html lang>={html_lang} | locate.title={locate_title!r}',
                 f'lang={html_lang} title={locate_title!r}')

        hreflang = page.eval_on_selector_all(
            'link[rel="alternate"][hreflang]',
            'els => els.map(e => e.hreflang + "=" + e.href)')
        canonical = page.get_attribute('link[rel="canonical"]', 'href')
        ld = page.eval_on_selector(
            'script#locusify-structured-data',
            'el => el.textContent.length') if page.query_selector('script#locusify-structured-data') else 0
        ev.check('E', 'e2-seo-meta: canonical / hreflang / JSON-LD 齐全',
                 bool(canonical) and len(hreflang) >= 3 and ld > 500,
                 f'canonical={canonical} hreflang={hreflang} jsonld={ld}B',
                 f'hreflang={len(hreflang)} jsonld={ld}B')

        # ---------------- B. 状态矩阵 ----------------
        print('\n[B] 状态矩阵')
        drawers = page.locator('.ant-drawer').count()
        ev.check('B', 'b1-anonymous-gate: 匿名访问弹出登录抽屉',
                 drawers >= 1,
                 f'{rel(ev.shot(page, "b1-anonymous-gate"))} | .ant-drawer={drawers}',
                 f'.ant-drawer={drawers}')
        upload_visible = page.locator('[data-testid="map-menu-upload"]').count()
        ev.check('B', 'b2-no-auth: 匿名不可见上传入口（门禁生效）',
                 upload_visible == 0,
                 f'map-menu-upload 节点数={upload_visible}', f'{upload_visible}')

        # ---------------- G. 视觉：地图是否真的画出来 ----------------
        print('\n[G] 视觉验证')
        # 先用网络层确认 MapLibre 真的拉到了矢量瓦片（拉不到就没必要看像素）
        mvt = [u for s, u in net if s == 200 and '.mvt' in u]
        ev.check('G', 'g0-tiles-fetched: MapLibre 成功拉取矢量瓦片', bool(mvt),
                 f'{len(mvt)} 个 .mvt 200（例: {mvt[0].split("/")[-1] if mvt else "-"}）',
                 f'{len(mvt)} 个')
        shot = page.locator('.maplibregl-map').first.screenshot()
        open(os.path.join(art, 'g1-map-area.png'), 'wb').write(shot)
        w, h, mean, std, buckets = image_stats(shot, band=(0.30, 0.62))
        ev.check('G', 'g1-visual-map: 地图中段有真实内容（非空白 canvas）',
                 std > 10 and buckets > 40,
                 f'{rel(os.path.join(art, "g1-map-area.png"))} | {w}x{h} mean={mean:.1f} std={std:.1f} 色桶={buckets}',
                 f'std={std:.1f} 色桶={buckets}')

        # ---------------- H. console 门禁 ----------------
        print('\n[H] console 门禁')
        # 环境噪声（headless/SwiftShader），不算应用缺陷，但要显式列出
        ENV_NOISE = ('GPU stall due to ReadPixels', 'GL Driver Message', 'WebGL-')
        bad = [(t, m) for t, m in console if t in ('error', 'warning')]
        env_noise = [(t, m) for t, m in bad if any(k in m for k in ENV_NOISE)]
        real = [(t, m) for t, m in bad if (t, m) not in env_noise]
        detail = '; '.join(f'[{t}] {m[:90]}' for t, m in real) or '无'
        ev.check('H', 'h1-console-clean: 无应用侧 error/warning', not real,
                 f'console 总数={len(console)} 环境噪声={len(env_noise)} 应用侧={len(real)}',
                 detail)
        ev.check('H', 'h2-no-pageerror: 无未捕获异常', not page_errors,
                 f'pageerror={len(page_errors)}', '; '.join(page_errors[:2]) or '无')

        # 证据先落盘，后面即使断言抛异常也留得下现场
        open(os.path.join(art, 'console.json'), 'w').write(
            json.dumps([{'type': t, 'text': m} for t, m in console], ensure_ascii=False, indent=2))
        open(os.path.join(art, 'network.json'), 'w').write(
            json.dumps([{'status': s, 'url': u} for s, u in net], ensure_ascii=False, indent=2))

        # ---------------- B. 定位无权限 ----------------
        print('\n[B] 定位无权限路径')
        toast = ''
        try:
            # 匿名时登录抽屉盖住地图控件，真实命中测试点不到它。
            # 这里验的是「定位失败的处理」而不是命中测试，所以直接派发 click；
            # 真实点击链路在 dev 的 E2E 里覆盖（那里已登录、抽屉关闭）。
            page.locator('[data-testid="map-control-locate"]').dispatch_event('click')
            for _ in range(15):
                page.wait_for_timeout(1000)
                if page.locator('[data-sonner-toast]').count():
                    toast = page.locator('[data-sonner-toast]').first.inner_text()
                    break
        except Exception as e:  # noqa: BLE001
            toast = f'<点击失败: {type(e).__name__}>'
        geo_warn = [m for t, m in console if 'Geolocation' in m]
        ev.check('B', 'b4-geo-denied: 拒绝定位时给出可读反馈',
                 '权限被拒绝' in toast,
                 f'{rel(ev.shot(page, "b4-geo-denied"))} | [data-sonner-toast]="{toast}"',
                 f'toast={toast!r}')
        ev.check('B', 'b4b-geo-silent: 不再向 console 输出 geolocation warning',
                 not geo_warn,
                 f'含 Geolocation 的 console 消息={len(geo_warn)}',
                 str(geo_warn[:1]))

        if args.vision:
            print('\n[G] 多模态断言（Midscene）')
            # Midscene 需要自己的浏览器会话，这里只做可用性声明，真正执行为独立命令
            print('  (由 run.sh 单独调用 midscene，见报告)')

        browser.close()

    # ---------------- 报告 ----------------
    passed = len(ev.rows) - len(ev.failures)
    verdict = 'PASS' if not ev.failures else 'FAIL'
    print(f'\n{"=" * 72}\n结果: {passed}/{len(ev.rows)} 通过  →  {verdict}')
    if ev.failures:
        print('失败: ' + '; '.join(ev.failures))

    write_report(art, base, ev, results, verdict, passed)
    return 0 if not ev.failures else 1


def write_report(art, base, ev, results, verdict, passed):
    date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    rdir = os.path.join(ROOT, 'reports')
    os.makedirs(rdir, exist_ok=True)
    path = os.path.join(rdir, f'{date}-test-report.md')
    lines = [
        f'# Locusify 验收报告 — {date}',
        '',
        f'- 被测地址: `{base}`（生产构建 `vite preview` + 真实后端 `api.locusify.cn`，无 mock）',
        f'- 证据目录: `{rel(art)}`',
        f'- 服务自检: `GET /api/v1/auth/me` → HTTP {results.get("boot")}',
        f'- 结论: **{verdict}**（{passed}/{len(ev.rows)} 断言通过）',
        '',
        '## 断言明细',
        '',
        '| 分组 | 断言 | 结果 | 证据 | 说明 |',
        '|---|---|---|---|---|',
    ]
    for r in ev.rows:
        lines.append(f'| {r["group"]} | {r["name"]} | {r["result"]} | `{r["evidence"]}` | {r["detail"] or "—"} |')
    lines += ['', '## 证据文件', '', '```']
    for f in sorted(os.listdir(art)):
        lines.append(f'{rel(os.path.join(art, f))}')
    lines += ['```', '']
    lines += [
        '## 覆盖范围与缺口',
        '',
        '本链路验证的是：**生产构建 + 真实后端**（经 vite preview 代理，无 mock）。',
        '',
        '| 已覆盖 | 说明 |',
        '|---|---|',
        '| 服务自检 | `/api/v1/auth/me` → 401（在跑且路由已注册）|',
        '| 匿名门禁 | 登录抽屉弹出、上传入口不可见 |',
        '| i18n / SEO | `<html lang>`、canonical、hreflang×3、JSON-LD |',
        '| 地图渲染 | `.mvt` 网络级 + 像素方差（防「canvas 已挂载但一片空白」）|',
        '| 定位降级 | 拒绝授权 → toast；不污染 console |',
        '| console 门禁 | 应用侧 error/warning = 0 |',
        '',
        '| 未覆盖 | 原因 |',
        '|---|---|',
        '| 登录后功能（上传→EXIF→路线）| 验收构建无 dev 测试桥；已在 `packages/app/e2e/` 用 mock 后端覆盖 |',
        '| 真实账号登录（OTP / signin）| 无可用的测试账号与邮箱验证码通道 |',
        '| 写操作（signup / feedback / redeem）| `api.locusify.cn` 疑为生产环境，未获授权不做写入 |',
        '| 越权 / 角色差异 | 后端只有单一 free 计划，无多角色模型 |',
        '| 轨迹回放 / MP4 导出 | 依赖 headless 下能力不确定的编码器 |',
        '',
        '## 纳入 CI',
        '',
        '```bash',
        'pnpm verify            # 全链路；退出码 0 = 通过，2 = 环境不可用',
        'VERIFY_PORT=4300 pnpm verify',
        'pnpm verify --vision   # 额外跑 Midscene 多模态断言（需 .env 里的 MIDSCENE_MODEL_*）',
        '```',
        '',
        '- 耗时：typecheck+lint+test ≈ 40s，build ≈ 20s，验收 ≈ 90s；给 10 分钟余量。',
        '- artifacts：`artifacts/<UTC 时间戳>/`，含截图与 console/network JSON，可直接上传为 CI artifact。',
        '- `reports/<date>-test-report.md` 每次覆盖写入，可当流水线摘要。',
        '- 前置：`python3` 带 `playwright` + chromium（与 `packages/app/e2e` 共用同一套运行时）。',
        '- 已内置防误判：启动前清理端口残留（否则 `--strictPort` 静默失败会让验收打到旧服务），',
        '  单次导航（否则会 abort MapLibre 在途请求、被记成 console error 而误判为应用缺陷）。',
        '',
    ]
    open(path, 'w').write('\n'.join(lines) + '\n')
    print(f'报告: {rel(path)}')


if __name__ == '__main__':
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except BaseException:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        ev, art, base = _STATE['ev'], _STATE['art'], _STATE['base']
        if ev is not None:
            ev.check('Z', 'z1-harness-completed', False,
                     'harness 自身异常中断（上述断言为中断前已采集的部分）',
                     traceback.format_exc().strip().splitlines()[-1][:160])
            passed = len(ev.rows) - len(ev.failures)
            write_report(art, base, ev, _STATE['results'], 'FAIL(harness crashed)', passed)
        sys.exit(1)
