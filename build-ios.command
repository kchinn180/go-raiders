#!/bin/bash
# GO Raiders - iOS Build Script
# Double-click this file in Finder to build the iOS app

set -e

# Find the project directory (same folder as this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "ðï¸  GO Raiders iOS Builder"
echo "=========================="
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

# Add iOS platform if not present
if [ ! -d "ios" ]; then
  echo "ð± Adding iOS platform..."
  npx cap add ios
fi

# Sync web assets to iOS
echo "ð Syncing to iOS..."
npx cap sync ios

# Open Xcode
echo ""
echo "â Done! Opening Xcode..."
echo ""
echo "In Xcode, you'll need to:"
echo "  1. Select your Team in Signing & Capabilities"
echo "  2. Confirm Bundle ID: com.goraiders.app"
echo "  3. Set version number"
echo "  4. Product â Archive to upload to App Store"
echo ""
npx cap open ios

