/**
 * AdService — Google AdMob wrapper for GO Raiders
 *
 * Wraps @capacitor-community/admob so the rest of the app never imports
 * Capacitor plugins directly.  Falls back gracefully in the browser / simulator.
 *
 * ─── SETUP ──────────────────────────────────────────────────────────────────
 * 1. Install the plugin:
 *      npm install @capacitor-community/admob
 *      npx cap sync ios
 *
 * 2. In ios/App/App/Info.plist add:
 *      <key>GADApplicationIdentifier</key>
 *      <string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
 *      <key>SKAdNetworkItems</key>  (see AdMob docs for full list)
 *
 * 3. Replace the TEST_* constants below with real Ad Unit IDs from AdMob console.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { Capacitor } from "@capacitor/core";
import { getApiUrl } from "@/lib/queryClient";
import type { AdPlacement } from "@shared/schema";

// ── Ad Unit IDs ──────────────────────────────────────────────────────────────
// Using Google's official test IDs during development.
// Replace with your production IDs (never commit real IDs to version control —
// put them in .env.production and inject via build config).
const AD_UNITS = {
  banner:       process.env.VITE_ADMOB_BANNER_ID       ?? "ca-app-pub-3940256099942544/2934735716",
  interstitial: process.env.VITE_ADMOB_INTERSTITIAL_ID ?? "ca-app-pub-3940256099942544/4411468910",
  rewarded:     process.env.VITE_ADMOB_REWARDED_ID     ?? "ca-app-pub-3940256099942544/1712485313",
} as const;

// True when running inside a real Capacitor native container (iOS/Android)
const IS_NATIVE = Capacitor.isNativePlatform();

// Lazy-loaded plugin reference — avoids import errors when the package isn't installed yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AdMob: any | null = null;

async function getAdMob() {
  if (!IS_NATIVE) return null;
  if (!AdMob) {
    try {
      // Dynamic import so the build doesn't hard-fail if the package is absent
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – installed via: npm install @capacitor-community/admob
      const mod = await import("@capacitor-community/admob");
      AdMob = mod.AdMob;
    } catch {
      AdMob = null;
    }
  }
  return AdMob;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function reportImpression(
  userId: string,
  placement: AdPlacement,
  adUnitId: string,
  estimatedRevenueMicros = 0,
) {
  try {
    await fetch(getApiUrl("/api/ads/impression"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        placement,
        adUnitId,
        viewable: true,
        estimatedRevenueMicros,
      }),
    });
  } catch { /* non-critical */ }
}

export async function reportAdClick(impressionId: string) {
  try {
    await fetch(getApiUrl("/api/ads/click"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ impressionId }),
    });
  } catch { /* non-critical */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

let admobInitialized = false;

/**
 * Must be called once at app boot (before any ad requests).
 * Safe to call on web — returns immediately.
 */
export async function initAdMob(): Promise<void> {
  if (admobInitialized || !IS_NATIVE) return;
  const plugin = await getAdMob();
  if (!plugin) return;
  try {
    await plugin.initialize({
      requestTrackingAuthorization: true, // iOS 14+ ATT prompt
      testingDevices: [],                 // add your device ID here during dev
      initializeForTesting: false,
    });
    admobInitialized = true;
    console.log("[AdMob] Initialized");
  } catch (e) {
    console.warn("[AdMob] Init failed:", e);
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────

let bannerVisible = false;

/**
 * Show a sticky bottom banner ad.
 * No-op on web or for premium users (caller must check isPremium).
 */
export async function showBannerAd(userId: string): Promise<void> {
  if (bannerVisible || !IS_NATIVE) return;
  const plugin = await getAdMob();
  if (!plugin) return;

  try {
    // @ts-ignore – @capacitor-community/admob not yet installed
    const { BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
    await plugin.showBanner({
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: AD_UNITS.banner.includes("3940256"),
    });
    bannerVisible = true;
    reportImpression(userId, "banner", AD_UNITS.banner);
  } catch (e) {
    console.warn("[AdMob] Banner failed:", e);
  }
}

export async function hideBannerAd(): Promise<void> {
  if (!bannerVisible || !IS_NATIVE) return;
  const plugin = await getAdMob();
  if (!plugin) return;
  try {
    await plugin.removeBanner();
    bannerVisible = false;
  } catch { /* ignore */ }
}

// ── Rewarded ──────────────────────────────────────────────────────────────────

/**
 * Load and show a rewarded video ad.
 * Returns `true` when the user earns the reward (watched the full ad).
 * Returns `false` on failure, skip, or web environment.
 */
export async function showRewardedAd(userId: string): Promise<boolean> {
  if (!IS_NATIVE) {
    // Web/simulator: simulate a 2-second "ad" for testing
    await new Promise(r => setTimeout(r, 2000));
    return true;
  }

  const plugin = await getAdMob();
  if (!plugin) return false;

  return new Promise(async (resolve) => {
    let earned = false;

    const onRewarded = () => { earned = true; };
    // @ts-ignore – @capacitor-community/admob not yet installed
    const _adMobTypes = await import("@capacitor-community/admob").catch(() => null);

    try {
      // Listen for the reward event
      await plugin.addListener("onRewardedVideoAdRewarded" as any, onRewarded);

      await plugin.prepareRewardVideoAd({
        adId: AD_UNITS.rewarded,
        isTesting: AD_UNITS.rewarded.includes("3940256"),
      });

      await plugin.showRewardVideoAd();
      reportImpression(userId, "rewarded", AD_UNITS.rewarded);
      resolve(earned);
    } catch (e) {
      console.warn("[AdMob] Rewarded ad failed:", e);
      resolve(false);
    } finally {
      plugin.removeAllListeners();
    }
  });
}

// ── Interstitial ──────────────────────────────────────────────────────────────

/**
 * Preload an interstitial so it's ready when needed.
 * Call this in the background; then call showInterstitialAd() at the right moment.
 */
export async function prepareInterstitialAd(): Promise<void> {
  if (!IS_NATIVE) return;
  const plugin = await getAdMob();
  if (!plugin) return;
  try {
    await plugin.prepareInterstitial({
      adId: AD_UNITS.interstitial,
      isTesting: AD_UNITS.interstitial.includes("3940256"),
    });
  } catch { /* non-critical */ }
}

export async function showInterstitialAd(userId: string): Promise<void> {
  if (!IS_NATIVE) return;
  const plugin = await getAdMob();
  if (!plugin) return;
  try {
    await plugin.showInterstitial();
    reportImpression(userId, "interstitial", AD_UNITS.interstitial);
  } catch (e) {
    console.warn("[AdMob] Interstitial failed:", e);
  }
}
