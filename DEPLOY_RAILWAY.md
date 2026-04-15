# GO Raiders - Railway Deployment Guide

Complete step-by-step guide to deploy GO Raiders to Railway (backend + database), Apple App Store (iOS), and Google Play Store (Android).

## Part 1: Railway Backend Deployment

### Step 1: Create a Railway Account

1. Go to https://railway.app and click "Start a New Project"
2. Sign up with GitHub (recommended — this links your repo for auto-deploy)
3. You'll get $5/month free credit on the Hobby plan, or upgrade to Pro ($5/month) for production use

### Step 2: Push Your Code to GitHub

If your code isn't already on GitHub:

```bash
# Initialize git if needed
git init

# Add all files
git add -A

# Commit
git commit -m "Prepare GO Raiders for Railway deployment"

# Create a GitHub repo and push
gh repo create go-raiders --private --source=. --push
```

Or if you already have a repo, just push the latest changes.

### Step 3: Create Railway Project

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your GO Raiders repository
4. Railway will auto-detect it as a Node.js app

### Step 4: Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically sets `DATABASE_URL` as an environment variable
3. No additional config needed — the app reads `DATABASE_URL` automatically

### Step 5: Set Environment Variables

In Railway dashboard → your service → Variables tab, add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | (auto-set by Railway PostgreSQL) | Yes (auto) |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `5000` | Yes |
| `ADMIN_TOKEN` | (generate a random string) | Yes |
| `VAPID_PUBLIC_KEY` | (see below) | Yes |
| `VAPID_PRIVATE_KEY` | (see below) | Yes |
| `RAID_SCRAPER_ENABLED` | `true` | Optional |

**Generate VAPID Keys** (run locally):
```bash
npx web-push generate-vapid-keys
```
This outputs a public and private key — paste them into the Railway variables.

**Generate ADMIN_TOKEN** (run locally):
```bash
openssl rand -hex 32
```

### Step 6: Configure Build Settings

Railway should auto-detect the build from `railway.toml`, but verify:
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check: `/health`

### Step 7: Set Up Database Schema

After the first deploy, the database tables need to be created. You can do this locally:

```bash
# Set your Railway DATABASE_URL locally
export DATABASE_URL="postgresql://..."  # Copy from Railway dashboard

# Push the schema
npx drizzle-kit push
```

Or use Railway's built-in shell (Settings → "Open Shell"):
```bash
npx drizzle-kit push
```

### Step 8: Generate a Public Domain

1. In Railway → your service → Settings → Networking
2. Click "Generate Domain" to get a `*.railway.app` URL
3. Or add a custom domain if you have one

### Step 9: Verify Deployment

Visit `https://your-app.railway.app/health` — you should see:
```json
{"status":"healthy","timestamp":"..."}
```

Then visit `https://your-app.railway.app` to see the full app.

---

## Part 2: iOS App Store Deployment

### Prerequisites
- Mac with Xcode 15+ installed
- Apple Developer Account ($99/year) — https://developer.apple.com/programs/enroll/
- CocoaPods installed: `sudo gem install cocoapods`

### Step 1: Update Capacitor Config

In `capacitor.config.ts`, uncomment and set the server URL:
```ts
server: {
  androidScheme: 'https',
  url: 'https://your-app.railway.app',  // Your Railway URL
}
```

### Step 2: Build the Web App

```bash
npm run build
```

### Step 3: Add iOS Platform & Sync

```bash
npx cap add ios
npx cap sync ios
```

### Step 4: Configure in Xcode

```bash
npx cap open ios
```

In Xcode:
1. Select "App" in the project navigator
2. Under "Signing & Capabilities":
   - Set your Apple Developer Team
   - Bundle Identifier: `com.goraiders.app`
3. Set Display Name to "GO Raiders"
4. Add app icons (use https://appicon.co to generate all sizes from a 1024x1024 source image)

### Step 5: Archive & Upload

1. Select "Any iOS Device" as build target
2. Product → Archive
3. Window → Organizer → Distribute App
4. Select "App Store Connect" → Upload

### Step 6: App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Create new app with bundle ID `com.goraiders.app`
3. Fill in:
   - Name: GO Raiders
   - Subtitle: Remote Raid Coordination
   - Category: Social Networking (primary), Games (secondary)
   - Description: Coordinate Pokemon GO raids with trainers worldwide
   - Keywords: pokemon go, raids, remote raids, raid coordination, pokemon
4. Add screenshots (capture from Xcode Simulator at required sizes)
5. Add privacy policy URL
6. Add disclaimer: "GO Raiders is not affiliated with Niantic, The Pokemon Company, or Nintendo."
7. Submit for review

---

## Part 3: Google Play Store Deployment

### Prerequisites
- Android Studio installed
- Google Play Console account ($25 one-time) — https://play.google.com/console/signup
- Java/JDK installed

### Step 1: Build & Sync Android

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

### Step 2: Generate Signed App Bundle

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Select "Android App Bundle"
3. Create a new keystore (SAVE THIS FILE — you need it for every update)
4. Fill in keystore details
5. Build Release

### Step 3: Google Play Console Setup

1. Go to https://play.google.com/console
2. Create new app
3. Fill in:
   - App name: GO Raiders
   - Short description: "Coordinate Pokemon GO raids with trainers worldwide"
   - Full description: (detailed app description)
   - Category: Social
4. Upload AAB from `android/app/build/outputs/bundle/release/`
5. Complete content rating questionnaire
6. Set pricing: Free
7. Submit for review

---

## Post-Deployment Checklist

- [ ] Railway backend is running and `/health` returns healthy
- [ ] Database schema is created (tables exist)
- [ ] VAPID keys are set (push notifications work)
- [ ] Admin token is set and admin panel is accessible
- [ ] Raid scraper is running (boss list auto-updates)
- [ ] WebSocket connections work (real-time lobby updates)
- [ ] iOS build runs on a physical device
- [ ] Android build runs on a physical device
- [ ] Push notifications work on both platforms
- [ ] App includes Niantic/Pokemon disclaimer
- [ ] Privacy policy URL is live and accessible

## Estimated Costs

| Service | Cost |
|---------|------|
| Railway Hobby | $5/month (includes $5 credit) |
| Railway PostgreSQL | ~$1-5/month depending on usage |
| Apple Developer | $99/year |
| Google Play Console | $25 one-time |
| **Total Year 1** | **~$200** |

## Troubleshooting

**Build fails on Railway:**
- Check build logs in Railway dashboard
- Ensure `package.json` has correct build script
- Verify Node.js version compatibility (18+)

**Database connection errors:**
- Verify `DATABASE_URL` is set in Railway variables
- Run `npx drizzle-kit push` to create tables
- Check Railway PostgreSQL is running

**WebSocket not connecting:**
- Railway supports WebSockets natively on the generated domain
- Ensure CSP `connectSrc` includes `wss:`

**iOS build fails:**
- Run `npx cap sync ios` after any web build
- Check Xcode signing settings
- Ensure minimum iOS target is set (iOS 14+)
