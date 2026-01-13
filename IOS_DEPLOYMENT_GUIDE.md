# GO Raiders - iOS App Store Deployment Guide

## Prerequisites

1. **Mac computer** with macOS 12.0+ (required for Xcode)
2. **Xcode 14+** installed from Mac App Store
3. **Apple Developer Program** membership ($99/year) - https://developer.apple.com/programs/
4. **Node.js 18+** installed
5. **CocoaPods** - `sudo gem install cocoapods`

## Quick Start

### Step 1: Download and Extract Code

Extract the GO Raiders codebase to your Mac.

### Step 2: Install Dependencies

```bash
cd go-raiders
npm install
```

### Step 3: Build the Web App

```bash
npm run build
```

### Step 4: Add iOS Platform (First Time Only)

```bash
npx cap add ios
```

### Step 5: Sync Web Assets to iOS

```bash
npx cap sync ios
```

### Step 6: Open in Xcode

```bash
npx cap open ios
```

## Xcode Configuration

### 1. Select Your Team

1. Click on "App" in the project navigator
2. Go to "Signing & Capabilities" tab
3. Select your Apple Developer Team
4. Change Bundle Identifier to: `com.yourcompany.goraiders`

### 2. Configure App Icons

1. Go to App > Assets.xcassets > AppIcon
2. Add your 1024x1024 app icon
3. Xcode will generate all required sizes

### 3. Configure Splash Screen

1. Edit `ios/App/App/LaunchScreen.storyboard`
2. Customize as needed

## Build for App Store

### 1. Archive the App

1. Select "Any iOS Device" as build target
2. Go to Product > Archive
3. Wait for archive to complete

### 2. Upload to App Store Connect

1. Open Window > Organizer
2. Select your archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Follow prompts to upload

### 3. Complete App Store Listing

Go to https://appstoreconnect.apple.com:

1. **App Information**
   - Name: GO Raiders
   - Subtitle: Pokemon GO Raid Coordination
   - Category: Social Networking / Games

2. **Screenshots Required**
   - 6.7" iPhone (1290 x 2796) - iPhone 14 Pro Max
   - 6.5" iPhone (1284 x 2778) - iPhone 11 Pro Max
   - 5.5" iPhone (1242 x 2208) - iPhone 8 Plus

3. **App Privacy**
   - Data collected: Account info, identifiers
   - Complete privacy questionnaire

4. **Age Rating**: 4+ (no objectionable content)

5. **Review Notes**: "Test account not required. App allows Pokemon GO players to coordinate raid activities."

## Capacitor Configuration

The `capacitor.config.ts` file is already configured:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goraiders.app',
  appName: 'GO Raiders',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e'
    }
  }
};

export default config;
```

## Important Notes

### API Server

The web app communicates with a backend server. For production:

1. Deploy your backend to a server (Replit, Railway, Render, etc.)
2. Update `capacitor.config.ts` to point to your production server:

```typescript
server: {
  url: 'https://your-production-url.com',
  cleartext: false
}
```

### Environment Variables

For production, set these environment variables on your server:
- `SESSION_SECRET` - Session encryption key
- `ADMIN_TOKEN` - Admin dashboard access token
- `DATABASE_URL` - PostgreSQL connection string (if using database)

## Android Deployment (Play Store)

### Prerequisites
- Android Studio installed
- Google Play Console account ($25 one-time)

### Steps

```bash
# Add Android platform
npx cap add android

# Sync assets
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Build > Generate Signed Bundle/APK
2. Create new keystore or use existing
3. Build release APK or App Bundle
4. Upload to Google Play Console

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf ios/App/App/public
npx cap sync ios --force
```

### CocoaPods Issues

```bash
cd ios/App
pod install --repo-update
cd ../..
```

### Signing Issues

Ensure you have a valid Apple Developer certificate and provisioning profile.

## Support

For issues with the app code, check the `replit.md` file for architecture details.
