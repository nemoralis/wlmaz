#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Deployment..."

echo "📥 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
# Use --prod=false to ensure we get devDependencies needed for build (like vite, typescript)
# npm install includes devDependencies by default unless config changes.
npm install

echo "🐳 Starting Redis..."
docker-compose up -d redis

echo "🏗️ Building application..."
npm run build

echo "🔄 Restarting application..."
pm2 restart wlmaz

echo "✅ Deployment Complete!"
