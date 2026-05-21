/**
 * BossDetailsModal
 *
 * Displays what we know about a raid boss from the live rotation feed,
 * plus an external link to Pokebattler for full counters / movesets.
 *
 * We no longer maintain a local static boss database, so this modal
 * shows the CurrentBoss data directly (name, image, tier, category)
 * and links out to authoritative sources for the rest.
 */

import { X, ExternalLink, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/safe-image";
import { cn } from "@/lib/utils";
import type { CurrentBoss } from "@shared/schema";

interface BossDetailsModalProps {
  bossId: string;
  boss?: CurrentBoss | null;   // pass the CurrentBoss object if you have it
  isOpen: boolean;
  onClose: () => void;
  raidEndTime?: number;        // unused — kept for call-site compatibility
  isCounter?: boolean;         // unused — kept for call-site compatibility
}

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

export function BossDetailsModal({
  bossId,
  boss,
  isOpen,
  onClose,
}: BossDetailsModalProps) {
  if (!isOpen || !bossId) return null;

  // Derive the Pokémon's base name for external links
  // e.g. "Mega Rayquaza" → "rayquaza", "Shadow Mewtwo" → "mewtwo"
  const baseName = (boss?.name ?? bossId)
    .replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax|Alolan|Galarian|Hisuian|Paldean)\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const displayName = boss?.name ?? bossId;
  const tier = boss?.tier ?? 5;
  const category = boss?.category ?? TIER_LABEL[tier] ?? `Tier ${tier}`;
  const image = boss?.image ?? "";

  const pokebattlerUrl = `https://www.pokebattler.com/raids/${baseName.replace(/-/g, "_").toUpperCase()}`;
  const leekduckUrl    = `https://leekduck.com/raids/`;
  const pokemondbUrl   = `https://pokemondb.net/pokedex/${baseName}`;

  return (
    <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
      {/* Header */}
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

        {/* Boss card */}
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl bg-card border border-card-border flex items-center justify-center overflow-hidden">
            <SafeImage
              src={image}
              alt={displayName}
              className="w-20 h-20 object-contain"
              fallbackChar={displayName[0]}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-2xl leading-tight">{displayName}</h3>
            <p className={cn("text-sm font-semibold mt-1", TIER_COLOR[tier] ?? "text-muted-foreground")}>
              {category}
            </p>
            {boss?.isShadow && (
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400">
                Shadow
              </span>
            )}
            {boss?.isDynamax && (
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-600/20 text-pink-400">
                Dynamax
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-card-border" />

        {/* External links */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Swords className="w-3 h-3" /> Full Info &amp; Counters
          </p>
          <p className="text-sm text-muted-foreground">
            Tap below to see best counters, movesets, and weather boosts from community sources.
          </p>

          <a
            href={pokebattlerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            <div>
              <p className="font-bold text-sm">Pokebattler</p>
              <p className="text-xs text-muted-foreground">Best counters &amp; DPS rankings</p>
            </div>
            <ExternalLink className="w-4 h-4 text-primary" />
          </a>

          <a
            href={leekduckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-card border border-card-border hover:border-primary/30 transition-colors"
          >
            <div>
              <p className="font-bold text-sm">LeekDuck</p>
              <p className="text-xs text-muted-foreground">Current raid rotation &amp; tips</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>

          <a
            href={pokemondbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-card border border-card-border hover:border-primary/30 transition-colors"
          >
            <div>
              <p className="font-bold text-sm">PokémonDB</p>
              <p className="text-xs text-muted-foreground">Species info &amp; base stats</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}

// Alias kept for any remaining import sites
export const PokemonDetailsModal = BossDetailsModal;
export default BossDetailsModal;
