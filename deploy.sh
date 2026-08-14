#!/bin/bash
set -e

BASE_DIR="/home/park-pro/VilaPro"
FRONTEND_SRC="$BASE_DIR/frontend-dev"
FRONTEND_DEPLOY="$BASE_DIR/frontend"

echo "🚀 Starting Deployment..."

# 1. Build frontend from source
echo "📦 Building Frontend..."
cd "$FRONTEND_SRC"

npm install
npm run build

# 2. Deploy production build
echo "📤 Deploying Frontend..."
rm -rf "$FRONTEND_DEPLOY/dist"
cp -a "$FRONTEND_SRC/dist" "$FRONTEND_DEPLOY/"

# 3. Restart backend
echo "♻️ Restarting Backend..."
cd "$BASE_DIR"
pm2 restart parkpro-api

# 4. Restart frontend
echo "🌐 Restarting Frontend..."
pm2 restart parkpro-web

# 5. Save PM2 state
pm2 save

echo "✅ Deployment Complete"
echo "----------------------------------------"
echo "Public URL:  https://www.vadovsky-tech.com"
echo "API URL:     https://api.vadovsky-tech.com"
echo "----------------------------------------"

pm2 status