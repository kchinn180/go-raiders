/**
 * fetchCurrentRaidBosses()
 *
 * Fetches the CURRENT active raid boss rotation from three community pages:
 *   1. pokemongohub.net/post/guide/current-go-raids/
 *   2. leekduck.com/events/
 *   3. pogocalendar.com/
 *
 * Merges results, deduplicates, and caches for 10 minutes.
 * Falls back to the last successful result if all sources fail.
 * Returns [] only when there is no cache AND all sources fail.
 */

import { log } from "../index";
import type { CurrentBoss } from "@shared/schema";

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache: { bosses: CurrentBoss[]; fetchedAt: number } | null = null;

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns the current active raid boss list, using cache when fresh. */
export async function fetchCurrentRaidBosses(): Promise<CurrentBoss[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.bosses;
  }

  log("Fetching current raid boss rotation from live sources…", "raid-fetch");

  const [hubResult, leekResult, calResult] = await Promise.allSettled([
    scrapePoGoHub(),
    scrapeLeekDuck(),
    scrapePoGoCalendar(),
  ]);

  const all: CurrentBoss[] = [];

  const sources: [string, typeof hubResult][] = [
    ["PoGoHub",      hubResult],
    ["LeekDuck",     leekResult],
    ["PoGoCalendar", calResult],
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

/** Force the next call to re-fetch (ignores TTL). */
export function invalidateBossCache(): void {
  cache = null;
}

/** Metadata about the current cache state (for the admin debug panel). */
export function getBossCacheInfo(): { fetchedAt: number | null; bossCount: number; stale: boolean } {
  if (!cache) return { fetchedAt: null, bossCount: 0, stale: true };
  return {
    fetchedAt: cache.fetchedAt,
    bossCount: cache.bosses.length,
    stale: Date.now() - cache.fetchedAt >= CACHE_TTL_MS,
  };
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RaidCoordinator/2.0; +https://github.com/)",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function scrapePoGoHub(): Promise<CurrentBoss[]> {
  const html = await fetchHtml("https://pokemongohub.net/post/guide/current-go-raids/");
  return extractBossesFromHtml(html);
}

async function scrapeLeekDuck(): Promise<CurrentBoss[]> {
  // Try the events page first (user-specified), then the dedicated raids page
  const eventsHtml = await fetchHtml("https://leekduck.com/events/").catch(() => "");
  const eventBosses = extractBossesFromHtml(eventsHtml);
  if (eventBosses.length > 0) return eventBosses;

  const raidsHtml = await fetchHtml("https://leekduck.com/raids/").catch(() => "");
  return extractBossesFromHtml(raidsHtml);
}

async function scrapePoGoCalendar(): Promise<CurrentBoss[]> {
  const html = await fetchHtml("https://pogocalendar.com/");
  return extractBossesFromHtml(html);
}

// ── Extraction engine ─────────────────────────────────────────────────────────

/**
 * Tries three strategies in order, returns first non-empty result:
 *  1. Next.js __NEXT_DATA__ embedded JSON (LeekDuck, modern React sites)
 *  2. Other embedded JSON variables in <script> tags
 *  3. Plain-text extraction from tier-structured HTML content
 */
function extractBossesFromHtml(html: string): CurrentBoss[] {
  if (!html) return [];

  const fromNextData = tryNextData(html);
  if (fromNextData.length > 0) return fromNextData;

  const fromJson = tryEmbeddedJson(html);
  if (fromJson.length > 0) return fromJson;

  return tryTextExtraction(html);
}

// ── Strategy 1: Next.js __NEXT_DATA__ ────────────────────────────────────────

function tryNextData(html: string): CurrentBoss[] {
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
    if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].title || obj[0].boss)) {
      const parsed = obj.flatMap((e: any) => parseBossEntry(e) ?? []);
      if (parsed.length > 0) return parsed;
    }
    return obj.flatMap((e: any) => walkJson(e, depth + 1));
  }

  // Prioritise keys that sound like raid data
  for (const key of ["raids", "raidBosses", "bosses", "currentRaids", "raidList", "items", "events"]) {
    if (obj[key]) {
      const found = walkJson(obj[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  return Object.values(obj).flatMap((v: any) => walkJson(v, depth + 1));
}

function parseBossEntry(e: any): CurrentBoss | null {
  const name = ((e.name || e.title || e.boss || e.pokemon || e.pokemon_name) ?? "").trim();
  if (!name || name.length < 2 || name.length > 40) return null;
  const tierRaw = e.tier ?? e.level ?? e.raidTier ?? e.stars;
  const tier = parseTier(tierRaw, name);
  return makeBoss(name, tier);
}

// ── Strategy 2: Embedded JSON variables ──────────────────────────────────────

function tryEmbeddedJson(html: string): CurrentBoss[] {
  const patterns = [
    /(?:raids?|bosses?|raidBosses?|currentRaids?|activeBosses?)\s*[=:]\s*(\[[\s\S]{10,6000}?\])\s*[;,}]/i,
    /"(?:raids?|bosses?|currentRaids?)":\s*(\[[\s\S]{10,6000}?\])/i,
  ];
  for (const pat of patterns) {
    const m = pat.exec(html);
    if (!m) continue;
    try {
      const arr = JSON.parse(m[1]);
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const parsed = arr.flatMap((e: any) => parseBossEntry(e) ?? []);
      if (parsed.length > 0) return parsed;
    } catch { /* not valid JSON */ }
  }
  return [];
}

// ── Strategy 3: Text extraction from structured HTML ─────────────────────────

const STOP_WORDS = new Set([
  "Raid","Raids","Boss","Bosses","Tier","Star","Stars","Level","Event","Guide",
  "Current","Active","Season","Week","Month","Day","List","Type","Form","Forms",
  "The","And","For","With","From","But","Not","This","That","When","Where","How",
  "What","Why","Use","Can","All","Are","Has","Its","Our","New","See","Read",
  "Best","Top","More","Info","View","Next","Back","Home","Click","Here","Open",
  "January","February","March","April","May","June","July","August","September",
  "October","November","December",
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
  "Pokemon","Pokmon","Pokémon","Go","Shiny","Catch","Rate","Weather","Boost","Boosted",
  "Counter","Attack","Defense","Stats","Details","Available","Exclusive","Loading",
]);

function tryTextExtraction(html: string): CurrentBoss[] {
  // Strip scripts/styles, convert block-level tags to newlines, remove remaining tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6]|section|article|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&[a-z]+;|&#\d+;/g, " ");

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 1);

  const bosses: CurrentBoss[] = [];
  let currentTier = 5;
  let sectionStarted = false;

  for (const line of lines) {
    // Is this line a tier section header?
    const tierInfo = detectTierLine(line);
    if (tierInfo) {
      currentTier = tierInfo.tier;
      sectionStarted = true;

      // Also extract any names inline after a colon: "Tier 5: Cresselia, Dialga"
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const inline = line.slice(colonIdx + 1);
        bosses.push(...extractNamesFromSegment(inline, currentTier));
      }
      continue;
    }

    if (!sectionStarted) continue;
    bosses.push(...extractNamesFromSegment(line, currentTier));
  }

  return bosses;
}

function detectTierLine(line: string): { tier: number } | null {
  if (line.length > 100) return null; // Section headers are always short
  const l = line.toLowerCase();

  if (/\bmega\s+raids?\b/.test(l))         return { tier: 4 };
  if (/\bshadow\s+raids?\b/.test(l))        return { tier: 5 }; // shadow T5 most common
  if (/\bdynamax\b|\bgigantamax\b/.test(l)) return { tier: 6 };
  if (/\belite\s+raids?\b/.test(l))         return { tier: 6 };
  if (/tier\s*5|legendary\s+raid|5[★*]|5-star/i.test(l)) return { tier: 5 };
  if (/tier\s*3|3[★*]|3-star/i.test(l))    return { tier: 3 };
  if (/tier\s*1|1[★*]|1-star/i.test(l))    return { tier: 1 };
  if (/tier\s*4/i.test(l))                  return { tier: 4 };

  return null;
}

function extractNamesFromSegment(text: string, contextTier: number): CurrentBoss[] {
  const results: CurrentBoss[] = [];

  // Split by common list separators
  const segments = text.split(/[,|•·\t]+/).map(s => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const cleaned = seg
      .replace(/^\d+[\.\)]\s*/, "")       // remove "1. " numbering
      .replace(/\([^)]*\)/g, "")           // remove parenthetical notes
      .replace(/\b(CP|HP|IV)\s*[\d,]+/gi, "") // remove stat numbers
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length < 3 || cleaned.length > 35) continue;
    if (!/^[A-ZÀ-Ö]/.test(cleaned)) continue;          // must start capital

    const words = cleaned.split(/\s+/);
    if (words.some(w => STOP_WORDS.has(w))) continue;

    // Infer tier from the boss name itself (e.g. "Mega Heracross" → tier 4)
    const tier = inferTierFromName(cleaned, contextTier);
    results.push(makeBoss(cleaned, tier));
  }

  return results;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function inferTierFromName(name: string, fallback: number): number {
  const l = name.toLowerCase();
  if (l.startsWith("mega ") || l.startsWith("primal ")) return 4;
  if (l.startsWith("shadow ")) return fallback; // keep context tier
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
  if (isDynamax)    { category = "Dynamax"; variant = "Dynamax"; tier = 6; }
  else if (isShadow){ category = "Shadow";  variant = "Shadow"; }
  else if (isMega)  { category = "Mega";    variant = "Mega";   tier = 4; }
  else              { category = `Tier ${tier}`; variant = "Normal"; }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Derive sprite: strip form prefix so "Mega Heracross" → "heracross"
  const baseName = name
    .replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax)\s+/i, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return {
    id,
    name,
    tier,
    category,
    variant,
    isShadow,
    isDynamax,
    image: `https://img.pokemondb.net/sprites/home/normal/${baseName}.png`,
  };
}

function deduplicate(bosses: CurrentBoss[]): CurrentBoss[] {
  const seen = new Map<string, CurrentBoss>();
  for (const boss of bosses) {
    if (!seen.has(boss.id)) seen.set(boss.id, boss);
  }
  return Array.from(seen.values());
}
