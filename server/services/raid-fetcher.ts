/**
 * fetchCurrentRaidBosses()
 *
 * Fetches the CURRENT active raid boss rotation from community sources:
 *   1. pogoapi.net/api/v1/raid_bosses.json  — structured JSON, primary source
 *   2. leekduck.com/raids/                  — HTML fallback (Next.js __NEXT_DATA__)
 *   3. pokemongohub.net current raids page  — HTML fallback (text extraction)
 *
 * Caches for 10 minutes. Falls back to stale cache if all sources fail.
 * Returns [] only when no cache AND all sources fail.
 */

import { log } from "../index";
import type { CurrentBoss } from "@shared/schema";

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache: { bosses: CurrentBoss[]; fetchedAt: number } | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchCurrentRaidBosses(): Promise<CurrentBoss[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.bosses;
  }

  log("Fetching current raid boss rotation from live sources…", "raid-fetch");

  const [pogoApiResult, leekResult, hubResult] = await Promise.allSettled([
    scrapePoGoApi(),
    scrapeLeekDuck(),
    scrapePoGoHub(),
  ]);

  const all: CurrentBoss[] = [];

  const sources: [string, typeof pogoApiResult][] = [
    ["pogoapi.net",  pogoApiResult],
    ["leekduck.com", leekResult],
    ["pogohub.net",  hubResult],
  ];

  for (const [label, result] of sources) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      log(`  [${label}] ${result.value.length} bosses`, "raid-fetch");
      all.push(...result.value);
    } else {
      const err = result.status === "rejected" ? result.reason : "0 results";
      log(`  [${label}] failed: ${err}`, "raid-fetch");
    }
  }

  const deduped = deduplicate(all);

  if (deduped.length > 0) {
    log(`Rotation fetched: ${deduped.length} unique bosses`, "raid-fetch");
    cache = { bosses: deduped, fetchedAt: Date.now() };
    return deduped;
  }

  if (cache) {
    log("All sources failed — returning stale cache", "raid-fetch");
    return cache.bosses;
  }

  log("All sources failed — no cache available, returning empty list", "raid-fetch");
  return [];
}

export function invalidateBossCache(): void {
  cache = null;
}

export function getBossCacheInfo(): { fetchedAt: number | null; bossCount: number; stale: boolean } {
  if (!cache) return { fetchedAt: null, bossCount: 0, stale: true };
  return {
    fetchedAt: cache.fetchedAt,
    bossCount: cache.bosses.length,
    stale: Date.now() - cache.fetchedAt >= CACHE_TTL_MS,
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaidCoordinator/2.0)",
  "Accept": "text/html,application/json,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Source 1: pogoapi.net (structured JSON) ───────────────────────────────────
//
// Returns JSON shaped like:
//   { "1": [{pokemon_name:"Stufful",...}], "3":[...], "5":[...], "mega":[...], "shadow":[...] }

async function scrapePoGoApi(): Promise<CurrentBoss[]> {
  const text = await fetchText("https://pogoapi.net/api/v1/raid_bosses.json");
  const data = JSON.parse(text);
  const bosses: CurrentBoss[] = [];

  const tierMap: Record<string, number> = {
    "1": 1, "2": 1, "3": 3, "4": 4, "5": 5, "6": 6,
    "mega": 4, "shadow": 5, "elite": 6,
  };

  for (const [key, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    const tier = tierMap[key.toLowerCase()] ?? 5;

    for (const entry of entries as any[]) {
      const rawName = (entry.pokemon_name || entry.name || entry.pokemon || "").trim();
      if (!rawName || rawName.length < 2) continue;

      // Build display name: add prefix for shadow/mega tiers if not already present
      let name = rawName;
      const lk = key.toLowerCase();
      if (lk === "shadow" && !name.toLowerCase().startsWith("shadow ")) {
        name = `Shadow ${name}`;
      } else if (lk === "mega" && !name.toLowerCase().startsWith("mega ") && !name.toLowerCase().startsWith("primal ")) {
        name = `Mega ${name}`;
      }

      // Validate: name must look like a real boss (no sentence fragments)
      if (!isValidBossName(name)) continue;

      bosses.push(makeBoss(name, tier));
    }
  }

  return bosses;
}

// ── Source 2: LeekDuck (Next.js __NEXT_DATA__ JSON) ──────────────────────────

async function scrapeLeekDuck(): Promise<CurrentBoss[]> {
  // Try /raids/ first, then /events/ as fallback
  for (const path of ["/raids/", "/events/"]) {
    try {
      const html = await fetchText(`https://leekduck.com${path}`);
      const bosses = extractFromNextData(html);
      if (bosses.length > 0) return bosses;
    } catch { /* try next */ }
  }
  return [];
}

function extractFromNextData(html: string): CurrentBoss[] {
  const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return [];
  try {
    return walkJson(JSON.parse(m[1]));
  } catch {
    return [];
  }
}

function walkJson(obj: any, depth = 0): CurrentBoss[] {
  if (depth > 8 || !obj || typeof obj !== "object") return [];

  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].title || obj[0].boss || obj[0].pokemon_name)) {
      const parsed = obj.flatMap((e: any) => parseBossEntry(e) ?? []);
      if (parsed.length > 0) return parsed;
    }
    return obj.flatMap((e: any) => walkJson(e, depth + 1));
  }

  for (const key of ["raids", "raidBosses", "bosses", "currentRaids", "raidList"]) {
    if (obj[key]) {
      const found = walkJson(obj[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  return Object.values(obj).flatMap((v: any) => walkJson(v, depth + 1));
}

function parseBossEntry(e: any): CurrentBoss | null {
  const name = ((e.name || e.title || e.boss || e.pokemon || e.pokemon_name) ?? "").trim();
  if (!name || !isValidBossName(name)) return null;
  const tier = parseTier(e.tier ?? e.level ?? e.raidTier ?? e.stars, name);
  return makeBoss(name, tier);
}

// ── Source 3: PoGoHub (text extraction, tightened) ────────────────────────────

async function scrapePoGoHub(): Promise<CurrentBoss[]> {
  const html = await fetchText("https://pokemongohub.net/post/guide/current-go-raids/");
  return extractFromTierSections(html);
}

function extractFromTierSections(html: string): CurrentBoss[] {
  // Strip scripts/styles, convert block tags to newlines
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6]|section|article|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&[a-z]+;|&#\d+;/g, " ");

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  const bosses: CurrentBoss[] = [];
  let currentTier = 5;
  let inSection = false;

  for (const line of lines) {
    const tierInfo = detectTierLine(line);
    if (tierInfo) {
      currentTier = tierInfo.tier;
      inSection = true;
      // Extract inline names after colon: "Tier 5: Cresselia, Dialga"
      const colon = line.indexOf(":");
      if (colon !== -1) {
        bosses.push(...extractValidNames(line.slice(colon + 1), currentTier));
      }
      continue;
    }
    if (!inSection) continue;
    // Stop ingesting if line looks like article prose (long sentence)
    if (line.length > 80 && line.includes(" ")) continue;
    bosses.push(...extractValidNames(line, currentTier));
  }

  return bosses;
}

function detectTierLine(line: string): { tier: number } | null {
  if (line.length > 80) return null;
  const l = line.toLowerCase();
  if (/\bmega\s+raids?\b/.test(l))         return { tier: 4 };
  if (/\bshadow\s+raids?\b/.test(l))        return { tier: 5 };
  if (/\bdynamax\b|\bgigantamax\b/.test(l)) return { tier: 6 };
  if (/\belite\s+raids?\b/.test(l))         return { tier: 6 };
  if (/tier\s*5|legendary|5[★*]|5-star/i.test(l)) return { tier: 5 };
  if (/tier\s*3|3[★*]|3-star/i.test(l))    return { tier: 3 };
  if (/tier\s*1|1[★*]|1-star/i.test(l))    return { tier: 1 };
  if (/tier\s*4/i.test(l))                  return { tier: 4 };
  return null;
}

function extractValidNames(text: string, tier: number): CurrentBoss[] {
  return text
    .split(/[,|•·\t]+/)
    .map(s => s.replace(/^\d+[\.\)]\s*/, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim())
    .filter(s => isValidBossName(s))
    .map(s => makeBoss(s, inferTierFromName(s, tier)));
}

// ── Boss name validation ───────────────────────────────────────────────────────
//
// A valid boss name:
//   - 2–30 characters
//   - 1–3 words
//   - Starts with a capital letter
//   - No sentence punctuation (periods mid-word, question marks, etc.)
//   - Does not contain common stop words
//   - Is not pure numbers or single characters

const STOP_WORDS = new Set([
  // Page structure
  "Guides","Guide","Article","Articles","Post","Posts","Read","More","Click","Here",
  "Home","Back","Next","Prev","Previous","Share","Follow","Subscribe","Menu","Nav",
  "Search","Loading","Error","Login","Logout","Register","Sign","Account","Profile",
  "Comment","Comments","Reply","Replies","Like","Likes","View","Views","Print",
  // Raid/game terms that appear as section headings (not boss names)
  "Raids","Raid","Boss","Bosses","Tier","Tiers","Star","Stars","Level","Levels",
  "Event","Events","Season","Week","Month","Day","List","Type","Types","Form","Forms",
  "Current","Active","Featured","Upcoming","Available","Exclusive","Special","Limited",
  "New","Updated","Latest","Recent","Today","Now","Live","Official",
  // Common English words
  "The","And","For","With","From","But","Not","This","That","When","Where","How",
  "What","Why","Use","Can","All","Are","Has","Its","Our","In","Order","To",
  "Best","Top","Info","About","Details","Check","Find","Get","Set","Take","Make",
  "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  // Calendar / time
  "January","February","March","April","May","June","July","August","September",
  "October","November","December",
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
  // Game concepts (not boss names)
  "Pokemon","Pokmon","Pokémon","Go","Shiny","Catch","Rate","Chance",
  "Weather","Boost","Boosted","Counter","Counters","Attack","Defense",
  "Stats","Moves","Move","Fast","Charge","CP","HP","IV","IVs","DPS",
  "Item","Items","Berry","Berries","Stardust","Candy","Dust",
]);

function isValidBossName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 35) return false;

  // No sentence fragments: reject if contains ". " mid-string or "…" or "?"
  if (/\. |\.{2,}|\?|!|:/.test(name)) return false;

  // Must start with a capital letter
  if (!/^[A-ZÀ-Ö]/.test(name)) return false;

  // Max 3 words (boss names are never full sentences)
  const words = name.trim().split(/\s+/);
  if (words.length > 3) return false;

  // Reject if any word is a stop word
  if (words.some(w => STOP_WORDS.has(w))) return false;

  // Each word must look like a proper noun or hyphenated name (not a number, not all-caps abbreviation > 2 chars)
  for (const w of words) {
    if (/^\d+$/.test(w)) return false;          // pure number
    if (w.length > 3 && /^[A-Z]+$/.test(w)) return false; // ALL-CAPS abbreviation like "TYPE"
  }

  return true;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function inferTierFromName(name: string, fallback: number): number {
  const l = name.toLowerCase();
  if (l.startsWith("mega ") || l.startsWith("primal ")) return 4;
  if (l.includes("dynamax") || l.includes("gigantamax")) return 6;
  return fallback;
}

function parseTier(raw: any, name: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const l = raw.toLowerCase().trim();
    if (l === "mega" || l === "primal") return 4;
    if (l === "elite" || l === "6") return 6;
    const n = parseInt(l);
    if (!isNaN(n)) return n;
  }
  return inferTierFromName(name, 5);
}

function makeBoss(name: string, tier: number): CurrentBoss {
  const l = name.toLowerCase();
  const isShadow  = l.startsWith("shadow ");
  const isDynamax = l.includes("dynamax") || l.includes("gigantamax");
  const isMega    = l.startsWith("mega ") || l.startsWith("primal ");

  let category: string;
  let variant: string;
  if (isDynamax)     { category = "Dynamax"; variant = "Dynamax"; tier = 6; }
  else if (isShadow) { category = "Shadow";  variant = "Shadow"; }
  else if (isMega)   { category = "Mega";    variant = "Mega";   tier = 4; }
  else               { category = `Tier ${tier}`; variant = "Normal"; }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const baseName = name
    .replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax)\s+/i, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return { id, name, tier, category, variant, isShadow, isDynamax,
    image: `https://img.pokemondb.net/sprites/home/normal/${baseName}.png` };
}

function deduplicate(bosses: CurrentBoss[]): CurrentBoss[] {
  const seen = new Map<string, CurrentBoss>();
  for (const boss of bosses) {
    if (!seen.has(boss.id)) seen.set(boss.id, boss);
  }
  return Array.from(seen.values());
}
