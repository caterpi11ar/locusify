#!/usr/bin/env bash
#
# 对抗与边界验收：空值 / 非法输入 / 超量 / 重复提交 / 接口故障。
#
#   pnpm verify:edge
#
# 素材默认在 /tmp/locusify-edge（无 GPS 图、非图片文件、30 张带 GPS 图）；
# 用 EDGE_DIR 覆盖。素材不存在时会提示如何构造。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/packages/app"
PORT="${AUTH_PORT:-1052}"
BASE="http://localhost:$PORT"
ACCOUNT="${LOCUSIFY_TEST_ACCOUNT:-$HOME/.locusify-test-account}"
EDGE_DIR="${EDGE_DIR:-/tmp/locusify-edge}"

log() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

[[ -f "$ACCOUNT" ]] || { echo "✗ 找不到凭据文件: $ACCOUNT" >&2; exit 2; }
[[ -d "$EDGE_DIR" ]] || { echo "✗ 找不到边界素材目录: $EDGE_DIR" >&2; exit 2; }

stale=$(lsof -ti:"$PORT" 2>/dev/null || true)
[[ -n "$stale" ]] && { echo "  清理端口 $PORT 残留: $stale"; kill $stale 2>/dev/null || true; sleep 1; }

DEV_PID=""
cleanup() { [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null || true; }
trap cleanup EXIT

log "1/2 启动 dev server（vite proxy → 真实后端）"
( cd "$APP" && nohup npx vite --port "$PORT" --strictPort > /tmp/locusify-edge-dev.log 2>&1 & )
for _ in $(seq 1 45); do curl -sf -o /dev/null -m 3 "$BASE/zh-CN/" && break; sleep 1; done
DEV_PID="$(lsof -ti:"$PORT" 2>/dev/null | head -1)"
echo "  dev pid=$DEV_PID"

code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$BASE/api/v1/auth/me" || true)
echo "  服务自检 GET /api/v1/auth/me -> $code  (401=ok, 000=没起来)"
[[ "$code" == "000" ]] && { echo "✗ 后端不可达" >&2; exit 2; }

log "2/2 对抗与边界验收"
python3 "$ROOT/tools/verify/verify-edge.py" --base "$BASE" --account "$ACCOUNT" --edge-dir "$EDGE_DIR" "$@"

log "完成"
