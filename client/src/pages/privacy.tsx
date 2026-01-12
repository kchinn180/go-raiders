import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-card-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Introduction</h2>
          <p className="text-muted-foreground">
            GO Raiders ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Information We Collect</h2>
          <p className="text-muted-foreground">We collect information that you provide directly to us:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Trainer name (display name)</li>
            <li>Team affiliation (Valor, Mystic, Instinct)</li>
            <li>Trainer level</li>
            <li>Friend code for coordination purposes</li>
            <li>Subscription and payment information</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. How We Use Your Information</h2>
          <p className="text-muted-foreground">We use the information we collect to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Facilitate raid coordination between users</li>
            <li>Process subscriptions and payments</li>
            <li>Send you notifications about raids and app updates</li>
            <li>Respond to your comments and questions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Information Sharing</h2>
          <p className="text-muted-foreground">
            We share your trainer name, team, level, and friend code with other users in raid lobbies you join. This is necessary for the coordination features to work.
          </p>
          <p className="text-muted-foreground">
            We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties except as described in this policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Data Storage</h2>
          <p className="text-muted-foreground">
            Your profile information is stored locally on your device. Lobby data is temporarily stored on our servers during active raid sessions and is deleted when lobbies expire.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Your Rights</h2>
          <p className="text-muted-foreground">You have the right to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Our app is intended for users 13 years of age and older. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy, please contact us at support@goraiders.app
          </p>
        </section>
      </div>
    </div>
  );
}
