#!/usr/bin/env bash
#
# 带鉴权的验收：真实账号 + 真实后端，跑完整业务流程。
#
#   pnpm verify:auth
#
# 凭据从仓库外的 $LOCUSIFY_TEST_ACCOUNT 读取（默认 ~/.locusify-test-account，
# JSON: {"email":..., "password":...}）。凭据不会进入任何输出或报告，
# 报告里只保留 user.id 前缀。
#
# 与 pnpm verify 的分工：
#   verify      生产构建 + 匿名门禁/SEO/console 门禁，真实后端
#   verify:auth dev server + 真实会话 + 上传→EXIF→路线，真实后端
# 为什么鉴权这层用 dev：生产 bundle 刻意不含测试钩子（window.__locusify），
# 无法在不手写 localStorage 的前提下注入真实会话。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/packages/app"
PORT="${AUTH_PORT:-1052}"
BASE="http://localhost:$PORT"
ACCOUNT="${LOCUSIFY_TEST_ACCOUNT:-$HOME/.locusify-test-account}"

log() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

if [[ ! -f "$ACCOUNT" ]]; then
  echo "✗ 找不到凭据文件: $ACCOUNT"
  echo "  格式: {\"email\":\"...\",\"password\":\"...\"}  权限建议 600"
  exit 2
fi
# 凭据文件权限过宽时提醒（不读取内容）
perms=$(stat -f '%Lp' "$ACCOUNT" 2>/dev/null || echo '?')
if [[ "$perms" != "600" && "$perms" != "?" ]]; then
  echo "⚠ $ACCOUNT 权限是 $perms，建议 chmod 600"
fi

# dev server：启动前清残留，避免拿到旧进程（同 pnpm verify 的坑）
stale=$(lsof -ti:"$PORT" 2>/dev/null || true)
[[ -n "$stale" ]] && { echo "  清理端口 $PORT 残留: $stale"; kill $stale 2>/dev/null || true; sleep 1; }

DEV_PID=""
cleanup() { [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null || true; }
trap cleanup EXIT

log "1/2 启动 dev server（vite proxy → 真实后端）"
( cd "$APP" && nohup npx vite --port "$PORT" --strictPort > /tmp/locusify-auth-dev.log 2>&1 & )
for _ in $(seq 1 45); do
  curl -sf -o /dev/null -m 3 "$BASE/zh-CN/" && break; sleep 1
done
DEV_PID="$(lsof -ti:"$PORT" 2>/dev/null | head -1)"
echo "  dev pid=$DEV_PID"

code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$BASE/api/v1/auth/me" || true)
echo "  服务自检 GET /api/v1/auth/me -> $code  (401=ok, 000=没起来)"
[[ "$code" == "000" ]] && { echo "✗ 后端不可达" >&2; exit 2; }

log "2/2 鉴权验收（真实账号 + 真实后端）"
python3 "$ROOT/tools/verify/verify-auth.py" --base "$BASE" --account "$ACCOUNT" "$@"

log "完成"
