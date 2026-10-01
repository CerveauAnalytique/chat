#!/usr/bin/env bash
# Start ElloFive (Ollama) + FRC7 gateway for the Prysel chat app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELLO="$ROOT/vendor/ellofive"
FRC="$ROOT/vendor/frc7"
HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
export OLLAMA_HOST="$HOST"
export PATH="$HOME/.local/bin:$PATH"
export NEURIY_LLM_BASE_URL="${NEURIY_LLM_BASE_URL:-$HOST/v1}"
export NEURIY_LLM_API_KEY="${NEURIY_LLM_API_KEY:-ellofive}"
export NEURIY_LLM_MODEL="${NEURIY_LLM_MODEL:-ellofive}"
export FRC_API_KEYS="${FRC_API_KEYS:-ayiti_gov_test_key,frc_test_key}"
export FRC_ALLOW_BUILTIN="${FRC_ALLOW_BUILTIN:-1}"
export PORT="${FRC_GATEWAY_PORT:-3100}"

if command -v ollama >/dev/null 2>&1 && ! curl -sf "$HOST/api/tags" >/dev/null 2>&1; then
  echo "==> Starting ElloFive runtime on $HOST"
  nohup ollama serve >/tmp/ellofive-serve.log 2>&1 &
  for _ in $(seq 1 40); do
    curl -sf "$HOST/api/tags" >/dev/null 2>&1 && break
    sleep 1
  done
fi

if curl -sf "$HOST/api/tags" >/dev/null; then
  echo "==> ElloFive runtime OK"
  ollama list || true
else
  echo "!! ElloFive runtime is down — chat will use FRC7 Neuriy + live research until you run scripts/install-ai.sh" >&2
fi

if [[ -d "$FRC/apps/gateway" ]]; then
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "==> FRC7 gateway already on :${PORT}"
  else
    echo "==> Starting FRC7 gateway on :${PORT}"
    (cd "$FRC" && nohup env PORT="$PORT" npm run start:gateway >/tmp/frc7-gateway.log 2>&1 &)
    for _ in $(seq 1 30); do
      curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
      sleep 1
    done
  fi
  curl -sf "http://127.0.0.1:${PORT}/health" && echo || echo "!! FRC7 gateway did not start (see /tmp/frc7-gateway.log)"
fi

echo "==> Ready. Chat app: npm run dev  (http://127.0.0.1:3000)"
