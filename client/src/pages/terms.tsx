import { ArrowLeft } from "lucide-react";
import { SwipeBackWrapper } from "@/components/swipe-back-wrapper";

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <SwipeBackWrapper onBack={onBack}>
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <header
        className="sticky top-0 z-10 bg-card border-b border-card-border flex items-center justify-center px-4 pb-3 shrink-0"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <h1 className="text-lg font-bold">Terms of Service</h1>
      </header>
      <div className="flex-1 overflow-y-auto pb-24">
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Last updated: May 22, 2025</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By downloading, installing, or using GO Raiders (the "App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. These Terms apply to all users, including free and paid subscribers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Description of Service</h2>
          <p className="text-muted-foreground">
            GO Raiders is an independent third-party coordination tool that helps Pokémon GO players organize raid battles. The App allows users to host and join raid lobbies, share friend codes, and receive notifications about raid activity.
          </p>
          <p className="text-muted-foreground">
            <strong>Disclaimer:</strong> GO Raiders is not affiliated with, endorsed by, sponsored by, or in any way associated with Niantic, Inc., The Pokémon Company, Nintendo, or any of their subsidiaries or affiliates. Pokémon, Pokémon GO, and all related names, marks, and characters are trademarks of their respective owners.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Eligibility</h2>
          <p className="text-muted-foreground">
            You must be at least 13 years of age (or the applicable minimum digital age of consent in your jurisdiction) to use the App. By using the App, you represent that you meet this age requirement. If you are under 18, you represent that a parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. User Profiles</h2>
          <p className="text-muted-foreground">
            The App does not require a traditional account with an email address or password. Your trainer profile (name, team, level, friend code) is created locally on your device. You are responsible for the accuracy of your profile information and for any activity conducted through your profile. We reserve the right to remove or suspend any profile that violates these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. User Conduct</h2>
          <p className="text-muted-foreground">You agree not to use the App to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Violate any applicable local, national, or international law or regulation</li>
            <li>Harass, threaten, abuse, bully, or harm other users</li>
            <li>Impersonate any person, entity, or trainer</li>
            <li>Use a trainer name that is offensive, misleading, or violates third-party rights</li>
            <li>Spam lobby feeds or create fake or duplicate lobbies</li>
            <li>Interfere with, disrupt, or overload the App's servers or infrastructure</li>
            <li>Use bots, scrapers, or automated systems to access or interact with the App</li>
            <li>Attempt to gain unauthorized access to any part of the App or its backend systems</li>
            <li>Reverse-engineer, decompile, or disassemble any part of the App</li>
          </ul>
          <p className="text-muted-foreground">
            We reserve the right to ban users who violate these conduct rules, with or without prior notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. In-App Purchases</h2>

          <h3 className="font-semibold">6.1 Available Purchases</h3>
          <p className="text-muted-foreground">The App offers the following purchases:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li><strong>Elite Monthly</strong> — $12.99 USD per month (auto-renewing subscription)</li>
            <li><strong>Elite Annual</strong> — $129.99 USD per year (auto-renewing subscription, approximately $10.83/month)</li>
            <li><strong>Remove Ads</strong> — $4.99 USD one-time purchase; permanently removes advertising</li>
          </ul>
          <p className="text-muted-foreground text-sm mt-1">
            Prices may vary by region and are displayed in your local currency at checkout.
          </p>

          <h3 className="font-semibold mt-3">6.2 Billing and Payment</h3>
          <p className="text-muted-foreground">
            All purchases are processed exclusively through Apple App Store or Google Play Store ("the Store"). Payment is charged to your Apple ID or Google Play account upon confirmation of purchase. We never receive or store your payment card details.
          </p>

          <h3 className="font-semibold mt-3">6.3 Auto-Renewal</h3>
          <p className="text-muted-foreground">
            Elite subscriptions auto-renew at the end of each billing period unless cancelled at least 24 hours before the renewal date. Your account will be charged within 24 hours prior to the end of the current period.
          </p>

          <h3 className="font-semibold mt-3">6.4 Cancellation</h3>
          <p className="text-muted-foreground">
            You may cancel your subscription at any time through your Apple ID or Google Play account settings. Cancellation takes effect at the end of the current billing period — you will retain Elite access until then. We do not provide refunds for partial subscription periods.
          </p>

          <h3 className="font-semibold mt-3">6.5 Refunds</h3>
          <p className="text-muted-foreground">
            All refund requests are handled directly by Apple or Google in accordance with their respective refund policies. We do not control and cannot override their decisions. To request a refund, visit reportaproblem.apple.com (iOS) or the Google Play Help Center (Android).
          </p>

          <h3 className="font-semibold mt-3">6.6 Restoring Purchases</h3>
          <p className="text-muted-foreground">
            If you reinstall the App or switch devices, use the "Restore Purchases" button in the Shop to recover your active subscriptions and one-time purchases. Restoration requires the same Apple ID or Google account used for the original purchase.
          </p>

          <h3 className="font-semibold mt-3">6.7 Elite Features</h3>
          <p className="text-muted-foreground">
            Elite features are provided "as available." We reserve the right to modify, add, or remove features at any time. We will endeavor to notify subscribers of material changes, but access to specific features is not guaranteed for the full subscription period.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Push Notifications</h2>
          <p className="text-muted-foreground">
            By enabling push notifications, you consent to receiving alerts about raid events, lobby activity, and occasional promotional messages from GO Raiders. You may opt out at any time in the App's Settings or your device's notification settings. Standard data rates from your carrier may apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Advertising</h2>
          <p className="text-muted-foreground">
            The free tier of the App displays advertisements served by Google AdMob. Advertisements are removed upon purchase of an Elite subscription or the Remove Ads add-on. We are not responsible for the content of third-party advertisements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The App, including its design, code, graphics, and original content, is owned by GO Raiders and is protected by applicable copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable license to use the App for its intended personal, non-commercial purpose.
          </p>
          <p className="text-muted-foreground">
            You may not reproduce, distribute, modify, create derivative works of, publicly display, or commercially exploit any portion of the App without our prior written consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            THE APP IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We make no guarantee that you will find other players to raid with, that lobbies will be successful, or that raid coordination will result in successful in-game outcomes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, GO RAIDERS AND ITS OWNERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOST PROFITS, DATA LOSS, OR GOODWILL — ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE APP, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="text-muted-foreground">
            Our total aggregate liability to you for any claims arising under these Terms shall not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) $10 USD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">12. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify and hold harmless GO Raiders and its owners, officers, and agents from any claims, damages, losses, or expenses (including reasonable attorney's fees) arising out of your use of the App, your violation of these Terms, or your violation of any third-party rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">13. Termination</h2>
          <p className="text-muted-foreground">
            We reserve the right to suspend or permanently ban any user who violates these Terms, with or without prior notice and without liability. Upon termination, your right to use the App ceases immediately. Provisions that by their nature should survive termination (including Sections 9–12) will do so.
          </p>
          <p className="text-muted-foreground">
            Termination of your access does not entitle you to a refund of any subscription fees already charged. Refund eligibility is determined solely by Apple or Google's policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">14. Governing Law and Dispute Resolution</h2>
          <p className="text-muted-foreground">
            These Terms are governed by the laws of the State of California, United States, without regard to its conflict of law provisions. Any dispute arising from these Terms or your use of the App shall first be addressed through good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association, conducted in English. You waive any right to bring claims as a class action or class-wide arbitration.
          </p>
          <p className="text-muted-foreground">
            Notwithstanding the above, either party may seek emergency injunctive relief in a court of competent jurisdiction to prevent irreparable harm.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">15. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these Terms at any time. Material changes will be communicated via an in-app notice or push notification. The "Last updated" date at the top of this page reflects the most current version. Your continued use of the App after changes are posted constitutes your acceptance of the revised Terms. If you do not agree to the new Terms, you must stop using the App.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">16. Contact Us</h2>
          <p className="text-muted-foreground">
            For questions about these Terms, please contact us at:
          </p>
          <p className="text-muted-foreground font-medium">support@goraiders.app</p>
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
