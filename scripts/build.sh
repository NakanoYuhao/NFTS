#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --no-frozen-lockfile --loglevel debug --reporter=append-only 2>&1 || {
  echo "pnpm install failed, retrying with --force..."
  pnpm install --no-frozen-lockfile --force 2>&1
}

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
echo 'import { createServer } from "http"; import { request as httpRequest } from "http"; import { parse } from "url"; import next from "next";' > /tmp/server-header.js
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting 2>&1 || {
  echo "tsup failed, trying without format option..."
  npx tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify --external:https 2>&1
}

echo "Build completed successfully!"
