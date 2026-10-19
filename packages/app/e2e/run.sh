#!/usr/bin/env bash
# Locusify E2E 运行器：用 webapp-testing skill 的 with_server.py 托管 dev server
# 用法: pnpm e2e   （或 E2E_PORT=1051 pnpm e2e）
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$DIR")"
PORT="${E2E_PORT:-1050}"

ROOT="$(git -C "$APP_DIR" rev-parse --show-toplevel)"
SKILL="$ROOT/.agents/skills/webapp-testing/scripts/with_server.py"

if [[ ! -f "$SKILL" ]]; then
  echo "✗ 找不到 webapp-testing skill: $SKILL" >&2
  echo "  安装: npx -y skills add anthropics/skills@webapp-testing" >&2
  exit 1
fi

if ! python3 -c 'import playwright' >/dev/null 2>&1; then
  echo "✗ python3 未安装 playwright" >&2
  echo "  python3 -m pip install --user playwright && python3 -m playwright install chromium" >&2
  exit 1
fi

# 默认 1050，避开开发者本地常用的 1046
cd "$APP_DIR"
exec python3 "$SKILL" \
  --server "npx vite --port $PORT --strictPort" \
  --port "$PORT" \
  --timeout 120 \
  -- python3 "$DIR/locusify-flow.e2e.py" --base "http://localhost:$PORT" "$@"
