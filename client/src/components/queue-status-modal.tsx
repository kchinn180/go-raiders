import { useState, useEffect, useRef } from "react";
import { X, Users, Clock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { apiRequest } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { QueueStatus } from "@shared/schema";
import { triggerNotification, triggerImpact } from "@/lib/haptics";
import { playRewardSound } from "@/lib/sounds";

interface QueueStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  bossId: string;
  onMatched?: (lobbyId: string) => void;
}

export function QueueStatusModal({ 
  isOpen, 
  onClose, 
  userId, 
  bossId,
  onMatched 
}: QueueStatusModalProps) {
  const queryClient = useQueryClient();
  const [hasNotifiedMatch, setHasNotifiedMatch] = useState(false);
  const onMatchedRef = useRef(onMatched);
  
  useEffect(() => {
    onMatchedRef.current = onMatched;
  }, [onMatched]);

  const boss = BOSSES.find(b => b.id === bossId);

  const { data: status, isLoading } = useQuery<QueueStatus>({
    queryKey: ['/api/queue/status', userId, bossId],
    enabled: isOpen && !!userId && !!bossId,
    refetchInterval: 3000,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/queue/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bossId }),
      });
      if (!response.ok) throw new Error('Failed to leave queue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/queue/user'] });
      triggerImpact('light');
      onClose();
    },
  });

  useEffect(() => {
    if (status?.status === 'matched' && status.matchedLobbyId && !hasNotifiedMatch) {
      setHasNotifiedMatch(true);
      triggerNotification('success');
      playRewardSound();
      if (onMatchedRef.current) {
        onMatchedRef.current(status.matchedLobbyId);
      }
    }
  }, [status, hasNotifiedMatch]);

  useEffect(() => {
    if (!isOpen) {
      setHasNotifiedMatch(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes}m`;
  };

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
        ) : status?.status === 'matched' ? (
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
        ) : status?.status === 'cancelled' || !status ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Not in Queue</h2>
            <p className="text-muted-foreground mb-6">
              You're no longer in the queue for this boss.
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
            <div className="text-center mb-6">
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
              <h2 className="text-xl font-black">{status?.bossName || boss?.name}</h2>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl p-6 mb-6 border border-indigo-500/30">
              <div className="text-center">
                <div className="text-6xl font-black text-indigo-400 mb-2">
                  #{status?.position || 1}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{status?.totalInQueue || 1} in queue</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatWaitTime(status?.estimatedWaitSeconds || 0)} wait</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div>
                    <p className="font-semibold text-sm">Searching for lobbies...</p>
                    <p className="text-xs text-muted-foreground">
                      You'll be auto-placed when a spot opens
                    </p>
                  </div>
                </div>
              </div>

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
    </div>
  );
}
