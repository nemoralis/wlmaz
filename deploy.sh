#!/bin/bash

# Exit on error
set -e

# Check for auto-confirm flag
AUTO_CONFIRM=false
if [ "$1" = "-y" ] || [ "$1" = "--yes" ]; then
    AUTO_CONFIRM=true
    echo "🤖 Running in auto-confirm mode"
fi

# Function to ask for confirmation
confirm() {
    local message="$1"
    if [ "$AUTO_CONFIRM" = true ]; then
        echo "$message (y/n): y (auto)"
        return 0
    fi
    read -p "$message (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

echo "🚀 Starting Deployment..."
echo "📅 $(date)"
echo ""

# Pre-deployment checks
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️ Warning: You are on branch '$CURRENT_BRANCH', not 'main'"
    if ! confirm "Continue anyway?"; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Warning: You have uncommitted changes:"
    git status --short
    echo ""
    if ! confirm "Continue with uncommitted changes?"; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo ""

if confirm "📥 Pull latest changes from git?"; then
    git pull
else
    echo "⏭️ Skipping git pull"
fi

if confirm "📦 Install/update npm packages?"; then
    npm install
else
    echo "⏭️ Skipping npm install"
fi

# echo "🐳 Starting Redis..."
# docker-compose up -d redis

if confirm "🏗️ Build application?"; then
    npm run build
else
    echo "⏭️ Skipping build"
fi

if confirm "🔄 Restart application with PM2?"; then
    pm2 restart wlmaz
    pm2 logs wlmaz
else
    echo "⏭️ Skipping PM2 restart"
fi

echo ""
echo "✅ Deployment Complete!"
