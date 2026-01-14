import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Sparkles } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import { triggerImpact } from "@/lib/haptics";
import type { RaidBoss, QueueStatus } from "@shared/schema";

interface QueueBossBarProps {
  userId: string;
  userName: string;
  userLevel: number;
  userTeam: 'valor' | 'mystic' | 'instinct' | 'neutral';
  friendCode: string;
  isPremium: boolean;
  onQueueJoined: (bossId: string) => void;
}

export function QueueBossBar({
  userId,
  userName,
  userLevel,
  userTeam,
  friendCode,
  isPremium,
  onQueueJoined,
}: QueueBossBarProps) {
  const queryClient = useQueryClient();
  const [joiningBossId, setJoiningBossId] = useState<string | null>(null);

  const { data: activeBosses, isLoading: loadingBosses } = useQuery<RaidBoss[]>({
    queryKey: ['/api/bosses/active'],
  });

  const { data: queueCounts } = useQuery<Record<string, number>>({
    queryKey: ['/api/queue/counts'],
    queryFn: async () => {
      const response = await fetch('/api/queue/counts');
      if (!response.ok) return {};
      return response.json();
    },
    refetchInterval: 5000,
  });

  const { data: userQueues } = useQuery<QueueStatus[]>({
    queryKey: ['/api/queue/user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/queue/user/${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const joinQueueMutation = useMutation({
    mutationFn: async (bossId: string) => {
      setJoiningBossId(bossId);
      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bossId,
          userId,
          userName,
          userLevel,
          userTeam,
          friendCode,
          isPremium,
        }),
      });
      if (!response.ok) throw new Error('Failed to join queue');
      return response.json() as Promise<QueueStatus>;
    },
    onSuccess: (status) => {
      triggerImpact('medium');
      queryClient.invalidateQueries({ queryKey: ['/api/queue/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/queue/counts'] });
      onQueueJoined(status.bossId);
      setJoiningBossId(null);
    },
    onError: () => {
      setJoiningBossId(null);
    },
  });

  const isInQueue = (bossId: string) => {
    return userQueues?.some(q => q.bossId === bossId && q.status === 'waiting');
  };

  const getQueuePosition = (bossId: string) => {
    const queue = userQueues?.find(q => q.bossId === bossId && q.status === 'waiting');
    return queue?.position;
  };

  if (loadingBosses) {
    return (
      <div className="flex items-center justify-center h-28 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-2xl">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    );
  }

  if (!activeBosses?.length) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 rounded-2xl p-3 space-y-2 border border-indigo-500/30">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/80" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">Auto Join Queue</span>
        </div>
        {isPremium && (
          <div className="flex items-center gap-1 bg-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            PRIORITY
          </div>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {activeBosses.map((boss) => {
          const inQueue = isInQueue(boss.id);
          const position = getQueuePosition(boss.id);
          const isJoining = joiningBossId === boss.id;
          const waitingCount = queueCounts?.[boss.id] || 0;
          
          return (
            <button
              key={boss.id}
              onClick={() => {
                if (!inQueue && !isJoining) {
                  joinQueueMutation.mutate(boss.id);
                }
              }}
              disabled={isJoining}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all min-w-[80px]",
                inQueue 
                  ? "bg-green-500/30 border-2 border-green-500 shadow-lg shadow-green-500/20" 
                  : "bg-white/10 border-2 border-transparent hover:bg-white/20 active:scale-95",
                isJoining && "opacity-60"
              )}
              data-testid={`queue-boss-${boss.id}`}
            >
              <div className="relative">
                <SafeImage
                  src={boss.image}
                  alt={boss.name}
                  className="w-14 h-14 rounded-lg"
                  fallbackChar={boss.name[0]}
                />
                {inQueue && position && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-green-300 shadow-lg">
                    <span className="text-[10px] font-black text-white">#{position}</span>
                  </div>
                )}
                {isJoining && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <span className="text-[10px] text-white font-semibold truncate max-w-[72px] text-center leading-tight">
                {boss.name.replace('(', '\n(').split('\n')[0]}
              </span>
              
              <div className={cn(
                "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold",
                inQueue 
                  ? "bg-green-500 text-white" 
                  : waitingCount > 0 
                    ? "bg-blue-500/30 text-blue-300"
                    : "bg-white/20 text-white/70"
              )}>
                <Users className="w-2.5 h-2.5" />
                <span>
                  {inQueue 
                    ? `#${position}` 
                    : waitingCount > 0 
                      ? `${waitingCount} waiting`
                      : "Join"
                  }
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="text-[10px] text-white/50 text-center px-2">
        Tap a Pokémon to join the queue. You'll be matched to a raid automatically when available.
      </p>
    </div>
  );
}
