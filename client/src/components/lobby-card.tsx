import { useState, useEffect } from "react";
import { Lock, Users, CloudLightning, Timer, Shield, Flame, Zap, Sparkles } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BOSSES, TEAMS } from "@shared/schema";
import type { Lobby } from "@shared/schema";

interface LobbyCardProps {
  lobby: Lobby;
  isLocked: boolean;
  onJoin: () => void;
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

export function LobbyCard({ lobby, isLocked, onJoin }: LobbyCardProps) {
  const [lockCountdown, setLockCountdown] = useState(0);
  
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
      {isLocked && lockCountdown > 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-background/80 rounded-xl">
          <Lock className="w-5 h-5 text-yellow-500 mb-1" />
          <span className="text-xs font-black text-yellow-500">
            {lockCountdown}s
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Elite Early Access
          </span>
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
        <div className="flex items-center gap-1 text-muted-foreground">
          <Timer className="w-3 h-3" />
          <span className="text-xs font-bold">{lobby.timeLeft}m</span>
        </div>
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
      </div>
    </button>
  );
}
