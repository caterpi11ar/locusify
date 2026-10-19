#!/usr/bin/env bash
#
# 全链路：开发门禁 → 构建 → 上线（preview）→ 验收
#
#   pnpm verify              完整链路
#   pnpm verify --vision     额外跑 Midscene 多模态断言
#
# 硬规则：改代码后必须重启再验收。本脚本每次都重新 build + 起 preview，
# 不复用任何在跑的进程，所以拿到的截图一定对应当前代码。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/packages/app"
PORT="${VERIFY_PORT:-4173}"
BASE="http://localhost:$PORT"
VISION=0
[[ "${1:-}" == "--vision" ]] && VISION=1

log() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

# ---------------------------------------------------------------- 1. 开发门禁
log "1/4 开发门禁"
pnpm --dir "$APP" typecheck
pnpm --dir "$APP" lint
pnpm --dir "$APP" test -- --run

# ---------------------------------------------------------------- 2. 构建
log "2/4 构建生产产物"
pnpm --dir "$APP" build

# ---------------------------------------------------------------- 3. 上线
log "3/4 启动 preview（带 /api 代理 → 真实后端）"
PIDFILE="$(mktemp)"
PREVIEW_PID=""
cleanup() {
  # 必须按端口反查真正在监听的进程：$! 拿到的是 npx 的 pid，
  # kill 它不会杀掉 vite 子进程，上一轮的 preview 会漏到下一轮。
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
}
trap cleanup EXIT

# 启动前清理残留：否则 --strictPort 会静默失败，
# 就绪检查会打到**上一轮的旧服务**，等于拿旧代码的截图当验收。
stale=$(lsof -ti:"$PORT" 2>/dev/null || true)
if [[ -n "$stale" ]]; then
  echo "  清理端口 $PORT 上的残留进程: $stale"
  kill $stale 2>/dev/null || true
  sleep 1
fi

( cd "$APP" && nohup npx vite preview --port "$PORT" --strictPort \
    > /tmp/locusify-verify-preview.log 2>&1 & echo $! > "$PIDFILE" )

ready=0
for _ in $(seq 1 45); do
  if curl -sf -o /dev/null -m 3 "$BASE/zh-CN/"; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo "✗ preview 未就绪，日志：" >&2
  tail -20 /tmp/locusify-verify-preview.log >&2
  exit 2
fi
# 记录真正监听端口的 pid，供 cleanup 使用
PREVIEW_PID="$(lsof -ti:"$PORT" 2>/dev/null | head -1)"
echo "  preview pid=$PREVIEW_PID"
# 服务自检：401 说明代理已把 /api 转发到真实后端
code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$BASE/api/v1/auth/me" || true)
echo "服务自检 GET /api/v1/auth/me -> $code  (401=ok, 000=没起来, 404=路由未注册)"
if [[ "$code" == "000" ]]; then
  echo "✗ 后端不可达，验收中止" >&2
  exit 2
fi

# ---------------------------------------------------------------- 4. 验收
log "4/4 验收"
python3 "$ROOT/tools/verify/verify.py" --base "$BASE"

if [[ "$VISION" == 1 ]]; then
  log "4b/4 多模态断言（Midscene，视觉驱动）"
  if [[ ! -f "$ROOT/.env" ]]; then
    echo "  跳过：未找到 .env（需要 MIDSCENE_MODEL_*）"
  else
    ( cd "$ROOT" && set -a && . ./.env && set +a
      npx -y @midscene/web@1 connect --url "$BASE/zh-CN/" >/dev/null 2>&1
      # connect 返回只代表导航完成。矢量瓦片是异歩绘制的，
      # 立刻截图会得到一张空白地图，视觉断言必失败——同一个坑在 verify.py 里也踩过。
      sleep 15
      npx -y @midscene/web@1 assert --prompt \
        "页面是中文界面；地图区域能看到真实的街道和地名；因为未登录，所以屏幕上有一个登录面板"
      # Midscene 的 Chrome 不会自己退出，不关就会一直攥着端口和内存
      npx -y @midscene/web@1 close >/dev/null 2>&1 || true )
  fi
fi

log "完成"
