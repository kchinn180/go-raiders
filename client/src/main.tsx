import { createRoot } from "react-dom/client";
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import App from "./App";
import "./index.css";
import "./i18n";

// Global unhandled promise rejection guard — prevents silent failures
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledPromiseRejection]', event.reason);
  // Don't re-throw — let the ErrorBoundary handle render errors
  event.preventDefault();
});

async function initializeApp() {
  // Always render the React tree first so the UI is ready before the splash hides.
  // This prevents a blank-screen flash between splash-hide and first React paint.
  createRoot(document.getElementById("root")!).render(<App />);

  if (Capacitor.isNativePlatform()) {
    // StatusBar — errors are non-fatal; log and continue
    try {
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.log('[Init] StatusBar.setStyle not available:', e);
    }
    try {
      await StatusBar.setBackgroundColor({ color: '#0f0c0a' });
    } catch (e) {
      // setBackgroundColor is Android-only; silently ignore on iOS
    }

    // Hide splash after a short delay so React has time to paint before it disappears.
    // launchAutoHide is false in capacitor.config.ts so this is the only hide call.
    await new Promise(r => setTimeout(r, 300));
    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (e) {
      console.log('[Init] SplashScreen.hide not available:', e);
    }
  }
}

initializeApp();
