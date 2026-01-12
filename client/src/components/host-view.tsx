import { useState } from "react";
import { CloudLightning, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SafeImage } from "@/components/safe-image";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { BOSSES, TEAMS } from "@shared/schema";
import type { Lobby, Player } from "@shared/schema";

interface HostViewProps {
  onHost: (lobby: Lobby) => void;
}

export function HostView({ onHost }: HostViewProps) {
  const { user } = useUser();
  const [selectedBoss, setSelectedBoss] = useState(BOSSES[0].id);
  const [minLevel, setMinLevel] = useState(1);
  const [weather, setWeather] = useState(false);

  if (!user) return null;

  const handleHost = () => {
    const hostPlayer: Player = {
      id: user.id,
      name: user.name,
      level: user.level,
      team: user.team,
      isReady: true,
      isHost: true,
      friendCode: user.code,
    };

    const newLobby: Lobby = {
      id: `lobby-${Date.now()}`,
      bossId: selectedBoss,
      hostId: user.id,
      hostName: user.name,
      hostRating: "5.0",
      players: [hostPlayer],
      maxPlayers: 6,
      team: user.team,
      minLevel,
      weather,
      createdAt: Date.now(),
      timeLeft: 45,
    };

    onHost(newLobby);
  };

  const selectedBossData = BOSSES.find((b) => b.id === selectedBoss);
  const selectedTeam = TEAMS.find((t) => t.id === user.team) || TEAMS[0];

  return (
    <div className="p-4 space-y-6 pb-28">
      <div className="text-center">
        <h2 className="text-2xl font-black">Host a Raid</h2>
        <p className="text-muted-foreground text-sm">
          Select a boss and configure your lobby
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-muted-foreground uppercase block">
          Select Boss
        </label>
        <div className="grid grid-cols-3 gap-3">
          {BOSSES.slice(0, 6).map((boss) => (
            <button
              key={boss.id}
              onClick={() => setSelectedBoss(boss.id)}
              className={cn(
                "p-3 rounded-xl border-2 flex flex-col items-center transition-all duration-200",
                selectedBoss === boss.id
                  ? `${selectedTeam.border} bg-card shadow-lg scale-105`
                  : "border-card-border bg-card opacity-70 hover:opacity-100"
              )}
              data-testid={`boss-${boss.id}`}
            >
              <SafeImage
                src={boss.image}
                alt={boss.name}
                className="w-12 h-12 mb-2"
                fallbackChar={boss.name[0]}
              />
              <span className="text-[10px] font-bold truncate w-full text-center">
                {boss.name}
              </span>
              <span className="text-[9px] text-muted-foreground">T{boss.tier}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedBossData && (
        <div className={cn("p-4 rounded-2xl border-2", selectedTeam.border, selectedTeam.tint)}>
          <div className="flex items-center gap-4">
            <SafeImage
              src={selectedBossData.image}
              alt={selectedBossData.name}
              className="w-20 h-20 rounded-xl bg-card"
              fallbackChar={selectedBossData.name[0]}
            />
            <div>
              <h3 className="font-black text-xl">{selectedBossData.name}</h3>
              <p className="text-muted-foreground text-sm">
                Tier {selectedBossData.tier} • CP {selectedBossData.cp.toLocaleString()}
              </p>
              <div className="flex gap-2 mt-2">
                {selectedBossData.isShadow && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400">
                    Shadow
                  </span>
                )}
                {selectedBossData.isDynamax && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-600/20 text-pink-400">
                    Dynamax
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 bg-card p-4 rounded-2xl border border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-semibold block">Minimum Level</label>
            <span className="text-sm text-muted-foreground">
              Set level requirement for raiders
            </span>
          </div>
          <Input
            type="number"
            value={minLevel}
            onChange={(e) => setMinLevel(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 text-center font-bold"
            min={1}
            max={50}
            data-testid="input-min-level"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="font-semibold block flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-yellow-500" />
              Weather Boosted
            </label>
            <span className="text-sm text-muted-foreground">
              Boss is weather boosted
            </span>
          </div>
          <Switch
            checked={weather}
            onCheckedChange={setWeather}
            data-testid="switch-weather"
          />
        </div>
      </div>

      <Button
        onClick={handleHost}
        className={cn("w-full py-6 text-lg font-black rounded-2xl", selectedTeam.bg)}
        data-testid="button-create-lobby"
      >
        <Plus className="w-5 h-5 mr-2" />
        CREATE LOBBY
      </Button>
    </div>
  );
}
