/**
 * Host View Component
 * 
 * Allows users to create new raid lobbies by selecting from active raid bosses.
 * Features a 3-column scrollable grid of available bosses with "Details" buttons
 * to view comprehensive Pokémon information including stats, moves, and counters.
 */

import { useState, useEffect } from "react";
import { CloudLightning, Plus, Sparkles, Lock, Flame, Shield, Zap, Users, Loader2, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SafeImage } from "@/components/safe-image";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { TEAMS, ALL_BOSSES } from "@shared/schema";
import type { Lobby, Player, TeamId, RaidBoss, RaidGroup } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/queryClient";
import { PokemonDetailsModal } from "./pokemon-details-modal";

interface HostViewProps {
  onHost: (lobby: Lobby) => void;
  isPending?: boolean;
}

const teamIcons = {
  valor: Flame,
  mystic: Shield,
  instinct: Zap,
  neutral: Users,
};

export function HostView({ onHost, isPending = false }: HostViewProps) {
  const { user } = useUser();
  const [selectedBoss, setSelectedBoss] = useState<string>("");
  const [selectedGymTeam, setSelectedGymTeam] = useState<TeamId>("valor");
  const [minLevel, setMinLevel] = useState(1);
  const [weather, setWeather] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6); // Raid capacity (2-6)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // State for Pokemon details modal
  const [detailsBossId, setDetailsBossId] = useState<string | null>(null);

  // Fetch user's groups for private lobby option
  const { data: userGroups = [] } = useQuery<RaidGroup[]>({
    queryKey: ["/api/groups/user", user?.id],
    queryFn: () => fetch(getApiUrl(`/api/groups/user/${user!.id}`)).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Fetch active bosses from server; fall back to local ALL_BOSSES if API unreachable
  const { data: serverBosses, isLoading, refetch } = useQuery<RaidBoss[]>({
    queryKey: ["/api/bosses/active"],
    retry: 2,
    staleTime: 60000,
  });

  // Use server data when available, otherwise fall back to the local boss list
  const activeBosses: RaidBoss[] = (serverBosses && serverBosses.length > 0)
    ? serverBosses
    : ALL_BOSSES.map(b => ({ ...b, isActive: true, types: [...b.types] as string[] })) as unknown as RaidBoss[];

  // Set default selected boss when bosses load
  useEffect(() => {
    if (activeBosses.length > 0 && !selectedBoss) {
      setSelectedBoss(activeBosses[0].id);
    }
  }, [activeBosses, selectedBoss]);

  if (!user) return null;

  const handleHost = () => {
    // Clamp/sanitise all fields so Zod never rejects a valid host attempt
    // (guards against edge-cases where onboarding stored out-of-range values)
    const safeName = (user.name || 'Trainer').trim() || 'Trainer';
    const safeLevel = Math.min(80, Math.max(1, user.level || 1));
    const safeTeam = (['valor','mystic','instinct','neutral'] as const)
      .includes(user.team as any) ? user.team : 'neutral';

    const hostPlayer: Player = {
      id: user.id,
      name: safeName,
      level: safeLevel,
      team: safeTeam,
      isReady: true,
      isHost: true,
      isPremium: user.isPremium ?? false,
      friendCode: user.code || '',
    };

    const newLobby: Lobby = {
      id: `lobby-${Date.now()}`,
      bossId: selectedBoss || activeBosses[0]?.id || 'nihilego',
      hostId: user.id,
      hostName: safeName,
      hostRating: "5.0",
      players: [hostPlayer],
      maxPlayers: maxPlayers,
      team: selectedGymTeam,
      minLevel: user.isPremium ? safeLevel : 1,
      weather,
      createdAt: Date.now(),
      timeLeft: 900,  // 15 minutes in seconds
      raidStarted: false,
      invitesSent: false,
      ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
    };

    onHost(newLobby);
  };

  const selectedBossData = activeBosses.find((b) => b.id === selectedBoss);
  const selectedTeamData = TEAMS.find((t) => t.id === selectedGymTeam) || TEAMS[0];

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading available raid bosses...</p>
      </div>
    );
  }

  // No empty-state block needed — activeBosses always has at least the local fallback

  return (
    <div className="p-4 space-y-6 pb-nav">
      <div className="text-center">
        <h2 className="text-2xl font-black">Host a Raid</h2>
        <p className="text-muted-foreground text-sm">
          Select from {activeBosses.length} current raid bosses
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-muted-foreground uppercase block">
          Current Raid Bosses ({activeBosses.length})
        </label>
        {/* 3-column scrollable grid of active raid bosses */}
        <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto overflow-x-visible p-1">
          {activeBosses.map((boss) => (
            <button
              key={boss.id}
              onClick={() => setSelectedBoss(boss.id)}
              className={cn(
                "p-2 rounded-xl border-2 flex flex-col items-center transition-all duration-200 relative",
                selectedBoss === boss.id
                  ? `${selectedTeamData.border} bg-card shadow-lg ring-2 ring-primary/30`
                  : "border-card-border bg-card opacity-70 hover:opacity-100"
              )}
              data-testid={`boss-${boss.id}`}
            >
              <SafeImage
                src={boss.image}
                alt={boss.name}
                className="w-10 h-10 mb-1"
                fallbackChar={boss.name[0]}
              />
              <span className="text-[9px] font-bold truncate w-full text-center leading-tight">
                {boss.name.length > 12 ? boss.name.slice(0, 12) + '...' : boss.name}
              </span>
              <span className="text-[9px] font-bold text-primary">T{boss.tier}</span>
              
              {/* Details button - opens Pokemon details modal */}
              <div
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-muted/80 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsBossId(boss.id);
                }}
                data-testid={`button-details-${boss.id}`}
              >
                <Info className="w-2.5 h-2.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected boss preview with Details button */}
      {selectedBossData && (
        <div className={cn("p-4 rounded-2xl border-2", selectedTeamData.border, selectedTeamData.tint)}>
          <div className="flex items-center gap-4">
            <SafeImage
              src={selectedBossData.image}
              alt={selectedBossData.name}
              className="w-20 h-20 rounded-xl bg-card"
              fallbackChar={selectedBossData.name[0]}
            />
            <div className="flex-1">
              <h3 className="font-black text-xl">{selectedBossData.name}</h3>
              <p className="text-muted-foreground text-sm">
                Tier {selectedBossData.tier} • CP {selectedBossData.cp.toLocaleString()}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
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
            {/* Details button for selected boss */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailsBossId(selectedBossData.id)}
              data-testid="button-selected-boss-details"
            >
              <Info className="w-4 h-4 mr-1" />
              Details
            </Button>
          </div>
        </div>
      )}

      {/* Gym Team Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground uppercase block">
          Gym Controlled By
        </label>
        <div className="grid grid-cols-4 gap-2">
          {TEAMS.map((team) => {
            const TeamIcon = teamIcons[team.id as keyof typeof teamIcons] || Users;
            const isSelected = selectedGymTeam === team.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedGymTeam(team.id as TeamId)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                  isSelected
                    ? `${team.bg} ${team.border} text-white`
                    : "bg-card border-card-border text-muted-foreground hover:opacity-80"
                )}
                data-testid={`gym-team-${team.id}`}
              >
                <TeamIcon className="w-5 h-5" fill={isSelected ? "currentColor" : "none"} />
                <span className="text-[10px] font-bold">{team.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 bg-card p-4 rounded-2xl border border-card-border">
        <div className={cn(
          "flex items-center justify-between",
          !user.isPremium && "opacity-50"
        )}>
          <div>
            <label className="font-semibold block flex items-center gap-2">
              Minimum Level
              {user.isPremium ? (
                <Sparkles className="w-4 h-4 text-yellow-400" />
              ) : (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </label>
            <span className="text-sm text-muted-foreground">
              {user.isPremium ? "Set level requirement for raiders" : "Elite feature"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold w-8 text-right">{user.isPremium ? minLevel : 1}</span>
          </div>
        </div>
        
        {user.isPremium && (
          <Slider
            value={[minLevel]}
            onValueChange={(val) => setMinLevel(val[0])}
            min={1}
            max={80}
            step={1}
            className="w-full"
            data-testid="slider-min-level"
          />
        )}

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

        {/* Raid Capacity Slider */}
        <div className="space-y-3 pt-2 border-t border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold block flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Raid Capacity
              </label>
              <span className="text-sm text-muted-foreground">
                Maximum players in lobby
              </span>
            </div>
            <span className="text-lg font-bold w-8 text-right">{maxPlayers}</span>
          </div>
          <Slider
            value={[maxPlayers]}
            onValueChange={(val) => setMaxPlayers(val[0])}
            min={2}
            max={6}
            step={1}
            className="w-full"
            data-testid="slider-max-players"
          />
          <p className="text-xs text-muted-foreground text-center">
            Host + up to {maxPlayers - 1} remote invites
          </p>
        </div>

        {/* Private Group option */}
        {userGroups.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-card-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <label className="font-semibold text-sm">Private Group</label>
            </div>
            <p className="text-xs text-muted-foreground">Restrict this lobby to your group members</p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all",
                  !selectedGroupId
                    ? "bg-card border-card-border text-foreground"
                    : "border-transparent text-muted-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" /> Public (anyone can join)
              </button>
              {userGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all",
                    selectedGroupId === g.id
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                      : "border-transparent text-muted-foreground"
                  )}
                >
                  <Shield className="w-3.5 h-3.5" /> {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleHost}
        disabled={isPending || !selectedBoss}
        className={cn("w-full py-6 text-lg font-black rounded-2xl", selectedTeamData.bg)}
        data-testid="button-create-lobby"
      >
        {isPending ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating Lobby…</>
        ) : (
          <><Plus className="w-5 h-5 mr-2" />CREATE LOBBY</>
        )}
      </Button>

      {/* Pokemon Details Modal - shows comprehensive boss information */}
      <PokemonDetailsModal
        pokemonId={detailsBossId || ""}
        isOpen={!!detailsBossId}
        onClose={() => setDetailsBossId(null)}
      />
    </div>
  );
}
