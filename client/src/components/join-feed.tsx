/**
 * JoinFeed Component
 * 
 * Displays a scrollable feed of available raid lobbies with:
 * - Pull-to-refresh functionality
 * - Quick Raid button for instant lobby joining
 * - Auto Join button for premium users
 * - Filter chips for raid tiers (All, 1, 3, 5, Mega, Shadow, Max)
 * - Lobby cards with Details button for Pokémon information
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LobbyCard } from "@/components/lobby-card";
import { PokemonDetailsModal } from "@/components/pokemon-details-modal";
import { QueueBossBar } from "@/components/queue-boss-bar";
import { Skeleton } from "@/components/ui/skeleton";
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

  const filteredLobbies = lobbies.filter((lobby) => {
    if (filter === "all") return true;
    const boss = BOSSES.find((b) => b.id === lobby.bossId);
    if (!boss) return false;

    if (filter === "mega") return boss.name.toLowerCase().includes("mega");
    if (filter === "shadow") return boss.isShadow;
    if (filter === "max") return boss.isDynamax;
    return boss.tier.toString() === filter;
  });

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

      <div className="space-y-3">
        {filteredLobbies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Radar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold">No lobbies found</p>
            <p className="text-sm">Try a different filter or check back soon</p>
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
