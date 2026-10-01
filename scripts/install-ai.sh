#!/usr/bin/env bash
# Install ElloFive (Ollama LLM) + FRC7 (Neuriy / FRCL) and wire them to Prysel Ai.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELLO="$ROOT/vendor/ellofive"
FRC="$ROOT/vendor/frc7"
HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
export OLLAMA_HOST="$HOST"

# CPU-friendly defaults for ~8–16 GB boxes. Override to qwen2.5:7b on a GPU host.
BASE_MODEL="${ELLOFIVE_BASE_MODEL:-llama3.2:1b}"
FAST_MODEL="${ELLOFIVE_FAST_MODEL:-$BASE_MODEL}"

echo "==> Prysel Ai installer (ElloFive + FRC7)"

if ! command -v ollama >/dev/null 2>&1; then
  echo "==> Installing Ollama (ElloFive runtime)"
  curl -fsSL https://ollama.com/install.sh | sh
fi

chmod +x "$ELLO/bin/"* "$ELLO/scripts/"*.sh "$ELLO/frc/cli.js" 2>/dev/null || true
mkdir -p "$HOME/.local/bin"
ln -sfn "$ELLO/bin/ellofive" "$HOME/.local/bin/ellofive"
ln -sfn "$ELLO/bin/ellofive-memory" "$HOME/.local/bin/ellofive-memory"
ln -sfn "$FRC/apps/cli/src/index.js" "$HOME/.local/bin/frc"
export PATH="$HOME/.local/bin:$PATH"

if ! curl -sf "$HOST/api/tags" >/dev/null 2>&1; then
  echo "==> Starting ElloFive runtime"
  nohup ollama serve >/tmp/ellofive-serve.log 2>&1 &
  for _ in $(seq 1 60); do
    curl -sf "$HOST/api/tags" >/dev/null 2>&1 && break
    sleep 1
  done
fi

if ! curl -sf "$HOST/api/tags" >/dev/null 2>&1; then
  echo "ElloFive runtime is not reachable at $HOST" >&2
  exit 1
fi

echo "==> Installing ElloFive Node deps"
(cd "$ELLO" && npm install --silent)

echo "==> Installing FRC7 workspace"
(cd "$FRC" && npm install --silent)

echo "==> Pulling base model ${BASE_MODEL}"
ollama pull "$BASE_MODEL"
if [[ "$FAST_MODEL" != "$BASE_MODEL" ]]; then
  ollama pull "$FAST_MODEL"
fi

echo "==> Building ElloFive Modelfile (num_ctx=2048 for this host)"
ELLOFIVE_BASE_MODEL="$BASE_MODEL" bash "$ELLO/scripts/build-modelfile.sh"
python3 - <<PY
from pathlib import Path
p = Path("$ELLO/models/Modelfile")
text = p.read_text()
text = text.replace("PARAMETER num_ctx 16384", "PARAMETER num_ctx 2048")
text = text.replace("PARAMETER num_predict 4096", "PARAMETER num_predict 512")
p.write_text(text)
PY

echo "==> Creating ellofive / ellofive-fast / models5"
ollama create ellofive -f "$ELLO/models/Modelfile"
FASTFILE="$ELLO/models/Modelfile.fast"
TMPF="$(mktemp)"
sed "s|^FROM .*|FROM ${FAST_MODEL}|" "$FASTFILE" > "$TMPF"
printf '\nPARAMETER num_ctx 2048\nPARAMETER num_predict 512\n' >> "$TMPF"
ollama create ellofive-fast -f "$TMPF"
rm -f "$TMPF"
if [[ -f "$ELLO/models/Modelfile.models5" ]]; then
  ollama create models5 -f "$ELLO/models/Modelfile.models5" || ollama create models5 -f "$ELLO/models/Modelfile"
fi

cat > "$ELLO/.ellofive-models.env" <<EOF
ELLOFIVE_BASE_MODEL=${BASE_MODEL}
ELLOFIVE_FAST_MODEL=${FAST_MODEL}
ELLOFIVE_PRO_NAME=ellofive
ELLOFIVE_FAST_NAME=ellofive-fast
EOF

cat > "$ROOT/.env" <<EOF
OLLAMA_HOST=${HOST}
ELLOFIVE_HOST=${HOST}
ELLOFIVE_MODEL=ellofive
FRC7_GATEWAY=http://127.0.0.1:3100
FRC_API_KEYS=ayiti_gov_test_key
NEURIY_LLM_BASE_URL=${HOST}/v1
NEURIY_LLM_API_KEY=ellofive
NEURIY_LLM_MODEL=ellofive
EOF

echo ""
ollama list
echo ""
echo "==> ElloFive + FRC7 installed"
echo "    bash scripts/start-ai.sh"
echo "    npm run dev"
