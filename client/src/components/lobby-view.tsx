/**
 * LobbyView Component
 * 
 * Displays the lobby view for a raid with player management and coordination.
 * 
 * HOST CAPACITY CONTROL:
 * - Only the host can modify raid capacity (slider visible only to hosts)
 * - Capacity range: 2-10 players (enforced both client and server-side)
 * - Cannot reduce below current player count
 * - Changes are sent to server which validates host permission
 */

import { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  CheckCircle2,
  Users,
  CloudLightning,
  Timer,
  Sparkles,
  Send,
  Flame,
  Shield,
  Zap,
  LogOut,
  Rocket,
  ExternalLink,
  Train,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SafeImage } from "@/components/safe-image";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/user-context";
import { triggerImpact, triggerNotification } from "@/lib/haptics";
import { playRaidCountdown, playReadySound } from "@/lib/sounds";
import { useLobbyWebSocket } from "@/lib/use-lobby-websocket";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TEAMS } from "@shared/schema";
import type { Lobby, PokemonType, CurrentBoss } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { getApiUrl } from "@/lib/queryClient";

const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  normal: { bg: 'bg-gray-400/20', text: 'text-gray-300', border: 'border-gray-400' },
  fire: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  water: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  electric: { bg: 'bg-yellow-400/20', text: 'text-yellow-300', border: 'border-yellow-400' },
  grass: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  ice: { bg: 'bg-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400' },
  fighting: { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600' },
  poison: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  ground: { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-600' },
  flying: { bg: 'bg-indigo-400/20', text: 'text-indigo-300', border: 'border-indigo-400' },
  psychic: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500' },
  bug: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500' },
  rock: { bg: 'bg-stone-500/20', text: 'text-stone-400', border: 'border-stone-500' },
  ghost: { bg: 'bg-violet-600/20', text: 'text-violet-400', border: 'border-violet-600' },
  dragon: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-600' },
  dark: { bg: 'bg-neutral-700/30', text: 'text-neutral-300', border: 'border-neutral-600' },
  steel: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400' },
  fairy: { bg: 'bg-pink-400/20', text: 'text-pink-300', border: 'border-pink-400' }
};

function TypeBadge({ type }: { type: PokemonType }) {
  const colors = TYPE_COLORS[type];
  return (
    <Badge 
      className={cn(
        colors.bg, 
        colors.text, 
        "border",
        colors.border,
        "text-[10px] px-1.5 py-0",
        "font-semibold uppercase"
      )}
    >
      {type}
    </Badge>
  );
}

interface LobbyViewProps {
  lobby: Lobby;
  isHost: boolean;
  onLeave: () => void;
  onUpdateLobby: (lobby: Lobby) => void;
  onStartRaid?: () => void;
}

const teamIcons = {
  valor: Flame,
  mystic: Shield,
  instinct: Zap,
  neutral: Users,
};

export function LobbyView({ lobby, isHost, onLeave, onUpdateLobby, onStartRaid }: LobbyViewProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const lastTimeLeftRef = useRef(lobby.timeLeft);
  const soundPlayedRef = useRef(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // OPTIMISTIC STATE: Track local ready state for instant button feedback
  const [optimisticReady, setOptimisticReady] = useState<boolean | null>(null);
  const [raidTrainLoading, setRaidTrainLoading] = useState(false);

  // Swipe-from-left-edge to open the leave confirmation dialog
  useSwipeBack({
    onBack: () => setLeaveDialogOpen(true),
    threshold: 120, // Slightly higher threshold for destructive action
  });

  // Scroll to top when entering lobby so friend codes are visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Use live boss feed instead of stale static BOSSES list
  const { data: activeBosses = [] } = useQuery<CurrentBoss[]>({
    queryKey: ["/api/bosses/active"],
    staleTime: 60000,
  });
  const boss: CurrentBoss | undefined = activeBosses.find((b) => b.id === lobby.bossId)
    ?? (lobby.bossId ? {
        id: lobby.bossId,
        name: lobby.bossId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        tier: 5, category: "Tier 5", variant: "Normal",
        isShadow: false, isDynamax: false, image: "",
      } : undefined);
  const team = TEAMS.find((t) => t.id === lobby.team) || TEAMS[3];
  
  const hapticEnabled = user?.notifications?.hapticFeedback !== false;
  const soundEnabled = user?.notifications?.soundEffects !== false;
  
  useLobbyWebSocket({
    lobbyId: lobby.id,
    userId: user?.id || '',
    onLobbyUpdate: onUpdateLobby,
    onPlayerReady: (playerId, playerName, isReady) => {
      if (isReady && soundEnabled) {
        playReadySound();
      }
      toast({
        title: isReady ? `${playerName} is ready!` : `${playerName} is no longer ready`,
        duration: 2000,
      });
    },
    onInvitesSent: () => {
      toast({
        title: "Invites Sent!",
        description: "Open Pokémon GO now to accept the raid invite!",
      });
    },
    onPlayerJoined: (playerName) => {
      toast({
        title: `${playerName} joined!`,
        duration: 2000,
      });
    },
    onPlayerLeft: (playerName) => {
      toast({
        title: `${playerName} left the lobby`,
        duration: 2000,
      });
    },
    onLobbyClosed: (reason) => {
      toast({
        title: "Lobby Closed",
        description: reason,
        variant: "destructive",
      });
      // Trigger leave to clean up state
      onLeave();
    },
    hapticEnabled,
  });

  useEffect(() => {
    const allReady = lobby.players.every(p => p.isReady);
    if (allReady && lobby.players.length >= 2 && !soundPlayedRef.current) {
      if (soundEnabled) playRaidCountdown();
      if (hapticEnabled) triggerNotification('success');
      soundPlayedRef.current = true;
      toast({ title: "All players ready!", description: "Raid is about to begin!" });
    }
    if (!allReady) {
      soundPlayedRef.current = false;
    }
  }, [lobby.players, soundEnabled, hapticEnabled]);

  if (!user) return null;
  // boss is always defined via fallback above — never block render
  if (!boss) return null; // TypeScript guard — fallback guarantees this never fires

  const myPlayer = lobby.players.find((p) => p.id === user.id);
  const hostPlayer = lobby.players.find((p) => p.isHost);
  const readyCount = lobby.players.filter((p) => p.isReady).length;
  const allReady = readyCount === lobby.players.length;
  
  // Use optimistic ready state for instant UI feedback, fallback to server state
  const displayReady = optimisticReady !== null ? optimisticReady : (myPlayer?.isReady || false);
  
  // Reset optimistic state when server data catches up
  useEffect(() => {
    if (myPlayer && optimisticReady !== null && myPlayer.isReady === optimisticReady) {
      setOptimisticReady(null);
    }
  }, [myPlayer?.isReady, optimisticReady]);

  const copyCode = async (code: string, playerName: string) => {
    try {
      await navigator.clipboard.writeText(code.replace(/\s/g, ""));
      setCopiedCode(code);
      toast({ title: "Code Copied!", description: `${playerName}'s friend code copied` });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="pb-nav">
      <div
        className={cn(
          "relative flex items-end p-4 bg-gradient-to-b",
          team.gradient
        )}
      >
        <div className="absolute inset-0 bg-black/40" />

        {lobby.weather && (
          <div className="absolute top-4 right-4 z-10 bg-yellow-500/80 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
            <CloudLightning className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-xs">BOOSTED</span>
          </div>
        )}

        <div className="relative z-10 flex items-end gap-4 pt-4 pb-2">
          <SafeImage
            src={boss.image ?? ""}
            alt={boss.name}
            className="w-20 h-20 bg-white/10 rounded-2xl backdrop-blur"
            fallbackChar={boss.name[0]}
          />
          <div className="text-white">
            <h2 className="text-xl font-black">{boss.name}</h2>
            <p className="text-white/80 text-sm">
              {boss.category ?? `Tier ${boss.tier}`}
            </p>
            {'types' in boss && (boss as any).types && (
              <div className="flex gap-1 mt-1">
                {((boss as any).types as string[]).map((type: string) => (
                  <TypeBadge key={type} type={type.toLowerCase() as PokemonType} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time remaining bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/80 border-b border-card-border">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Timer className="w-4 h-4" />
          <span className="font-bold text-sm">{lobby.timeLeft}m remaining</span>
        </div>
        <div className={cn(
          "px-2.5 py-0.5 rounded-full font-bold text-xs",
          allReady ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
        )}>
          {readyCount}/{lobby.players.length} Ready
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ═══════════════════════════════════════════
            JOINER FLOW
            Step 1: Copy host code → Step 2: Add friend in GO →
            Step 3: Tap Ready → Step 4: Accept invite
            ═══════════════════════════════════════════ */}
        {!isHost && (
          <div className="space-y-3">

            {/* Step 1 + 2: Copy host code */}
            {hostPlayer && (
              <div className={cn("rounded-2xl border-2 overflow-hidden", team.border)}>
                {/* Step header */}
                <div className={cn("px-4 py-2 flex items-center gap-2", team.tint)}>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-[10px] font-black text-white">1</span>
                  </div>
                  <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                    Copy &amp; add host as a friend in Pokémon GO
                  </span>
                </div>

                {/* Friend code */}
                <div className="p-4 bg-background/60 backdrop-blur">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", TEAMS.find(t => t.id === hostPlayer.team)?.bg ?? 'bg-zinc-700')}>
                      {(() => { const TI = teamIcons[hostPlayer.team] || Users; return <TI className="w-5 h-5 text-white" fill="currentColor" />; })()}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{hostPlayer.name}</p>
                      <p className="text-xs text-muted-foreground">Lv. {hostPlayer.level} · Host</p>
                    </div>
                    {hostPlayer.isPremium && <Sparkles className="w-4 h-4 text-yellow-400 ml-auto" />}
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-card border border-card-border p-3 rounded-xl font-mono text-base tracking-widest text-center">
                      {hostPlayer.friendCode || '— — —'}
                    </code>
                    <Button
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-primary"
                      onClick={() => copyCode(hostPlayer.friendCode || user.code, hostPlayer.name)}
                      data-testid="button-copy-host-code"
                    >
                      {copiedCode === (hostPlayer.friendCode || user.code) ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Copy className="w-5 h-5 text-white" />
                      )}
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Open Pokémon GO → Friends → Add Friend → paste code
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Ready Up */}
            {!lobby.raidStarted && (
              <div className="rounded-2xl border-2 border-card-border overflow-hidden">
                <div className="px-4 py-2 bg-card flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-black text-muted-foreground">2</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Sent the friend request? Tap ready!
                  </span>
                </div>
                <div className="p-3">
                  <Button
                    onClick={() => {
                      if (!displayReady) {
                        setOptimisticReady(true);
                        try {
                          if (hapticEnabled) triggerImpact('medium');
                          if (soundEnabled) playReadySound();
                        } catch {}
                        const updatedPlayers = lobby.players.map((p) =>
                          p.id === user.id
                            ? { ...p, isReady: true, hasSentRequest: true }
                            : p
                        );
                        onUpdateLobby({ ...lobby, players: updatedPlayers });
                      }
                    }}
                    disabled={displayReady}
                    className={cn(
                      "w-full py-3 text-sm font-bold rounded-xl transition-all",
                      displayReady
                        ? "bg-green-600 hover:bg-green-700 cursor-not-allowed"
                        : "bg-yellow-500 hover:bg-yellow-600 text-black"
                    )}
                    data-testid="button-joiner-ready"
                  >
                    {displayReady ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" />Friend Request Sent — I'm Ready!</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Send Friend Request &amp; Ready Up</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Wait for host invite / accept it */}
            {lobby.raidStarted && (
              <div className="rounded-2xl border-2 border-green-500/60 bg-green-500/5 overflow-hidden">
                <div className="px-4 py-2 bg-green-600/20 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-600/40 flex items-center justify-center">
                    <span className="text-[10px] font-black text-green-300">3</span>
                  </div>
                  <span className="text-xs font-bold text-green-300 uppercase tracking-wide">
                    Invites sent — accept &amp; join the raid!
                  </span>
                </div>
                <div className="p-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Host has sent raid invites</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open Pokémon GO and accept the raid invite from your notifications
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            HOST FLOW
            Step 1: Wait for players → Step 2: Send invites → Step 3: Start
            ═══════════════════════════════════════════ */}
        {isHost && (
          <div className="space-y-3">
            {!lobby.raidStarted ? (
              <>
                {/* Step 1: Wait for players / see status */}
                <div className="rounded-2xl border-2 border-card-border overflow-hidden">
                  <div className="px-4 py-2 bg-card flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-black text-muted-foreground">1</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Wait for raiders to add you &amp; ready up
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Raiders will copy your friend code and send you a friend request in Pokémon GO.
                      Watch for pending friend requests in-game while you wait.
                    </p>
                  </div>
                </div>

                {/* Step 2: Send invites */}
                <div className={cn(
                  "rounded-2xl border-2 overflow-hidden transition-all",
                  allReady && lobby.players.length >= 2
                    ? "border-green-500/60 bg-green-500/5"
                    : "border-card-border"
                )}>
                  <div className={cn(
                    "px-4 py-2 flex items-center gap-2",
                    allReady && lobby.players.length >= 2 ? "bg-green-600/20" : "bg-card"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center",
                      allReady && lobby.players.length >= 2 ? "bg-green-600/40" : "bg-muted"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black",
                        allReady && lobby.players.length >= 2 ? "text-green-300" : "text-muted-foreground"
                      )}>2</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wide",
                      allReady && lobby.players.length >= 2 ? "text-green-300" : "text-muted-foreground"
                    )}>
                      Accept friend requests &amp; send raid invites in Pokémon GO
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Once raiders are ready, open Pokémon GO → enter the raid → tap "Battle" → invite friends.
                    </p>
                    <Button
                      onClick={() => {
                        setOptimisticReady(true);
                        try {
                          if (hapticEnabled) triggerNotification('success');
                          if (soundEnabled) playReadySound();
                        } catch {}
                        const updatedPlayers = lobby.players.map((p) =>
                          p.id === user.id ? { ...p, isReady: true } : p
                        );
                        onUpdateLobby({ ...lobby, players: updatedPlayers });
                        if (onStartRaid) onStartRaid();
                      }}
                      className="w-full py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-green-600 to-emerald-600"
                      data-testid="button-send-invites"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Invites Sent — Start Raid!
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Post-invite state for host */
              <div className="rounded-2xl border-2 border-green-500/60 bg-green-500/5 overflow-hidden">
                <div className="px-4 py-2 bg-green-600/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-bold text-green-300 uppercase tracking-wide">
                    Raid invites sent!
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    All players have been notified. Raid is underway — good luck!
                  </p>
                  <Button
                    onClick={() => {
                      try { if (hapticEnabled) triggerImpact('medium'); } catch {}
                      toast({ title: "Backup invites sent!", description: "Resending invites to all players" });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    data-testid="button-resend-invites"
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Resend Invites
                  </Button>

                  {/* Raid Train — chain the next raid with the same group */}
                  <Button
                    onClick={async () => {
                      if (raidTrainLoading) return;
                      setRaidTrainLoading(true);
                      try {
                        if (hapticEnabled) triggerImpact('heavy');
                        const res = await fetch(`/api/lobbies/${lobby.id}/train`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ hostId: user?.id }),
                        });
                        if (!res.ok) throw new Error('train failed');
                        const newLobby = await res.json() as { id: string };
                        toast({ title: "🚂 Raid Train Started!", description: "All players notified — new lobby ready!" });
                        // Navigate to the new lobby via the parent
                        window.location.hash = `#lobby-${newLobby.id}`;
                      } catch {
                        toast({ title: "Couldn't start train", description: "Try again in a moment", variant: "destructive" });
                      } finally {
                        setRaidTrainLoading(false);
                      }
                    }}
                    disabled={raidTrainLoading}
                    size="sm"
                    className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold border-0"
                    data-testid="button-raid-train"
                  >
                    <Train className="w-3 h-3 mr-2" />
                    {raidTrainLoading ? "Starting…" : "🚂 Start Next Raid"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            RAIDERS LIST — visible to everyone
            ═══════════════════════════════════════════ */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
            Raiders ({lobby.players.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {lobby.players.map((player) => {
              const playerTeam = TEAMS.find((t) => t.id === player.team) || TEAMS[3];
              const TeamIcon = teamIcons[player.team] || Users;
              const isMe = player.id === user.id;

              return (
                <div
                  key={player.id}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all",
                    player.isReady ? "border-green-500/60 bg-green-500/5" : "border-card-border bg-card",
                    isMe && "ring-2 ring-offset-1 ring-offset-background ring-primary/60"
                  )}
                  data-testid={`player-card-${player.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", playerTeam.bg)}>
                      <TeamIcon className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-bold text-sm truncate",
                          player.isPremium && "text-yellow-400"
                        )}>{player.name}{isMe && " (you)"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Lv. {player.level}</span>
                    </div>
                    {player.isPremium && <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    {player.isReady ? (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">READY</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Waiting...</span>
                    )}

                    {/* Host-only: see which players sent friend request */}
                    {isHost && !player.isHost && player.hasSentRequest && (
                      <span className="text-[10px] text-blue-400 font-medium">Request sent</span>
                    )}

                    {player.isHost && (
                      <span className="text-[10px] text-primary font-bold">HOST</span>
                    )}
                  </div>

                  {/* Host sees each player's friend code for easy adding */}
                  {isHost && !player.isHost && player.friendCode && (
                    <button
                      onClick={() => copyCode(player.friendCode!, player.name)}
                      className="mt-2 w-full flex items-center gap-1.5 bg-background border border-card-border rounded-lg px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-copy-player-code-${player.id}`}
                    >
                      <Copy className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{player.friendCode}</span>
                      {copiedCode === player.friendCode && (
                        <Check className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* GO TO GAME button — always visible */}
        <Button
          onClick={() => {
            try { if (hapticEnabled) triggerImpact('medium'); } catch {}
            window.location.href = 'pokemongo://';
          }}
          className="w-full py-3 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700"
          data-testid="button-go-to-game"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Pokémon GO
        </Button>

        {/* Test push notification button — visible when in a test lobby */}
        {lobby.id.startsWith('test-') && user && (
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-muted-foreground border-dashed"
            data-testid="button-test-push"
            onClick={async () => {
              try {
                const res = await fetch(getApiUrl(`/api/push/test/${user.id}`), { method: 'POST' });
                const data = await res.json() as { sent?: number; failed?: number; error?: string; tokenCount?: number };
                if (!res.ok || data.error) {
                  toast({ title: data.error || "Push test failed", variant: "destructive" });
                } else if ((data.tokenCount ?? 0) === 0) {
                  toast({ title: "No push token registered yet", description: "Enable notifications in Settings first" });
                } else {
                  toast({ title: `🔔 Test sent to ${data.sent ?? 0} device(s)`, description: "Background notification should appear now" });
                }
              } catch {
                toast({ title: "Couldn't reach server", variant: "destructive" });
              }
            }}
          >
            <Bell className="w-3 h-3 mr-2" />
            Test Push Notification
          </Button>
        )}

        {/* Leave lobby */}
        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-leave-room"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Lobby
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this raid?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave? You'll need to rejoin if you want to participate in this raid.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLeaveDialogOpen(false)}>Stay</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setLeaveDialogOpen(false); onLeave(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-leave"
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
