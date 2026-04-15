# GO Raiders - App Store Deployment Guide

## Prerequisites

- Apple Developer Account ($99/year) - https://developer.apple.com
- Google Play Console ($25 one-time) - https://play.google.com/console
- Xcode 15+ installed (for iOS builds)
- Android Studio installed (for Android builds)
- Node.js 18+ installed
- CocoaPods installed (`sudo gem install cocoapods`)

## 1. Backend Deployment

The Express server must be deployed first, since the app connects to it.

### Recommended: Railway / Render / Fly.io

```bash
# Set environment variables on your hosting platform:
DATABASE_URL=postgresql://...
ADMIN_TOKEN=your-secure-admin-token
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
RAID_SCRAPER_ENABLED=true
NODE_ENV=production
PORT=5000
```

### Build and start:
```bash
npm run build
npm run start
```

## 2. Web Build for Capacitor

```bash
# Build the web app
npm run build

# The output goes to dist/public/ which is configured in capacitor.config.ts
```

## 3. iOS Deployment

### Initial Setup (first time only)
```bash
# Add iOS platform
npx cap add ios

# Open in Xcode
npx cap open ios
```

### In Xcode:
1. Set your Team in Signing & Capabilities
2. Set Bundle Identifier to `com.goraiders.app`
3. Set Display Name to "GO Raiders"
4. Add app icons (see App Icons section below)

### Build and Submit:
```bash
# Sync web build to native project
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select "Any iOS Device" as build target
2. Product > Archive
3. Window > Organizer > Distribute App
4. Select "App Store Connect"
5. Upload

### App Store Connect Setup:
1. Go to https://appstoreconnect.apple.com
2. Create a new app with bundle ID `com.goraiders.app`
3. Fill in app metadata:
   - Name: GO Raiders
   - Subtitle: Remote Raid Coordination
   - Category: Social Networking (primary), Games (secondary)
   - Privacy Policy URL: Your privacy policy URL
4. Upload screenshots (see Screenshots section)
5. Submit for review

## 4. Android Deployment

### Initial Setup (first time only)
```bash
# Add Android platform
npx cap add android

# Open in Android Studio
npx cap open android
```

### Build Release APK/AAB:
```bash
# Sync web build
npx cap sync android

# Open Android Studio
npx cap open android
```

In Android Studio:
1. Build > Generate Signed Bundle/APK
2. Choose "Android App Bundle"
3. Create or use existing keystore
4. Build Release

### Google Play Console Setup:
1. Go to https://play.google.com/console
2. Create a new app
3. Fill in store listing:
   - App name: GO Raiders
   - Short description: "Coordinate Pokémon GO raids with trainers worldwide"
   - Category: Social
4. Upload AAB from `android/app/build/outputs/bundle/release/`
5. Set up content rating questionnaire
6. Set pricing to Free (with in-app purchases for Elite)
7. Submit for review

## 5. App Icons

You need app icons in the following sizes. Use a 1024x1024 source image.

### iOS (place in ios/App/App/Assets.xcassets/AppIcon.appiconset/):
- 20pt @2x (40x40), @3x (60x60)
- 29pt @2x (58x58), @3x (87x87)
- 40pt @2x (80x80), @3x (120x120)
- 60pt @2x (120x120), @3x (180x180)
- 1024pt @1x (1024x1024) - App Store

### Android (place in android/app/src/main/res/):
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

**Tip:** Use https://appicon.co or `npx capacitor-assets generate` to generate all sizes from a single image.

## 6. Screenshots

Both stores require screenshots. Capture these screens:
1. Landing/splash screen
2. Join Feed (showing available raids)
3. Hosting a raid (boss selection)
4. Lobby view (with players)
5. Profile/Settings page
6. Trainer scanner during onboarding

### Required sizes:
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1284 x 2778)
- iPad Pro 12.9" (2048 x 2732)
- Android Phone (1080 x 1920 minimum)

## 7. Push Notifications Setup

### iOS:
1. In Apple Developer portal, create an APNs key
2. Download the .p8 file
3. Configure in your backend push service

### Android:
1. In Firebase Console, create a project
2. Add your Android app
3. Download google-services.json
4. Place in android/app/

## 8. In-App Purchases

### Apple:
1. In App Store Connect > In-App Purchases
2. Create subscription products:
   - `com.goraiders.elite.monthly` (Elite Monthly)
   - `com.goraiders.elite.yearly` (Elite Yearly)
3. Set pricing and description

### Google:
1. In Play Console > Monetize > Subscriptions
2. Create matching products with same IDs
3. Set pricing

## 9. Review Checklist

Before submitting to app stores, verify:

- [ ] App works offline gracefully (shows appropriate messages)
- [ ] All links work (Privacy Policy, Terms of Service)
- [ ] No placeholder text or "Lorem ipsum"
- [ ] Push notifications work on both platforms
- [ ] In-app purchases work in sandbox mode
- [ ] Trainer scanner works with camera and gallery
- [ ] Raid boss list is current and accurate
- [ ] No crashes on app launch, navigation, or backgrounding
- [ ] Proper handling of network errors
- [ ] Dark mode works correctly
- [ ] Text is readable at all font sizes (accessibility)
- [ ] App respects system font size settings

## 10. Common Rejection Reasons & Fixes

1. **"App uses Pokémon GO branding"** - Ensure no official Niantic/Pokémon trademarks. Use "GO Raiders" branding only. Add disclaimer that app is unofficial.

2. **"Guideline 5.2.1 - Legal"** - Add clear disclaimer: "GO Raiders is not affiliated with Niantic, The Pokémon Company, or Nintendo."

3. **"Guideline 4.0 - Design"** - Ensure native feel. Use proper safe areas, navigation patterns, and iOS/Android conventions.

4. **"Guideline 2.1 - Performance"** - Test thoroughly on physical devices, not just simulators.

## Quick Commands Reference

```bash
# Full build and sync
npm run build && npx cap sync

# iOS only
npm run build && npx cap sync ios && npx cap open ios

# Android only
npm run build && npx cap sync android && npx cap open android

# Run on device (dev mode)
npx cap run ios
npx cap run android
```
