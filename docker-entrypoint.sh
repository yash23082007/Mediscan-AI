#!/bin/sh
set -e

echo "[MEDISCAN] Starting AI Engine on 127.0.0.1:5000..."
cd /app/ai-engine
gunicorn --bind 127.0.0.1:5000 --workers 1 --timeout 30 --access-logfile - app:app &
AI_PID=$!

# Wait briefly for AI engine to bind to port 5000
sleep 2

echo "[MEDISCAN] Initializing database and starting Node.js API on port ${PORT:-3001}..."
cd /app/server
node scripts/initialize-database.js || echo "[WARN] MongoDB initialization skipped or waiting for connection..."

# Forward signals to children
trap "kill -TERM $AI_PID 2>/dev/null; exit 0" TERM INT

node src/index.js &
NODE_PID=$!

wait $NODE_PID
