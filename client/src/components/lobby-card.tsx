import { useEffect, useState } from "react";
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
  const [timeRemaining, setTimeRemaining] = useState(0);

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
      className={cn(
        "w-full rounded-xl p-2 flex items-center gap-2 relative overflow-visible border-l-4 text-left transition-all duration-200 bg-card border border-card-border hover-elevate active:scale-[0.98]",
        team.border,
        team.tint,
        glowClass
      )}
      data-testid={`lobby-card-${lobby.id}`}
    >

      <div className="relative shrink-0 w-10 h-10 rounded-lg border border-border flex items-center justify-center bg-card">
        <SafeImage
          src={boss.image}
          alt={boss.name}
          className="w-full h-full object-contain p-0.5 rounded-lg"
          fallbackChar={boss.name[0]}
        />
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <span className="text-[9px] font-black bg-primary/20 text-primary px-1 py-0 rounded border border-primary/30">
            {boss.tier}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-bold text-xs truncate">{boss.name}</span>
          {boss.isShadow && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-purple-600/20 text-purple-400 border-purple-500/30">
              Shadow
            </Badge>
          )}
          {boss.tier === 4 && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-orange-600/20 text-orange-400 border-orange-500/30">
              Mega
            </Badge>
          )}
          {boss.isDynamax && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-pink-600/20 text-pink-400 border-pink-500/30">
              Max
            </Badge>
          )}
          {lobby.groupId && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-purple-600/20 text-purple-300 border-purple-500/30 flex items-center gap-0.5">
              <Shield className="w-2 h-2" />
              Private
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <TeamIcon className={cn("w-2.5 h-2.5", team.color)} />
            <span className={cn(
              "text-[9px] font-semibold",
              isHostElite && "text-yellow-400 elite-name-glow"
            )}>
              {lobby.hostName}
            </span>
            {isHostElite && (
              <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" />
            <span className="text-[9px] font-semibold">
              {playerCount}/{lobby.maxPlayers}
            </span>
          </div>
          {lobby.weather && (
            <CloudLightning className="w-2.5 h-2.5 text-yellow-500" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <div className={cn(
          "flex items-center gap-1 font-mono",
          timeRemaining < 60 ? "text-red-400" : timeRemaining < 180 ? "text-yellow-400" : "text-muted-foreground"
        )}>
          {isLocked && <Lock className="w-2 h-2 text-yellow-500" />}
          <Clock className="w-2.5 h-2.5" />
          <span className="text-[10px] font-bold">{formatTime(timeRemaining)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span
            className={cn(
              "text-[9px] font-bold px-1.5 py-0 rounded-full",
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
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                const lobbyEndTime = lobby.createdAt + LOBBY_LIFESPAN_MS;
                onShowDetails(lobby.bossId, lobbyEndTime);
              }}
              data-testid={`button-lobby-details-${lobby.id}`}
            >
              <Info className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </div>
    </button>
  );
}
