#!/usr/bin/env bash
#
# fix-ios-iap.command — Rebuild the iOS app from scratch to fix the
# "'IAP' plugin is not implemented on ios" error.
#
# What this does:
#   1. Closes any running Xcode + Simulator instances
#   2. Wipes Xcode's DerivedData for this app (force fresh compile)
#   3. Rebuilds the web bundle (npm run build)
#   4. Syncs the Capacitor iOS project (npx cap sync ios)
#   5. Reinstalls CocoaPods (so Capacitor's plugin registry refreshes)
#   6. Opens the workspace in Xcode
#
# After this runs, in Xcode:
#   - Product → Clean Build Folder (Cmd+Shift+K)   ← important
#   - Product → Run (Cmd+R) on an iOS Simulator
#   - Look in the Xcode console for "[IAPPlugin] load() called"
#     — if you see it, the plugin is properly registered.
#
# Why this fixes the error:
#   The "plugin is not implemented" message is Capacitor's JS bridge telling
#   you the native IAPPlugin class wasn't found in the running binary. This
#   happens when Xcode's incremental build keeps shipping an old .app that
#   pre-dates the IAP plugin files. A clean rebuild forces the plugin
#   registration code path to run.
#

set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════════════════════"
echo "  GO Raiders — iOS IAP rebuild script"
echo "════════════════════════════════════════════════════════════"
echo

echo "[1/6] Quitting Xcode and Simulator (if running)…"
osascript -e 'tell application "Xcode" to quit' 2>/dev/null || true
osascript -e 'tell application "Simulator" to quit' 2>/dev/null || true
sleep 2

echo "[2/6] Wiping DerivedData for this app…"
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/App-"*
echo "      done."

echo "[3/6] Building the web bundle (this may take a minute)…"
npm run build

echo "[4/6] Syncing Capacitor → iOS…"
npx cap sync ios

# `cap sync` regenerates ios/App/App/capacitor.config.json and drops the IAPPlugin
# entry from packageClassList. Capacitor 8 won't register IAPPlugin without it,
# which is what causes the "'IAP' plugin is not implemented on ios" error.
# Re-add it after every sync.
echo "      patching packageClassList to include IAPPlugin…"
python3 - <<'PYEOF'
import json, pathlib
p = pathlib.Path("ios/App/App/capacitor.config.json")
cfg = json.loads(p.read_text())
lst = cfg.setdefault("packageClassList", [])
if "IAPPlugin" not in lst:
    lst.append("IAPPlugin")
    p.write_text(json.dumps(cfg, indent="\t") + "\n")
    print("      added IAPPlugin to packageClassList")
else:
    print("      IAPPlugin already in packageClassList")
PYEOF

echo "[5/6] Reinstalling CocoaPods (fresh plugin registry)…"
cd ios/App
pod deintegrate || true
pod install --repo-update
cd ../..

echo "[6/6] Opening Xcode workspace…"
open ios/App/App.xcworkspace

echo
echo "════════════════════════════════════════════════════════════"
echo "  Next steps in Xcode:"
echo "  1. Product → Clean Build Folder  (Cmd+Shift+K)"
echo "  2. Product → Run                  (Cmd+R)"
echo "  3. Watch the console for:  [IAPPlugin] load() called"
echo "  4. Tap a paywall button — purchase sheet should appear"
echo "════════════════════════════════════════════════════════════"
