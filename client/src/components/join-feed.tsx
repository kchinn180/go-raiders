/**
 * JoinFeed Component
 *
 * Architecture: split into three isolated render zones so that lobby refreshes
 * don't cause the queue bar or filter controls to flicker or re-mount.
 *
 * ┌─────────────────────────────────────────┐  ← sticky, never refreshes
 * │  QueueBossBar (boss circles + counts)   │
 * │  Tier chips  │  Boss filter  │  Pills   │
 * └─────────────────────────────────────────┘
 * ┌─────────────────────────────────────────┐  ← only this section updates
 * │  Lobby list (add / remove raids)        │
 * └─────────────────────────────────────────┘
 *
 * React.memo on StaticHeader + FilterSection prevents any re-render from
 * propagating upward when `lobbies` changes.
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Radar, Filter, X, ChevronDown, ChevronUp, Pause, Shield } from "lucide-react";
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
import { AdNativeCard } from "@/components/ad-native-card";
import { getCurrentWeather, WEATHER_ICONS, WEATHER_LABELS } from "@/lib/weather-service";
import type { CurrentWeather } from "@/lib/weather-service";
import { GroupModal } from "@/components/group-modal";
import type { RaidGroup } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JoinFeedProps {
  lobbies: Lobby[];
  loading: boolean;
  isFetching?: boolean;
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
  autoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
  onHostClick?: () => void;
}

// ─── Static header: QueueBossBar + pills ─────────────────────────────────────
// Wrapped in React.memo — only re-renders when its own props change (never on
// lobby list refreshes).

interface StaticHeaderProps {
  userId: string;
  userName: string;
  userLevel: number;
  userTeam: 'valor' | 'mystic' | 'instinct' | 'neutral';
  friendCode: string;
  isPremium: boolean;
  onQueueJoined: (bossId: string) => void;
  autoRefresh: boolean;
  isFetching: boolean;
  isRefreshing: boolean;
  onToggleAutoRefresh?: () => void;
  // weather
  weatherBoostOnly: boolean;
  onToggleWeather: () => void;
  weatherLoading: boolean;
  currentWeather: CurrentWeather | null;
  // group
  activeGroup: RaidGroup | null;
  groupFilterOnly: boolean;
  onToggleGroupFilter: () => void;
  onClearGroup: () => void;
  onOpenGroupModal: () => void;
}

const StaticHeader = memo(function StaticHeader({
  userId, userName, userLevel, userTeam, friendCode, isPremium, onQueueJoined,
  autoRefresh, isFetching, isRefreshing, onToggleAutoRefresh,
  weatherBoostOnly, onToggleWeather, weatherLoading, currentWeather,
  activeGroup, groupFilterOnly, onToggleGroupFilter, onClearGroup, onOpenGroupModal,
}: StaticHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Top pills: group + weather + live toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Private group pill */}
          {activeGroup ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleGroupFilter}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all",
                  groupFilterOnly
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                    : "bg-card border-card-border text-muted-foreground"
                )}
                data-testid="button-group-filter"
              >
                <Shield className="w-2.5 h-2.5" />
                {activeGroup.name}
              </button>
              <button
                onClick={onClearGroup}
                className="text-muted-foreground/50 hover:text-muted-foreground p-0.5"
                title="Leave group"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenGroupModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all bg-card border-card-border text-muted-foreground"
              data-testid="button-open-group-modal"
            >
              <Shield className="w-2.5 h-2.5" />
              Group
            </button>
          )}

          {/* Weather boost filter — premium only */}
          {isPremium && (
            <button
              onClick={onToggleWeather}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all",
                weatherBoostOnly
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                  : "bg-card border-card-border text-muted-foreground"
              )}
              data-testid="button-weather-boost-filter"
            >
              {weatherLoading ? "⏳" : currentWeather ? WEATHER_ICONS[currentWeather.pgoWeather] : "🌡️"}
              {weatherBoostOnly
                ? currentWeather ? WEATHER_LABELS[currentWeather.pgoWeather] : "Boosted"
                : "Boosted"}
            </button>
          )}
        </div>

        {/* Auto-refresh pill */}
        <button
          onClick={onToggleAutoRefresh}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all",
            autoRefresh
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-card border-card-border text-muted-foreground"
          )}
          data-testid="button-auto-refresh-toggle"
        >
          {autoRefresh ? (
            <><RefreshCw className={cn("w-2.5 h-2.5", (isFetching || isRefreshing) && "animate-spin")} />Live</>
          ) : (
            <><Pause className="w-2.5 h-2.5" />Paused</>
          )}
        </button>
      </div>

      {/* Queue boss bar */}
      <QueueBossBar
        userId={userId}
        userName={userName}
        userLevel={userLevel}
        userTeam={userTeam}
        friendCode={friendCode}
        isPremium={isPremium}
        onQueueJoined={onQueueJoined}
      />
    </div>
  );
});

// ─── Filter section ───────────────────────────────────────────────────────────
// Also memoized — only re-renders when filter state or availableBossIds change.

interface FilterSectionProps {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  selectedBosses: Set<string>;
  isBossFilterOpen: boolean;
  setIsBossFilterOpen: (v: boolean) => void;
  toggleBossFilter: (id: string) => void;
  clearBossFilter: () => void;
  availableBossIds: Set<string>;
}

const FilterSection = memo(function FilterSection({
  filter, setFilter,
  selectedBosses, isBossFilterOpen, setIsBossFilterOpen,
  toggleBossFilter, clearBossFilter, availableBossIds,
}: FilterSectionProps) {
  return (
    <div className="space-y-3">
      {/* Tier filter chips */}
      <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-card-border"
            )}
            data-testid={`filter-${f}`}
          >
            {f === "max" ? "MAX" : f}
          </button>
        ))}
      </div>

      {/* Boss filter collapsible */}
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
                onClick={(e) => { e.stopPropagation(); clearBossFilter(); }}
                data-testid="button-clear-boss-filter"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            {isBossFilterOpen
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {isBossFilterOpen && (
          <div className="px-3 pb-3 border-t border-card-border">
            <p className="text-xs text-muted-foreground py-2">
              Select bosses to filter raids. Only lobbies with selected bosses will appear.
            </p>
            <div className="grid grid-cols-4 gap-2">
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
                        : "bg-card border-card-border",
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
                      {boss.name.length > 10 ? boss.name.slice(0, 10) + '…' : boss.name}
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
    </div>
  );
});

// ─── Lobby list ───────────────────────────────────────────────────────────────
// This is the ONLY section that re-renders when `lobbies` changes.

interface LobbyListProps {
  filteredLobbies: Lobby[];
  isPremium: boolean;
  userId: string;
  selectedBosses: Set<string>;
  clearBossFilter: () => void;
  onJoin: (lobby: Lobby) => void;
  onShowDetails: (bossId: string, endTime: number) => void;
  onHostClick?: () => void;
}

const LobbyList = memo(function LobbyList({
  filteredLobbies, isPremium, userId,
  selectedBosses, clearBossFilter, onJoin, onShowDetails, onHostClick,
}: LobbyListProps) {
  const { toast } = useToast();

  // Timer tick so countdowns update inside lobby cards without parent re-renders
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (filteredLobbies.length === 0) {
    if (selectedBosses.size > 0) {
      // Boss filter active — no matching lobbies
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Radar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold">No raids for selected bosses</p>
          <p className="text-sm mt-1">No one has hosted these bosses yet.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={clearBossFilter}
            data-testid="button-clear-boss-filter-empty"
          >
            Clear Boss Filter
          </Button>
        </div>
      );
    }

    // No lobbies at all — encourage hosting
    return (
      <div className="text-center py-14 text-muted-foreground">
        <div className="text-5xl mb-4">🏟️</div>
        <p className="text-lg font-black text-foreground">No Raids Available</p>
        <p className="text-sm mt-2 mb-6 max-w-xs mx-auto leading-relaxed">
          Be the first trainer to host a raid and help your community take down a legendary boss!
        </p>
        {onHostClick && (
          <Button
            onClick={onHostClick}
            className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl"
            data-testid="button-empty-state-host"
          >
            + Host a Raid
          </Button>
        )}
        <p className="text-xs text-muted-foreground/60 mt-6">
          Auto-refreshing every 15 seconds
        </p>
      </div>
    );
  }

  const AD_FREQUENCY = 5;
  return (
    <div className="space-y-3">
      {filteredLobbies.flatMap((lobby, idx) => {
        const isLocked = !isPremium && Date.now() - lobby.createdAt < 10000;
        const showAdAfter = !isPremium && idx > 0 && idx % AD_FREQUENCY === 0;
        return [
          ...(showAdAfter ? [<AdNativeCard key={`ad-${idx}`} userId={userId} />] : []),
          <div key={lobby.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <LobbyCard
              lobby={lobby}
              isLocked={isLocked}
              onJoin={() => {
                if (isLocked) {
                  toast({
                    title: "Elite Early Access",
                    description: "Upgrade to Elite to join raids instantly — no 10s wait.",
                  });
                } else {
                  onJoin(lobby);
                }
              }}
              onShowDetails={onShowDetails}
            />
          </div>,
        ];
      })}
    </div>
  );
});

// ─── Root component ───────────────────────────────────────────────────────────

export function JoinFeed({
  lobbies,
  loading,
  isFetching = false,
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
  autoRefresh = true,
  onToggleAutoRefresh,
  onHostClick,
}: JoinFeedProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Modal state
  const [detailsInfo, setDetailsInfo] = useState<{ bossId: string; endTime: number } | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Filter state
  const [selectedBosses, setSelectedBosses] = useState<Set<string>>(new Set());
  const [isBossFilterOpen, setIsBossFilterOpen] = useState(false);

  // Weather filter (premium)
  const [weatherBoostOnly, setWeatherBoostOnly] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Group filter
  const [activeGroup, setActiveGroup] = useState<RaidGroup | null>(null);
  const [groupFilterOnly, setGroupFilterOnly] = useState(false);

  // Load weather when premium user enables it
  useEffect(() => {
    if (!weatherBoostOnly || !isPremium || currentWeather) return;
    setWeatherLoading(true);
    getCurrentWeather().then(w => { setCurrentWeather(w); setWeatherLoading(false); });
  }, [weatherBoostOnly, isPremium, currentWeather]);

  const toggleBossFilter = useCallback((bossId: string) => {
    setSelectedBosses(prev => {
      const next = new Set(prev);
      next.has(bossId) ? next.delete(bossId) : next.add(bossId);
      return next;
    });
  }, []);

  const clearBossFilter = useCallback(() => setSelectedBosses(new Set()), []);

  const handleShowDetails = useCallback((bossId: string, lobbyEndTime: number) => {
    setDetailsInfo({ bossId, endTime: lobbyEndTime });
  }, []);

  // Pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    setPullDistance(Math.max(0, Math.min(100, e.touches[0].clientY - touchStartY.current)));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, onRefresh, isRefreshing]);

  // Filtered lobby list — only recomputed when lobbies or filter state changes
  const filteredLobbies = useMemo(() => {
    return lobbies.filter((lobby) => {
      const boss = BOSSES.find((b) => b.id === lobby.bossId);
      if (!boss) return false;

      if (selectedBosses.size > 0 && !selectedBosses.has(lobby.bossId)) return false;

      if (weatherBoostOnly && isPremium && currentWeather) {
        const bossTypes = (boss as any).types as string[] | undefined;
        if (bossTypes && !currentWeather.isBoosted(bossTypes)) return false;
      }

      if (groupFilterOnly && activeGroup && lobby.groupId !== activeGroup.id) return false;

      if (filter === "all") return true;
      if (filter === "mega") return boss.name.toLowerCase().includes("mega");
      if (filter === "shadow") return boss.isShadow;
      if (filter === "max") return boss.isDynamax;
      return boss.tier.toString() === filter;
    });
  }, [lobbies, filter, selectedBosses, weatherBoostOnly, isPremium, currentWeather, groupFilterOnly, activeGroup]);

  // Boss IDs with live lobbies — passed to FilterSection so LIVE dots update
  const availableBossIds = useMemo(
    () => new Set(lobbies.map(l => l.bossId)),
    [lobbies]
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thin fetch progress bar — only visible during manual refresh, not auto-refresh */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden transition-opacity duration-300",
        isRefreshing ? "opacity-100" : "opacity-0"
      )}>
        <div className="h-full bg-primary animate-[shimmer_1.5s_linear_infinite] bg-gradient-to-r from-transparent via-primary to-transparent bg-[length:200%_100%]" />
      </div>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute left-0 right-0 flex justify-center z-10 transition-opacity"
          style={{ top: Math.max(8, pullDistance * 0.4), opacity: Math.min(1, pullDistance / 60) }}
        >
          <div className="bg-card rounded-full p-2 shadow-lg border border-card-border">
            <RefreshCw className={cn("w-5 h-5 text-muted-foreground", isRefreshing && "animate-spin")} />
          </div>
        </div>
      )}

      {/* ══ STATIC ZONE — always visible, NEVER replaced by skeletons ══ */}
      <div className="px-4 pt-4 space-y-3">
        <StaticHeader
          userId={userId}
          userName={userName}
          userLevel={userLevel}
          userTeam={userTeam}
          friendCode={friendCode}
          isPremium={isPremium}
          onQueueJoined={onQueueJoined}
          autoRefresh={autoRefresh}
          isFetching={isFetching}
          isRefreshing={isRefreshing}
          onToggleAutoRefresh={onToggleAutoRefresh}
          weatherBoostOnly={weatherBoostOnly}
          onToggleWeather={() => setWeatherBoostOnly(p => !p)}
          weatherLoading={weatherLoading}
          currentWeather={currentWeather}
          activeGroup={activeGroup}
          groupFilterOnly={groupFilterOnly}
          onToggleGroupFilter={() => setGroupFilterOnly(p => !p)}
          onClearGroup={() => { setActiveGroup(null); setGroupFilterOnly(false); }}
          onOpenGroupModal={() => setGroupModalOpen(true)}
        />

        <FilterSection
          filter={filter}
          setFilter={setFilter}
          selectedBosses={selectedBosses}
          isBossFilterOpen={isBossFilterOpen}
          setIsBossFilterOpen={setIsBossFilterOpen}
          toggleBossFilter={toggleBossFilter}
          clearBossFilter={clearBossFilter}
          availableBossIds={availableBossIds}
        />
      </div>

      {/* ══ LIVE ZONE — skeleton here only, header/filters never affected ══ */}
      <div className="px-4 pt-3 pb-nav">
        {loading && lobbies.length === 0 ? (
          <div className="space-y-2 pt-1">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="w-full h-[68px] rounded-xl" />
            ))}
          </div>
        ) : (
          <LobbyList
            filteredLobbies={filteredLobbies}
            isPremium={isPremium}
            userId={userId}
            selectedBosses={selectedBosses}
            clearBossFilter={clearBossFilter}
            onJoin={onJoin}
            onShowDetails={handleShowDetails}
            onHostClick={onHostClick}
          />
        )}
      </div>

      {/* Modals */}
      <PokemonDetailsModal
        pokemonId={detailsInfo?.bossId || ""}
        raidEndTime={detailsInfo?.endTime}
        isOpen={!!detailsInfo}
        onClose={() => setDetailsInfo(null)}
      />

      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        userId={userId}
        userName={userName}
        onGroupJoined={(group) => {
          setActiveGroup(group);
          setGroupModalOpen(false);
        }}
      />
    </div>
  );
}
