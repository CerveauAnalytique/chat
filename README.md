# Prysel Ai — ElloFive + FRC7

This chat app runs a **real local AI stack**:

| Piece | Source | Role |
| --- | --- | --- |
| **ElloFive** | [EricksonAtHome/ElloFive](https://github.com/EricksonAtHome/ElloFive) | Local LLM on Ollama (`ellofive`) |
| **FRC7 / Neuriy** | [EricksonAtHome/FRC7](https://github.com/EricksonAtHome/FRC7) | Tools, sessions, FRCL gateway |
| **Prysel chat UI** | this repo | Ask → answer, research, code, images |

When you ask, the model answers. It can look up live facts, write a program, and generate an image.

## Install the real AI

```bash
npm install
bash scripts/install-ai.sh    # Ollama + llama3.2:1b + ellofive model + FRC7
bash scripts/start-ai.sh      # runtime :11434 and FRC7 gateway :3100
npm run dev                   # chat UI http://127.0.0.1:3000
```

GPU hosts can use a larger base:

```bash
ELLOFIVE_BASE_MODEL=qwen2.5:7b bash scripts/install-ai.sh
```

## Try it

In the chat box:

1. **Research** — `What is the population of France? Find real data.`
2. **Program** — `Write a Python function greet(name) that returns Hello, name.`
3. **Image** — `Draw a picture of a programmer making a sunset mountain image.`

Or:

```bash
bash scripts/test-ai.sh http://127.0.0.1:3000
```

## Architecture

```
Browser  →  /api/ai/chat
              ├─ FRC7 Neuriy tools (time, calculator, marketplace)
              ├─ Live research (Wikipedia / DuckDuckGo)
              ├─ ElloFive LLM (Ollama)
              └─ Image studio (SVG illustration files)
```

Vendored sources live in `vendor/ellofive` and `vendor/frc7`.
