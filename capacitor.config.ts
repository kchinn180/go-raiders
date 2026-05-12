import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kyree.goraidcoordinator',
  appName: 'GO Raiders',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
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
        ios:     "ca-app-pub-3940256099942544~1458002511",  // ← replace with production iOS App ID
        android: "ca-app-pub-3940256099942544~3347511713",  // ← replace with production Android App ID
      },
      requestTrackingAuthorization: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
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
