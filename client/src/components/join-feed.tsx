/**
 * JoinFeed Component
 * 
 * Displays a scrollable feed of available raid lobbies with:
 * - Pull-to-refresh functionality
 * - Quick Raid button for instant lobby joining
 * - Auto Join button for premium users
 * - Filter chips for raid tiers (All, 1, 3, 5, Mega, Shadow, Max)
 * - BOSS FILTER: Multi-select filter for specific raid boss species
 *   - Works alongside tier filters
 *   - Persists until user explicitly clears it
 *   - Shows empty state when no raids match the filter
 * - Lobby cards with Details button for boss information
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Radar, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LobbyCard } from "@/components/lobby-card";
import { PokemonDetailsModal } from "@/components/pokemon-details-modal";
import { QueueBossBar } from "@/components/queue-boss-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import { FILTERS, BOSSES } from "@shared/schema";
import type { Lobby, FilterType } from "@shared/schema";

interface JoinFeedProps {
  lobbies: Lobby[];
  loading: boolean;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  isPremium: boolean;
  onJoin: (lobby: Lobby) => void;
  onRefresh?: () => Promise<void>;
  userId: string;
  userName: string;
  userLevel: number;
  userTeam: 'valor' | 'mystic' | 'instinct' | 'neutral';
  friendCode: string;
  onQueueJoined: (bossId: string) => void;
}

export function JoinFeed({
  lobbies,
  loading,
  filter,
  setFilter,
  isPremium,
  onJoin,
  onRefresh,
  userId,
  userName,
  userLevel,
  userTeam,
  friendCode,
  onQueueJoined,
}: JoinFeedProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const [, forceUpdate] = useState(0);
  
  // State for Pokemon details modal
  const [detailsInfo, setDetailsInfo] = useState<{ bossId: string; endTime: number } | null>(null);
  
  /**
   * BOSS FILTER STATE
   * 
   * Multi-select filter allowing users to filter lobbies by specific raid boss species.
   * - selectedBosses: Set of boss IDs the user wants to see
   * - isBossFilterOpen: Controls the collapsible filter panel visibility
   * - Filter persists until user explicitly clears it
   * - Works alongside the tier filter (both must match for lobby to show)
   */
  const [selectedBosses, setSelectedBosses] = useState<Set<string>>(new Set());
  const [isBossFilterOpen, setIsBossFilterOpen] = useState(false);
  
  /**
   * Toggle a boss in the filter selection
   * If already selected, removes it. If not selected, adds it.
   */
  const toggleBossFilter = useCallback((bossId: string) => {
    setSelectedBosses(prev => {
      const next = new Set(prev);
      if (next.has(bossId)) {
        next.delete(bossId);
      } else {
        next.add(bossId);
      }
      return next;
    });
  }, []);
  
  /**
   * Clear all boss filter selections
   */
  const clearBossFilter = useCallback(() => {
    setSelectedBosses(new Set());
  }, []);
  
  /**
   * Handler for showing Pokemon details modal from lobby cards
   */
  const handleShowDetails = useCallback((bossId: string, lobbyEndTime: number) => {
    setDetailsInfo({ bossId, endTime: lobbyEndTime });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(100, currentY - touchStartY.current));
    setPullDistance(distance);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, onRefresh, isRefreshing]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="w-full h-24 rounded-3xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-16 h-8 rounded-full" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-full h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  /**
   * LOBBY FILTERING LOGIC
   * 
   * Filters lobbies based on two criteria that work together:
   * 1. TIER FILTER: Category-based filter (All, 1, 3, 5, Mega, Shadow, Max)
   * 2. BOSS FILTER: Specific raid boss species filter (multi-select)
   * 
   * Both filters must match for a lobby to be displayed.
   * If boss filter is empty (no selections), only tier filter applies.
   */
  const filteredLobbies = lobbies.filter((lobby) => {
    const boss = BOSSES.find((b) => b.id === lobby.bossId);
    if (!boss) return false;
    
    // BOSS FILTER CHECK
    // If user has selected specific bosses, only show lobbies with those bosses
    // If no bosses selected, this check passes (all bosses allowed)
    const bossFilterPassed = selectedBosses.size === 0 || selectedBosses.has(lobby.bossId);
    if (!bossFilterPassed) return false;
    
    // TIER FILTER CHECK
    // "all" tier shows everything that passed the boss filter
    if (filter === "all") return true;
    
    if (filter === "mega") return boss.name.toLowerCase().includes("mega");
    if (filter === "shadow") return boss.isShadow;
    if (filter === "max") return boss.isDynamax;
    return boss.tier.toString() === filter;
  });
  
  // Get unique bosses that have active lobbies for the Pokémon filter display
  const availableBossIds = new Set(lobbies.map(l => l.bossId));

  const handleManualRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="p-4 space-y-4 pb-28 relative overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute left-0 right-0 flex justify-center transition-opacity z-10"
          style={{ 
            top: Math.max(8, pullDistance * 0.4),
            opacity: Math.min(1, pullDistance / 60)
          }}
        >
          <div className="bg-card rounded-full p-2 shadow-lg border border-card-border">
            <RefreshCw 
              className={cn(
                "w-5 h-5 text-muted-foreground",
                isRefreshing && "animate-spin"
              )} 
            />
          </div>
        </div>
      )}
      
      {onRefresh && (
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="w-full py-2 text-xs text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          data-testid="button-refresh-feed"
        >
          <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing..." : "Pull down or tap to refresh"}
        </button>
      )}
      <QueueBossBar
        userId={userId}
        userName={userName}
        userLevel={userLevel}
        userTeam={userTeam}
        friendCode={friendCode}
        isPremium={isPremium}
        onQueueJoined={onQueueJoined}
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-card-border hover-elevate"
            )}
            data-testid={`filter-${f}`}
          >
            {f === "max" ? "MAX" : f}
          </button>
        ))}
      </div>
      
      {/* BOSS FILTER SECTION
       * Multi-select filter for specific raid boss species
       * - Collapsible panel to save screen space
       * - Shows selected count badge when collapsed
       * - Clear button to reset all selections
       */}
      <div className="bg-card border border-card-border rounded-xl">
        <button
          onClick={() => setIsBossFilterOpen(!isBossFilterOpen)}
          className="w-full p-3 flex items-center justify-between gap-2"
          data-testid="button-boss-filter-toggle"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Boss Filter</span>
            {selectedBosses.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedBosses.size} selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedBosses.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  clearBossFilter();
                }}
                data-testid="button-clear-boss-filter"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            {isBossFilterOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
        
        {isBossFilterOpen && (
          <div className="px-3 pb-3 border-t border-card-border">
            <p className="text-xs text-muted-foreground py-2">
              Select bosses to filter raids. Only lobbies with selected bosses will appear.
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
              {BOSSES.map((boss) => {
                const isSelected = selectedBosses.has(boss.id);
                const hasActiveLobbies = availableBossIds.has(boss.id);
                
                return (
                  <button
                    key={boss.id}
                    onClick={() => toggleBossFilter(boss.id)}
                    className={cn(
                      "p-2 rounded-lg flex flex-col items-center transition-all border",
                      isSelected
                        ? "bg-primary/20 border-primary ring-1 ring-primary/30"
                        : "bg-card border-card-border hover-elevate",
                      !hasActiveLobbies && "opacity-50"
                    )}
                    data-testid={`boss-filter-${boss.id}`}
                  >
                    <SafeImage
                      src={boss.image}
                      alt={boss.name}
                      className="w-8 h-8"
                      fallbackChar={boss.name[0]}
                    />
                    <span className="text-[9px] font-medium truncate w-full text-center mt-1 leading-tight">
                      {boss.name.length > 10 ? boss.name.slice(0, 10) + '...' : boss.name}
                    </span>
                    {hasActiveLobbies && (
                      <span className="text-[8px] text-green-500 font-bold">LIVE</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filteredLobbies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Radar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold">No lobbies found</p>
            {/* EMPTY STATE MESSAGE
             * Provides context-aware messaging based on active filters:
             * - If boss filter is active: explain that no matching raids exist
             * - Otherwise: generic message about trying different filters
             */}
            {selectedBosses.size > 0 ? (
              <>
                <p className="text-sm">No raids available for your selected bosses.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={clearBossFilter}
                  data-testid="button-clear-boss-filter-empty"
                >
                  Clear Boss Filter
                </Button>
              </>
            ) : (
              <p className="text-sm">Try a different filter or check back soon</p>
            )}
          </div>
        ) : (
          filteredLobbies.map((lobby) => {
            const isLocked = !isPremium && Date.now() - lobby.createdAt < 10000;
            return (
              <LobbyCard
                key={lobby.id}
                lobby={lobby}
                isLocked={isLocked}
                onJoin={() => onJoin(lobby)}
                onShowDetails={handleShowDetails}
              />
            );
          })
        )}
      </div>

      {/* Pokemon Details Modal - shows comprehensive boss information */}
      <PokemonDetailsModal
        pokemonId={detailsInfo?.bossId || ""}
        raidEndTime={detailsInfo?.endTime}
        isOpen={!!detailsInfo}
        onClose={() => setDetailsInfo(null)}
      />
    </div>
  );
}
