/**
 * Pokemon Details Modal Component
 * 
 * Displays comprehensive information about a raid Pokémon including:
 * - Name, image, tier, and CP
 * - Types with colored badges
 * - Weaknesses and resistances calculated from type effectiveness
 * - Available movesets (fast and charged moves)
 * - Top recommended counters with their effectiveness scores
 * - Base stats (Attack, Defense, Stamina)
 * - Countdown timer for when the raid ends
 * 
 * Counter Pokémon can also be clicked to show their own details modal,
 * enabling a nested modal experience for full exploration.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Swords, Shield, Heart, Clock, ChevronRight, Loader2, AlertTriangle, Zap, Target, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
import type { 
  PokemonDetails, 
  CounterPokemon, 
  RaidBossDetails, 
  PokemonType 
} from "@shared/schema";

/**
 * Props for the PokemonDetailsModal component
 */
interface PokemonDetailsModalProps {
  pokemonId: string;
  raidEndTime?: number;
  isOpen: boolean;
  onClose: () => void;
  isCounter?: boolean; // If true, fetches from counter endpoint
}

/**
 * Type color mapping for visual distinction of Pokémon types
 * Each type has a unique color scheme for badges
 */
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

/**
 * Type Badge Component
 * Displays a Pokémon type with appropriate coloring
 */
function TypeBadge({ type, small = false }: { type: PokemonType; small?: boolean }) {
  const colors = TYPE_COLORS[type];
  return (
    <Badge 
      className={cn(
        colors.bg, 
        colors.text, 
        "border",
        colors.border,
        small ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        "font-semibold uppercase"
      )}
    >
      {type}
    </Badge>
  );
}

/**
 * Countdown Timer Component
 * Shows remaining time until raid ends with live updates
 */
function RaidCountdown({ endTime }: { endTime: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    /**
     * Calculates and formats the remaining time
     * Updates every second for accurate countdown display
     */
    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeLeft("Raid Ended");
        setIsExpired(true);
        return;
      }
      
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
      isExpired ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
    )}>
      <Clock className="w-4 h-4" />
      <span className="font-bold text-sm">{timeLeft}</span>
      <span className="text-xs text-muted-foreground">
        {isExpired ? "" : "remaining"}
      </span>
    </div>
  );
}

/**
 * Move Display Component
 * Shows a move with its type, damage, and energy information
 */
function MoveDisplay({ move, isFast }: { move: { name: string; type: PokemonType; damage: number; energy: number; isLegacy?: boolean; isElite?: boolean }; isFast: boolean }) {
  const colors = TYPE_COLORS[move.type];
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg border",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-center gap-2">
        <Zap className={cn("w-3 h-3", colors.text)} />
        <span className="text-sm font-medium">{move.name}</span>
        {move.isLegacy && (
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">Legacy</Badge>
        )}
        {move.isElite && (
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-yellow-500 text-yellow-500">Elite</Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{move.damage} DMG</span>
        <span>{isFast ? `+${move.energy}` : `-${move.energy}`} EN</span>
      </div>
    </div>
  );
}

/**
 * Counter Pokemon Card Component
 * Displays a recommended counter with click handler to show its details
 */
function CounterCard({ 
  counter, 
  onShowDetails 
}: { 
  counter: CounterPokemon; 
  onShowDetails: (counterId: string) => void 
}) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <SafeImage 
          src={counter.image} 
          alt={counter.name} 
          className="w-12 h-12"
          fallbackChar={counter.name[0]}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{counter.name}</h4>
          <div className="flex gap-1 mt-1">
            {counter.types.map(type => (
              <TypeBadge key={type} type={type} small />
            ))}
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => onShowDetails(counter.id)}
          className="h-8 px-2"
          data-testid={`button-counter-details-${counter.id}`}
        >
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

/**
 * Stats Display Component
 * Shows Attack, Defense, and Stamina with visual bars
 */
function StatsDisplay({ stats }: { stats: { attack: number; defense: number; stamina: number } }) {
  const maxStat = 400; // Max possible stat value for scaling
  
  const statItems = [
    { label: 'Attack', value: stats.attack, icon: Swords, color: 'bg-red-500' },
    { label: 'Defense', value: stats.defense, icon: Shield, color: 'bg-blue-500' },
    { label: 'Stamina', value: stats.stamina, icon: Heart, color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-3">
      {statItems.map(stat => {
        const Icon = stat.icon;
        const percentage = Math.min((stat.value / maxStat) * 100, 100);
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
              <div 
                className={cn("h-full rounded-full transition-all", stat.color)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Main Pokemon Details Modal Component
 * 
 * Fetches and displays comprehensive Pokémon data from the API.
 * Supports both raid bosses and counter Pokémon with nested modals.
 */
export function PokemonDetailsModal({ 
  pokemonId, 
  raidEndTime,
  isOpen, 
  onClose,
  isCounter = false
}: PokemonDetailsModalProps) {
  // Lock body scroll when modal is open
  useScrollLock(isOpen);
  
  // State for nested counter details modal
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);

  // Fetch raid boss details from API - only when we have a valid pokemonId
  const { data: bossDetails, isLoading: bossLoading, isError: bossError, refetch: refetchBoss } = useQuery<RaidBossDetails>({
    queryKey: ['/api/pokemon/details', pokemonId, raidEndTime ?? 'no-timer'],
    queryFn: async () => {
      const url = raidEndTime 
        ? `/api/pokemon/${pokemonId}/details?raidEndTime=${raidEndTime}`
        : `/api/pokemon/${pokemonId}/details`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch boss details');
      return response.json();
    },
    enabled: isOpen && !isCounter && !!pokemonId && pokemonId.length > 0,
  });

  // Fetch counter pokemon details from API (for nested modals)
  const { data: counterDetails, isLoading: counterLoading, isError: counterError, refetch: refetchCounter } = useQuery<PokemonDetails>({
    queryKey: ['/api/pokemon/counter/details', pokemonId],
    queryFn: async () => {
      const response = await fetch(`/api/pokemon/counter/${pokemonId}/details`);
      if (!response.ok) throw new Error('Failed to fetch counter details');
      return response.json();
    },
    enabled: isOpen && isCounter && !!pokemonId && pokemonId.length > 0,
  });

  // Use appropriate data based on whether this is a counter or raid boss
  const pokemon = isCounter ? counterDetails : bossDetails?.pokemon;
  const counters = bossDetails?.counters;
  const estimatedPlayers = bossDetails?.estimatedPlayers;
  const isLoading = isCounter ? counterLoading : bossLoading;
  const isError = isCounter ? counterError : bossError;
  const refetch = isCounter ? refetchCounter : refetchBoss;

  /**
   * Handles clicking on a counter to show its details
   * Opens a nested modal with the counter's information
   */
  const handleShowCounterDetails = useCallback((counterId: string) => {
    setSelectedCounterId(counterId);
  }, []);

  /**
   * Closes the counter details modal
   */
  const handleCloseCounterDetails = useCallback(() => {
    setSelectedCounterId(null);
  }, []);

  /**
   * Handles clicking outside the modal to close it
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  /**
   * Reset nested modal state when this modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      setSelectedCounterId(null);
    }
  }, [isOpen]);

  // Don't render if not open or no valid pokemonId
  if (!isOpen || !pokemonId || pokemonId.length === 0) return null;

  return (
    <>
      {/* Main Modal Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        data-testid="modal-pokemon-details"
      >
        {/* Modal Content */}
        <div 
          className="bg-background border border-card-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-card-border shrink-0">
            <h2 className="font-bold text-lg">
              {isCounter ? "Counter Details" : "Raid Boss Details"}
            </h2>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onClose}
              data-testid="button-close-pokemon-details"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading details...</p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <p className="text-destructive font-medium">Failed to load details</p>
                <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-details">
                  Try Again
                </Button>
              </div>
            )}

            {/* Pokemon Data */}
            {pokemon && (
              <>
                {/* Pokemon Header with Image and Basic Info */}
                <div className="flex items-center gap-4">
                  <SafeImage 
                    src={pokemon.image} 
                    alt={pokemon.name}
                    className="w-24 h-24 rounded-xl bg-card"
                    fallbackChar={pokemon.name[0]}
                  />
                  <div className="flex-1">
                    <h3 className="font-black text-xl">{pokemon.name}</h3>
                    {pokemon.tier && pokemon.cp && (
                      <p className="text-muted-foreground text-sm">
                        Tier {pokemon.tier} • CP {pokemon.cp.toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {pokemon.types.map(type => (
                        <TypeBadge key={type} type={type} />
                      ))}
                    </div>
                    {estimatedPlayers && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: {estimatedPlayers}+ trainers
                      </p>
                    )}
                  </div>
                </div>

                {/* Raid Timer (if applicable) */}
                {raidEndTime && (
                  <RaidCountdown endTime={raidEndTime} />
                )}

                {/* Stats Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Base Stats</h4>
                  <StatsDisplay stats={pokemon.stats} />
                </div>

                {/* Weaknesses Section */}
                {pokemon.weaknesses.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">
                      Weaknesses ({pokemon.weaknesses.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.weaknesses.map(w => (
                        <div key={w.type} className="flex items-center gap-1">
                          <TypeBadge type={w.type} small />
                          <span className="text-xs text-destructive font-medium">
                            {w.multiplier.toFixed(2)}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resistances Section */}
                {pokemon.resistances.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">
                      Resistances ({pokemon.resistances.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.resistances.map(r => (
                        <div key={r.type} className="flex items-center gap-1">
                          <TypeBadge type={r.type} small />
                          <span className="text-xs text-green-500 font-medium">
                            {r.multiplier.toFixed(2)}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fast Moves Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">
                    Fast Moves ({pokemon.fastMoves.length})
                  </h4>
                  <div className="space-y-2">
                    {pokemon.fastMoves.map(move => (
                      <MoveDisplay key={move.name} move={move} isFast={true} />
                    ))}
                  </div>
                </div>

                {/* Charged Moves Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">
                    Charged Moves ({pokemon.chargedMoves.length})
                  </h4>
                  <div className="space-y-2">
                    {pokemon.chargedMoves.map(move => (
                      <MoveDisplay key={move.name} move={move} isFast={false} />
                    ))}
                  </div>
                </div>

                {/* Top Counters Section (only for raid bosses) */}
                {counters && counters.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase">
                        Top Counters ({counters.length})
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Tap for details
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {counters.map(counter => (
                        <CounterCard 
                          key={counter.id} 
                          counter={counter} 
                          onShowDetails={handleShowCounterDetails}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nested Counter Details Modal */}
      {selectedCounterId && (
        <PokemonDetailsModal
          pokemonId={selectedCounterId}
          isOpen={true}
          onClose={handleCloseCounterDetails}
          isCounter={true}
        />
      )}
    </>
  );
}

export default PokemonDetailsModal;
