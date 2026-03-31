/**
 * Premium Subscription Modal
 * 
 * IN-APP PURCHASE IMPLEMENTATION:
 * - All subscriptions are processed through Apple App Store (iOS) or Google Play Store (Android)
 * - No custom payment forms or third-party processors are used
 * - This ensures compliance with App Store and Play Store billing policies
 * 
 * PRICING:
 * - Monthly: $6.99/month
 * - Annual: $69.90/year (10 months price, 2 months FREE)
 * 
 * SECURITY:
 * - Premium status is ONLY granted after server-side receipt verification
 * - The frontend never sets isPremium directly
 * - All verification happens through /api/subscription/verify
 */

import { useState } from "react";
import { X, Sparkles, Zap, Radar, Users, Star, Clock, ShieldCheck, Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { purchaseSubscription, restorePurchases, type SubscriptionProduct } from "@/lib/subscription";
import { cn } from "@/lib/utils";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  { icon: Radar, text: "Auto Join Raids" },
  { icon: Clock, text: "No Wait Time" },
  { icon: Users, text: "Priority Queue" },
  { icon: Star, text: "Host Ratings" },
  { icon: ShieldCheck, text: "Verified Badge" },
  { icon: Zap, text: "Instant Alerts" },
];

/**
 * Subscription Products
 * 
 * Product IDs must match exactly in:
 * - Apple App Store Connect (In-App Purchases > Auto-Renewable Subscriptions)
 * - Google Play Console (Products > Subscriptions)
 */
const ELITE_MONTHLY: SubscriptionProduct = {
  id: 'elite_monthly',
  name: 'Elite Monthly',
  description: 'Premium raid features',
  price: 12.99,
  period: 'month',
  appleProductId: 'com.goraiders.elite.monthly',
  googleProductId: 'elite_monthly_subscription',
  features: ['Priority Queue', 'No Wait Time', 'Elite Badge']
};

const ELITE_YEARLY: SubscriptionProduct = {
  id: 'elite_yearly',
  name: 'Elite Annual',
  description: 'Best value - 2 months free',
  price: 129.90,
  period: 'year',
  appleProductId: 'com.goraiders.elite.yearly',
  googleProductId: 'elite_yearly_subscription',
  features: ['Priority Queue', 'No Wait Time', 'Elite Badge', '2 Months Free']
};

export function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user, syncPremiumFromServer } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  
  if (!isOpen) return null;

  const currentProduct = selectedPlan === 'yearly' ? ELITE_YEARLY : ELITE_MONTHLY;
  const monthlyEquivalent = selectedPlan === 'yearly' ? (129.90 / 12).toFixed(2) : '12.99';
  const savings = selectedPlan === 'yearly' ? (12.99 * 12 - 129.90).toFixed(2) : '0';

  /**
   * Handle subscription purchase
   * 
   * Flow:
   * 1. Opens native App Store / Play Store purchase dialog
   * 2. User completes payment through Apple/Google
   * 3. Receipt is sent to backend for server-side verification
   * 4. Backend validates with Apple/Google servers
   * 5. Premium access granted only after successful verification
   */
  const handleUpgrade = async () => {
    if (!user) return;
    
    setIsPurchasing(true);
    try {
      const result = await purchaseSubscription(user.id, currentProduct);
      
      if (result.success && result.isPremium) {
        const renewalMs = selectedPlan === 'yearly' 
          ? 365 * 24 * 60 * 60 * 1000 
          : 30 * 24 * 60 * 60 * 1000;
        
        syncPremiumFromServer(true, {
          status: 'active',
          startDate: Date.now(),
          renewalDate: Date.now() + renewalMs,
          canceledAt: null,
          plan: currentProduct.id as 'elite_monthly' | 'elite_yearly',
          price: currentProduct.price,
          storeType: 'apple',
          verificationStatus: 'verified'
        });
        toast({ title: "Welcome to Elite!", description: "You now have access to all premium features" });
        onClose();
      } else {
        toast({ 
          title: "Purchase failed", 
          description: result.error || "Could not complete purchase. Please try again.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Purchase error", 
        description: "Please try again later", 
        variant: "destructive" 
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  /**
   * Restore previous purchases
   * 
   * Required by App Store guidelines - allows users to restore
   * subscriptions after reinstalling the app or switching devices.
   * 
   * Flow:
   * 1. Queries App Store / Play Store for user's purchase history
   * 2. Sends any found receipts to backend for verification
   * 3. Re-grants access if valid subscription found
   */
  const handleRestore = async () => {
    if (!user) return;
    
    setIsRestoring(true);
    try {
      const result = await restorePurchases(user.id);
      
      if (result.success && result.isPremium) {
        syncPremiumFromServer(true, {
          status: 'active',
          startDate: Date.now(),
          renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          canceledAt: null,
          plan: 'restored',
          price: 0,
          storeType: 'apple',
          verificationStatus: 'verified'
        });
        toast({ title: "Purchases Restored!", description: "Your Elite access has been restored" });
        onClose();
      } else {
        toast({ 
          title: "No purchases found", 
          description: "No previous Elite subscription found for this account",
          variant: "default"
        });
      }
    } catch (error) {
      toast({ 
        title: "Restore failed", 
        description: "Please try again later", 
        variant: "destructive" 
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          data-testid="button-close-premium"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black">GO Raiders Elite</h2>
          <p className="text-muted-foreground text-sm">
            Unlock the ultimate raid experience
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl"
              >
                <Icon className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            );
          })}
        </div>

        {user?.isPremium ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-bold text-green-500">You're already Elite!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Manage your subscription in App Store or Play Store settings
            </p>
          </div>
        ) : (
          <>
            {/* Plan Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Monthly Plan */}
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all",
                  selectedPlan === 'monthly'
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-card-border bg-muted/30 hover:border-muted-foreground/50"
                )}
                data-testid="button-plan-monthly"
              >
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Monthly</div>
                <div className="text-2xl font-black">${ELITE_MONTHLY.price}</div>
                <div className="text-xs text-muted-foreground">/month</div>
              </button>

              {/* Annual Plan */}
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all",
                  selectedPlan === 'yearly'
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-card-border bg-muted/30 hover:border-muted-foreground/50"
                )}
                data-testid="button-plan-yearly"
              >
                {/* Best Value Badge */}
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  SAVE ${savings}
                </div>
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Annual</div>
                <div className="text-2xl font-black">${ELITE_YEARLY.price}</div>
                <div className="text-xs text-muted-foreground">${monthlyEquivalent}/mo</div>
              </button>
            </div>

            {/* Savings callout for annual */}
            {selectedPlan === 'yearly' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-center">
                <span className="text-green-500 font-bold text-sm">
                  2 months FREE with annual plan!
                </span>
              </div>
            )}

            {/* Purchase Button */}
            <Button
              onClick={handleUpgrade}
              disabled={isPurchasing || isRestoring}
              className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
              data-testid="button-confirm-upgrade"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {selectedPlan === 'yearly' ? 'GET ANNUAL ELITE' : 'GET MONTHLY ELITE'}
                </>
              )}
            </Button>

            {/* Restore Purchases */}
            <Button
              variant="ghost"
              onClick={handleRestore}
              disabled={isPurchasing || isRestoring}
              className="w-full mt-2"
              data-testid="button-restore-purchases"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Purchases
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-3">
              Subscription renews automatically. Cancel anytime in App Store or Play Store settings.
              Payment will be charged to your Apple ID or Google Play account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
