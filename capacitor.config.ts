import type { CapacitorConfig } from '@capacitor/cli';

// ─── Live Reload ─────────────────────────────────────────────────────────────
// Set LIVE_RELOAD=true when running `npm run dev` so the simulator hot-reloads
// from your local dev server instead of the static build in dist/public.
//
// Usage (two Terminal tabs):
//   Tab 1:  LIVE_RELOAD=true npm run dev          ← starts Express + Vite HMR
//   Tab 2:  npx cap sync ios && npx cap open ios  ← sync once, then ⌘R in Xcode
//
// For App Store / production builds, leave LIVE_RELOAD unset (default).
// ─────────────────────────────────────────────────────────────────────────────
const LIVE_RELOAD = process.env.LIVE_RELOAD === 'true';
// Port 5000 is reserved by macOS AirPlay Receiver — use 5001 for dev
const DEV_PORT = process.env.PORT || '5001';
const DEV_SERVER_URL = `http://localhost:${DEV_PORT}`;

const config: CapacitorConfig = {
  appId: 'com.kyree.goraidcoordinator',
  appName: 'GO Raiders',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // When live reload is on, point the native shell at the local Vite dev server.
    // The simulator shares the Mac's localhost so no IP address is needed.
    ...(LIVE_RELOAD ? {
      url: DEV_SERVER_URL,
      cleartext: true,  // allow http:// on iOS (dev only)
    } : {}),
  },
  plugins: {
    /**
     * AdMob — replace test IDs with your production IDs from the AdMob console.
     * iOS App ID also goes in ios/App/App/Info.plist:
     *   <key>GADApplicationIdentifier</key>
     *   <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
     */
    AdMob: {
      appId: {
        ios:     "ca-app-pub-5534211525876266~8642493107",
        android: "ca-app-pub-5534211525876266~8642493107",  // update if Android App ID differs
      },
      requestTrackingAuthorization: false, // ATT prompt handled in AppDelegate with proper timing
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false, // JS calls SplashScreen.hide() manually after React mounts
      backgroundColor: '#0f0c0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f0c0a'
    }
  }
};

export default config;
