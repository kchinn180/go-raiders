/**
 * LobbyCard Component
 * 
 * Displays a raid lobby card in the join feed with:
 * - Raid boss image and tier
 * - Host information with Elite status indicator
 * - Player count and spots remaining
 * - Lobby countdown timer
 * - Weather boost indicator
 * - Elite Early Access lock for new lobbies
 * - Details button to view comprehensive Pokémon information
 * 
 * BASIC VS PREMIUM TIERED ACCESS VISUALS:
 * 
 * For BASIC users viewing locked raids:
 * - Prominent blur effect over the entire card
 * - Large, animated lock icon
 * - Highly visible countdown timer with pulsing animation
 * - Clear messaging explaining why access is restricted
 * - Timer ticks down in real-time (10 second countdown)
 * 
 * For PREMIUM/ELITE users:
 * - No blur, lock, or countdown (instant access)
 * - All card details fully visible
 * - Can join immediately when tapping
 * 
 * SECURITY NOTE: Visual indicators are for UX only.
 * Server-side validation in the join endpoint is the
 * authoritative enforcement point for Elite Early Access.
 */

import { useState, useEffect } from "react";
import { Lock, Users, CloudLightning, Clock, Shield, Flame, Zap, Sparkles, Info } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOSSES, TEAMS } from "@shared/schema";
import type { Lobby } from "@shared/schema";

interface LobbyCardProps {
  lobby: Lobby;
  isLocked: boolean;
  onJoin: () => void;
  onShowDetails?: (bossId: string, lobbyEndTime: number) => void;
}

const teamIcons = {
  valor: Flame,
  mystic: Shield,
  instinct: Zap,
  neutral: Users,
};

const teamGlowClasses = {
  valor: "team-glow-valor",
  mystic: "team-glow-mystic",
  instinct: "team-glow-instinct",
  neutral: "team-glow-neutral",
};

const LOBBY_LIFESPAN_MS = 15 * 60 * 1000;

export function LobbyCard({ lobby, isLocked, onJoin, onShowDetails }: LobbyCardProps) {
  const [lockCountdown, setLockCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  useEffect(() => {
    if (!isLocked) {
      setLockCountdown(0);
      return;
    }
    
    const updateCountdown = () => {
      const elapsed = Date.now() - lobby.createdAt;
      const remaining = Math.max(0, Math.ceil((10000 - elapsed) / 1000));
      setLockCountdown(remaining);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 100);
    return () => clearInterval(interval);
  }, [isLocked, lobby.createdAt]);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const elapsed = Date.now() - lobby.createdAt;
      const remaining = Math.max(0, Math.floor((LOBBY_LIFESPAN_MS - elapsed) / 1000));
      setTimeRemaining(remaining);
    };
    
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [lobby.createdAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const boss = BOSSES.find((b) => b.id === lobby.bossId);
  const team = TEAMS.find((t) => t.id === lobby.team) || TEAMS[3];
  const TeamIcon = teamIcons[lobby.team] || Users;
  const glowClass = teamGlowClasses[lobby.team] || teamGlowClasses.neutral;

  if (!boss) return null;

  const playerCount = lobby.players.length;
  const spotsLeft = lobby.maxPlayers - playerCount;
  const hostPlayer = lobby.players.find(p => p.isHost);
  const isHostElite = hostPlayer?.isPremium || false;

  return (
    <button
      onClick={onJoin}
      disabled={isLocked}
      className={cn(
        "w-full rounded-xl p-3 flex items-center gap-3 relative overflow-visible border-l-4 text-left transition-all duration-200 bg-card border border-card-border hover-elevate active:scale-[0.98]",
        team.border,
        team.tint,
        glowClass
      )}
      data-testid={`lobby-card-${lobby.id}`}
    >
      {/* BASIC USER LOCK OVERLAY
       * Displayed when a Basic (non-Premium) user tries to view a lobby
       * that is still within the Elite Early Access period (10 seconds).
       * 
       * Features:
       * - Strong blur effect to indicate restricted access
       * - Large, pulsing lock icon
       * - Prominent countdown timer (large, visible)
       * - Clear messaging about Premium benefits
       * - Timer updates in real-time
       */}
      {isLocked && lockCountdown > 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md bg-background/90 rounded-xl border-2 border-yellow-500/50">
          {/* Animated lock icon */}
          <div className="animate-pulse mb-2">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500/50">
              <Lock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          
          {/* Large countdown timer */}
          <div className="text-3xl font-black text-yellow-500 tabular-nums animate-pulse">
            {lockCountdown}
          </div>
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">
            seconds
          </span>
          
          {/* Access restriction messaging */}
          <div className="mt-3 text-center px-4">
            <span className="text-xs font-bold text-yellow-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Elite Early Access
              <Sparkles className="w-3 h-3" />
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Premium users get instant access
            </p>
          </div>
        </div>
      )}

      <div className="relative shrink-0 w-14 h-14 rounded-lg border border-border flex items-center justify-center bg-card">
        <SafeImage
          src={boss.image}
          alt={boss.name}
          className="w-full h-full object-contain p-1 rounded-lg"
          fallbackChar={boss.name[0]}
        />
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <span className="text-[10px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30">
            {boss.tier}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm truncate">{boss.name}</span>
          {boss.isShadow && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-purple-600/20 text-purple-400 border-purple-500/30">
              Shadow
            </Badge>
          )}
          {boss.isDynamax && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-pink-600/20 text-pink-400 border-pink-500/30">
              MAX
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1">
            <TeamIcon className={cn("w-3 h-3", team.color)} />
            <span className={cn(
              "text-[10px] font-semibold",
              isHostElite && "text-yellow-400 elite-name-glow"
            )}>
              {lobby.hostName}
            </span>
            {isHostElite && (
              <Sparkles className="w-3 h-3 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-semibold">
              {playerCount}/{lobby.maxPlayers}
            </span>
          </div>
          {lobby.weather && (
            <CloudLightning className="w-3 h-3 text-yellow-500" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className={cn(
          "flex items-center gap-1 font-mono",
          timeRemaining < 60 ? "text-red-400" : timeRemaining < 180 ? "text-yellow-400" : "text-muted-foreground"
        )}>
          <Clock className="w-3 h-3" />
          <span className="text-xs font-bold">{formatTime(timeRemaining)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              spotsLeft <= 2
                ? "bg-red-600/20 text-red-400"
                : spotsLeft <= 4
                ? "bg-yellow-600/20 text-yellow-400"
                : "bg-green-600/20 text-green-400"
            )}
          >
            {spotsLeft} spots
          </span>
          {/* Details button - shows Pokemon info modal */}
          {onShowDetails && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                const lobbyEndTime = lobby.createdAt + LOBBY_LIFESPAN_MS;
                onShowDetails(lobby.bossId, lobbyEndTime);
              }}
              data-testid={`button-lobby-details-${lobby.id}`}
            >
              <Info className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </button>
  );
}
