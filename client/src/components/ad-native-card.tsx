/**
 * AdNativeCard
 *
 * A sponsored card that slots into the JoinFeed between lobby cards.
 * On native (iOS) it's a placeholder that AdMob's native ad SDK will
 * populate.  On web it renders a clearly-labelled mock for layout testing.
 *
 * The parent (JoinFeed) decides how often to inject these — determined by
 * the "native_card.frequency" ad config (default: every 5 lobbies).
 */

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

interface AdNativeCardProps {
  userId: string;
  /** Called with the server-issued impressionId after the ad is visible */
  onImpression?: (impressionId: string) => void;
}

const IS_NATIVE = Capacitor.isNativePlatform();

export function AdNativeCard({ userId, onImpression }: AdNativeCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "relative w-full rounded-xl overflow-hidden border border-card-border bg-card",
        "animate-in fade-in slide-in-from-bottom-2 duration-300"
      )}
      data-testid="ad-native-card"
    >
      {/* "Sponsored" label */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-card/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
          Sponsored
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
        aria-label="Close ad"
        data-testid="button-dismiss-ad"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>

      {IS_NATIVE ? (
        /**
         * On native: this div is the AdMob "native ad view" container.
         * The AdMob SDK will populate it after the component mounts.
         * You will need the @capacitor-community/admob native ad API
         * (currently in beta) to bind an ad view to this element.
         *
         * For now this renders a placeholder; replace with the native
         * ad binding call when the API stabilises.
         */
        <div
          id="admob-native-ad"
          className="w-full h-24 flex items-center justify-center bg-muted/30"
        >
          <span className="text-xs text-muted-foreground">Ad loading…</span>
        </div>
      ) : (
        /* Web / dev preview */
        <div className="flex items-center gap-3 p-3 pt-7">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎮</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">Level up your game</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Discover the best accessories and apps for Pokémon GO trainers.
            </p>
          </div>
          <button className="flex-shrink-0 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
            <ExternalLink className="w-3 h-3" />
            Learn More
          </button>
        </div>
      )}
    </div>
  );
}
