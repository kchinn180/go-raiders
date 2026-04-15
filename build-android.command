#!/bin/bash
# GO Raiders - Android Build Script
# Double-click this file in Finder to build the Android app

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🤖 GO Raiders Android Builder"
echo "=============================="
echo ""
echo "📁 Project: $SCRIPT_DIR"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the web app
echo "⚙️  Building web app..."
npm run build

# Add Android platform if not present
if [ ! -d "android" ]; then
  echo "🤖 Adding Android platform..."
  npx cap add android
fi

# Sync web assets to Android
echo "🔄 Syncing to Android..."
npx cap sync android

# Open Android Studio
echo ""
echo "✅ Done! Opening Android Studio..."
echo ""
echo "In Android Studio, you'll need to:"
echo "  1. Build → Generate Signed Bundle/APK"
echo "  2. Choose 'Android App Bundle' (.aab)"
echo "  3. Create or use existing keystore"
echo "  4. Upload the .aab to Google Play Console"
echo ""
npx cap open android

