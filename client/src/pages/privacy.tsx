import { ArrowLeft } from "lucide-react";
import { SwipeBackWrapper } from "@/components/swipe-back-wrapper";

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <SwipeBackWrapper onBack={onBack}>
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <header
        className="sticky top-0 z-10 bg-card border-b border-card-border flex items-center justify-center px-4 pb-3 shrink-0"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </header>
      <div className="flex-1 overflow-y-auto pb-24">
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Last updated: May 22, 2025</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Introduction</h2>
          <p className="text-muted-foreground">
            GO Raiders ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App"). Please read this policy carefully. By using the App you agree to the practices described here.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Information We Collect</h2>

          <h3 className="font-semibold">2.1 Information You Provide</h3>
          <p className="text-muted-foreground">When you set up your trainer profile you provide:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Trainer name (display name — not your real name)</li>
            <li>Team affiliation (Valor, Mystic, or Instinct)</li>
            <li>Trainer level (1–50)</li>
            <li>Pokémon GO friend code</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            We do not collect your real name, email address, phone number, or any government-issued ID. No traditional account registration is required.
          </p>

          <h3 className="font-semibold mt-3">2.2 Information Collected Automatically</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li><strong>Device push token</strong> — a unique identifier issued by Apple (APNs) or Google (FCM) used solely to deliver raid alerts and lobby notifications to your device.</li>
            <li><strong>IP address</strong> — logged temporarily by our servers for security purposes (e.g., detecting abuse or unauthorized admin access).</li>
            <li><strong>App error reports</strong> — if the App crashes or encounters an error, basic diagnostic information (error message, stack trace, app version) is sent to our servers to help us fix bugs. This data is not tied to any personally identifiable information.</li>
            <li><strong>Raid and lobby activity</strong> — when you host or join a lobby, session data (boss selected, players in lobby, timestamps) is stored on our servers for the duration of the session and deleted automatically when the lobby expires (typically within 15 minutes).</li>
          </ul>

          <h3 className="font-semibold mt-3">2.3 Advertising Data (Non-Premium Users)</h3>
          <p className="text-muted-foreground">
            The free tier of the App displays advertisements served by Google AdMob. AdMob may collect device identifiers, approximate location, and ad interaction data in accordance with Google's own privacy policy. You can review Google's data practices at <span className="text-primary">policies.google.com/privacy</span>. Purchasing an Elite subscription or the Remove Ads add-on disables all advertising and the associated data collection.
          </p>

          <h3 className="font-semibold mt-3">2.4 Purchase Information</h3>
          <p className="text-muted-foreground">
            All in-app purchases (Elite subscription and Remove Ads) are processed entirely by Apple App Store or Google Play Store. We receive only a cryptographic receipt or signed token confirming the purchase — we never see your payment card number, Apple ID, or Google account credentials. We store the receipt verification result (active/expired, subscription tier, renewal date) associated with your anonymous user ID.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Provide raid coordination features (lobby creation, joining, and real-time updates)</li>
            <li>Display your trainer profile to other players in shared lobbies</li>
            <li>Send push notifications about raid events, lobby status, and app announcements</li>
            <li>Verify and maintain your subscription or one-time purchase entitlements</li>
            <li>Detect and prevent abuse, spam, or fraudulent activity</li>
            <li>Diagnose and fix bugs using anonymized crash reports</li>
            <li>Improve app performance and features based on aggregate usage patterns</li>
          </ul>
          <p className="text-muted-foreground">
            We do not use your information for automated decision-making or profiling that produces legal or similarly significant effects.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Information Sharing and Disclosure</h2>

          <h3 className="font-semibold">4.1 Shared With Other Users</h3>
          <p className="text-muted-foreground">
            When you join or host a raid lobby, your trainer name, team, level, and friend code are visible to other participants in that lobby. This sharing is essential to the App's coordination features. Lobby data is ephemeral and deleted when the session ends.
          </p>

          <h3 className="font-semibold mt-3">4.2 Service Providers</h3>
          <p className="text-muted-foreground">
            We use the following third-party services to operate the App. Each is bound by its own privacy commitments:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li><strong>Railway</strong> — cloud hosting for our backend server and temporary lobby data</li>
            <li><strong>Apple APNs / Google FCM</strong> — push notification delivery</li>
            <li><strong>Google AdMob</strong> — advertising (free tier only)</li>
            <li><strong>Apple App Store / Google Play</strong> — payment processing</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            We do not sell, rent, or trade your personal information to any third party for their own marketing purposes.
          </p>

          <h3 className="font-semibold mt-3">4.3 Legal Requirements</h3>
          <p className="text-muted-foreground">
            We may disclose information if required by law, court order, or governmental authority, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Data Storage and Retention</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li><strong>Profile data</strong> — stored locally on your device using the device's secure storage. We do not maintain a central database of user profiles.</li>
            <li><strong>Active lobby data</strong> — stored on our servers only while the lobby is live. Automatically purged within 15 minutes of lobby creation or immediately upon closure.</li>
            <li><strong>Push tokens</strong> — retained until you disable push notifications in the App or uninstall the App.</li>
            <li><strong>Subscription records</strong> — retained for the duration of your subscription and up to 90 days after expiration for dispute resolution purposes.</li>
            <li><strong>Error logs</strong> — retained for up to 30 days, then automatically deleted.</li>
            <li><strong>Security logs (IP addresses)</strong> — retained for up to 7 days.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Push Notifications</h2>
          <p className="text-muted-foreground">
            With your permission, we send push notifications for raid alerts, lobby events, and occasional re-engagement messages (e.g., weekend raid reminders). You can disable notifications at any time in the App's Settings screen or in your device's system settings. Disabling notifications does not affect your ability to use the App.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Your Privacy Rights</h2>

          <h3 className="font-semibold">7.1 All Users</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Access or correct your trainer profile at any time in the App's Settings screen</li>
            <li>Delete your local profile data by using the "Delete Profile" option in Settings</li>
            <li>Opt out of push notifications in Settings or device system settings</li>
            <li>Opt out of personalized advertising via your device's privacy settings (Limit Ad Tracking on iOS; Opt out of Ads Personalization on Android)</li>
          </ul>

          <h3 className="font-semibold mt-3">7.2 California Residents (CCPA)</h3>
          <p className="text-muted-foreground">
            California residents have the right to know what personal information we collect, request deletion of their personal information, and opt out of the sale of personal information. We do not sell personal information. To exercise your rights, contact us at the address below.
          </p>

          <h3 className="font-semibold mt-3">7.3 European / UK Residents (GDPR / UK GDPR)</h3>
          <p className="text-muted-foreground">
            If you are located in the European Economic Area or the United Kingdom, you have the right to access, rectify, erase, restrict, or object to processing of your personal data, and the right to data portability. Our legal basis for processing is our legitimate interest in providing the coordination service, and — for advertising — your implicit consent through use of the free tier. To exercise your rights or lodge a complaint, contact us at the address below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Children's Privacy</h2>
          <p className="text-muted-foreground">
            The App is intended for users aged 13 and older (or the applicable minimum digital age of consent in your jurisdiction). We do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected such information, we will delete it promptly. If you believe a child under 13 has provided us with personal information, please contact us immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Security</h2>
          <p className="text-muted-foreground">
            We implement reasonable technical and organizational measures to protect your information, including HTTPS encryption for all data in transit and server-side token verification for purchases. However, no method of transmission over the internet or method of electronic storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Third-Party Links</h2>
          <p className="text-muted-foreground">
            The App is not affiliated with, endorsed by, or connected to Niantic, The Pokémon Company, or Nintendo. Any references to Pokémon GO are solely for the purpose of describing the coordination context. Those companies' privacy practices are governed by their own policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. Material changes will be communicated through an in-app notice or push notification. The "Last updated" date at the top of this page will always reflect the most recent revision. Continued use of the App after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">12. Contact Us</h2>
          <p className="text-muted-foreground">
            For privacy-related questions, requests, or complaints, please contact us at:
          </p>
          <p className="text-muted-foreground font-medium">support@goraiders.app</p>
          <p className="text-muted-foreground text-sm mt-2">
            We will respond to verifiable requests within 30 days (or as required by applicable law).
          </p>
        </section>
      </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-start px-5"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onBack}
          data-testid="button-back"
          className="flex items-center gap-2 bg-card border border-card-border px-5 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
    </SwipeBackWrapper>
  );
}
