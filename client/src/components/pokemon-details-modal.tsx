/**
 * BossDetailsModal
 *
 * Fetches live data from PokeAPI and displays it fully in-app:
 *   - Types (with colour-coded badges)
 *   - Base stats (HP / Attack / Defense / Sp.Atk / Sp.Def / Speed) with bars
 *   - Type-effectiveness: weaknesses 2× / 4× and resistances
 *
 * No external links. Everything renders inside this modal.
 */

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import type { CurrentBoss } from "@shared/schema";

// ── Props ─────────────────────────────────────────────────────────────────────

interface BossDetailsModalProps {
  bossId: string;
  boss?: CurrentBoss | null;
  isOpen: boolean;
  onClose: () => void;
  raidEndTime?: number;   // kept for call-site compatibility
  isCounter?: boolean;    // kept for call-site compatibility
}

// ── Type chart (Gen 9 standard) ───────────────────────────────────────────────
// TYPE_CHART[attackingType][defendingType] = damage multiplier

const TYPE_CHART: Record<string, Record<string, number>> = {
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

const ALL_TYPES = Object.keys(TYPE_CHART);

function calcEffectiveness(defTypes: string[]): {
  weaknesses: { type: string; mult: number }[];
  resistances: { type: string; mult: number }[];
} {
  const result: Record<string, number> = {};
  for (const atk of ALL_TYPES) {
    let mult = 1;
    for (const def of defTypes) {
      mult *= TYPE_CHART[atk]?.[def] ?? 1;
    }
    result[atk] = mult;
  }
  const weaknesses = Object.entries(result)
    .filter(([, m]) => m > 1)
    .map(([t, m]) => ({ type: t, mult: m }))
    .sort((a, b) => b.mult - a.mult);
  const resistances = Object.entries(result)
    .filter(([, m]) => m < 1 && m > 0)
    .map(([t, m]) => ({ type: t, mult: m }))
    .sort((a, b) => a.mult - b.mult);
  return { weaknesses, resistances };
}

// ── Type colours ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  normal:   "bg-gray-400 text-white",
  fire:     "bg-orange-500 text-white",
  water:    "bg-blue-500 text-white",
  electric: "bg-yellow-400 text-black",
  grass:    "bg-green-500 text-white",
  ice:      "bg-cyan-400 text-white",
  fighting: "bg-red-700 text-white",
  poison:   "bg-purple-500 text-white",
  ground:   "bg-amber-600 text-white",
  flying:   "bg-indigo-400 text-white",
  psychic:  "bg-pink-500 text-white",
  bug:      "bg-lime-600 text-white",
  rock:     "bg-stone-500 text-white",
  ghost:    "bg-violet-700 text-white",
  dragon:   "bg-indigo-700 text-white",
  dark:     "bg-zinc-700 text-white",
  steel:    "bg-slate-400 text-white",
  fairy:    "bg-pink-300 text-black",
};

function TypeBadge({ type, suffix }: { type: string; suffix?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", TYPE_COLORS[type] ?? "bg-muted text-foreground")}>
      {type}{suffix}
    </span>
  );
}

// ── Stat bar ──────────────────────────────────────────────────────────────────

const STAT_LABELS: Record<string, string> = {
  hp:               "HP",
  attack:           "ATK",
  defense:          "DEF",
  "special-attack": "SP.ATK",
  "special-defense":"SP.DEF",
  speed:            "SPD",
};

const STAT_COLORS: Record<string, string> = {
  hp:               "bg-red-400",
  attack:           "bg-orange-400",
  defense:          "bg-yellow-400",
  "special-attack": "bg-blue-400",
  "special-defense":"bg-green-400",
  speed:            "bg-pink-400",
};

function StatBar({ name, value }: { name: string; value: number }) {
  const pct = Math.min(100, Math.round((value / 255) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-muted-foreground w-14 shrink-0">
        {STAT_LABELS[name] ?? name.toUpperCase()}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", STAT_COLORS[name] ?? "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right">{value}</span>
    </div>
  );
}

// ── Tier labels ───────────────────────────────────────────────────────────────

const TIER_LABEL: Record<number, string> = {
  1: "Tier 1",
  3: "Tier 3",
  4: "Mega Raid",
  5: "Tier 5 — Legendary",
  6: "Elite / Dynamax",
};

const TIER_COLOR: Record<number, string> = {
  1: "text-green-400",
  3: "text-blue-400",
  4: "text-orange-400",
  5: "text-violet-400",
  6: "text-pink-400",
};

// ── PokeAPI shapes ────────────────────────────────────────────────────────────

interface PokeApiStat { base_stat: number; stat: { name: string } }
interface PokeApiType { type: { name: string } }
interface PokeApiData {
  types: PokeApiType[];
  stats: PokeApiStat[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPokeApiSlug(bossName: string): string {
  const name = bossName.trim();

  // Regional variants: PokeAPI uses suffix format (grimer-alola, zigzagoon-galar, etc.)
  const regionalMatch = name.match(/^(Alolan|Galarian|Hisuian|Paldean)\s+(.+)$/i);
  if (regionalMatch) {
    const prefix  = regionalMatch[1].toLowerCase();
    const species = regionalMatch[2].replace(/\s+/g, "-").toLowerCase();
    const suffix  = prefix === "alolan"   ? "alola"
                  : prefix === "paldean"  ? "paldea"
                  : prefix === "hisuian"  ? "hisui"
                  : /* galarian */          "galar";
    return `${species}-${suffix}`;
  }

  // Strip battle/form prefixes and slugify
  return name
    .replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax)\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// ── Main component ────────────────────────────────────────────────────────────

export function BossDetailsModal({ bossId, boss, isOpen, onClose }: BossDetailsModalProps) {
  const [pokeData, setPokeData] = useState<PokeApiData | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const bossName = boss?.name ?? bossId;

  function doFetch() {
    setPokeData(null);
    setError(null);
    setLoading(true);
    const slug = buildPokeApiSlug(bossName);
    fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: any) => {
        setPokeData({ types: data.types ?? [], stats: data.stats ?? [] });
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load Pokémon data. Check your connection and try again.");
        setLoading(false);
      });
  }

  useEffect(() => {
    if (isOpen && bossId) doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bossId]);

  if (!isOpen || !bossId) return null;

  const displayName = boss?.name ?? bossId;
  const tier        = boss?.tier ?? 5;
  const category    = boss?.category ?? TIER_LABEL[tier] ?? `Tier ${tier}`;
  const image       = boss?.image ?? "";

  const types      = pokeData?.types.map(t => t.type.name) ?? [];
  const stats      = pokeData?.stats ?? [];
  const statTotal  = stats.reduce((s, x) => s + x.base_stat, 0);
  const { weaknesses, resistances } = types.length > 0 ? calcEffectiveness(types) : { weaknesses: [], resistances: [] };

  return (
    <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 bg-background border-b border-card-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold text-lg">Raid Boss Details</h2>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-boss-details">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6 pb-nav">

        {/* Boss identity card */}
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl bg-card border border-card-border flex items-center justify-center overflow-hidden">
            <SafeImage src={image} alt={displayName} className="w-20 h-20 object-contain" fallbackChar={displayName[0]} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-2xl leading-tight">{displayName}</h3>
            <p className={cn("text-sm font-semibold mt-1", TIER_COLOR[tier] ?? "text-muted-foreground")}>
              {category}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {boss?.isShadow && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400">Shadow</span>
              )}
              {boss?.isDynamax && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-600/20 text-pink-400">Dynamax</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-card-border" />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Pokémon data…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
            <Button size="sm" variant="outline" onClick={doFetch}>Retry</Button>
          </div>
        )}

        {/* Live data */}
        {!loading && !error && pokeData && (
          <>
            {/* Types */}
            {types.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Type</p>
                <div className="flex flex-wrap gap-2">
                  {types.map(t => <TypeBadge key={t} type={t} />)}
                </div>
              </div>
            )}

            {/* Base stats */}
            {stats.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Base Stats</p>
                <div className="space-y-2">
                  {stats.map(s => (
                    <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-right">Total: {statTotal}</p>
              </div>
            )}

            {/* Weaknesses */}
            {weaknesses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Weaknesses</p>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map(w => (
                    <TypeBadge key={w.type} type={w.type} suffix={w.mult >= 4 ? " ×4" : " ×2"} />
                  ))}
                </div>
              </div>
            )}

            {/* Resistances */}
            {resistances.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resistances</p>
                <div className="flex flex-wrap gap-1.5">
                  {resistances.map(r => (
                    <TypeBadge
                      key={r.type}
                      type={r.type}
                      suffix={r.mult === 0 ? " ×0" : r.mult <= 0.25 ? " ×¼" : " ×½"}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Alias kept for any remaining import sites
export const PokemonDetailsModal = BossDetailsModal;
export default BossDetailsModal;
