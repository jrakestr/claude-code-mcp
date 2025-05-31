#!/bin/bash
set -e

# Change to script directory
cd "$(dirname "$0")"

# Add your API keys here if needed
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
export DEBUG="mcp:*"
export NODE_OPTIONS="--max-old-space-size=4096"

# Ensure node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Ensure dist exists
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
  echo "Building project..."
  npm run build
fi

# Use npm start as recommended in the README
echo "Starting MCP server..."
npm start
