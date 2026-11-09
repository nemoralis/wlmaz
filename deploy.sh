#!/bin/bash
# Thin launcher: the deployment workflow (with @clack/prompts UI) lives in
# scripts/deploy.mjs so it can use real Clack input/spinner primitives.
# Kept so `bash deploy.sh` and `-y` / `--yes` keep working.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# deploy.mjs imports @clack/prompts (a devDependency). On a fresh clone
# without node_modules it would fail at import time, before its own
# "Install npm packages" step — install quietly first if needed.
if [ ! -d "$ROOT/node_modules/@clack/prompts" ]; then
    echo "📦 @clack/prompts missing — running npm install first"
    (cd "$ROOT" && npm install --silent)
fi

exec node "$ROOT/scripts/deploy.mjs" "$@"
