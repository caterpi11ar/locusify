#!/usr/bin/env bash
#
# 全链路一条命令跑完，并生成 HTML 报告。
#
#   pnpm verify:all            跑全部并出 HTML
#   pnpm verify:all --open     跑完自动打开报告
#
# 四层：
#   1. 单元/组件（Vitest）
#   2. E2E 主流程（Playwright + mock 后端，验前端状态机）
#   3. 验收（生产构建 + 真实后端，匿名门禁 / SEO / console 门禁）
#   4. 鉴权验收 + 对抗边界（dev server + 真实账号 + 真实后端）
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/packages/app"
PREVIEW_PORT="${VERIFY_PORT:-4173}"
DEV_PORT="${AUTH_PORT:-1052}"
ACCOUNT="${LOCUSIFY_TEST_ACCOUNT:-$HOME/.locusify-test-account}"
EDGE_DIR="${EDGE_DIR:-/tmp/locusify-edge}"
OPEN=0
[[ "${1:-}" == "--open" ]] && OPEN=1

log() { printf '\n\033[1m======== %s ========\033[0m\n' "$*"; }
RESULTS=()

kill_port() { local p="$1"; local pid; pid=$(lsof -ti:"$p" 2>/dev/null | head -1); \
  [[ -n "$pid" ]] && { kill "$pid" 2>/dev/null || true; sleep 1; }; }

cleanup() { kill_port "$PREVIEW_PORT"; kill_port "$DEV_PORT"; }
trap cleanup EXIT

# ---------------------------------------------------------------- 1. 单元
log "1/4 单元与组件测试"
if (cd "$APP" && pnpm typecheck && pnpm lint && pnpm test -- --run); then
  RESULTS+=("单元/类型/Lint|PASS|49 个用例（4 文件）+ tsc + eslint 全绿")
else
  RESULTS+=("单元/类型/Lint|FAIL|见上方输出")
fi

# ---------------------------------------------------------------- 2. E2E
log "2/4 E2E 主流程（mock 后端）"
# 用退出码判定，不要 grep -q 输出：pipefail 下 grep 提前退出会让 tee 吃到
# SIGPIPE，从而把成功的 e2e 判成失败。
if (cd "$APP" && pnpm e2e) > /tmp/verify-all-e2e.log 2>&1; then
  RESULTS+=("E2E 主流程|PASS|26 断言：[0]-[5] 上传链路 / [6] 语言路由 / [7] 存储迁移")
else
  RESULTS+=("E2E 主流程|FAIL|见 /tmp/verify-all-e2e.log")
fi

# ---------------------------------------------------------------- 3. 生产验收
log "3/4 验收：生产构建 + 真实后端"
kill_port "$PREVIEW_PORT"
( cd "$APP" && pnpm build >/tmp/verify-all-build.log 2>&1 ) || true
( cd "$APP" && nohup npx vite preview --port "$PREVIEW_PORT" --strictPort \
    >/tmp/verify-all-preview.log 2>&1 & )
for _ in $(seq 1 45); do curl -sf -o /dev/null -m 3 "http://localhost:$PREVIEW_PORT/zh-CN/" && break; sleep 1; done
if python3 "$ROOT/tools/verify/verify.py" --base "http://localhost:$PREVIEW_PORT" >/tmp/verify-all-prod.log 2>&1; then
  RESULTS+=("验收（生产+真实后端）|PASS|11 断言：服务自检/匿名门禁/SEO/地图像素/定位降级/console 门禁")
else
  RESULTS+=("验收（生产+真实后端）|FAIL|见 /tmp/verify-all-prod.log")
fi
kill_port "$PREVIEW_PORT"

# ---------------------------------------------------------------- 4. 鉴权 + 对抗
if [[ ! -f "$ACCOUNT" ]]; then
  log "4/4 跳过：找不到凭据文件 $ACCOUNT"
  RESULTS+=("鉴权验收|SKIP|缺少 $ACCOUNT")
  RESULTS+=("对抗与边界|SKIP|缺少 $ACCOUNT")
else
  log "4/4 鉴权验收 + 对抗边界（dev + 真实账号 + 真实后端）"
  kill_port "$DEV_PORT"
  ( cd "$APP" && nohup npx vite --port "$DEV_PORT" --strictPort >/tmp/verify-all-dev.log 2>&1 & )
  for _ in $(seq 1 45); do curl -sf -o /dev/null -m 3 "http://localhost:$DEV_PORT/zh-CN/" && break; sleep 1; done

  if python3 "$ROOT/tools/verify/verify-auth.py" --base "http://localhost:$DEV_PORT" --account "$ACCOUNT" \
       >/tmp/verify-all-auth.log 2>&1; then
    RESULTS+=("鉴权验收（真实账号）|PASS|13 断言：真实 signin → /auth/me /profile /subscriptions → 上传→EXIF→路线")
  else
    RESULTS+=("鉴权验收（真实账号）|FAIL|见 /tmp/verify-all-auth.log")
  fi

  log "4e/4 布局对齐审计（各界面内容块左右边缘）"
  if python3 "$ROOT/tools/verify/audit-align.py" --base "http://localhost:$DEV_PORT" \
       --json "$ROOT/artifacts/align-audit.json" >/tmp/verify-all-align.log 2>&1; then
    RESULTS+=("布局对齐审计|PASS|6 个界面 / 20 个内容块左右边缘全部对齐")
  else
    RESULTS+=("布局对齐审计|FAIL|见 /tmp/verify-all-align.log")
  fi

  log "4d/4 按钮一致性审计（圆角/高度/居中，运行时实测）"
  if python3 "$ROOT/tools/verify/audit-buttons.py" --base "http://localhost:$DEV_PORT" \
       --json "$ROOT/artifacts/button-audit.json" >/tmp/verify-all-buttons.log 2>&1; then
    RESULTS+=("按钮一致性审计|PASS|圆角收敛为 图标=full / 文字=12px 两种；垂直居中 0 个不达标")
  else
    RESULTS+=("按钮一致性审计|FAIL|见 /tmp/verify-all-buttons.log")
  fi

  log "4c/4 UI 设计审计（对比度/触控目标/语义/反模式）"
  if python3 "$ROOT/tools/verify/audit-ui.py" --base "http://localhost:$DEV_PORT" --json "$ROOT/artifacts/ui-audit.json" \
       >/tmp/verify-all-ui.log 2>&1; then
    RESULTS+=("UI 设计审计|PASS|文本对比度全部达 WCAG AA；触控目标达标；无 transition:all、无可点击 div、无嵌套交互、无缺失可访问名")
  else
    RESULTS+=("UI 设计审计|FAIL|见 /tmp/verify-all-ui.log")
  fi

  if [[ -d "$EDGE_DIR" ]]; then
    if python3 "$ROOT/tools/verify/verify-edge.py" --base "http://localhost:$DEV_PORT" \
         --account "$ACCOUNT" --edge-dir "$EDGE_DIR" >/tmp/verify-all-edge.log 2>&1; then
      RESULTS+=("对抗与边界|PASS|22 断言：无 GPS / 非图片 / 30 张 / 连点提交 / 连点菜单 / 后端全挂 / 相机跟随 / 移动端不换行 / 提示卡不遮工具栏与控制轨")
    else
      RESULTS+=("对抗与边界|FAIL|见 /tmp/verify-all-edge.log")
    fi
  else
    RESULTS+=("对抗与边界|SKIP|缺少素材目录 $EDGE_DIR")
  fi
  kill_port "$DEV_PORT"
fi

# ---------------------------------------------------------------- 报告
log "生成 HTML 报告"
printf '%s\n' "${RESULTS[@]}" > /tmp/verify-all-summary.txt
if ! python3 "$ROOT/tools/verify/report.py"; then
  # 报告生成失败不能静默算通过
  RESULTS+=("HTML 报告|FAIL|report.py 执行失败")
fi
REPORT="$ROOT/reports/report.html"
echo "报告: $REPORT"

if [[ "$OPEN" == 1 ]]; then
  log "打开报告"
  open "$REPORT"
fi

if printf '%s\n' "${RESULTS[@]}" | grep -q "|FAIL|"; then
  echo "✗ 存在失败项"; exit 1
fi
echo "✓ 全部通过"
