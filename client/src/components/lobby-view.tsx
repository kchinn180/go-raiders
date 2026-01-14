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

import { useState, useEffect, useRef, useCallback } from "react";
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
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

// Raid capacity constraints (must match server-side RAID_CAPACITY constants)
const RAID_CAPACITY = {
  MIN: 2,
  MAX: 10,
  DEFAULT: 6,
} as const;

export function LobbyView({ lobby, isHost, onLeave, onUpdateLobby, onStartRaid }: LobbyViewProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const lastTimeLeftRef = useRef(lobby.timeLeft);
  const soundPlayedRef = useRef(false);
  
  // HOST CAPACITY CONTROL STATE
  // Track pending capacity for optimistic UI updates
  const [pendingCapacity, setPendingCapacity] = useState<number | null>(null);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);

  const boss = BOSSES.find((b) => b.id === lobby.bossId);
  const team = TEAMS.find((t) => t.id === lobby.team) || TEAMS[3];
  
  const hapticEnabled = user?.notifications?.hapticFeedback !== false;
  const soundEnabled = user?.notifications?.soundEffects !== false;
  
  /**
   * HOST CAPACITY UPDATE HANDLER
   * 
   * Allows ONLY the host to modify raid capacity.
   * Sends request to server which validates:
   * 1. User is the host (server-side enforcement)
   * 2. New capacity is within valid range (2-10)
   * 3. Cannot reduce below current player count
   */
  const updateCapacity = useCallback(async (newCapacity: number) => {
    if (!isHost || !user) return;
    
    // Client-side validation (server will also validate)
    if (newCapacity < RAID_CAPACITY.MIN || newCapacity > RAID_CAPACITY.MAX) {
      toast({
        title: "Invalid capacity",
        description: `Capacity must be between ${RAID_CAPACITY.MIN} and ${RAID_CAPACITY.MAX}`,
        variant: "destructive"
      });
      return;
    }
    
    if (newCapacity < lobby.players.length) {
      toast({
        title: "Cannot reduce capacity",
        description: `Current player count is ${lobby.players.length}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdatingCapacity(true);
    setPendingCapacity(newCapacity);
    
    try {
      const response = await fetch(`/api/lobbies/${lobby.id}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user.id,
          capacity: newCapacity
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update capacity');
      }
      
      const updatedLobby = await response.json();
      onUpdateLobby(updatedLobby);
      
      if (hapticEnabled) triggerImpact('light');
      toast({
        title: "Capacity updated",
        description: `Raid now has ${newCapacity} spots`
      });
    } catch (error) {
      toast({
        title: "Failed to update capacity",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCapacity(false);
      setPendingCapacity(null);
    }
  }, [isHost, user, lobby.id, lobby.players.length, onUpdateLobby, hapticEnabled, toast]);

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
    
    if (hapticEnabled) triggerImpact('medium');
    if (soundEnabled) playReadySound();
    
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
              Tier {boss.tier} • CP {boss.cp.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-card-border">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <span className="font-bold">{lobby.players.length}/{pendingCapacity ?? lobby.maxPlayers}</span>
              <span className="text-muted-foreground text-sm ml-2">Raiders</span>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full font-bold text-sm",
            allReady ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
          )}>
            {readyCount}/{lobby.players.length} Ready
          </div>
        </div>
        
        {/* HOST CAPACITY CONTROL SLIDER
         * Only visible to the lobby host.
         * Allows host to adjust raid capacity from 2-10 players.
         * Used to reserve slots for friends or limit raid size.
         * Changes are validated server-side (host permission check).
         */}
        {isHost && (
          <div className="bg-card p-4 rounded-2xl border border-card-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm">Raid Capacity</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Host Only
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-4">{RAID_CAPACITY.MIN}</span>
              <Slider
                value={[pendingCapacity ?? lobby.maxPlayers]}
                min={RAID_CAPACITY.MIN}
                max={RAID_CAPACITY.MAX}
                step={1}
                disabled={isUpdatingCapacity}
                onValueChange={(values) => {
                  const newValue = values[0];
                  // Only update if valid (not below current player count)
                  if (newValue >= lobby.players.length) {
                    setPendingCapacity(newValue);
                  }
                }}
                onValueCommit={(values) => {
                  const newValue = values[0];
                  if (newValue !== lobby.maxPlayers) {
                    updateCapacity(newValue);
                  }
                }}
                className="flex-1"
                data-testid="slider-raid-capacity"
              />
              <span className="text-xs text-muted-foreground w-4">{RAID_CAPACITY.MAX}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Current: {lobby.players.length} players
              </span>
              <span className={cn(
                "text-sm font-bold",
                isUpdatingCapacity && "animate-pulse"
              )}>
                Max: {pendingCapacity ?? lobby.maxPlayers} spots
              </span>
            </div>
          </div>
        )}

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

        {!isHost && !myPlayer?.hasSentRequest && (
          <Button
            onClick={() => markSentRequest(user.id)}
            variant="secondary"
            className="w-full"
            data-testid="button-sent-request"
          >
            <Send className="w-4 h-4 mr-2" />
            I Sent Friend Request
          </Button>
        )}

        {isHost && onStartRaid && !lobby.raidStarted && (
          <Button
            onClick={() => {
              if (hapticEnabled) triggerNotification('success');
              onStartRaid();
            }}
            className="w-full py-6 text-lg font-black rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600"
            data-testid="button-start-raid"
          >
            <Rocket className="w-5 h-5 mr-2" />
            INVITES SENT - START RAID!
          </Button>
        )}

        {lobby.raidStarted && (
          <div className="bg-green-600/20 border-2 border-green-500 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
              <Rocket className="w-5 h-5" />
              <span>RAID IN PROGRESS!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Invites sent - Accept and join the raid!
            </p>
          </div>
        )}

        <Button
          onClick={toggleReady}
          className={cn(
            "w-full py-6 text-lg font-black rounded-2xl transition-all",
            myPlayer?.isReady
              ? "bg-green-600 hover:bg-green-700"
              : team.bg
          )}
          data-testid="button-toggle-ready"
        >
          {myPlayer?.isReady ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              READY!
            </>
          ) : (
            "TAP WHEN READY"
          )}
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
