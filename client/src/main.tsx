import { createRoot } from "react-dom/client";
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import App from "./App";
import "./index.css";
import "./i18n";

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
