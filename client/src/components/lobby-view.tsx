import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  Users,
  CloudLightning,
  Timer,
  Crown,
  Send,
  Flame,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { BOSSES, TEAMS } from "@shared/schema";
import type { Lobby, Player } from "@shared/schema";

interface LobbyViewProps {
  lobby: Lobby;
  isHost: boolean;
  onLeave: () => void;
  onUpdateLobby: (lobby: Lobby) => void;
}

const teamIcons = {
  ember: Flame,
  frost: Shield,
  storm: Zap,
  neutral: Users,
};

export function LobbyView({ lobby, isHost, onLeave, onUpdateLobby }: LobbyViewProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const boss = BOSSES.find((b) => b.id === lobby.bossId);
  const team = TEAMS.find((t) => t.id === lobby.team) || TEAMS[3];

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
        <button
          onClick={onLeave}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center"
          data-testid="button-leave-lobby"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

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
              <span className="font-bold">{lobby.players.length}/{lobby.maxPlayers}</span>
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

        {hostPlayer && (
          <div className={cn("p-4 rounded-2xl border-2", team.border, team.tint)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
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
                        <span className="font-bold text-sm truncate">{player.name}</span>
                        {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
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
      </div>
    </div>
  );
}
