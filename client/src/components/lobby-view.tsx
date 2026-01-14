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
import { BOSSES, TEAMS } from "@shared/schema";
import type { Lobby, Player } from "@shared/schema";

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
  
  // OPTIMISTIC STATE: Track local ready state for instant button feedback
  const [optimisticReady, setOptimisticReady] = useState<boolean | null>(null);
  
  // Scroll to top when entering lobby so friend codes are visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const boss = BOSSES.find((b) => b.id === lobby.bossId);
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

  if (!boss || !user) return null;

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

  const toggleReady = () => {
    if (!myPlayer) return;
    
    // Regular players cannot unready - only hosts can toggle
    if (myPlayer.isReady && !isHost) return;
    
    try {
      if (hapticEnabled) triggerImpact('medium');
      if (soundEnabled) playReadySound();
    } catch {
      // Ignore haptic/sound errors
    }
    
    const updatedPlayers = lobby.players.map((p) =>
      p.id === user.id ? { ...p, isReady: !p.isReady } : p
    );
    onUpdateLobby({ ...lobby, players: updatedPlayers });
  };

  const markSentRequest = (playerId: string) => {
    const updatedPlayers = lobby.players.map((p) =>
      p.id === playerId ? { ...p, hasSentRequest: true } : p
    );
    onUpdateLobby({ ...lobby, players: updatedPlayers });
    toast({ title: "Marked as Sent", description: "Host has been notified" });
  };

  return (
    <div className="pb-28">
      <div
        className={cn(
          "relative h-48 flex items-end p-4 bg-gradient-to-b",
          team.gradient
        )}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur px-3 py-1 rounded-full">
            <Timer className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">{lobby.timeLeft}m</span>
          </div>
          {lobby.weather && (
            <div className="bg-yellow-500/80 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
              <CloudLightning className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">BOOSTED</span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex items-end gap-4">
          <SafeImage
            src={boss.image}
            alt={boss.name}
            className="w-24 h-24 bg-white/10 rounded-2xl backdrop-blur"
            fallbackChar={boss.name[0]}
          />
          <div className="text-white mb-2">
            <h2 className="text-2xl font-black">{boss.name}</h2>
            <p className="text-white/80 text-sm">
              Tier {boss.tier} • CP {boss.cp.toLocaleString()} • {'types' in boss && boss.types ? boss.types.join('/') : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-end bg-card p-4 rounded-2xl border border-card-border">
          <div className={cn(
            "px-3 py-1 rounded-full font-bold text-sm",
            allReady ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
          )}>
            {readyCount}/{lobby.players.length} Ready
          </div>
        </div>
        

        {hostPlayer && !isHost && (
          <div className={cn("p-4 rounded-2xl border-2", team.border, team.tint)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="font-bold">Host's Friend Code</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Add host first!
              </span>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-background p-3 rounded-xl font-mono text-lg tracking-widest text-center">
                {hostPlayer.friendCode || user.code}
              </code>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => copyCode(hostPlayer.friendCode || user.code, hostPlayer.name)}
                data-testid="button-copy-host-code"
              >
                {copiedCode === (hostPlayer.friendCode || user.code) ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}

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
                    player.isReady ? "border-green-500/50 bg-green-500/5" : "border-card-border bg-card",
                    isMe && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                  )}
                  data-testid={`player-card-${player.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", playerTeam.bg)}>
                      <TeamIcon className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-bold text-sm truncate",
                          player.isPremium && "text-yellow-400 elite-name-glow"
                        )}>{player.name}</span>
                        {player.isPremium && <Sparkles className="w-3 h-3 text-yellow-400" />}
                        {player.isHost && !player.isPremium && <span className="text-[10px] text-muted-foreground">(Host)</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">Lv. {player.level}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {player.isReady ? (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">READY</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Waiting...</span>
                    )}

                    {!player.isHost && isHost && player.hasSentRequest && (
                      <span className="text-xs text-green-400 font-medium">Request sent</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* HOST: Combined Ready + Send Invites Button */}
        {isHost && !lobby.raidStarted && (
          <Button
            onClick={() => {
              // OPTIMISTIC: Update UI immediately
              setOptimisticReady(true);
              
              try {
                if (hapticEnabled) triggerNotification('success');
                if (soundEnabled) playReadySound();
              } catch {}
              // Mark host as ready and send invites in one action
              const updatedPlayers = lobby.players.map((p) =>
                p.id === user.id ? { ...p, isReady: true } : p
              );
              onUpdateLobby({ ...lobby, players: updatedPlayers });
              if (onStartRaid) onStartRaid();
            }}
            size="sm"
            className="w-full py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-green-600 to-emerald-600"
            data-testid="button-send-invites"
          >
            <Rocket className="w-4 h-4 mr-1" />
            Invites Sent - Start Raid
          </Button>
        )}

        {/* INVITES SENT banner for everyone */}
        {lobby.raidStarted && (
          <div className="space-y-2">
            <div className="bg-green-600/20 border border-green-500 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                <span>INVITES SENT!</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accept and join the raid!
              </p>
            </div>
            {isHost && (
              <Button
                onClick={() => {
                  try {
                    if (hapticEnabled) triggerImpact('medium');
                  } catch {}
                  toast({ title: "Backup invites sent!", description: "Resending invites to all players" });
                }}
                variant="ghost"
                size="sm"
                className="w-full py-2 text-xs font-medium rounded-lg"
                data-testid="button-resend-invites"
              >
                <Send className="w-3 h-3 mr-1" />
                Resend Invites
              </Button>
            )}
          </div>
        )}

        {/* Action buttons for joiners: combined friend request + ready */}
        {!isHost && !lobby.raidStarted && (
          <Button
            onClick={() => {
              if (!displayReady) {
                // OPTIMISTIC: Update UI immediately
                setOptimisticReady(true);
                
                try {
                  if (hapticEnabled) triggerImpact('medium');
                  if (soundEnabled) playReadySound();
                } catch {
                  // Ignore haptic/sound errors
                }
                
                // Combine both updates into a single onUpdateLobby call
                const updatedPlayers = lobby.players.map((p) =>
                  p.id === user.id 
                    ? { ...p, isReady: true, hasSentRequest: true } 
                    : p
                );
                onUpdateLobby({ ...lobby, players: updatedPlayers });
              }
            }}
            disabled={displayReady}
            size="sm"
            className={cn(
              "w-full py-3 text-sm font-bold rounded-xl transition-all",
              displayReady
                ? "bg-green-600 hover:bg-green-700"
                : "bg-yellow-500 hover:bg-yellow-600 text-black",
              displayReady && "opacity-90 cursor-not-allowed"
            )}
            data-testid="button-joiner-ready"
          >
            {displayReady ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                READY - Friend Request Sent
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Send Friend Request & Ready Up
              </>
            )}
          </Button>
        )}

        {/* Joiner: Show locked state after raid started */}
        {!isHost && lobby.raidStarted && myPlayer?.isReady && (
          <div className="bg-green-600/20 border border-green-500 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
              <Check className="w-4 h-4" />
              <span>READY - Friend Request Sent</span>
            </div>
          </div>
        )}

        {/* GO TO GAME BUTTON - Blue color */}
        <Button
          onClick={() => {
            try {
              if (hapticEnabled) triggerImpact('medium');
            } catch {}
            window.location.href = 'pokemongo://';
          }}
          size="sm"
          className="w-full py-3 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700"
          data-testid="button-go-to-game"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          GO TO GAME
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-leave-room"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this raid?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave this lobby? You'll need to rejoin if you want to participate in this raid.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction
                onClick={onLeave}
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
