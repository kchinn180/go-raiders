/**
 * RewardedAdButton
 *
 * "Watch an ad to skip 5 spots" button shown inside QueueStatusModal.
 * Only rendered for free users with a queue position > 1.
 *
 * Calls showRewardedAd() and on success fires onRewardEarned() which
 * the parent uses to call the /api/queue/reward-skip endpoint.
 */

import { useState } from "react";
import { PlayCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showRewardedAd } from "@/lib/ad-service";
import { triggerNotification, triggerImpact } from "@/lib/haptics";

interface RewardedAdButtonProps {
  userId: string;
  /** How many positions the user will skip on ad completion */
  queueSkip: number;
  /** Called after a successful full ad watch */
  onRewardEarned: () => void;
  className?: string;
}

type State = "idle" | "loading" | "earned" | "failed";

export function RewardedAdButton({
  userId,
  queueSkip,
  onRewardEarned,
  className,
}: RewardedAdButtonProps) {
  const [state, setState] = useState<State>("idle");

  const handlePress = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      const earned = await showRewardedAd(userId);
      if (earned) {
        setState("earned");
        triggerNotification("success");
        triggerImpact("medium");
        onRewardEarned();
        // Reset after 3 s so the user can watch another ad
        setTimeout(() => setState("idle"), 3000);
      } else {
        setState("failed");
        setTimeout(() => setState("idle"), 2000);
      }
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  return (
    <Button
      onClick={handlePress}
      disabled={state === "loading" || state === "earned"}
      className={cn(
        "w-full py-4 text-sm font-bold rounded-xl transition-all",
        state === "earned"
          ? "bg-green-600/20 border border-green-500/50 text-green-400"
          : state === "failed"
            ? "bg-red-600/20 border border-red-500/50 text-red-400"
            : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white",
        className,
      )}
      data-testid="button-watch-ad"
    >
      {state === "loading" ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading ad…
        </>
      ) : state === "earned" ? (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          +{queueSkip} spots earned!
        </>
      ) : state === "failed" ? (
        "No ad available — try again"
      ) : (
        <>
          <PlayCircle className="w-4 h-4 mr-2" />
          Watch an ad · Skip {queueSkip} spots
        </>
      )}
    </Button>
  );
}
