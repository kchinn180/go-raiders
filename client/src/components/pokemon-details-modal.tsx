/**
 * Boss Details Modal Component
 *
 * Displays comprehensive information about a raid boss including:
 * - Name, image, tier, and CP
 * - Types with colored badges
 * - Weaknesses and resistances calculated from type effectiveness
 * - Available movesets (fast and charged moves)
 * - Top recommended counters with their effectiveness scores
 * - Base stats (Attack, Defense, Stamina)
 * - Countdown timer for when the raid ends
 *
 * Data source priority:
 *   1. Local static database (getRaidBossDetailsClient) — instant, has moves + counters
 *   2. PokeAPI fallback — async, provides types + stats + weaknesses + counters
 *
 * Counters can also be clicked to show their own details modal,
 * enabling a nested modal experience for full exploration.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Swords, Shield, Heart, Clock, Loader2, AlertTriangle, Zap, Target, Info, TrendingUp } from "lucide-react";
import { getRaidBossDetailsClient, getCounterDetailsClient, calcCatchCPRange, calcTopCountersFromTypes } from "@/lib/pokemon-client-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import type {
  PokemonDetails,
  CounterPokemon,
  PokemonType,
  PokemonStats,
} from "@shared/schema";
import type { CurrentBoss } from "@shared/schema";

// ── Props ────────────────────────────────────────────────────────────────────

interface PokemonDetailsModalProps {
  bossId: string;
  boss?: CurrentBoss | null;   // CurrentBoss from live feed — used for PokeAPI fallback
  raidEndTime?: number;
  isOpen: boolean;
  onClose: () => void;
  isCounter?: boolean;
}

// ── Type colours ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  normal:   { bg: 'bg-gray-400/20',    text: 'text-gray-300',    border: 'border-gray-400'   },
  fire:     { bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500' },
  water:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500'   },
  electric: { bg: 'bg-yellow-400/20',  text: 'text-yellow-300',  border: 'border-yellow-400' },
  grass:    { bg: 'bg-green-500/20',   text: 'text-green-400',   border: 'border-green-500'  },
  ice:      { bg: 'bg-cyan-400/20',    text: 'text-cyan-300',    border: 'border-cyan-400'   },
  fighting: { bg: 'bg-red-600/20',     text: 'text-red-400',     border: 'border-red-600'    },
  poison:   { bg: 'bg-purple-500/20',  text: 'text-purple-400',  border: 'border-purple-500' },
  ground:   { bg: 'bg-amber-600/20',   text: 'text-amber-400',   border: 'border-amber-600'  },
  flying:   { bg: 'bg-indigo-400/20',  text: 'text-indigo-300',  border: 'border-indigo-400' },
  psychic:  { bg: 'bg-pink-500/20',    text: 'text-pink-400',    border: 'border-pink-500'   },
  bug:      { bg: 'bg-lime-500/20',    text: 'text-lime-400',    border: 'border-lime-500'   },
  rock:     { bg: 'bg-stone-500/20',   text: 'text-stone-400',   border: 'border-stone-500'  },
  ghost:    { bg: 'bg-violet-600/20',  text: 'text-violet-400',  border: 'border-violet-600' },
  dragon:   { bg: 'bg-indigo-600/20',  text: 'text-indigo-400',  border: 'border-indigo-600' },
  dark:     { bg: 'bg-neutral-700/30', text: 'text-neutral-300', border: 'border-neutral-600'},
  steel:    { bg: 'bg-slate-400/20',   text: 'text-slate-300',   border: 'border-slate-400'  },
  fairy:    { bg: 'bg-pink-400/20',    text: 'text-pink-300',    border: 'border-pink-400'   },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type, small = false }: { type: PokemonType; small?: boolean }) {
  const colors = TYPE_COLORS[type];
  return (
    <Badge
      className={cn(
        colors.bg, colors.text, "border", colors.border,
        small ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        "font-semibold uppercase",
      )}
    >
      {type}
    </Badge>
  );
}

function RaidCountdown({ endTime }: { endTime: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) { setTimeLeft("Raid Ended"); setIsExpired(true); return; }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg",
      isExpired ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary",
    )}>
      <Clock className="w-4 h-4" />
      <span className="font-bold text-sm">{timeLeft}</span>
      <span className="text-xs text-muted-foreground">{isExpired ? "" : "remaining"}</span>
    </div>
  );
}

function MoveDisplay({ move, isFast }: { move: { name: string; type: PokemonType; damage: number; energy: number; isLegacy?: boolean; isElite?: boolean }; isFast: boolean }) {
  const colors = TYPE_COLORS[move.type];
  return (
    <div className={cn("flex items-center justify-between p-2 rounded-lg border", colors.bg, colors.border)}>
      <div className="flex items-center gap-2">
        <Zap className={cn("w-3 h-3", colors.text)} />
        <span className="text-sm font-medium">{move.name}</span>
        {move.isLegacy && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">Legacy</Badge>}
        {move.isElite  && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-yellow-500 text-yellow-500">Elite</Badge>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{move.damage} DMG</span>
        <span>{isFast ? `+${move.energy}` : `-${move.energy}`} EN</span>
      </div>
    </div>
  );
}

function CounterCard({ counter, onShowDetails }: { counter: CounterPokemon; onShowDetails: (id: string) => void }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <SafeImage src={counter.image} alt={counter.name} className="w-12 h-12" fallbackChar={counter.name[0]} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{counter.name}</h4>
          <div className="flex gap-1 mt-1">
            {counter.types.map(type => <TypeBadge key={type} type={type} small />)}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onShowDetails(counter.id)} className="h-8 px-2" data-testid={`button-counter-details-${counter.id}`}>
          <Info className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span className="text-muted-foreground">Fast:</span>
          <span className="font-medium">{counter.fastMove.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Target className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Charged:</span>
          <span className="font-medium">{counter.chargedMove.name}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs pt-1 border-t border-card-border">
        <span className="text-muted-foreground">DPS Score</span>
        <span className="font-bold text-primary">{counter.dps.toFixed(1)}</span>
      </div>
    </div>
  );
}

function StatsDisplay({ stats }: { stats: PokemonStats }) {
  const maxStat = 400;
  const statItems = [
    { label: 'Attack',  value: stats.attack,  icon: Swords, color: 'bg-red-500'   },
    { label: 'Defense', value: stats.defense, icon: Shield, color: 'bg-blue-500'  },
    { label: 'Stamina', value: stats.stamina, icon: Heart,  color: 'bg-green-500' },
  ];
  return (
    <div className="space-y-3">
      {statItems.map(stat => {
        const Icon = stat.icon;
        const pct = Math.min((stat.value / maxStat) * 100, 100);
        return (
          <div key={stat.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", stat.color.replace('bg-', 'text-'))} />
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
              <span className="font-bold">{stat.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", stat.color)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PokeAPI type chart for fallback weakness calc ─────────────────────────────

const POKEAPI_TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock:0.5, ghost:0, steel:0.5 },
  fire:     { fire:0.5, water:0.5, rock:0.5, dragon:0.5, grass:2, ice:2, bug:2, steel:2 },
  water:    { water:0.5, grass:0.5, dragon:0.5, fire:2, ground:2, rock:2 },
  electric: { electric:0.5, grass:0.5, dragon:0.5, ground:0, water:2, flying:2 },
  grass:    { fire:0.5, grass:0.5, poison:0.5, flying:0.5, bug:0.5, dragon:0.5, steel:0.5, water:2, ground:2, rock:2 },
  ice:      { water:0.5, ice:0.5, fire:2, fighting:2, rock:2, steel:2 },
  fighting: { poison:0.5, bug:0.5, psychic:0.5, flying:0.5, fairy:0.5, ghost:0, normal:2, ice:2, rock:2, dark:2, steel:2 },
  poison:   { poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0, grass:2, fairy:2 },
  ground:   { grass:0.5, bug:0.5, flying:0, fire:2, electric:2, poison:2, rock:2, steel:2 },
  flying:   { electric:0.5, rock:0.5, steel:0.5, grass:2, fighting:2, bug:2 },
  psychic:  { psychic:0.5, steel:0.5, dark:0, fighting:2, poison:2 },
  bug:      { fire:0.5, fighting:0.5, flying:0.5, ghost:0.5, steel:0.5, fairy:0.5, grass:2, psychic:2, dark:2 },
  rock:     { fighting:0.5, ground:0.5, steel:0.5, fire:2, ice:2, flying:2, bug:2 },
  ghost:    { normal:0, fighting:0, ghost:2, dark:2 },
  dragon:   { steel:0.5, fairy:0, dragon:2, ice:2 },
  dark:     { fighting:0.5, dark:0.5, fairy:0.5, ghost:2, psychic:2 },
  steel:    { fire:0.5, water:0.5, electric:0.5, steel:0.5, poison:0, grass:2, ice:2, rock:2, fairy:2 },
  fairy:    { fire:0.5, poison:0.5, steel:0.5, fighting:2, dragon:2, dark:2 },
};

function calcApiWeaknesses(defTypes: string[]): { type: PokemonType; multiplier: number }[] {
  return Object.entries(POKEAPI_TYPE_CHART)
    .map(([atk, chart]) => {
      let mult = 1;
      for (const def of defTypes) mult *= chart[def] ?? 1;
      return { type: atk as PokemonType, multiplier: mult };
    })
    .filter(x => x.multiplier > 1)
    .sort((a, b) => b.multiplier - a.multiplier);
}

function calcApiResistances(defTypes: string[]): { type: PokemonType; multiplier: number }[] {
  return Object.entries(POKEAPI_TYPE_CHART)
    .map(([atk, chart]) => {
      let mult = 1;
      for (const def of defTypes) mult *= chart[def] ?? 1;
      return { type: atk as PokemonType, multiplier: mult };
    })
    .filter(x => x.multiplier < 1 && x.multiplier > 0)
    .sort((a, b) => a.multiplier - b.multiplier);
}

// Convert PokeAPI stat names to Go stats (approximate)
function pokeApiStatsToGo(apiStats: { base_stat: number; stat: { name: string } }[]): PokemonStats {
  const get = (name: string) => apiStats.find(s => s.stat.name === name)?.base_stat ?? 100;
  return {
    attack:  get('attack'),
    defense: get('defense'),
    stamina: get('hp'),
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function BossDetailsModal({
  bossId,
  boss,
  raidEndTime,
  isOpen,
  onClose,
  isCounter = false,
}: PokemonDetailsModalProps) {
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);

  // PokeAPI fallback state
  const [apiDetails,  setApiDetails]  = useState<{ pokemon: PokemonDetails; counters: CounterPokemon[] } | null>(null);
  const [loadingApi,  setLoadingApi]  = useState(false);
  const [apiError,    setApiError]    = useState(false);

  // 1 — Try local static database first (synchronous, instant)
  const localDetails = useMemo(
    () => (isOpen && !isCounter && bossId) ? getRaidBossDetailsClient(bossId, raidEndTime) : null,
    [isOpen, isCounter, bossId, raidEndTime],
  );

  const counterDetails = useMemo(
    () => (isOpen && isCounter && bossId) ? getCounterDetailsClient(bossId) : null,
    [isOpen, isCounter, bossId],
  );

  // 2 — If boss not in local DB, fetch from PokeAPI
  useEffect(() => {
    if (!isOpen || !bossId || isCounter || localDetails) {
      setApiDetails(null);
      setApiError(false);
      return;
    }

    setApiDetails(null);
    setApiError(false);
    setLoadingApi(true);

    // Derive PokeAPI slug from boss name
    const rawName = boss?.name ?? bossId;
    const regionalMatch = rawName.match(/^(Alolan|Galarian|Hisuian|Paldean)\s+(.+)$/i);
    let slug: string;
    if (regionalMatch) {
      const prefix  = regionalMatch[1].toLowerCase();
      const species = regionalMatch[2].replace(/\s+/g, '-').toLowerCase();
      const suffix  = prefix === 'alolan' ? 'alola' : prefix === 'paldean' ? 'paldea' : prefix === 'hisuian' ? 'hisui' : 'galar';
      slug = `${species}-${suffix}`;
    } else {
      slug = rawName
        .replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax)\s+/i, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
    }

    fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: any) => {
        const types = (data.types as { type: { name: string } }[]).map(t => t.type.name);
        const goStats = pokeApiStatsToGo(data.stats ?? []);
        const weaknesses  = calcApiWeaknesses(types);
        const resistances = calcApiResistances(types);
        const counters    = calcTopCountersFromTypes(types as PokemonType[]);

        const pokemon: PokemonDetails = {
          id:           bossId,
          name:         boss?.name ?? bossId,
          types:        types as PokemonType[],
          stats:        goStats,
          fastMoves:    [],
          chargedMoves: [],
          weaknesses,
          resistances,
          tier:  boss?.tier,
          cp:    undefined,   // PokeAPI doesn't have Go CP
          image: boss?.image ?? '',
          raidEndTime,
        };

        setApiDetails({ pokemon, counters });
        setLoadingApi(false);
      })
      .catch(() => {
        setApiError(true);
        setLoadingApi(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bossId, isCounter, localDetails]);

  useEffect(() => {
    if (!isOpen) setSelectedCounterId(null);
  }, [isOpen]);

  if (!isOpen || !bossId || bossId.length === 0) return null;

  // Resolve which data to show
  const bossDetails    = localDetails ?? (apiDetails ? { pokemon: apiDetails.pokemon, counters: apiDetails.counters, estimatedPlayers: undefined } : null);
  const pokemon        = isCounter ? counterDetails : bossDetails?.pokemon;
  const counters       = bossDetails?.counters;
  const estimatedPlayers = bossDetails && 'estimatedPlayers' in bossDetails ? (bossDetails as any).estimatedPlayers : undefined;

  const isLoading = loadingApi;
  const isError   = !isLoading && isOpen && !!bossId && !pokemon && (apiError || (!localDetails && !apiDetails && !loadingApi));

  // Portal renders directly in <body>, bypassing the app's overflow-hidden
  // flex container which clips fixed children on iOS WebKit
  return createPortal(
    <>
      <div className="fixed inset-0 z-[200] bg-background overflow-y-auto" data-testid="modal-boss-details">
        {/* Sticky header — max() ensures text never hides behind the notch/dynamic island */}
        <div className="sticky top-0 z-10 bg-background border-b border-card-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-bold text-lg">{isCounter ? "Counter Details" : "Raid Boss Details"}</h2>
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-boss-details">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 pb-nav space-y-6">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading details…</p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <p className="text-destructive font-medium">Could not load details</p>
              <p className="text-xs text-muted-foreground text-center px-6">Check your connection and try again.</p>
            </div>
          )}

          {/* Boss data */}
          {pokemon && (
            <>
              {/* Header */}
              <div className="flex items-center gap-4">
                <SafeImage src={pokemon.image} alt={pokemon.name} className="w-24 h-24 rounded-xl bg-card" fallbackChar={pokemon.name[0]} />
                <div className="flex-1">
                  <h3 className="font-black text-xl">{pokemon.name}</h3>
                  {pokemon.tier && pokemon.cp && (
                    <p className="text-muted-foreground text-sm">Tier {pokemon.tier} • CP {pokemon.cp.toLocaleString()}</p>
                  )}
                  {pokemon.tier && !pokemon.cp && (
                    <p className="text-muted-foreground text-sm">Tier {pokemon.tier}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {pokemon.types.map(type => <TypeBadge key={type} type={type} />)}
                  </div>
                  {estimatedPlayers && (
                    <p className="text-xs text-muted-foreground mt-2">Recommended: {estimatedPlayers}+ trainers</p>
                  )}
                </div>
              </div>

              {/* Countdown */}
              {raidEndTime && <RaidCountdown endTime={raidEndTime} />}

              {/* Catch CP range — only when we have Go stats from local DB */}
              {pokemon.tier && pokemon.cp && pokemon.stats && (
                (() => {
                  const ranges = calcCatchCPRange(pokemon.stats);
                  return (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Catch CP Range
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card border border-card-border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Normal</p>
                          <p className="font-bold text-sm">{ranges.normal.min.toLocaleString()} – {ranges.normal.max.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Level 20</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-xs text-blue-400 mb-1">☁️ Weather Boost</p>
                          <p className="font-bold text-sm">{ranges.weatherBoosted.min.toLocaleString()} – {ranges.weatherBoosted.max.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Level 25</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Stats */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">Base Stats</h4>
                <StatsDisplay stats={pokemon.stats} />
              </div>

              {/* Weaknesses */}
              {pokemon.weaknesses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Weaknesses ({pokemon.weaknesses.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {pokemon.weaknesses.map(w => (
                      <div key={w.type} className="flex items-center gap-1">
                        <TypeBadge type={w.type} small />
                        <span className="text-xs text-destructive font-medium">{w.multiplier.toFixed(2)}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resistances */}
              {pokemon.resistances.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Resistances ({pokemon.resistances.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {pokemon.resistances.map(r => (
                      <div key={r.type} className="flex items-center gap-1">
                        <TypeBadge type={r.type} small />
                        <span className="text-xs text-green-500 font-medium">{r.multiplier.toFixed(2)}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Moves — only when available from local DB */}
              {pokemon.fastMoves.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Fast Moves ({pokemon.fastMoves.length})</h4>
                  <div className="space-y-2">
                    {pokemon.fastMoves.map(move => <MoveDisplay key={move.name} move={move} isFast />)}
                  </div>
                </div>
              )}

              {/* Charged Moves — only when available from local DB */}
              {pokemon.chargedMoves.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Charged Moves ({pokemon.chargedMoves.length})</h4>
                  <div className="space-y-2">
                    {pokemon.chargedMoves.map(move => <MoveDisplay key={move.name} move={move} isFast={false} />)}
                  </div>
                </div>
              )}

              {/* Top Counters */}
              {counters && counters.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Top Counters ({counters.length})</h4>
                    <span className="text-xs text-muted-foreground">Tap for details</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {counters.map(counter => (
                      <CounterCard key={counter.id} counter={counter} onShowDetails={id => setSelectedCounterId(id)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Nested counter details */}
      {selectedCounterId !== null && (
        <BossDetailsModal
          bossId={selectedCounterId}
          isOpen={true}
          onClose={() => setSelectedCounterId(null)}
          isCounter={true}
        />
      )}
    </>,
    document.body
  );
}

// Aliases
export const PokemonDetailsModal = BossDetailsModal;
export default BossDetailsModal;
