/**
 * CatchHistoryView  — premium feature
 *
 * Full-screen stats panel accessible from the Profile tab.
 * Shows: summary cards, boss-by-boss breakdown, recent catch log.
 */

import { Sparkles, Trophy, Target, TrendingUp, Star, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { getApiUrl } from "@/lib/queryClient";
import { BOSSES } from "@shared/schema";
import type { CatchStats } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CatchHistoryViewProps {
  userId: string;
  isPremium: boolean;
  onUpgrade?: () => void;
}

function PremiumGate({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <Lock className="w-12 h-12 text-amber-400 mb-4" />
      <h2 className="text-xl font-black mb-2">Elite Feature</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Track every catch, IV, and shiny with your personal Raid Log. Upgrade to Elite to unlock.
      </p>
      {onUpgrade && (
        <Button
          onClick={onUpgrade}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black px-8"
        >
          <Star className="w-4 h-4 mr-2" />
          Upgrade to Elite
        </Button>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Trophy; label: string; value: string; color: string;
}) {
  return (
    <Card className="p-3 flex flex-col items-center text-center">
      <Icon className={cn("w-5 h-5 mb-1", color)} />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </Card>
  );
}

export function CatchHistoryView({ userId, isPremium, onUpgrade }: CatchHistoryViewProps) {
  const { data: stats, isLoading } = useQuery<CatchStats>({
    queryKey: ["/api/catch/stats", userId],
    queryFn: () => fetch(getApiUrl(`/api/catch/stats/${userId}`)).then(r => r.json()),
    enabled: isPremium && !!userId,
  });

  if (!isPremium) return <PremiumGate onUpgrade={onUpgrade} />;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!stats || stats.totalRaids === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <Trophy className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="font-bold text-muted-foreground">No raids logged yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          After your next raid, tap "Save to Raid Log" to start tracking.
        </p>
      </div>
    );
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  // Sort bosses by most raided
  const topBosses = Object.entries(stats.byBoss)
    .sort(([, a], [, b]) => b.raids - a.raids)
    .slice(0, 10);

  return (
    <div className="p-4 space-y-5 pb-nav">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Target}    label="Raids"    value={String(stats.totalRaids)}  color="text-blue-400" />
        <StatCard icon={Trophy}    label="Caught"   value={String(stats.totalCaught)} color="text-green-400" />
        <StatCard icon={TrendingUp} label="Rate"    value={pct(stats.catchRate)}      color="text-primary" />
        <StatCard icon={Sparkles}  label="Shiny"    value={String(stats.totalShiny)}  color="text-amber-400" />
      </div>

      {/* Shiny rate banner */}
      {stats.totalShiny > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-black text-amber-400">
              {stats.totalShiny} Shiny{stats.totalShiny > 1 ? " encounters" : ""}!
            </p>
            <p className="text-xs text-muted-foreground">
              1 in {Math.round(1 / stats.shinyRate)} — {stats.totalShiny > 3 ? "You're lucky 🍀" : "Keep raiding!"}
            </p>
          </div>
        </div>
      )}

      {/* Boss breakdown */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">By Boss</p>
        <div className="space-y-2">
          {topBosses.map(([bossId, data]) => {
            const boss = BOSSES.find(b => b.id === bossId);
            const catchRate = data.raids ? data.caught / data.raids : 0;
            return (
              <div key={bossId} className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-2.5">
                {boss && (
                  <SafeImage src={boss.image} alt={boss.name} className="w-10 h-10 object-contain flex-shrink-0" fallbackChar={boss.name[0]} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{boss?.name || bossId}</p>
                    {data.shiny > 0 && <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </div>
                  {/* Catch rate bar */}
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${catchRate * 100}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{data.raids} raids</span>
                    <span>{data.caught} caught ({pct(catchRate)})</span>
                    {data.bestCp > 0 && <span>Best: {data.bestCp} CP</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent catches */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent</p>
        <div className="space-y-1.5">
          {stats.recentCatches.map(r => {
            const boss = BOSSES.find(b => b.id === r.bossId);
            return (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", r.caught ? "bg-green-500" : "bg-muted-foreground/30")} />
                <span className="flex-1 truncate text-muted-foreground">{boss?.name || r.bossId}</span>
                {r.isShiny && <Sparkles className="w-3 h-3 text-amber-400" />}
                {r.cp && <span className="text-[10px] text-muted-foreground tabular-nums">{r.cp} CP</span>}
                <span className="text-[10px] text-muted-foreground/50">
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
