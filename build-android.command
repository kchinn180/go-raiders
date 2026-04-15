#!/bin/bash
# GO Raiders - Android Build Script
# Double-click this file in Finder to build the Android app

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "ð¤ GO Raiders Android Builder"
echo "=============================="
echo ""
echo "ð Project: $SCRIPT_DIR"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "ð¦ Installing dependencies..."
  npm install
fi

# Build the web app
echo "âï¸  Building web app..."
npm run build

# Add Android platform if not present
if [ ! -d "android" ]; then
  echo "ð¤ Adding Android platform..."
  npx cap add android
fi

# Sync web assets to Android
echo "ð Syncing to Android..."
npx cap sync android

# Open Android Studio
echo ""
echo "â Done! Opening Android Studio..."
echo ""
echo "In Android Studio, you'll need to:"
echo "  1. Build â Generate Signed Bundle/APK"
echo "  2. Choose 'Android App Bundle' (.aab)"
echo "  3. Create or use existing keystore"
echo "  4. Upload the .aab to Google Play Console"
echo ""
npx cap open android

