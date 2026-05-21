/**
 * fetchCurrentRaidBosses()
 *
 * Priority chain — stops at the first source that returns clean results:
 *   1. pogoapi.net/api/v1/raid_bosses.json  — structured JSON, no parsing noise
 *   2. leekduck.com/raids/                  — Next.js __NEXT_DATA__ JSON
 *   3. pokemongohub.net current raids page  — text extraction (last resort)
 *
 * All results pass through sanitizeBossList() before being cached or returned.
 * Caches for 10 minutes. Falls back to stale cache if all sources fail.
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
    { label: "pogoapi.net",  fn: scrapePoGoApi   },
    { label: "leekduck.com", fn: scrapeLeekDuck  },
    { label: "pogohub.net",  fn: scrapePoGoHub   },
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
  return { fetchedAt: cache.fetchedAt, bossCount: cache.bosses.length,
           stale: Date.now() - cache.fetchedAt >= CACHE_TTL_MS };
}

// ── Sanitization pipeline ─────────────────────────────────────────────────────
//
// Applied to every boss list regardless of source.
// Normalises names, strips labels, rejects non-boss strings, deduplicates.

/** Words that can appear inside a boss name as part of an allowed prefix */
const ALLOWED_PREFIXES = new Set(["mega","shadow","primal","dynamax","gigantamax","alolan","galarian","hisuian","paldean"]);

/**
 * Any word in this set causes the entire candidate to be rejected.
 * Covers page copy, section headings, event labels, dates, game-concept words, etc.
 */
const REJECT_WORDS = new Set([
  // Page / UI copy
  "guides","guide","article","articles","post","posts","read","more","click","here",
  "home","back","next","prev","previous","share","follow","subscribe","menu","nav",
  "search","loading","error","login","logout","register","sign","account","profile",
  "comment","comments","reply","replies","view","views","print","open","close","toggle",
  "newsletter","advertisement","sponsored","partner","continue","skip","dismiss",
  // Section / event labels
  "raid","raids","boss","bosses","tier","tiers","star","stars","level","levels",
  "event","events","season","week","month","day","days","list","type","types",
  "form","forms","current","active","featured","upcoming","available","exclusive",
  "special","limited","new","updated","latest","recent","today","now","live",
  "official","announcement","release","update","patch","notes","changelog",
  "starts","ends","beginning","ending","starting","ending","from","until","through",
  "calendar","schedule","date","dates","time","times","hour","hours","minute","minutes",
  "guide","guides","tip","tips","how","about","details","overview","summary",
  // Common English function words
  "the","and","for","with","from","but","not","this","that","when","where","how",
  "what","why","use","can","all","are","has","its","our","in","order","to","of",
  "is","was","be","been","will","would","could","should","may","might","must",
  "do","does","did","get","got","set","let","put","run","see","say","go","make",
  "take","come","give","know","think","look","want","need","find","feel","try",
  "best","top","info","check","also","then","than","just","only","even","still",
  "first","last","each","every","most","many","some","any","few","much","very",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  // Calendar / month / day names
  "january","february","march","april","may","june","july","august","september",
  "october","november","december",
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  // Game concepts — never used as boss names
  "pokemon","pokmon","pokémon","go","shiny","catch","rate","chance","spawn",
  "weather","boost","boosted","counter","counters","attack","defense","defence",
  "stats","moves","move","fast","charge","cp","hp","iv","ivs","dps","tdo",
  "item","items","berry","berries","stardust","candy","dust","xp","exp",
  "battle","league","pvp","pve","trainer","trainers","gym","gyms","arena",
  "evolution","evolve","power","up","buddy","egg","hatch","walk","distance",
  "remote","pass","ticket","premium","free","paid","store","shop","buy",
  "shadow","purified","purify","transfer","trade","friend","friendship","gift",
  "research","task","tasks","field","special","breakthrough","breakthrough",
  "community","day","spotlight","hour","raid","boss",
]);

/** Strip symbols, normalise whitespace, title-case each word */
function normalizeName(raw: string): string {
  return raw
    .replace(/[^\w\s\-'\.]/g, " ")   // keep letters, digits, hyphen, apostrophe, dot
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Remove label words that sometimes get glued to a name ("Raid Cresselia" → "Cresselia") */
const INLINE_LABELS = /\b(raid|raids|boss|bosses|event|events|guide|guides|calendar|starts|ends|tier\s*\d*|[1-6]\s*star)\b/gi;

function stripInlineLabels(name: string): string {
  return name.replace(INLINE_LABELS, " ").replace(/\s+/g, " ").trim();
}

/** Remove duplicate words: "Cresselia Cresselia" → "Cresselia" */
function dedupeWords(name: string): string {
  const words = name.split(" ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(w); }
  }
  return out.join(" ");
}

/**
 * Returns true if the cleaned name looks like a real boss name.
 * A valid boss name:
 *  - 2–30 characters
 *  - 1–3 words
 *  - Starts with a capital letter
 *  - No sentence punctuation that indicates prose (question marks, exclamation, ellipsis)
 *  - No word in the REJECT_WORDS set (except allowed prefixes like "Mega", "Shadow")
 *  - No word that is an all-caps abbreviation longer than 2 letters
 *  - No word that is a pure number
 */
function looksLikeBossName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) return false;
  if (/[?!…]/.test(name)) return false;
  if (!/^[A-ZÀ-Ö]/.test(name)) return false;

  const words = name.split(" ");
  if (words.length > 3) return false;

  for (const w of words) {
    const lw = w.toLowerCase();
    // Allow known prefixes (Mega, Shadow, etc.)
    if (ALLOWED_PREFIXES.has(lw)) continue;
    // Reject stop words
    if (REJECT_WORDS.has(lw)) return false;
    // Reject pure numbers
    if (/^\d+$/.test(w)) return false;
    // Reject all-caps abbreviations longer than 2 chars (CP, IV are ok; "TYPE" is not)
    if (w.length > 2 && /^[A-Z]+$/.test(w)) return false;
  }

  return true;
}

/** Full sanitization pipeline: normalize → strip labels → dedupe words → validate → deduplicate list */
function sanitizeBossList(bosses: CurrentBoss[]): CurrentBoss[] {
  const seen = new Map<string, CurrentBoss>();

  for (const boss of bosses) {
    // Step 1: normalize
    let name = normalizeName(boss.name);
    // Step 2: strip inline labels
    name = stripInlineLabels(name);
    // Step 3: remove duplicate words
    name = dedupeWords(name);
    // Step 4: validate
    if (!looksLikeBossName(name)) {
      log(`  [sanitize] rejected: "${boss.name}" → "${name}"`, "raid-fetch");
      continue;
    }
    // Step 5: deduplicate by normalized id
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!seen.has(id)) {
      seen.set(id, { ...boss, name, id });
    }
  }

  return Array.from(seen.values());
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RaidCoordinator/2.0)",
      "Accept": "text/html,application/json,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Source 1: pogoapi.net ─────────────────────────────────────────────────────

async function scrapePoGoApi(): Promise<CurrentBoss[]> {
  const text = await fetchText("https://pogoapi.net/api/v1/raid_bosses.json");
  const data = JSON.parse(text);
  const bosses: CurrentBoss[] = [];

  const tierMap: Record<string, number> = {
    "1":1,"2":1,"3":3,"4":4,"5":5,"6":6,"mega":4,"shadow":5,"elite":6,
  };

  for (const [key, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    const tier = tierMap[key.toLowerCase()] ?? 5;

    for (const entry of entries as any[]) {
      const rawName = (entry.pokemon_name || entry.name || entry.pokemon || "").trim();
      if (!rawName) continue;

      let name = rawName;
      const lk = key.toLowerCase();
      if (lk === "shadow" && !name.toLowerCase().startsWith("shadow ")) name = `Shadow ${name}`;
      else if (lk === "mega" && !/^(mega|primal)\s/i.test(name)) name = `Mega ${name}`;

      bosses.push(makeBoss(name, tier));
    }
  }
  return bosses;
}

// ── Source 2: LeekDuck ────────────────────────────────────────────────────────

async function scrapeLeekDuck(): Promise<CurrentBoss[]> {
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
  try { return walkJson(JSON.parse(m[1])); } catch { return []; }
}

function walkJson(obj: any, depth = 0): CurrentBoss[] {
  if (depth > 8 || !obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].pokemon_name || obj[0].boss)) {
      const parsed = obj.flatMap((e: any) => parseBossEntry(e) ?? []);
      if (parsed.length > 0) return parsed;
    }
    return obj.flatMap((e: any) => walkJson(e, depth + 1));
  }
  for (const key of ["raids","raidBosses","bosses","currentRaids","raidList"]) {
    if (obj[key]) { const f = walkJson(obj[key], depth + 1); if (f.length > 0) return f; }
  }
  return Object.values(obj).flatMap((v: any) => walkJson(v, depth + 1));
}

function parseBossEntry(e: any): CurrentBoss | null {
  const name = ((e.name || e.title || e.boss || e.pokemon || e.pokemon_name) ?? "").trim();
  if (!name || name.length < 2) return null;
  const tier = parseTier(e.tier ?? e.level ?? e.raidTier ?? e.stars, name);
  return makeBoss(name, tier);
}

// ── Source 3: PoGoHub (text extraction, last resort) ─────────────────────────

async function scrapePoGoHub(): Promise<CurrentBoss[]> {
  const html = await fetchText("https://pokemongohub.net/post/guide/current-go-raids/");
  return extractFromTierSections(html);
}

function extractFromTierSections(html: string): CurrentBoss[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6]|section|article|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&nbsp;|&#160;/g," ").replace(/&[a-z]+;|&#\d+;/g," ");

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  const bosses: CurrentBoss[] = [];
  let currentTier = 5;
  let inSection = false;

  for (const line of lines) {
    const tierInfo = detectTierLine(line);
    if (tierInfo) {
      currentTier = tierInfo.tier;
      inSection = true;
      const colon = line.indexOf(":");
      if (colon !== -1) {
        for (const seg of splitSegments(line.slice(colon + 1))) {
          bosses.push(makeBoss(seg, inferTierFromName(seg, currentTier)));
        }
      }
      continue;
    }
    if (!inSection) continue;
    if (line.length > 60) continue; // prose lines — skip
    for (const seg of splitSegments(line)) {
      bosses.push(makeBoss(seg, inferTierFromName(seg, currentTier)));
    }
  }
  return bosses;
}

function splitSegments(text: string): string[] {
  return text.split(/[,|•·\t]+/).map(s =>
    s.replace(/^\d+[\.\)]\s*/,"").replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim()
  ).filter(s => s.length >= 2);
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

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const baseName = name.replace(/^(Mega|Shadow|Primal|Dynamax|Gigantamax)\s+/i,"")
    .replace(/\s+/g,"-").toLowerCase();

  return { id, name, tier, category, variant, isShadow, isDynamax,
    image: `https://img.pokemondb.net/sprites/home/normal/${baseName}.png` };
}

function deduplicate(bosses: CurrentBoss[]): CurrentBoss[] {
  const seen = new Map<string, CurrentBoss>();
  for (const b of bosses) { if (!seen.has(b.id)) seen.set(b.id, b); }
  return Array.from(seen.values());
}
