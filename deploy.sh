#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Deployment..."

echo "📥 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
# Use --prod=false to ensure we get devDependencies needed for build (like vite, typescript)
# But verify if we need them. Actually pnpm install includes devDependencies by default unless config changes.
# pnpm install

echo "🏗️ Building application..."
pnpm run build

echo "🔄 Restarting application..."
pm2 restart wlmaz

echo "✅ Deployment Complete!"
