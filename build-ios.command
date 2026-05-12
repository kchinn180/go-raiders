#!/bin/zsh -l
# GO Raiders - iOS Build Script
# Double-click this file in Finder to build and open the Xcode project.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🏗️  GO Raiders iOS Builder"
echo "=========================="
echo "📁 Project: $SCRIPT_DIR"
echo ""

# ── 1. Make sure npm is available ─────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo "⚠️  npm / Node.js not found. Trying to install automatically..."
  echo ""

  # Try Homebrew (Apple Silicon path first, then Intel path)
  BREW=""
  [ -x "/opt/homebrew/bin/brew" ] && BREW="/opt/homebrew/bin/brew"
  [ -z "$BREW" ] && [ -x "/usr/local/bin/brew" ] && BREW="/usr/local/bin/brew"

  if [ -n "$BREW" ]; then
    echo "🍺 Homebrew found — installing Node.js (this may take a minute)..."
    "$BREW" install node
    # Re-source so the new node/npm is on PATH
    export PATH="$(/usr/bin/dirname "$BREW"):$PATH"
  else
    echo "❌ Homebrew is also not installed."
    echo ""
    echo "   Please install Node.js, then double-click this script again:"
    echo "   → https://nodejs.org/en/download  (choose the macOS installer)"
    echo ""
    echo "   Opening download page now..."
    open "https://nodejs.org/en/download"
    read "?Press Enter to close..."
    exit 1
  fi
fi

# ── 2. Confirm versions ───────────────────────────────────────────────────────
echo "✅ Node $(node -v)  /  npm $(npm -v)"
echo ""

# ── 3. Install / refresh project dependencies ────────────────────────────────
echo "📦 Installing project dependencies..."
npm install

# ── 4. Build the web app ──────────────────────────────────────────────────────
echo "⚙️  Building web app..."
npm run build
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed. Check the errors above."
  read "?Press Enter to close..."
  exit 1
fi

# ── 5. Add iOS Capacitor platform (first run only) ───────────────────────────
if [ ! -d "ios" ]; then
  echo "📱 Adding iOS platform (first time only)..."
  ./node_modules/.bin/cap add ios
fi

# ── 6. Sync web assets into the Xcode project ────────────────────────────────
echo "🔄 Syncing to Xcode..."
./node_modules/.bin/cap sync ios

# ── 7. Open Xcode ────────────────────────────────────────────────────────────
echo ""
echo "✅ Done! Opening Xcode..."
echo ""

# Check if the workspace exists
WORKSPACE="$SCRIPT_DIR/ios/App/App.xcworkspace"
if [ ! -d "$WORKSPACE" ]; then
  echo "❌ Error: Xcode workspace not found at:"
  echo "   $WORKSPACE"
  echo ""
  echo "Try running: npx cap sync ios"
  read "?Press Enter to close..."
  exit 1
fi

# Open the workspace in Xcode
open "$WORKSPACE"

echo ""
echo "   Next steps in Xcode:"
echo "   1. Select 'App' in the Project Navigator (left panel)"
echo "   2. Select 'App' under Targets"
echo "   3. Go to Signing & Capabilities tab"
echo "   4. Set your Team ID (required for App Store)"
echo "   5. Verify Bundle ID is: com.kyree.goraidcoordinator"
echo "   6. Select a device simulator or your device"
echo "   7. Product → Archive"
echo "   8. Organizer window opens → Distribute App → App Store Connect"
echo ""
read "?Press Enter when done..."
