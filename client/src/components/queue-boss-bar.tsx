/**
 * QueueBossBar — Pokégenie-style boss selection row
 *
 * Shows all active raid bosses as a horizontal scrollable row of circles.
 * Each card shows:
 *   - Boss portrait in a circle with a tier-coloured gradient ring
 *   - Boss name
 *   - 🚪 open lobby count (green)  +  👥 queue count (blue)
 *
 * Tapping a card either joins the queue for that boss (if not already queued)
 * or opens the QueueStatusModal (if already queued).
 *
 * Users can only be in one queue at a time.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, DoorOpen, Users } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import { triggerImpact } from "@/lib/haptics";
import { getApiUrl } from "@/lib/queryClient";
import { ALL_BOSSES } from "@shared/schema";
import type { RaidBoss, QueueStatus, Lobby } from "@shared/schema";

// Mirror of server/storage.ts DEFAULT_ACTIVE_BOSS_IDS — used as client-side fallback
// when the /api/bosses/active endpoint is unreachable or returns an empty array.
const FALLBACK_BOSS_IDS = [
  'nihilego', 'tapu-bulu', 'tapu-fini',
  'shadow-cresselia',
  'mega-camerupt', 'mega-glalie', 'mega-altaria', 'mega-medicham',
  'nidoqueen', 'starmie', 'druddigon',
  'hisuian-voltorb', 'bagon', 'shieldon', 'espurr', 'shadow-larvitar',
];

const now = Date.now();
const FALLBACK_BOSSES: RaidBoss[] = ALL_BOSSES
  .filter(b => FALLBACK_BOSS_IDS.includes(b.id))
  .map(b => ({ ...b, isActive: true, startTime: now, endTime: now + 7 * 24 * 60 * 60 * 1000 }));

interface QueueBossBarProps {
  userId: string;
  userName: string;
  userLevel: number;
  userTeam: 'valor' | 'mystic' | 'instinct' | 'neutral';
  friendCode: string;
  isPremium: boolean;
  onQueueJoined: (bossId: string) => void;
}

/** Gradient ring colour based on boss tier / type */
function tierRingStyle(boss: RaidBoss): string {
  if (boss.isDynamax) return "from-red-500 via-red-400 to-rose-600";
  if (boss.isShadow)  return "from-purple-700 via-indigo-500 to-purple-900";
  if (boss.name.toLowerCase().includes("mega")) return "from-orange-400 via-yellow-400 to-orange-600";
  if (boss.tier === 5) return "from-violet-500 via-purple-400 to-fuchsia-600";
  if (boss.tier === 3) return "from-blue-500 via-cyan-400 to-blue-600";
  return "from-green-500 via-emerald-400 to-teal-500"; // tier 1 / other
}

/** Short display name — strip "(Mega )" prefix clutter, keep it tight */
function shortName(name: string): string {
  // "Mega Rayquaza" → "M.Rayquaza"; "Shadow Mewtwo" → keep as is
  if (name.startsWith("Mega "))   return "M." + name.slice(5);
  if (name.startsWith("Shadow ")) return "S." + name.slice(7);
  if (name.length > 11)           return name.slice(0, 10) + "…";
  return name;
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

  // Active bosses list — falls back to local FALLBACK_BOSSES on any error
  const { data: activeBosses, isLoading: loadingBosses } = useQuery<RaidBoss[]>({
    queryKey: ['/api/bosses/active'],
    queryFn: async () => {
      try {
        const r = await fetch(getApiUrl('/api/bosses/active'));
        if (!r.ok) return FALLBACK_BOSSES;
        const data: RaidBoss[] = await r.json();
        return data?.length ? data : FALLBACK_BOSSES;
      } catch {
        return FALLBACK_BOSSES;
      }
    },
    staleTime: 0,
    refetchInterval: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // Queue counts per boss (people waiting)
  const { data: queueCounts } = useQuery<Record<string, number>>({
    queryKey: ['/api/queue/counts'],
    queryFn: async () => {
      const r = await fetch(getApiUrl('/api/queue/counts'));
      if (!r.ok) return {};
      return r.json();
    },
    refetchInterval: 5000,
  });

  // Current lobbies — used to compute open slot counts per boss
  const { data: lobbies } = useQuery<Lobby[]>({
    queryKey: ['/api/lobbies'],
    refetchInterval: 10000,
  });

  // This user's active queues
  const { data: userQueues } = useQuery<QueueStatus[]>({
    queryKey: ['/api/queue/user', userId],
    queryFn: async () => {
      const r = await fetch(getApiUrl(`/api/queue/user/${userId}`));
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  // Open lobby count per boss (lobbies with space and not started)
  const openLobbyCounts: Record<string, number> = {};
  if (lobbies) {
    for (const l of lobbies) {
      if (!l.raidStarted && l.players.length < l.maxPlayers) {
        openLobbyCounts[l.bossId] = (openLobbyCounts[l.bossId] || 0) + 1;
      }
    }
  }

  const joinQueueMutation = useMutation({
    mutationFn: async (bossId: string) => {
      setJoiningBossId(bossId);
      const r = await fetch(getApiUrl('/api/queue/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bossId, userId, userName, userLevel, userTeam, friendCode, isPremium }),
      });
      if (!r.ok) throw new Error('Failed to join queue');
      return r.json() as Promise<QueueStatus>;
    },
    onSuccess: (status) => {
      triggerImpact('medium');
      queryClient.invalidateQueries({ queryKey: ['/api/queue/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/queue/counts'] });
      onQueueJoined(status.bossId);
      setJoiningBossId(null);
    },
    onError: () => setJoiningBossId(null),
  });

  const isInQueue    = (bossId: string) => userQueues?.some(q => q.bossId === bossId && q.status === 'waiting');
  const getPosition  = (bossId: string) => userQueues?.find(q => q.bossId === bossId && q.status === 'waiting')?.position;
  const isInAnyQueue = userQueues?.some(q => q.status === 'waiting');

  if (loadingBosses) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Raid Bosses</span>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-2 bg-muted rounded animate-pulse" />
              <div className="w-10 h-2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Always have something to show — fall back to the hardcoded list if the query
  // returned empty (e.g. server cold-start, network blip, etc.)
  const displayBosses = activeBosses?.length ? activeBosses : FALLBACK_BOSSES;

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">
            Current Raid Bosses
          </span>
        </div>
        {isInAnyQueue && (
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">
            In Queue
          </span>
        )}
      </div>

      {/* Boss row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-4 pt-1">
        {displayBosses.map((boss) => {
          const inQueue    = isInQueue(boss.id);
          const position   = getPosition(boss.id);
          const isJoining  = joiningBossId === boss.id;
          const openCount  = openLobbyCounts[boss.id] || 0;
          const waitCount  = queueCounts?.[boss.id] || 0;
          const canJoin    = !isInAnyQueue && !isJoining;
          const disabled   = isInAnyQueue && !inQueue;

          return (
            <button
              key={boss.id}
              onClick={() => {
                if (inQueue) {
                  onQueueJoined(boss.id);
                } else if (canJoin) {
                  joinQueueMutation.mutate(boss.id);
                }
              }}
              disabled={isJoining || disabled}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1 min-w-[72px] transition-all",
                disabled ? "opacity-35 cursor-not-allowed" : "active:scale-95"
              )}
              data-testid={`queue-boss-${boss.id}`}
            >
              {/* Circle portrait with gradient ring */}
              <div className={cn(
                "relative p-[3px] rounded-full bg-gradient-to-br",
                tierRingStyle(boss),
                inQueue && "ring-2 ring-green-400 ring-offset-2 ring-offset-card"
              )}>
                <div className="w-14 h-14 rounded-full bg-card overflow-hidden flex items-center justify-center">
                  {isJoining ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <SafeImage
                      src={boss.image}
                      alt={boss.name}
                      className="w-12 h-12 object-contain"
                      fallbackChar={boss.name[0]}
                    />
                  )}
                </div>
                {/* Queue position badge */}
                {inQueue && position && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-card shadow">
                    <span className="text-[9px] font-black text-white leading-none">{position}</span>
                  </div>
                )}
              </div>

              {/* Name */}
              <span className={cn(
                "text-[10px] font-semibold text-center leading-tight max-w-[72px] truncate",
                inQueue ? "text-green-400" : "text-foreground/90"
              )}>
                {shortName(boss.name)}
              </span>

              {/* Stats row: open lobbies + queue count */}
              <div className="flex items-center gap-1.5">
                {/* Open lobbies */}
                <div className={cn(
                  "flex items-center gap-0.5 text-[9px] font-bold",
                  openCount > 0 ? "text-green-400" : "text-muted-foreground/50"
                )}>
                  <DoorOpen className="w-2.5 h-2.5" />
                  <span>{openCount}</span>
                </div>
                <span className="text-muted-foreground/30 text-[9px]">·</span>
                {/* Queue waiters */}
                <div className={cn(
                  "flex items-center gap-0.5 text-[9px] font-bold",
                  waitCount > 0 ? "text-blue-400" : "text-muted-foreground/50"
                )}>
                  <Users className="w-2.5 h-2.5" />
                  <span>{waitCount}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 pb-3 -mt-1">
        <p className="text-[10px] text-muted-foreground text-center">
          {isInAnyQueue
            ? "Tap your queued boss to view position • Leave queue to switch"
            : "Tap a boss to join the queue — your place is saved if you leave the app"}
        </p>
      </div>
    </div>
  );
}
