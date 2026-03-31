import { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Clock, Loader2, CheckCircle, XCircle, Crown, Zap, Info, Bell, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { apiRequest } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { QueueStatus } from "@shared/schema";
import { triggerNotification, triggerImpact } from "@/lib/haptics";
import { playRewardSound } from "@/lib/sounds";
import { useUser } from "@/lib/user-context";
import { purchaseSubscription, fetchProducts } from "@/lib/subscription";
import { PokemonDetailsModal } from "@/components/pokemon-details-modal";

interface QueueStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  bossId: string;
  onMatched?: (lobbyId: string) => void;
}

const RESERVATION_TIMEOUT_MS = 20_000;

export function QueueStatusModal({
  isOpen,
  onClose,
  userId,
  bossId,
  onMatched,
}: QueueStatusModalProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [hasNotifiedMatch, setHasNotifiedMatch] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showBossInfo, setShowBossInfo] = useState(false);
  const [prevPosition, setPrevPosition] = useState<number | null>(null);
  const [positionChanged, setPositionChanged] = useState(false);
  // Countdown for reservation
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMatchedRef = useRef(onMatched);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onMatchedRef.current = onMatched;
  }, [onMatched]);

  // ── WebSocket: subscribe to queue channel and listen for promotions ──
  useEffect(() => {
    if (!isOpen || !userId || !bossId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe_queue", bossId, userId }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === "queue_update") {
          // Refresh our status query
          queryClient.invalidateQueries({ queryKey: ["/api/queue/status", userId, bossId] });
        }

        if (msg.type === "queue_promotion" && msg.data?.bossId === bossId) {
          // We got a slot reserved — sound + haptic + UI update
          triggerNotification("success");
          playRewardSound();
          queryClient.invalidateQueries({ queryKey: ["/api/queue/status", userId, bossId] });
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.send(JSON.stringify({ type: "unsubscribe_queue" }));
        ws.close();
      }
      wsRef.current = null;
    };
  }, [isOpen, userId, bossId, queryClient]);

  // ── Heartbeat: tell server we're still alive every 10s ──
  useEffect(() => {
    if (!isOpen || !userId || !bossId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/queue/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, bossId }),
        });
      } catch {}
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isOpen, userId, bossId]);

  // ── Poll queue status every 5s as a reliable fallback ──
  const { data: status, isLoading } = useQuery<QueueStatus>({
    queryKey: ["/api/queue/status", userId, bossId],
    enabled: isOpen && !!userId && !!bossId,
    refetchInterval: 5000,
  });

  // ── Track position changes for animation + haptics ──
  useEffect(() => {
    if (!status) return;
    if (prevPosition !== null && status.position < prevPosition) {
      setPositionChanged(true);
      triggerImpact("medium");
      setTimeout(() => setPositionChanged(false), 600);
    }
    setPrevPosition(status.position);
  }, [status?.position]);

  // ── Reservation countdown timer ──
  useEffect(() => {
    if (status?.reserved && status.reservationExpiresAt) {
      const updateCountdown = () => {
        const left = Math.max(0, Math.ceil((status.reservationExpiresAt! - Date.now()) / 1000));
        setReservationSecondsLeft(left);
      };
      updateCountdown();
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(updateCountdown, 250);
    } else {
      setReservationSecondsLeft(null);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status?.reserved, status?.reservationExpiresAt]);

  // ── Auto-navigate when matched ──
  useEffect(() => {
    if (status?.status === "matched" && status.matchedLobbyId && !hasNotifiedMatch) {
      setHasNotifiedMatch(true);
      triggerNotification("success");
      playRewardSound();
      if (onMatchedRef.current) {
        onMatchedRef.current(status.matchedLobbyId);
      }
    }
  }, [status, hasNotifiedMatch]);

  // ── Reset on close ──
  useEffect(() => {
    if (!isOpen) {
      setHasNotifiedMatch(false);
      setShowBossInfo(false);
      setPrevPosition(null);
      setPositionChanged(false);
      setReservationSecondsLeft(null);
    }
  }, [isOpen]);

  // ── Mutations ──
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/queue/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bossId }),
      });
      if (!response.ok) throw new Error("Failed to leave queue");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/user"] });
      triggerImpact("light");
      onClose();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/queue/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bossId }),
      });
      if (!response.ok) throw new Error("Reservation expired");
      return response.json() as Promise<{ lobbyId: string }>;
    },
    onSuccess: (data) => {
      triggerNotification("success");
      playRewardSound();
      queryClient.invalidateQueries({ queryKey: ["/api/queue/status"] });
      if (onMatchedRef.current) {
        onMatchedRef.current(data.lobbyId);
      }
      onClose();
    },
    onError: () => {
      // Reservation expired — refresh status
      queryClient.invalidateQueries({ queryKey: ["/api/queue/status", userId, bossId] });
      triggerNotification("error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/queue/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bossId }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue/status"] });
      triggerImpact("light");
      onClose();
    },
  });

  const handleUpgrade = async () => {
    if (!user?.id) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const products = await fetchProducts();
      const monthlyProduct = products.find((p) => p.id === "elite_monthly");
      if (!monthlyProduct) {
        setPurchaseError("Unable to load subscription options");
        return;
      }
      const result = await purchaseSubscription(user.id, monthlyProduct);
      if (result.success && result.isPremium) {
        triggerNotification("success");
        playRewardSound();
        queryClient.invalidateQueries({ queryKey: ["/api/queue/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      } else if (result.error) {
        setPurchaseError(result.error);
      }
    } catch {
      setPurchaseError("Purchase failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const boss = BOSSES.find((b) => b.id === bossId);

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes}m`;
  };

  if (!isOpen) return null;

  // ── Reservation state ──
  if (status?.reserved) {
    const urgentColor =
      reservationSecondsLeft !== null && reservationSecondsLeft <= 10
        ? "text-red-400"
        : "text-amber-400";
    const progressPct =
      reservationSecondsLeft !== null
        ? (reservationSecondsLeft / (RESERVATION_TIMEOUT_MS / 1000)) * 100
        : 100;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-card border border-amber-500/50 rounded-3xl p-6 animate-in zoom-in-95 duration-300 mx-4 shadow-2xl shadow-amber-500/20">
          {/* Pulsing border ring */}
          <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/60 animate-pulse pointer-events-none" />

          <div className="text-center mb-5">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Bell className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-amber-400">YOU'RE UP!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              A slot just opened for{" "}
              <span className="font-bold text-foreground">{boss?.name || bossId}</span>
            </p>
          </div>

          {/* Countdown ring */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" strokeWidth="6" stroke="currentColor" className="text-muted/30" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  strokeWidth="6"
                  stroke="currentColor"
                  className={urgentColor}
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.25s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-black tabular-nums ${urgentColor}`}>
                  {reservationSecondsLeft ?? "–"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">seconds to respond</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              data-testid="button-accept-reservation"
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              JOIN NOW
            </Button>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="outline"
              className="w-full py-4 border-muted-foreground/30 text-muted-foreground"
              data-testid="button-reject-reservation"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Skip / Pass
            </Button>
          </div>
        </div>

        <PokemonDetailsModal
          pokemonId={bossId}
          isOpen={showBossInfo}
          onClose={() => setShowBossInfo(false)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-card border border-card-border rounded-3xl p-6 animate-in zoom-in-95 duration-300 mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          data-testid="button-close-queue-status"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading queue status...</p>
          </div>
        ) : status?.status === "matched" ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-green-500 mb-2">MATCHED!</h2>
            <p className="text-muted-foreground mb-6">
              You've been placed in a raid lobby!
            </p>
            <Button
              onClick={onClose}
              className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600"
              data-testid="button-go-to-lobby"
            >
              GO TO LOBBY
            </Button>
          </div>
        ) : status?.status === "cancelled" || status?.status === "expired" || !status ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Not in Queue</h2>
            <p className="text-muted-foreground mb-6">
              {status?.status === "expired"
                ? "You were removed for inactivity."
                : "You're no longer in the queue for this boss."}
            </p>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              data-testid="button-close-cancelled"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Boss header */}
            <div className="text-center mb-5">
              {boss && (
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <SafeImage
                    src={boss.image}
                    alt={boss.name}
                    className="w-full h-full object-contain"
                    fallbackChar={boss.name[0]}
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    TIER {boss.tier}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-black">{status?.bossName || boss?.name}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setShowBossInfo(true)}
                  data-testid="button-boss-info"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>

            {/* Position display */}
            <div className={`rounded-2xl p-6 mb-5 border transition-all duration-300 ${
              status?.isAlmostUp
                ? "bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/50"
                : "bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30"
            }`}>
              {status?.isAlmostUp && (
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Almost Your Turn!
                  </span>
                </div>
              )}
              <div className="text-center">
                <div
                  className={`text-6xl font-black mb-2 transition-all duration-300 ${
                    positionChanged ? "scale-110" : "scale-100"
                  } ${status?.isAlmostUp ? "text-amber-400" : "text-indigo-400"}`}
                  data-testid="text-queue-position"
                >
                  #{status?.position || 1}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span data-testid="text-queue-total">{status?.totalInQueue || 1} in queue</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span data-testid="text-estimated-wait">{formatWaitTime(status?.estimatedWaitSeconds || 0)} wait</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & actions */}
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Searching for lobbies...</p>
                    <p className="text-xs text-muted-foreground">
                      You'll be notified when a slot opens
                    </p>
                  </div>
                </div>
              </div>

              {/* Elite upsell for free users not at position 1 */}
              {!user?.isPremium && (status?.position || 1) > 1 && (
                <>
                  <Button
                    onClick={handleUpgrade}
                    disabled={isPurchasing}
                    className="w-full py-5 text-base font-black rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-black border-2 border-amber-300 shadow-lg shadow-amber-500/30"
                    data-testid="button-upgrade-elite"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="w-5 h-5 mr-2" />
                        SKIP THE LINE — $6.99/mo
                        <Zap className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-amber-500/80">
                    {purchaseError || "Elite members get priority queue access"}
                  </p>
                </>
              )}

              <Button
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                variant="outline"
                className="w-full py-4 border-red-500/50 text-red-500 hover:bg-red-500/10"
                data-testid="button-leave-queue"
              >
                {leaveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Leave Queue
              </Button>
            </div>
          </>
        )}
      </div>

      <PokemonDetailsModal
        pokemonId={bossId}
        isOpen={showBossInfo}
        onClose={() => setShowBossInfo(false)}
      />
    </div>
  );
}
