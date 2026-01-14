import { useState } from "react";
import { X, Sparkles, Zap, Radar, Users, Star, Clock, ShieldCheck, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { purchaseSubscription, type SubscriptionProduct } from "@/lib/subscription";

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

const ELITE_MONTHLY: SubscriptionProduct = {
  id: 'elite_monthly',
  name: 'Elite Monthly',
  description: 'Premium raid features',
  price: 4.99,
  period: 'monthly',
  appleProductId: 'com.goraiders.elite.monthly',
  googleProductId: 'elite_monthly_subscription',
  features: ['Priority Queue', 'No Wait Time', 'Elite Badge']
};

export function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user, syncPremiumFromServer } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Lock body scroll when modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!user) return;
    
    setIsPurchasing(true);
    try {
      // Initiate purchase through subscription service
      // This goes through the backend for receipt verification
      const result = await purchaseSubscription(user.id, ELITE_MONTHLY);
      
      if (result.success && result.isPremium) {
        // Sync the server-verified premium status to local state
        syncPremiumFromServer(true, {
          status: 'active',
          startDate: Date.now(),
          renewalDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          canceledAt: null,
          plan: 'elite_monthly',
          price: ELITE_MONTHLY.price
        });
        toast({ title: "Welcome to Elite!", description: "You now have access to all premium features" });
        onClose();
      } else {
        toast({ 
          title: "Purchase failed", 
          description: result.error || "Could not complete purchase", 
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
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
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className="text-4xl font-black">${ELITE_MONTHLY.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={isPurchasing}
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
                  UPGRADE NOW
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              In-app purchase. Cancel anytime in App Store or Play Store settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
