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
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f0c0a' });
    } catch (e) {
      console.log('StatusBar not available');
    }
    
    try {
      await SplashScreen.hide();
    } catch (e) {
      console.log('SplashScreen not available');
    }
  }
  
  createRoot(document.getElementById("root")!).render(<App />);
}

initializeApp();
