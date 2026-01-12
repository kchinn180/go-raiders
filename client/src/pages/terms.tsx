import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-card-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Terms of Service</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using GO Raiders, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Description of Service</h2>
          <p className="text-muted-foreground">
            GO Raiders is an independent third-party application designed to help players coordinate raid battles. We are not affiliated with, endorsed by, or connected to Niantic, The Pokémon Company, or Nintendo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. User Accounts</h2>
          <p className="text-muted-foreground">
            When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. User Conduct</h2>
          <p className="text-muted-foreground">You agree not to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Use the app for any unlawful purpose</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt the service</li>
            <li>Attempt to gain unauthorized access to any portion of the app</li>
            <li>Use automated systems to access the service</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Subscriptions and Payments</h2>
          <p className="text-muted-foreground">
            <strong>5.1 Billing:</strong> Elite subscriptions are billed monthly at $19.99 USD. Payment will be charged to your payment method at confirmation of purchase.
          </p>
          <p className="text-muted-foreground">
            <strong>5.2 Renewal:</strong> Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </p>
          <p className="text-muted-foreground">
            <strong>5.3 Cancellation:</strong> You may cancel your subscription at any time through the Settings page. Your benefits will continue until the end of the current billing period.
          </p>
          <p className="text-muted-foreground">
            <strong>5.4 Refunds:</strong> Refunds are handled on a case-by-case basis. Contact support for refund requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The GO Raiders app, including its original content, features, and functionality, is owned by GO Raiders and protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-muted-foreground">
            Pokémon and all related names, images, and trademarks are the property of their respective owners and are used for coordination purposes only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            The service is provided "as is" and "as available" without any warranties of any kind. We do not guarantee that raids will be successful or that you will find other players to coordinate with.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            In no event shall GO Raiders be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Termination</h2>
          <p className="text-muted-foreground">
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify or replace these Terms at any time. Continued use of the app after any changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Contact Us</h2>
          <p className="text-muted-foreground">
            For any questions about these Terms, please contact us at support@goraiders.app
          </p>
        </section>
      </div>
    </div>
  );
}
