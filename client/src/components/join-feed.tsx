import { Radar } from "lucide-react";
import { LobbyCard } from "@/components/lobby-card";
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
  onAutoJoin: () => void;
}

export function JoinFeed({
  lobbies,
  loading,
  filter,
  setFilter,
  isPremium,
  onJoin,
  onAutoJoin,
}: JoinFeedProps) {
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

  return (
    <div className="p-4 space-y-4 pb-28">
      <button
        onClick={onAutoJoin}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-3xl flex items-center justify-between shadow-xl relative overflow-hidden active:scale-[0.98] transition-transform"
        data-testid="button-auto-join"
      >
        <div className="flex items-center relative z-10">
          <div className="p-3 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <div className="text-left text-white">
            <div className="font-black text-lg">Auto Join</div>
            <div className="text-xs opacity-80 font-medium">
              Find boss & skip queue instantly
            </div>
          </div>
        </div>
        <div className="bg-white text-indigo-600 text-xs font-black px-3 py-1 rounded-full relative z-10">
          {isPremium ? "READY" : "PRO"}
        </div>
      </button>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all",
              filter === f
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground border border-card-border hover-elevate"
            )}
            data-testid={`filter-${f}`}
          >
            {f === "max" ? "MAX" : f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
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
              />
            );
          })
        )}
      </div>
    </div>
  );
}
