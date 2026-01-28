#!/bin/bash
set -e

# Define paths
BASE_DIR="/home/parking/parking-orchestrator"
FRONTEND_DIR="$BASE_DIR/frontend"

echo "🚀 Starting Deployment..."

# 1. Build Frontend
echo "📦 Building Frontend (Vite)..."
cd "$FRONTEND_DIR"

npm install
npm run build

# 2. Restart Backend (safe)
echo "♻️ Restarting Backend (PM2 ecosystem)..."
cd "$BASE_DIR"

pm2 start ecosystem.config.js --update-env

# 3. Restart Frontend (static dist, NO watch)
echo "🌐 Restarting Frontend (serve dist)..."

pm2 delete parkpro-web || true
pm2 start "serve -s /home/parking/parking-orchestrator/frontend/dist -l 3000 --single" --name "parkpro-web"



# 4. Save PM2 state
pm2 save

echo "✅ Deployment Complete"
echo "----------------------------------------"
echo "Public URL:  https://www.vadovsky-tech.com"
echo "API URL:     https://api.vadovsky-tech.com"
echo "----------------------------------------"
pm2 status
echo "----------------------------------------"
echo "To view logs, use: pm2 logs"
echo "To manage processes, use: pm2 dashboard"
echo "----------------------------------------"
exit 0
