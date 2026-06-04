#!/usr/bin/env node
/**
 * Post-`cap sync ios` patcher.
 *
 * Capacitor 8 reads the top-level `packageClassList` array from
 * `ios/App/App/capacitor.config.json` to decide which native plugin classes
 * to instantiate at startup. `npx cap sync ios` rewrites that file from
 * scratch based on what's in node_modules, which drops every custom native
 * plugin that's been added directly to the iOS project (i.e. anything not
 * shipped as an npm package).
 *
 * This script re-adds those plugins to the list. Run it via
 * `npm run cap:sync` (which wraps both steps) rather than calling
 * `npx cap sync ios` directly.
 *
 * Symptom if you forget: the JS bridge reports
 *     'IAP' plugin is not implemented on ios
 * even though the native code is compiled into the binary.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const cfgPath = path.resolve(__dirname, "..", "ios", "App", "App", "capacitor.config.json");

// Add any custom native iOS plugin class names here.
const CUSTOM_NATIVE_PLUGINS = ["IAPPlugin"];

if (!fs.existsSync(cfgPath)) {
  console.error(`[patch-ios-iap-plugin] config not found at ${cfgPath}. Run \`npx cap sync ios\` first.`);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const before = Array.isArray(cfg.packageClassList) ? [...cfg.packageClassList] : [];
const list = new Set(before);
let added = 0;
for (const name of CUSTOM_NATIVE_PLUGINS) {
  if (!list.has(name)) {
    list.add(name);
    added++;
  }
}

cfg.packageClassList = Array.from(list);
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, "\t") + "\n");

if (added > 0) {
  console.log(`[patch-ios-iap-plugin] added ${added} plugin(s): ${CUSTOM_NATIVE_PLUGINS.join(", ")}`);
} else {
  console.log(`[patch-ios-iap-plugin] packageClassList already contains all custom plugins.`);
}
