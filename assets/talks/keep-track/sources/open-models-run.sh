#!/bin/bash
# Run the paper's prompts (zero-shot and 2-shot with definitions) with each of
# the paper's open-weight configurations (Table 6), one served model at a time:
# download its weights, serve them with vLLM under their Hugging Face id (with
# the model's reasoning parser, or its 4-bit quantization; vLLM 0.34 dropped
# bitsandbytes, so the two 4-bit Gemma models are served by vLLM 0.11.0 from
# vllm-bnb), run the
# paper-prompt runner at 81786ed for both variants and each of the model's
# configurations, then stop the server and delete the whole Hugging Face hub
# cache, whose weights sit in a shared blobs folder, to keep the disk free. A
# configuration whose run folder already has a complete manifest is skipped, so
# a restart resumes.
# Usage: run_open_models.sh
set -euo pipefail
ROOT=/root/paper-models
CODE=$ROOT/code
VLLM=$ROOT/vllm/bin
INPUTS=$ROOT/prepared/inputs/all.jsonl
GOLD=$ROOT/prepared/gold/all.jsonl
[ "$(cat "$CODE/REVISION")" = 81786ed ]

serve_and_run() {
  local served=$1 flags=$2
  shift 2
  local todo=()
  for config in "$@"; do
    for variant in paper-zero-shot-definitions paper-2-shot-definitions; do
      local out=$ROOT/runs/${config//[\/:]/_}/$variant
      grep -qs '"complete": true' "$out/manifest.json" || todo+=("$config|$variant")
    done
  done
  [ "${#todo[@]}" -gt 0 ] || { echo "skip $served"; return; }
  echo "$(date -u +%FT%TZ) download $served"
  "$VLLM/hf" download "$served" > "$ROOT/logs/download-${served//\//_}.log" 2>&1
  echo "$(date -u +%FT%TZ) serve $served $flags"
  # shellcheck disable=SC2086
  "$VLLM/vllm" serve "$served" --host 127.0.0.1 --port 8000 --max-model-len 16384 \
    $flags > "$ROOT/logs/serve-${served//\//_}.log" 2>&1 &
  local server=$!
  trap 'kill "$server" 2>/dev/null' EXIT
  until curl -sf http://127.0.0.1:8000/v1/models > /dev/null; do
    kill -0 "$server" 2>/dev/null || { echo "server for $served died"; exit 1; }
    sleep 10
  done
  for item in "${todo[@]}"; do
    local config=${item%%|*} variant=${item##*|}
    local out=$ROOT/runs/${config//[\/:]/_}/$variant
    rm -rf "$out"
    mkdir -p "$(dirname "$out")"
    local shown=()
    [ "$variant" = paper-2-shot-definitions ] && shown=(--gold "$GOLD")
    echo "$(date -u +%FT%TZ) run $config $variant"
    (cd "$CODE" && .venv/bin/python -m experiments.run_biorelfact_paper_prompt \
      "$INPUTS" "$out" --variant "$variant" --model "$config" "${shown[@]}" \
      --seed 0 --workers 32) > "$ROOT/logs/run-${config//[\/:]/_}-$variant.log" 2>&1
  done
  kill "$server"
  wait "$server" || true
  trap - EXIT
  rm -rf /root/.cache/huggingface/hub
  echo "$(date -u +%FT%TZ) done $served"
}

mkdir -p "$ROOT/logs"
serve_and_run openai/gpt-oss-20b "--reasoning-parser openai_gptoss" openai/gpt-oss-20b
serve_and_run Qwen/Qwen3-8B "--reasoning-parser qwen3" \
  Qwen/Qwen3-8B:non-thinking Qwen/Qwen3-8B:thinking
serve_and_run Qwen/Qwen2.5-7B-Instruct "" Qwen/Qwen2.5-7B-Instruct
serve_and_run HPAI-BSC/Qwen2.5-Aloe-Beta-7B "" HPAI-BSC/Qwen2.5-Aloe-Beta-7B
VLLM=$ROOT/vllm-bnb/bin
serve_and_run unsloth/gemma-3-27b-it-unsloth-bnb-4bit "--quantization bitsandbytes" \
  unsloth/gemma-3-27b-it-unsloth-bnb-4bit
serve_and_run unsloth/medgemma-27b-text-it-unsloth-bnb-4bit "--quantization bitsandbytes" \
  unsloth/medgemma-27b-text-it-unsloth-bnb-4bit
echo "all done"
