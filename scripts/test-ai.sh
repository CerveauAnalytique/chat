#!/usr/bin/env bash
# Smoke-test research, programming, and image generation through /api/ai/chat
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"

ask() {
  local label="$1" prompt="$2"
  echo ""
  echo "=== ${label} ==="
  echo "Q: ${prompt}"
  local payload
  payload="$(python3 -c 'import json,sys; print(json.dumps({"message": sys.argv[1]}))' "$prompt")"
  curl -sS "${BASE}/api/ai/chat" \
    -H 'Content-Type: application/json' \
    --max-time 180 \
    -d "$payload" | python3 -m json.tool
}

echo "Health:"
curl -sS "${BASE}/api/ai/health" | python3 -m json.tool

ask "research" "What is the population of France? Find real data."
ask "program" "Write a Python function greet(name) that returns Hello, name."
ask "image" "Draw a picture of a programmer making a sunset mountain image."
