/**
 * CatchLogModal  — premium feature
 *
 * Shown to premium users right after a raid starts (when the host fires invites).
 * Lets them record: did they catch it? what CP? was it shiny?
 * Non-intrusive — auto-dismisses after 60 s if ignored.
 */

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Sparkles, Star, X, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/queryClient";
import { triggerNotification, triggerImpact } from "@/lib/haptics";
import { SafeImage } from "@/components/safe-image";
import { BOSSES } from "@shared/schema";

interface CatchLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  bossId: string;
  lobbyId: string;
}

const AUTO_DISMISS_S = 60;

export function CatchLogModal({ isOpen, onClose, userId, bossId, lobbyId }: CatchLogModalProps) {
  const [caught, setCaught] = useState<boolean | null>(null);
  const [isShiny, setIsShiny] = useState(false);
  const [cp, setCp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_S);

  const boss = BOSSES.find(b => b.id === bossId);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!isOpen || submitted) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, submitted, onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) { setCaught(null); setIsShiny(false); setCp(""); setSubmitted(false); setSecondsLeft(AUTO_DISMISS_S); }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (caught === null) return;
    try {
      await fetch(getApiUrl("/api/catch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          bossId,
          bossName: boss?.name || bossId,
          lobbyId,
          caught,
          cp: cp ? Number(cp) : undefined,
          isShiny,
        }),
      });
      triggerNotification("success");
      if (isShiny) triggerImpact("heavy");
      setSubmitted(true);
      setTimeout(onClose, 1800);
    } catch { onClose(); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center pb-8 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        "relative w-full max-w-sm rounded-3xl p-5 animate-in slide-in-from-bottom-4 duration-300",
        isShiny
          ? "bg-gradient-to-br from-amber-900/90 to-yellow-900/90 border border-amber-500/50"
          : "bg-card border border-card-border"
      )}>
        {/* Dismiss */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground">
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            {isShiny ? (
              <>
                <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-pulse" />
                <p className="text-xl font-black text-amber-400">✨ SHINY LOGGED!</p>
              </>
            ) : caught ? (
              <>
                <Trophy className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-lg font-black text-green-400">Catch logged!</p>
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-lg font-bold text-muted-foreground">Logged — better luck next time</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {boss && (
                <SafeImage src={boss.image} alt={boss.name} className="w-12 h-12 object-contain" fallbackChar={boss.name[0]} />
              )}
              <div className="flex-1">
                <p className="font-black text-base">{boss?.name || bossId}</p>
                <p className="text-xs text-muted-foreground">Did you catch it?</p>
              </div>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">{secondsLeft}s</span>
            </div>

            {/* Caught? */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => { setCaught(true); triggerImpact("light"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all",
                  caught === true
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-card border-card-border text-muted-foreground"
                )}
              >
                <CheckCircle className="w-4 h-4" /> Caught!
              </button>
              <button
                onClick={() => { setCaught(false); setIsShiny(false); triggerImpact("light"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all",
                  caught === false
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-card border-card-border text-muted-foreground"
                )}
              >
                <XCircle className="w-4 h-4" /> Fled
              </button>
            </div>

            {caught === true && (
              <div className="space-y-3 mb-4">
                {/* CP input */}
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">CP (optional)</label>
                  <input
                    type="number"
                    value={cp}
                    onChange={e => setCp(e.target.value)}
                    placeholder="e.g. 2387"
                    className="w-full bg-muted border border-card-border rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                {/* Shiny toggle */}
                <button
                  onClick={() => { setIsShiny(s => !s); if (!isShiny) triggerImpact("heavy"); }}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all",
                    isShiny
                      ? "bg-amber-500/20 border-amber-400 text-amber-400 animate-pulse"
                      : "bg-card border-card-border text-muted-foreground"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {isShiny ? "✨ SHINY!" : "Mark as Shiny"}
                </button>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={caught === null}
              className="w-full py-4 font-black rounded-xl"
            >
              <Star className="w-4 h-4 mr-2" />
              Save to Raid Log
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
