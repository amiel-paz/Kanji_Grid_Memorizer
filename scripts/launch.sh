#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"

cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Kanji Grid launcher could not find npm on PATH."
  echo "Install Node.js/npm, then run this launcher again."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing local dependencies..."
  npm install
fi

echo "Starting Kanji Grid Memorizer..."
echo "Press Ctrl+C in this terminal to stop it."
exec npm run loadfile -- "$@"
