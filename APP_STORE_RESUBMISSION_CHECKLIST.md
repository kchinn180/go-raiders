# GO Raiders — App Store Resubmission Checklist
**Submission ID being addressed:** 23c6b5fc-cd25-423b-a032-d190586b5140

---

## Issue 1 — Guideline 3.1.2(c): Add Terms of Use Link

### ✅ Code fix (already done)
The premium subscription modal (`premium-modal.tsx`) now shows tappable **Terms of Use** and **Apple EULA** links in the legal disclaimer at the bottom of the paywall. Tapping "Terms of Use" opens the in-app terms page; tapping "Apple EULA" opens Apple's standard EULA URL.

### 🔲 App Store Connect — Add EULA link to the App Description
1. Open [App Store Connect](https://appstoreconnect.apple.com) → GO Raiders → your 1.0 version
2. Under **App Information → Description**, add the following line at the end of the description:

   > Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

3. Alternatively, if you have a hosted custom Terms page (e.g. `https://goraiders.app/terms`), use that URL instead. You can upload a custom EULA under **App Store Connect → App Information → License Agreement**.

4. Click **Save**.

---

## Issue 2 — Guideline 2.1(b): Fix In-App Purchase Errors

### ✅ Code fixes (already done)
- Added missing `getProducts` method to `IAPPlugin.swift` so native StoreKit prices load correctly.
- Improved error messages in `subscription.ts` — the app now surfaces the StoreKit error detail instead of a generic message, making sandbox failures easier to diagnose.

### 🔲 App Store Connect — Sign the Paid Apps Agreement (CRITICAL)
This is the #1 cause of IAP failures during App Review. Without it, **all** StoreKit purchase attempts will fail in sandbox.

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Business** (top navigation)
2. Under **Agreements, Tax, and Banking**, find the **Paid Apps** agreement
3. If it shows "Action Required" or is not yet signed → click **Review** and complete all required fields (bank info, tax forms, contact info)
4. Status must show **Active** before IAP can work in review sandbox

### 🔲 App Store Connect — Verify IAP Product Configuration
Confirm all three products are fully configured and in **"Ready to Submit"** status:

| Product Name       | Product ID                                      | Type                    | Price  |
|--------------------|-------------------------------------------------|-------------------------|--------|
| Elite Monthly      | `com.kyree.goraidcoordinator.elite.monthly`     | Auto-Renewable Sub      | $12.99 |
| Elite Annual       | `com.kyree.goraidcoordinator.elite.yearly`      | Auto-Renewable Sub      | $129.99|
| Remove Ads         | `com.kyree.goraiders.removeads`                 | Non-Consumable          | $4.99  |

To check:
1. App Store Connect → GO Raiders → **In-App Purchases**
2. Each product must have: name, description, price tier, and screenshot — and status **"Ready to Submit"**
3. For the two auto-renewable subscriptions, also confirm they have a **subscription group** and **subscription duration** set

### 🔲 Test in Sandbox Before Resubmitting
1. On a real iPhone/iPad, go to **Settings → App Store → Sandbox Account** and sign in with a sandbox tester account
2. Build and run the app from Xcode (direct device build, not TestFlight)
3. Tap the **$4.99** Remove Ads button and both **Monthly** and **Annual** plan buttons through to purchase
4. All three should complete without errors

---

## Resubmit

### 🔲 Build & Upload
```bash
# In the project root:
npm run build
npx cap sync ios
npx cap open ios
```
Then in Xcode: **Product → Archive → Distribute App → App Store Connect**

Increment the build number before archiving (e.g. build 7 → build 8).

### 🔲 Reply to Apple in App Store Connect
After verifying IAP works in sandbox, reply to the review message with:

---
**Reply template:**

> Thank you for the detailed feedback. We've addressed both issues:
>
> **Guideline 3.1.2(c) — Terms of Use:** We've added a functional link to our Terms of Use (EULA) directly in the subscription paywall UI. We have also added the Apple Standard EULA link to the App Description in App Store Connect metadata.
>
> **Guideline 2.1(b) — IAP Errors:** We identified that the Paid Apps Agreement was not fully active and that IAP product configurations were incomplete. Both have now been resolved. We've also improved error handling in the purchase flow. We tested all three IAP products ($4.99 Remove Ads, $12.99/mo Elite Monthly, $129.99/yr Elite Annual) in the sandbox and they complete successfully.
>
> Please see the attached screen recording showing the working purchase flows.
>
> Thank you for your patience.

---

### 🔲 Include in App Review Notes (for future submissions)
In **App Store Connect → App Review Information → Notes**, add:

> This app offers auto-renewable subscriptions (Elite Monthly at $12.99/month and Elite Annual at $129.99/year) and a one-time non-consumable purchase (Remove Ads at $4.99). The Terms of Use (EULA) link is displayed in the subscription paywall and in the App Description. The Apple Standard EULA applies: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

---

## Summary of Code Files Changed
| File | Change |
|------|--------|
| `client/src/components/premium-modal.tsx` | Added Terms of Use + Apple EULA links in paywall footer |
| `client/src/pages/home.tsx` | Wired `onOpenTerms` prop to open in-app Terms page from paywall |
| `client/src/lib/subscription.ts` | Improved StoreKit error messages for purchase failures |
| `ios/App/App/IAPPlugin.swift` | Added missing `getProducts` method for native price loading |
