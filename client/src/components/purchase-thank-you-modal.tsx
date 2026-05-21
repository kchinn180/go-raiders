/**
 * PurchaseThankYouModal
 *
 * Shown immediately after a purchase is verified server-side.
 * Never shown speculatively — only appears on a confirmed `success: true` result
 * from `/api/subscription/verify`.
 *
 * Variants:
 *   'elite'      – subscription purchase ("Elite access is now active")
 *   'remove_ads' – one-time purchase ("Remove Ads has been activated")
 */

import { CheckCircle2, Crown, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export type ThankYouVariant = 'elite' | 'remove_ads';

interface PurchaseThankYouModalProps {
  isOpen: boolean;
  variant: ThankYouVariant;
  onClose: () => void;
}

const CONFIG: Record<ThankYouVariant, {
  icon: React.ElementType;
  iconGradient: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
}> = {
  elite: {
    icon: Crown,
    iconGradient: "from-amber-400 to-orange-600",
    title: "Thank you!",
    subtitle: "Elite access is now active. Enjoy priority queues, auto-join, and all premium features.",
    ctaLabel: "START RAIDING",
  },
  remove_ads: {
    icon: EyeOff,
    iconGradient: "from-emerald-500 to-teal-600",
    title: "Thank you!",
    subtitle: "Remove Ads has been activated. Your app experience is now completely ad-free.",
    ctaLabel: "GOT IT",
  },
};

export function PurchaseThankYouModal({ isOpen, variant, onClose }: PurchaseThankYouModalProps) {
  const [visible, setVisible] = useState(false);

  // Slight delay so the modal animates in after the purchase flow closes
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          relative w-full max-w-sm bg-card border border-card-border
          rounded-t-3xl sm:rounded-3xl p-8 text-center
          transition-all duration-300 ease-out
          ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {/* Icon */}
        <div className={`w-20 h-20 bg-gradient-to-br ${cfg.iconGradient} rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl`}>
          <Icon className="w-10 h-10 text-white" />
        </div>

        {/* Check badge overlay */}
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto -mt-12 mb-4 border-2 border-card shadow-lg relative z-10">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>

        <h2 className="text-3xl font-black mb-2">{cfg.title}</h2>

        {variant === 'elite' && (
          <div className="inline-flex items-center gap-1 mb-4 bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            GO RAIDERS ELITE
          </div>
        )}

        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          {cfg.subtitle}
        </p>

        <Button
          onClick={onClose}
          className={`w-full py-6 text-lg font-black rounded-2xl shadow-lg bg-gradient-to-r ${
            variant === 'elite'
              ? "from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500"
              : "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
          }`}
          data-testid="button-thank-you-close"
        >
          {cfg.ctaLabel}
        </Button>
      </div>
    </div>
  );
}
