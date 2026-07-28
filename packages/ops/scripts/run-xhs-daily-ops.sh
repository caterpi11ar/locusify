#!/bin/sh
# Run the multi-turn XHS coordinator outside the cron-owned agent lifecycle.
# The coordinator yields while analysts run; this supervisor keeps the command
# cron alive until finalized, audited artifacts prove the workflow completed.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
OPS_ROOT="$REPO_ROOT/packages/ops"
TODAY=$(TZ=Asia/Shanghai date +%F)
RUN_STAMP=$(TZ=Asia/Shanghai date +%Y%m%d-%H%M%S)
SESSION_KEY="agent:xhs-ops:locusify-xhs-daily-ops-$RUN_STAMP-$$"
DAILY="$OPS_ROOT/operations/daily/$TODAY.md"
REPORT="$OPS_ROOT/runtime/xiaohongshu/reports/$TODAY.md"
SNAPSHOT="$OPS_ROOT/runtime/xiaohongshu/snapshots/$TODAY.json"
PROMPT_FILE="$OPS_ROOT/openclaw/desired/xhs-daily-ops-prompt.txt"
TIMEOUT_SECONDS=${LOCUSIFY_XHS_RUN_TIMEOUT_SECONDS:-1200}
POLL_SECONDS=${LOCUSIFY_XHS_RUN_POLL_SECONDS:-5}
HEARTBEAT_SECONDS=${LOCUSIFY_XHS_RUN_HEARTBEAT_SECONDS:-30}
RECOVERY_DELAY_SECONDS=${LOCUSIFY_XHS_RECOVERY_DELAY_SECONDS:-45}
MAX_RECOVERY_TURNS=${LOCUSIFY_XHS_MAX_RECOVERY_TURNS:-3}

export OPENCLAW_CONFIG_PATH="$OPS_ROOT/openclaw/config/openclaw.json5"
export OPENCLAW_STATE_DIR="$OPS_ROOT/openclaw/state"
export LOCUSIFY_REPO_ROOT="$REPO_ROOT"
export LOCUSIFY_OPENCLAW_WORKSPACE="$OPS_ROOT/openclaw/workspace"
export LOCUSIFY_OPENCLAW_AGENT_DIR="$OPS_ROOT/openclaw/agent"

[ -f "$PROMPT_FILE" ] || { echo "missing prompt: $PROMPT_FILE" >&2; exit 1; }

fingerprint() {
  if [ -f "$1" ]; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    printf '%s' missing
  fi
}

BEFORE_DAILY=$(fingerprint "$DAILY")
BEFORE_REPORT=$(fingerprint "$REPORT")
STARTED_AT=$(date +%s)
LAST_HEARTBEAT=$STARTED_AT
STARTED_MARKER=$(mktemp /tmp/locusify-xhs-started.XXXXXX)
FINAL_MARKER="$OPS_ROOT/runtime/.locusify-xhs-final-$RUN_STAMP-$$"
rm -f "$FINAL_MARKER"
AGENT_RESULT=$(mktemp /tmp/locusify-xhs-agent.XXXXXX)
AUDIT_RESULT=$(mktemp /tmp/locusify-xhs-audit.XXXXXX)
SECRET_RESULT=$(mktemp /tmp/locusify-xhs-secret.XXXXXX)
cleanup() {
  if [ -n "${AGENT_PID:-}" ] && kill -0 "$AGENT_PID" 2>/dev/null; then
    kill "$AGENT_PID" 2>/dev/null || true
  fi
  rm -f "$STARTED_MARKER" "$FINAL_MARKER" "$AGENT_RESULT" "$AUDIT_RESULT" "$SECRET_RESULT"
}
trap cleanup EXIT HUP INT TERM
PROMPT="$(cat "$PROMPT_FILE")
本次 Run 的唯一完成信号：在最终日报/报告/快照均写完、ops-report-audit.py 与 ops-secret-scan.py 均通过后，执行 touch '$FINAL_MARKER'。在此之前严禁创建该文件。"


# sessions_yield intentionally returns from this initial CLI turn. Child
# completions continue in SESSION_KEY while this supervisor waits for artifacts.
# Run CLI turns asynchronously so this command can emit heartbeats while the
# model is active. A bounded recovery turn handles the OpenClaw race where the
# last successful child completion remains pending after an intermediate wake.
start_agent_turn() {
  TURN_MESSAGE=$1
  openclaw agent \
    --agent xhs-ops \
    --session-key "$SESSION_KEY" \
    --message "$TURN_MESSAGE" \
    --thinking medium \
    --timeout "$TIMEOUT_SECONDS" \
    --json >"$AGENT_RESULT" 2>&1 &
  AGENT_PID=$!
  AGENT_DONE=false
}

RECOVERY_TURNS=0
AGENT_DONE_AT=0
start_agent_turn "$PROMPT"

while :; do
  NOW=$(date +%s)
  if [ $((NOW - STARTED_AT)) -ge "$TIMEOUT_SECONDS" ]; then
    echo "locusify-xhs-daily-ops: timed out waiting for finalized audited artifacts" >&2
    exit 1
  fi
  if [ "$AGENT_DONE" = false ] && ! kill -0 "$AGENT_PID" 2>/dev/null; then
    if wait "$AGENT_PID"; then
      AGENT_DONE=true
      AGENT_DONE_AT=$NOW
    else
      cat "$AGENT_RESULT" >&2
      echo "locusify-xhs-daily-ops: Coordinator turn failed" >&2
      exit 1
    fi
  fi
  if [ $((NOW - LAST_HEARTBEAT)) -ge "$HEARTBEAT_SECONDS" ]; then
    echo "locusify-xhs-daily-ops: waiting for Coordinator finalization"
    LAST_HEARTBEAT=$NOW
  fi

  if [ "$AGENT_DONE" = true ] \
    && [ "$RECOVERY_TURNS" -lt "$MAX_RECOVERY_TURNS" ] \
    && [ $((NOW - AGENT_DONE_AT)) -ge "$RECOVERY_DELAY_SECONDS" ]; then
      RECOVERY_TURNS=$((RECOVERY_TURNS + 1))
      start_agent_turn "恢复本次尚未完成的每日 Run，不要重新采集或重新派发 Analyst。先消费已到达的 completion events。若 OpenClaw 的最后一个成功 completion 仍 pending，可仅调用一次 subagents list 核验三个既有子任务状态，并仅对 status=succeeded 但结果未送达的既有 childSessionKey 调用 sessions_history 取回其独立原始评审；不得模拟、补写或修改任何 Analyst 结论。三个角色齐全后立即完成交叉质证、Team 决策、日报/报告写入、条件执行、审计与 Secret 扫描。全部通过后执行 touch '$FINAL_MARKER' 作为唯一完成信号；在此之前严禁创建。仅在最终产物生成后返回最终总结；仍有真实 running 子任务时调用 sessions_yield。"
      echo "locusify-xhs-daily-ops: started bounded recovery turn $RECOVERY_TURNS"
  fi

  # The Coordinator creates FINAL_MARKER only after all final writes and both
  # audits. Re-run both gates here so the command's exit status is authoritative.
  if [ -f "$FINAL_MARKER" ] \
    && [ -f "$DAILY" ] && [ -f "$REPORT" ] && [ -f "$SNAPSHOT" ] \
    && [ "$(fingerprint "$DAILY")" != "$BEFORE_DAILY" ] \
    && [ "$(fingerprint "$REPORT")" != "$BEFORE_REPORT" ] \
    && grep -Eq '^[- ]*dailyActionStatus[：:] *(executed|partial|blocked) *$' "$DAILY" \
    && grep -Eq '^[- ]*(executionResult|执行结果)[：:] *(executed|partial|not_executed|not_applicable) *$' "$DAILY" \
    && python3 "$SCRIPT_DIR/ops-report-audit.py" "$DAILY" >"$AUDIT_RESULT" 2>/dev/null \
    && python3 "$SCRIPT_DIR/ops-secret-scan.py" "$DAILY" "$REPORT" "$SNAPSHOT" >"$SECRET_RESULT" 2>/dev/null; then
      cat "$AUDIT_RESULT"
      cat "$SECRET_RESULT"
      echo "locusify-xhs-daily-ops: finalized for $TODAY"
      exit 0
  fi

  sleep "$POLL_SECONDS"
done
