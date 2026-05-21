/**
 * fetchCurrentRaidBosses()
 *
 * Two structured-JSON sources only — NO HTML scraping.
 * HTML scraping is permanently removed because page chrome (nav, social buttons,
 * sidebar links) always contaminates results.
 *
 * Priority chain:
 *   1. pogoapi.net/api/v1/raid_bosses.json       — community JSON API
 *   2. ScrapedDuck (bigfoott) GitHub raw JSON     — auto-scraped LeekDuck data
 *
 * All results pass through sanitizeBossList() before being cached.
 * Falls back to stale cache if both sources fail.
 * Returns [] only when no cache AND both sources fail.
 */

import { log } from "../index";
import type { CurrentBoss } from "@shared/schema";

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { bosses: CurrentBoss[]; fetchedAt: number } | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchCurrentRaidBosses(): Promise<CurrentBoss[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.bosses;
  }

  log("Fetching current raid boss rotation…", "raid-fetch");

  const sources: Array<{ label: string; fn: () => Promise<CurrentBoss[]> }> = [
    { label: "pogoapi.net",   fn: scrapePoGoApi    },
    { label: "scrapedduck",   fn: scrapeScrapedDuck },
  ];

  for (const { label, fn } of sources) {
    try {
      const raw = await fn();
      const clean = sanitizeBossList(raw);
      if (clean.length > 0) {
        log(`[${label}] ${clean.length} valid bosses (${raw.length} raw)`, "raid-fetch");
        cache = { bosses: clean, fetchedAt: Date.now() };
        return clean;
      }
      log(`[${label}] 0 valid bosses after sanitization — trying next source`, "raid-fetch");
    } catch (err) {
      log(`[${label}] error: ${err}`, "raid-fetch");
    }
  }

  if (cache) {
    log("All sources failed — returning stale cache", "raid-fetch");
    return cache.bosses;
  }

  log("All sources failed and no cache — returning empty", "raid-fetch");
  return [];
}

export function invalidateBossCache(): void { cache = null; }

export function getBossCacheInfo() {
  if (!cache) return { fetchedAt: null, bossCount: 0, stale: true };
  return {
    fetchedAt: cache.fetchedAt,
    bossCount: cache.bosses.length,
    stale: Date.now() - cache.fetchedAt >= CACHE_TTL_MS,
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RaidCoordinator/2.0)",
      "Accept": "application/json,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Source 1: pogoapi.net ─────────────────────────────────────────────────────
//
// Returns: { "1": [{pokemon_name, has_shiny}], "3":[...], "5":[...], "mega":[...], "shadow":[...] }

async function scrapePoGoApi(): Promise<CurrentBoss[]> {
  const data = await fetchJson("https://pogoapi.net/api/v1/raid_bosses.json");
  const bosses: CurrentBoss[] = [];

  const tierMap: Record<string, number> = {
    "1":1, "2":1, "3":3, "4":4, "5":5, "6":6,
    "mega":4, "shadow":5, "elite":6,
  };

  for (const [key, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    const tier = tierMap[key.toLowerCase()] ?? 5;

    for (const entry of entries as any[]) {
      const rawName = (entry.pokemon_name || entry.name || "").trim();
      if (!rawName) continue;

      let name = rawName;
      const lk = key.toLowerCase();
      if (lk === "shadow" && !/^shadow\s/i.test(name))           name = `Shadow ${name}`;
      else if (lk === "mega" && !/^(mega|primal)\s/i.test(name)) name = `Mega ${name}`;

      bosses.push(makeBoss(name, tier));
    }
  }
  return bosses;
}

// ── Source 2: ScrapedDuck (bigfoott) ─────────────────────────────────────────
//
// GitHub Actions job scrapes LeekDuck every 15 min and stores clean JSON.
// Endpoint: https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json
//
// Returns an array of raid objects:
//   [{ name, tier, type, ... }, ...]  — field names vary by version

async function scrapeScrapedDuck(): Promise<CurrentBoss[]> {
  const data = await fetchJson(
    "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json"
  );

  const bosses: CurrentBoss[] = [];
  const entries = Array.isArray(data) ? data : Object.values(data).flat();

  for (const entry of entries as any[]) {
    const rawName = (
      entry.name || entry.pokemon || entry.pokemon_name ||
      entry.title || entry.boss || ""
    ).trim();
    if (!rawName) continue;

    const tierRaw = entry.tier ?? entry.level ?? entry.stars ?? entry.raidLevel;
    const tier = parseTier(tierRaw, rawName);
    bosses.push(makeBoss(rawName, tier));
  }
  return bosses;
}

// ── Sanitization pipeline ─────────────────────────────────────────────────────
//
// Final validation gate applied to every boss regardless of source.
// Strips labels, normalises names, rejects anything that isn't a boss name.

const ALLOWED_PREFIXES = new Set([
  "mega","shadow","primal","dynamax","gigantamax",
  "alolan","galarian","hisuian","paldean",
]);

const REJECT_WORDS = new Set([
  // UI / navigation / social
  "facebook","instagram","twitter","youtube","tiktok","reddit","discord",
  "rss","mail","email","newsletter","subscribe","follow","share","like",
  "comment","comments","reply","menu","nav","search","home","back","next",
  "prev","previous","click","here","open","close","toggle","print","login",
  "logout","register","account","profile","view","views","read","more",
  "sponsored","advertisement","partner","loading","error","skip","dismiss",
  // Site sections / categories
  "news","editorial","metagame","guides","guide","article","articles",
  "post","posts","categories","category","tag","tags","archive","archives",
  "featured","trending","popular","recent","latest","updated","new","official",
  // Event / calendar labels
  "raid","raids","boss","bosses","tier","tiers","star","stars","level","levels",
  "event","events","season","week","month","day","days","list","type","types",
  "form","forms","current","active","upcoming","available","exclusive",
  "special","limited","live","announcement","release","update","patch","notes",
  "starts","ends","beginning","ending","from","until","through","calendar",
  "schedule","date","dates","time","times","hour","hours","minute","minutes",
  "tip","tips","how","about","details","overview","summary","check","find",
  // Common English words
  "the","and","for","with","from","but","not","this","that","when","where",
  "how","what","why","use","can","all","are","has","its","our","in","order",
  "to","of","is","was","be","been","will","would","could","should","may",
  "might","must","do","does","did","get","got","set","let","put","run","see",
  "say","go","make","take","come","give","know","think","look","want","need",
  "feel","try","best","top","info","also","then","than","just","only","even",
  "still","first","last","each","every","most","many","some","any","few",
  "much","very","one","two","three","four","five","six","seven","eight","nine","ten",
  // Months / days
  "january","february","march","april","may","june","july","august","september",
  "october","november","december",
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  // Game concepts (not boss names)
  "pokemon","pokmon","pokémon","go","shiny","catch","rate","chance","spawn",
  "weather","boost","boosted","counter","counters","attack","defense","defence",
  "stats","moves","move","fast","charge","cp","hp","iv","ivs","dps","tdo",
  "item","items","berry","berries","stardust","candy","dust","xp","exp",
  "battle","league","pvp","pve","trainer","trainers","gym","gyms","arena",
  "evolution","evolve","power","buddy","egg","hatch","walk","distance",
  "remote","pass","ticket","premium","free","paid","store","shop","buy",
  "purified","purify","transfer","trade","friend","friendship","gift",
  "research","task","field","breakthrough","community","spotlight","rocket",
  "rocket" /* Team Rocket — not a boss name */,
]);

function normalizeName(raw: string): string {
  return raw
    .replace(/[^\w\s\-'\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const INLINE_LABELS = /\b(raid|raids|boss|bosses|event|events|guide|guides|calendar|starts|ends|tier\s*\d*|[1-6]\s*star[s]?)\b/gi;

function stripInlineLabels(name: string): string {
  return name.replace(INLINE_LABELS, " ").replace(/\s+/g, " ").trim();
}

function dedupeWords(name: string): string {
  const words = name.split(" ");
  const seen = new Set<string>();
  return words.filter(w => {
    const k = w.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).join(" ");
}

function looksLikeBossName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 30) return false;
  if (/[?!…]/.test(name)) return false;
  if (!/^[A-ZÀ-Ö]/.test(name)) return false;

  const words = name.split(" ");
  if (words.length > 3) return false;

  for (const w of words) {
    const lw = w.toLowerCase();
    if (ALLOWED_PREFIXES.has(lw)) continue;
    if (REJECT_WORDS.has(lw)) return false;
    if (/^\d+$/.test(w)) return false;
    if (w.length > 2 && /^[A-Z]+$/.test(w)) return false; // ALL-CAPS abbreviation
  }

  return true;
}

function sanitizeBossList(bosses: CurrentBoss[]): CurrentBoss[] {
  const seen = new Map<string, CurrentBoss>();

  for (const boss of bosses) {
    let name = normalizeName(boss.name);
    name = stripInlineLabels(name);
    name = dedupeWords(name);

    if (!looksLikeBossName(name)) {
      log(`  [sanitize] rejected: "${boss.name}"`, "raid-fetch");
      continue;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!seen.has(id)) {
      seen.set(id, { ...boss, name, id });
    }
  }

  return Array.from(seen.values());
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
    if (l === "elite") return 6;
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
    .replace(/\s+/g, "-").toLowerCase();

  return {
    id, name, tier, category, variant, isShadow, isDynamax,
    image: `https://img.pokemondb.net/sprites/home/normal/${baseName}.png`,
  };
}
