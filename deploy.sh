#!/bin/bash

# Define paths
BASE_DIR="/home/parking/parking-orchestrator"
FRONTEND_DIR="$BASE_DIR/frontend"
BACKEND_DIR="$BASE_DIR/backend"

echo "🚀 Starting Deployment with Watch Mode..."

# 1. Build Frontend
echo "📦 Rebuilding Frontend (Vite)..."
cd $FRONTEND_DIR
npm install
npm run build

# 2. Cleanup existing processes
echo "♻️ Refreshing PM2..."
pm2 delete parkpro-api || true
pm2 delete parkpro-web || true

# 3. Restart Backend via PM2 ecosystem
echo "♻️ Restarting Backend (PM2 ecosystem)..."
cd "$BASE_DIR" || exit 1

pm2 delete parkpro-api || true
pm2 start ecosystem.config.js
pm2 save


# 4. Start Frontend
# Note: Since your server.js also tries to serve static files, 
# hosting it separately on 3000 ensures your Cloudflare 'www' hostname works.
echo "🌐 Starting Frontend (Serving dist)..."
cd $FRONTEND_DIR
pm2 start "serve -s dist -l 3000" --name "parkpro-web" --watch

# 5. Persistence
pm2 save

echo "✅ Deployment Complete!"
echo "----------------------------------------"
echo "Public URL:  https://www.vadovsky-tech.com"
echo "API URL:     https://api.vadovsky-tech.com"
echo "----------------------------------------"
pm2 status