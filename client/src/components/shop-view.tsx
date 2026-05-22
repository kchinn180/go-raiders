import { Crown, Zap, Radar, Users, Star, Clock, ShieldCheck, EyeOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { loadNativeProductPrices, REMOVE_ADS_PRODUCT } from "@/lib/subscription";

interface ShopViewProps {
  onUpgrade: () => void;
  onRemoveAds: () => void;
}

const features = [
  {
    icon: Radar,
    title: "Auto Join",
    description: "Automatically find & join raids for your target boss",
  },
  {
    icon: Clock,
    title: "No Wait Time",
    description: "Skip the 10-second delay on new lobbies",
  },
  {
    icon: Users,
    title: "Priority Queue",
    description: "Get placed first in popular raid lobbies",
  },
  {
    icon: Star,
    title: "Host Ratings",
    description: "See detailed host ratings before joining",
  },
  {
    icon: ShieldCheck,
    title: "Verified Badge",
    description: "Show others you're a trusted raider",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get alerted the moment your target boss appears",
  },
];

export function ShopView({ onUpgrade, onRemoveAds }: ShopViewProps) {
  const { user } = useUser();
  const hasRemovedAds = (user?.subscription as any)?.hasRemovedAds === true;

  // Load real prices from native StoreKit / Play Billing
  const [removeAdsPrice, setRemoveAdsPrice] = useState<string | null>(null);
  useEffect(() => {
    loadNativeProductPrices([REMOVE_ADS_PRODUCT.appleProductId])
      .then((prices) => {
        const p = prices.get(REMOVE_ADS_PRODUCT.appleProductId);
        if (p?.price) setRemoveAdsPrice(p.price);
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  return (
    <div className="p-4 space-y-6 pb-nav">
      <div className="text-center relative">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black">GO Raiders Elite</h2>
        <p className="text-muted-foreground">Unlock the ultimate raid experience</p>
      </div>

      {user?.isPremium ? (
        <Card className="p-6 text-center border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-amber-500" />
            <span className="font-black text-xl">You're Elite!</span>
          </div>
          <p className="text-muted-foreground text-sm">
            You have access to all premium features
          </p>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
          <div className="text-center mb-4">
            <div className="text-4xl font-black mb-1">$12.99</div>
            <div className="text-muted-foreground text-sm">per month</div>
          </div>
          <Button
            onClick={onUpgrade}
            className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            data-testid="button-upgrade-elite"
          >
            <Crown className="w-5 h-5 mr-2" />
            UPGRADE TO ELITE
          </Button>
        </Card>
      )}

      {/* Remove Ads — One-Time Purchase (always visible so non-Elite users can find it) */}
      <Card className={cn(
        "p-4",
        hasRemovedAds || user?.isPremium
          ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10"
          : "border-border bg-muted/20"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            hasRemovedAds || user?.isPremium ? "bg-green-500/20" : "bg-muted"
          )}>
            {hasRemovedAds || user?.isPremium
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <EyeOff className="w-5 h-5 text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Remove Ads</h3>
              {(hasRemovedAds || user?.isPremium) && (
                <span className="text-xs font-bold text-green-500 bg-green-500/15 px-2 py-0.5 rounded-full">
                  {user?.isPremium && !hasRemovedAds ? "Included with Elite" : "Purchased"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.isPremium
                ? "No ads — included with your Elite subscription"
                : hasRemovedAds
                ? "All ads have been permanently removed"
                : "One-time purchase — permanently remove all ads"}
            </p>
          </div>
          {!hasRemovedAds && !user?.isPremium && (
            <Button
              onClick={onRemoveAds}
              variant="outline"
              size="sm"
              className="shrink-0 font-bold border-2 text-sm px-3 border-amber-500 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-300"
              data-testid="button-remove-ads"
            >
              {removeAdsPrice ?? `$${REMOVE_ADS_PRODUCT.price.toFixed(2)}`}
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
          Elite Features
        </h3>
        <div className="grid gap-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={i}
                className={cn(
                  "p-4 flex items-start gap-4",
                  user?.isPremium && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    user?.isPremium
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
