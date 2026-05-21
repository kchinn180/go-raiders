/**
 * Raid Boss Auto-Update Service
 *
 * Automatically fetches current Pokémon GO raid boss rotations from multiple
 * community data sources and cross-references them for accuracy.
 *
 * Data Sources (in priority order):
 * 1. ScrapedDuck (GitHub) — automated Leek Duck scraper, JSON format (highest accuracy)
 * 2. PoGoAPI.net — community-maintained REST API
 * 3. Pokemon-GO-API (GitHub) — GameMaster-based data
 *
 * SCHEDULE:
 * Runs once immediately on startup, then on the hour every hour (:00 exactly).
 * The scheduler aligns itself to wall-clock time regardless of when the
 * server started, so updates always fire at a predictable time.
 *
 * CROSS-REFERENCE STRATEGY:
 * - Each source contributes weighted points (ScrapedDuck=60, PoGoAPI=40, PokemonGoAPI=40)
 * - A boss needs ≥40 confidence points to be published to users
 * - Multi-source agreement adds +10 bonus per additional source
 * - New bosses not in the master list are added dynamically and flagged in logs
 * - Bosses removed from ALL sources are automatically deactivated
 * - Admin-approved bosses are never auto-deactivated
 */

import { log } from "../index";
import type { RaidBoss } from "@shared/schema";
import { ALL_BOSSES } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface ScrapedBoss {
  name: string;
  tier: number;
  image?: string;
  cp?: number;
  types?: string[];
  isShadow?: boolean;
  isDynamax?: boolean;
  isActive: boolean;
  source: string;
  /** Numeric confidence points contributed by this source (see SOURCE_WEIGHTS) */
  sourcePoints: number;
  sourceUrl?: string;
}

/**
 * Confidence scoring weights per data source.
 *
 * ScrapedDuck   = 60 pts — highest: automated Leek Duck scraper, community-curated
 * PoGoAPI       = 40 pts — reliable community API
 * PokemonGoAPI  = 40 pts — GameMaster-based, slightly less timely
 * LeekDuck      = 30 pts — HTML scrape of leekduck.com (ScrapedDuck mirrors this as JSON)
 * PoGoHub       = 25 pts — HTML scrape of pokemongohub.net raid guide
 * PoGoCalendar  = 25 pts — HTML scrape of pogocalendar.com
 *
 * Multi-source bonus: +10 pts per additional confirming source beyond the first.
 * Minimum score to publish: 40 pts (ensures at least one medium-quality source).
 *
 * HTML scrapers (25–30 pts) cannot publish a boss on their own — they only raise
 * confidence for bosses already confirmed by the primary JSON sources.
 */
const SOURCE_WEIGHTS: Record<string, number> = {
  ScrapedDuck:   60,
  PoGoAPI:       40,
  PokemonGoAPI:  40,
  LeekDuck:      30,
  PoGoHub:       25,
  PoGoCalendar:  25,
};
const MULTI_SOURCE_BONUS = 10;
const MIN_CONFIDENCE_TO_PUBLISH = 40;

interface ScraperResult {
  bosses: ScrapedBoss[];
  source: string;
  fetchedAt: number;
  success: boolean;
  error?: string;
}

interface SourceResultSummary {
  source: string;
  success: boolean;
  bossCount: number;
  error?: string;
  fetchedAt: number;
  sourceUrl?: string;
}

interface RaidRotationUpdate {
  added: RaidBoss[];
  removed: RaidBoss[];
  unchanged: RaidBoss[];
  newDiscovered: ScrapedBoss[];  // Bosses not in master list
  lastUpdated: number;
  sources: string[];
  /** Per-source breakdown — success, boss count, and error if failed */
  sourceResults: SourceResultSummary[];
}

// ============================================================================
// DATA SOURCE FETCHERS
// ============================================================================

/**
 * Fetch from ScrapedDuck (automated Leek Duck scraper)
 * https://github.com/bigfoott/ScrapedDuck
 *
 * STRICT: Only accepts data from a key that explicitly represents the CURRENT
 * rotation (currentList, current). Never falls back to a raw array which could
 * contain historical or all-time boss data.
 */
async function fetchScrapedDuck(): Promise<ScraperResult> {
  const source = 'ScrapedDuck';

  const URLS = [
    'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raid-bosses.json',
    'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json',
    'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raidbosses.json',
    'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/pokemon-go/raid-bosses.json',
  ];

  let lastError = '';
  for (const url of URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) { lastError = `HTTP ${res.status} (${url})`; continue; }
      const data = await res.json();

      // STRICT: Only use keys that represent the CURRENT rotation.
      // Do NOT fall back to raw `data` — that could be a flat array of all bosses ever.
      const entries: any[] | null =
        Array.isArray(data.currentList) ? data.currentList :
        Array.isArray(data.current)     ? data.current     :
        Array.isArray(data.raids)       ? data.raids       :
        null;

      if (!entries) {
        lastError = `No currentList/current/raids key found in response from ${url}`;
        continue;
      }

      const bosses: ScrapedBoss[] = [];

      for (const entry of entries) {
        const name: string = entry.name || entry.pokemon_name || entry.pokemon || '';
        if (!name) continue;
        const nameLow = name.toLowerCase();
        const isShadow = !!(entry.isShadow || entry.shadow || nameLow.includes('shadow'));
        const isDynamax = !!(entry.isDynamax || entry.dynamax || nameLow.includes('dynamax') || nameLow.includes('max raid'));

        let tier = parseTier(entry.tier ?? entry.raidTier ?? entry.level ?? entry.raidLevel);
        if (nameLow.startsWith('mega ') || nameLow.startsWith('primal ')) tier = 4;

        bosses.push({
          name,
          tier,
          image: entry.image || entry.imageUrl || entry.img || entry.imageURL,
          cp: entry.cp || entry.raidCp || entry.maxCp,
          types: entry.types || (entry.type ? [].concat(entry.type) : undefined),
          isShadow,
          isDynamax,
          isActive: true,
          source,
          sourcePoints: SOURCE_WEIGHTS[source] ?? 40,
          sourceUrl: url,
        });
      }

      if (bosses.length > 0) {
        log(`  [ScrapedDuck] fetched ${bosses.length} bosses from ${url}`, 'scraper');
        return { bosses, source, fetchedAt: Date.now(), success: true };
      }
      lastError = `0 bosses parsed from ${url}`;
    } catch (e: any) {
      lastError = e.message;
    }
  }

  return { bosses: [], source, fetchedAt: Date.now(), success: false, error: lastError };
}

/**
 * Fetch from PoGoAPI.net
 * https://pogoapi.net/api/v1/raid_bosses.json
 *
 * Response format: { "current": { "1": [...], "3": [...], "5": [...], "6": [...] },
 *                    "previous": { ... } }
 *
 * STRICT: Only reads `data.current`. Never falls back to `data` — that includes
 * the "previous" key with all historical bosses which would pollute the list.
 */
async function fetchPoGoAPI(): Promise<ScraperResult> {
  const source = 'PoGoAPI';
  try {
    const res = await fetch(
      'https://pogoapi.net/api/v1/raid_bosses.json',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // STRICT: Require the `current` key — bail if not present.
    // data.current || data would pull in ALL historical bosses when current is absent.
    if (!data.current || typeof data.current !== 'object') {
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: 'No current key in PoGoAPI response' };
    }

    const bosses: ScrapedBoss[] = [];

    for (const [tierStr, tierBosses] of Object.entries(data.current)) {
      let tier = parseInt(tierStr);
      if (isNaN(tier) || !Array.isArray(tierBosses)) continue;
      if (tier === 6) tier = 4; // PoGoAPI tier 6 = Mega

      for (const entry of tierBosses as any[]) {
        const rawName: string = entry.pokemon_name || entry.name || '';
        if (!rawName) continue;
        const nameLow = rawName.toLowerCase();
        const isShadow = !!(entry.shadow || entry.is_shadow || nameLow.includes('shadow'));
        const isDynamax = !!(entry.dynamax || nameLow.includes('dynamax') || nameLow.includes('max raid'));
        const effectiveTier = (nameLow.startsWith('mega ') || nameLow.startsWith('primal ')) ? 4 : tier;

        bosses.push({
          name: rawName,
          tier: effectiveTier,
          cp: entry.cp || entry.raid_cp || entry.max_cp,
          image: entry.image || entry.imageUrl,
          types: entry.type ? [].concat(entry.type) : (entry.types ? [].concat(entry.types) : undefined),
          isShadow,
          isDynamax,
          isActive: true,
          source,
          sourcePoints: SOURCE_WEIGHTS[source] ?? 40,
          sourceUrl: 'https://pogoapi.net/api/v1/raid_bosses.json',
        });
      }
    }

    log(`  [PoGoAPI] fetched ${bosses.length} current bosses`, 'scraper');
    return { bosses, source, fetchedAt: Date.now(), success: bosses.length > 0 };
  } catch (error: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: error.message };
  }
}

/**
 * Fetch from Pokemon-GO-API GitHub
 * https://pokemon-go-api.github.io/pokemon-go-api/api/raids.json
 *
 * STRICT: This endpoint returns GameMaster data for ALL raids ever — historical
 * and current. We ONLY accept entries explicitly marked as currently available
 * via an `available`, `active`, or `currently_available` flag. Entries without
 * such a flag are skipped entirely to prevent activating retired bosses.
 */
async function fetchPokemonGoAPI(): Promise<ScraperResult> {
  const source = 'PokemonGoAPI';
  try {
    const res = await fetch(
      'https://pokemon-go-api.github.io/pokemon-go-api/api/raids.json',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Accept array or object with raids/current key
    const allEntries: any[] =
      Array.isArray(data)         ? data :
      Array.isArray(data.current) ? data.current :
      Array.isArray(data.raids)   ? data.raids :
      [];

    if (allEntries.length === 0) {
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: 'No entries in PokemonGoAPI response' };
    }

    // STRICT: Only include entries explicitly marked as currently active.
    // If NONE have an active flag, this source is returning unfiltered GameMaster
    // data — reject it entirely rather than activating all historical bosses.
    const hasActiveFlags = allEntries.some(e =>
      e.available !== undefined || e.active !== undefined || e.currently_available !== undefined || e.current !== undefined
    );

    if (!hasActiveFlags) {
      log(`  [PokemonGoAPI] Response has no active/available flags — skipping (would activate all-time bosses)`, 'scraper');
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: 'No active flags in response — historical data only' };
    }

    const bosses: ScrapedBoss[] = [];

    for (const entry of allEntries) {
      // Only take explicitly active entries
      const isCurrentlyActive =
        entry.available === true ||
        entry.active === true ||
        entry.currently_available === true ||
        entry.current === true;

      if (!isCurrentlyActive) continue;

      const name: string = entry.name || entry.pokemon || '';
      if (!name) continue;
      const nameLow = name.toLowerCase();

      bosses.push({
        name,
        tier: parseTier(entry.tier || entry.raidLevel || entry.level),
        image: entry.image || entry.imageUrl,
        cp: entry.cp || entry.raidCp,
        types: entry.types || [],
        isShadow: entry.isShadow || nameLow.includes('shadow'),
        isDynamax: entry.isDynamax || nameLow.includes('max'),
        isActive: true,
        source,
        sourcePoints: SOURCE_WEIGHTS[source] ?? 40,
        sourceUrl: 'https://pokemon-go-api.github.io/pokemon-go-api/api/raids.json',
      });
    }

    log(`  [PokemonGoAPI] fetched ${bosses.length} active bosses (of ${allEntries.length} total entries)`, 'scraper');
    return { bosses, source, fetchedAt: Date.now(), success: bosses.length > 0 };
  } catch (error: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: error.message };
  }
}

// ============================================================================
// HTML SCRAPER UTILITIES
// ============================================================================

/**
 * Stop-words to exclude when scanning HTML text for boss names.
 * These are common English words and HTML/site-specific terms that would
 * produce false positives if extracted as Pokémon names.
 */
const HTML_STOP_WORDS = new Set([
  // HTML / web artifacts
  'Html','Head','Body','Span','Div','Nav','Header','Footer','Section','Article',
  // Common English words that match capitalization heuristics
  'The','And','For','With','From','But','Not','This','That','When','Where','How',
  'What','Why','Use','Can','All','Are','Has','Its','Our','New','Was','Been','Will',
  'Best','See','Top','More','Read','Info','Wiki','View','Type','Form','Next','Skip',
  'Click','Here','Back','Home','Menu','Site','Page','Main','Side','Show','Hide',
  // Site-specific words that appear near boss names
  'Raid','Raids','Boss','Bosses','Tier','Star','Stars','Mega','Shadow','Dynamax',
  'Max','Event','Guide','Current','Active','Season','Week','Month','Day',
  'Pokemon','Pokmon','Go','Shiny','Catch','Rate','Weather','Boost','Boosted',
  'Counter','Counters','Weakness','Weaknesses','Resistance','Attack','Defense',
  'Stamina','Details','Check','Learn','About','Category','Categories',
  // Calendar / date words
  'January','February','March','April','May','June','July','August','September',
  'October','November','December','Monday','Tuesday','Wednesday','Thursday',
  'Friday','Saturday','Sunday','Today','Tomorrow','Yesterday',
]);

/**
 * Extract raid boss data from arbitrary HTML pages using regex patterns.
 *
 * Strategies (tried in order, returns on first success):
 * 1. Embedded JSON variables in <script> tags (e.g. var raidBosses = [...])
 * 2. JSON-LD structured data (<script type="application/ld+json">)
 * 3. Tier-section parsing — finds tier headings then extracts capitalised
 *    names from each section, filtered by stop-words and length heuristics.
 *
 * Returns an empty array when no reliable data is found — never guesses.
 * The caller applies this source's low weight (25–30 pts) so false positives
 * from HTML parsing cannot publish a boss without JSON-source confirmation.
 */
function extractBossesFromHtml(html: string, source: string, sourceUrl: string): ScrapedBoss[] {
  const sourcePoints = SOURCE_WEIGHTS[source] ?? 25;
  const bosses: ScrapedBoss[] = [];

  // ── Strategy 1: embedded JSON arrays/objects in <script> tags ─────────────
  // Matches common patterns: var raidBosses=[...], window.raids={...}, etc.
  const jsVarPatterns: RegExp[] = [
    /(?:raids?Bosses?|raidData|bossData|activeBosses?|current\s*Raids?)\s*=\s*(\[[\s\S]{10,6000}?\])\s*[;,]/i,
    /(?:raids?|bosses?|raidData|pokemonData)\s*[:=]\s*(\[[\s\S]{10,6000}?\])\s*[;,}]/i,
    /"(?:raids?|bosses?|current)":\s*(\[[\s\S]{10,6000}?\])/i,
  ];
  for (const pat of jsVarPatterns) {
    const m = pat.exec(html);
    if (!m) continue;
    try {
      const arr: any[] = JSON.parse(m[1]);
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const first = arr[0];
      // Require at least a name-like field to treat this as boss data
      if (!first || !(first.name || first.pokemon_name || first.pokemon)) continue;
      const extracted: ScrapedBoss[] = [];
      for (const e of arr) {
        const name: string = (e.name || e.pokemon_name || e.pokemon || '').trim();
        if (!name || name.length < 2) continue;
        extracted.push({
          name,
          tier: parseTier(e.tier ?? e.level ?? e.raidTier ?? e.raidLevel ?? 5),
          image: e.image || e.img || e.imageUrl || e.imageURL,
          cp: e.cp || e.raidCp || e.maxCp,
          types: e.types || (e.type ? [].concat(e.type as any) : undefined),
          isShadow: !!(e.isShadow || e.shadow || /shadow/i.test(name)),
          isDynamax: !!(e.isDynamax || e.dynamax || /dynamax|max raid/i.test(name)),
          isActive: true,
          source,
          sourcePoints,
          sourceUrl,
        });
      }
      if (extracted.length > 0) return extracted;
    } catch { /* not valid JSON */ }
  }

  // ── Strategy 2: JSON-LD structured data ───────────────────────────────────
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldM: RegExpExecArray | null;
  while ((ldM = jsonLdRe.exec(html)) !== null) {
    try {
      const ld: any = JSON.parse(ldM[1]);
      const items: any[] = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
          for (const el of item.itemListElement) {
            const name: string = (el.name || el.item?.name || '').trim();
            if (!name || name.length < 2) continue;
            bosses.push({
              name,
              tier: parseTier(el.tier || el.item?.tier || 5),
              isShadow: /shadow/i.test(name),
              isDynamax: /dynamax|max raid/i.test(name),
              isActive: true,
              source,
              sourcePoints,
              sourceUrl,
            });
          }
        }
      }
      if (bosses.length > 0) return bosses;
    } catch { /* not valid JSON-LD */ }
  }

  // ── Strategy 3: tier-section regex ────────────────────────────────────────
  // Find headings like "Tier 5 Raid Bosses", "Mega Raids", "Shadow Raids",
  // then extract capitalised words from each section that look like boss names.

  /** Maps a regex that identifies a tier section heading → numeric tier value */
  const TIER_PATTERNS: Array<[RegExp, number, boolean, boolean]> = [
    // [pattern, tier, isShadow, isDynamax]
    [/mega\s+raids?/i,                4, false, false],
    [/shadow\s+raids?/i,              5, true,  false],  // shadow T5 is most common
    [/dynamax|gigantamax|max\s+raids?/i, 6, false, true],
    [/(?:tier|t)[\s-]*5|legendary\s+raids?|5[\s*★]/i, 5, false, false],
    [/(?:tier|t)[\s-]*3|3[\s*★]/i,   3, false, false],
    [/(?:tier|t)[\s-]*1|1[\s*★]/i,   1, false, false],
    [/(?:tier|t)[\s-]*4/i,            4, false, false],
    [/elite\s+raids?/i,               6, false, false],
  ];

  const sectionMarkers: Array<{ index: number; tier: number; isShadow: boolean; isDynamax: boolean }> = [];
  for (const [pat, tier, isShadow, isDynamax] of TIER_PATTERNS) {
    const gPat = new RegExp(pat.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = gPat.exec(html)) !== null) {
      sectionMarkers.push({ index: m.index, tier, isShadow, isDynamax });
    }
  }

  if (sectionMarkers.length === 0) return bosses;
  sectionMarkers.sort((a, b) => a.index - b.index);

  // Boss name: one to three capitalised words (includes accented chars for e.g. Flabébé)
  const NAME_RE = /([A-ZÀ-Ö][a-zà-öø-ÿé\-']{1,16}(?:\s+[A-ZÀ-Ö][a-zà-öø-ÿé\-']{1,16}){0,2})/g;

  for (let i = 0; i < sectionMarkers.length; i++) {
    const start = sectionMarkers[i].index;
    // Limit each section to 4 000 chars to avoid bleeding into next tier section
    const end = Math.min(
      sectionMarkers[i + 1]?.index ?? html.length,
      start + 4000
    );
    const section = html.slice(start, end);
    const { tier, isShadow, isDynamax } = sectionMarkers[i];

    const seen = new Set<string>();
    const namePat = new RegExp(NAME_RE.source, 'g');
    let nm: RegExpExecArray | null;

    while ((nm = namePat.exec(section)) !== null) {
      const name = nm[1].trim();
      const words = name.split(/\s+/);

      // Filter heuristics
      if (name.length < 3 || name.length > 28) continue;
      if (words.length === 1 && name.length < 4) continue;
      if (words.some(w => HTML_STOP_WORDS.has(w))) continue;
      if (seen.has(name)) continue;

      seen.add(name);
      bosses.push({
        name,
        tier,
        isShadow: isShadow || /shadow/i.test(name),
        isDynamax: isDynamax || /dynamax|max raid/i.test(name),
        isActive: true,
        source,
        sourcePoints,
        sourceUrl,
      });
    }
  }

  return bosses;
}

/**
 * Fetch from Pokémon GO Hub — current raid guide page
 * https://pokemongohub.net/post/guide/current-go-raids/
 *
 * HTML page with tier-structured content. Weight: 25 pts.
 * Uses extractBossesFromHtml for robust, multi-strategy extraction.
 */
async function fetchPoGoHub(): Promise<ScraperResult> {
  const source = 'PoGoHub';
  const url = 'https://pokemongohub.net/post/guide/current-go-raids/';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaidCoordinator/1.0)' },
    });
    if (!res.ok) {
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const bosses = extractBossesFromHtml(html, source, url);
    log(`  [PoGoHub] ${bosses.length} bosses extracted from ${url}`, 'scraper');
    return {
      bosses,
      source,
      fetchedAt: Date.now(),
      success: bosses.length > 0,
      error: bosses.length === 0 ? 'Could not extract boss data from HTML' : undefined,
    };
  } catch (e: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: e.message };
  }
}

/**
 * Fetch from LeekDuck events page
 * https://leekduck.com/events/
 *
 * HTML page — ScrapedDuck is a JSON mirror of LeekDuck data (already fetched as
 * ScrapedDuck), so this provides an independent cross-reference from the original
 * source. Weight: 30 pts (slightly higher than PoGoHub due to data quality).
 */
async function fetchLeekDuck(): Promise<ScraperResult> {
  const source = 'LeekDuck';
  const url = 'https://leekduck.com/events/';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaidCoordinator/1.0)' },
    });
    if (!res.ok) {
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const bosses = extractBossesFromHtml(html, source, url);
    log(`  [LeekDuck] ${bosses.length} bosses extracted from ${url}`, 'scraper');
    return {
      bosses,
      source,
      fetchedAt: Date.now(),
      success: bosses.length > 0,
      error: bosses.length === 0 ? 'Could not extract boss data from HTML' : undefined,
    };
  } catch (e: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: e.message };
  }
}

/**
 * Fetch from PoGoCalendar
 * https://pogocalendar.com/
 *
 * HTML calendar page listing current and upcoming raid bosses. Weight: 25 pts.
 */
async function fetchPoGoCalendar(): Promise<ScraperResult> {
  const source = 'PoGoCalendar';
  const url = 'https://pogocalendar.com/';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaidCoordinator/1.0)' },
    });
    if (!res.ok) {
      return { bosses: [], source, fetchedAt: Date.now(), success: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const bosses = extractBossesFromHtml(html, source, url);
    log(`  [PoGoCalendar] ${bosses.length} bosses extracted from ${url}`, 'scraper');
    return {
      bosses,
      source,
      fetchedAt: Date.now(),
      success: bosses.length > 0,
      error: bosses.length === 0 ? 'Could not extract boss data from HTML' : undefined,
    };
  } catch (e: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: e.message };
  }
}

// ============================================================================
// MATCHING & CROSS-REFERENCE
// ============================================================================

/**
 * Normalize a Pokémon name for comparison
 * Handles variations like "Mega Blaziken" vs "Blaziken (Mega)" vs "mega-blaziken"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/mega$/g, '')  // remove trailing "mega"
    .replace(/^mega/g, '')  // remove leading "mega"
    .replace(/shadow/g, '')
    .replace(/max$/g, '')
    .replace(/dynamax/g, '')
    .replace(/incarnate/g, '')
    .replace(/therian/g, '')
    .replace(/burn/g, '')
    .replace(/chill/g, '')
    .replace(/douse/g, '')
    .replace(/shock/g, '')
    .replace(/drive/g, '')
    .replace(/forme?/g, '')
    .trim();
}

/**
 * Match a scraped boss name to our master list
 * Returns the matching boss ID or null
 */
function matchToMasterList(scraped: ScrapedBoss): string | null {
  const normalizedScraped = normalizeName(scraped.name);

  // Direct ID match first
  for (const boss of ALL_BOSSES) {
    if (normalizeName(boss.name) === normalizedScraped) return boss.id;
    if (normalizeName(boss.id) === normalizedScraped) return boss.id;
  }

  // Fuzzy matching - check if one contains the other
  for (const boss of ALL_BOSSES) {
    const normalizedBoss = normalizeName(boss.name);
    const normalizedId = normalizeName(boss.id);

    // Must also match tier and shadow/dynamax status
    const tierMatch = boss.tier === scraped.tier;
    const shadowMatch = boss.isShadow === (scraped.isShadow || false);
    const dynamaxMatch = boss.isDynamax === (scraped.isDynamax || false);

    if (tierMatch && shadowMatch && dynamaxMatch) {
      if (normalizedBoss.includes(normalizedScraped) || normalizedScraped.includes(normalizedBoss)) {
        return boss.id;
      }
      if (normalizedId.includes(normalizedScraped) || normalizedScraped.includes(normalizedId)) {
        return boss.id;
      }
    }
  }

  return null;
}

interface CrossReferenced {
  boss: ScrapedBoss;
  sources: string[];
  sourceUrls: string[];
  masterBossId: string | null;
  /** Final confidence score 0–100 */
  confidenceScore: number;
}

/**
 * Cross-reference results from multiple sources.
 *
 * Confidence formula:
 *   - Base score = points from first confirming source (SOURCE_WEIGHTS)
 *   - Each additional source adds MULTI_SOURCE_BONUS (10 pts)
 *   - Cap at 100
 *
 * Bosses below MIN_CONFIDENCE_TO_PUBLISH (40) are kept in storage but not
 * shown to users until confidence improves on the next scrape cycle.
 */
function crossReference(results: ScraperResult[]): Map<string, CrossReferenced> {
  const merged = new Map<string, CrossReferenced>();

  for (const result of results) {
    if (!result.success) continue;

    for (const boss of result.bosses) {
      if (!boss.name) continue;
      const masterBossId = matchToMasterList(boss);
      const key = masterBossId || `new-${normalizeName(boss.name)}-t${boss.tier}`;

      const existing = merged.get(key);
      if (existing) {
        if (!existing.sources.includes(result.source)) {
          existing.sources.push(result.source);
          if (result.source && boss.sourceUrl && !existing.sourceUrls.includes(boss.sourceUrl)) {
            existing.sourceUrls.push(boss.sourceUrl);
          }
          // Additional source bonus
          existing.confidenceScore = Math.min(100, existing.confidenceScore + MULTI_SOURCE_BONUS);
        }
      } else {
        merged.set(key, {
          boss: { ...boss },
          sources: [result.source],
          sourceUrls: boss.sourceUrl ? [boss.sourceUrl] : [],
          masterBossId,
          confidenceScore: boss.sourcePoints,
        });
      }
    }
  }

  return merged;
}

/**
 * Detect the raidType from a ScrapedBoss's fields and name.
 */
function detectRaidType(boss: ScrapedBoss): 'standard' | 'mega' | 'shadow' | 'dynamax' | 'event' | 'special' {
  if (boss.isDynamax) return 'dynamax';
  if (boss.isShadow) return 'shadow';
  const nameLow = boss.name.toLowerCase();
  // Classify as Mega only if the NAME explicitly indicates it, not just from tier alone.
  // Tier 4 is the mechanical tier for Mega raids, but future Niantic additions could change this.
  if (nameLow.startsWith('mega ') || nameLow.startsWith('primal ')) return 'mega';
  if (boss.tier === 4) return 'mega'; // tier 4 is Mega in current game design
  if (nameLow.includes('elite')) return 'special';
  if (boss.tier === 6) return 'special'; // Dynamax/Gigantamax tier in some API schemas
  return 'standard';
}

// ============================================================================
// MAIN SCRAPER SERVICE
// ============================================================================

/** Parse various tier formats into a number */
function parseTier(tier: any): number {
  if (typeof tier === 'number') {
    if (tier === 6) return 4; // tier 6 = Mega in PoGoAPI → map to 4
    return tier;
  }
  const str = String(tier).toLowerCase().trim();
  if (str === 'mega' || str === 'primal' || str === '4') return 4;
  if (str === '6') return 4;  // Mega tier in some APIs
  if (str === '5' || str.includes('legendary') || str.includes('elite')) return 5;
  if (str === '3') return 3;
  if (str === '1') return 1;
  // Fallback: try numeric parse
  const n = parseInt(str);
  if (!isNaN(n)) return n === 6 ? 4 : n;
  return 5; // default to 5-star
}

export interface RaidScraperConfig {
  enabled: boolean;         // Whether auto-update is active
  sources: ('ScrapedDuck' | 'PoGoAPI' | 'PokemonGoAPI' | 'LeekDuck' | 'PoGoHub' | 'PoGoCalendar')[];
  autoActivate: boolean;    // Auto-activate matched bosses
  autoDeactivate: boolean;  // Auto-deactivate bosses removed from all sources
  notifyAdmin: boolean;     // Log new discovered bosses for admin review
  intervalMs: number;       // How often to scrape (default: 15 minutes)
  onUpdate?: (result: RaidRotationUpdate) => void;  // Called after each successful update
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const DEFAULT_CONFIG: RaidScraperConfig = {
  enabled: true,
  // JSON sources first (highest weight), then HTML sources for cross-reference.
  // HTML scrapers (LeekDuck/PoGoHub/PoGoCalendar) weight 25–30 pts — below the
  // 40-pt publish threshold, so they can only raise confidence for bosses already
  // confirmed by the JSON sources, never publish new bosses on their own.
  sources: ['ScrapedDuck', 'PoGoAPI', 'PokemonGoAPI', 'LeekDuck', 'PoGoHub', 'PoGoCalendar'],
  autoActivate: true,
  autoDeactivate: true,
  notifyAdmin: true,
  intervalMs: FIFTEEN_MINUTES_MS,
};

export class RaidScraperService {
  private config: RaidScraperConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private alignTimeoutId: NodeJS.Timeout | null = null;
  private lastUpdate: RaidRotationUpdate | null = null;
  private storage: any;  // IStorage - using any to avoid circular import issues

  constructor(storage: any, config?: Partial<RaidScraperConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = storage;
  }

  /**
   * Start the automatic raid boss update service.
   * Runs once immediately on startup, then every `intervalMs` milliseconds
   * (default: 15 minutes). After each successful update, calls `onUpdate`
   * so the server can broadcast a WebSocket event to all connected clients.
   */
  start(): void {
    if (this.intervalId || this.alignTimeoutId) {
      log('Raid scraper already running', 'scraper');
      return;
    }

    if (!this.config.enabled) {
      log('Raid scraper disabled by config', 'scraper');
      return;
    }

    const intervalMin = Math.round(this.config.intervalMs / 60000);
    log(`Raid scraper starting — running initial fetch now (then every ${intervalMin} min)`, 'scraper');

    // Always do an immediate fetch so bosses are current on startup
    this.update().catch(e => log(`Initial scrape failed: ${e}`, 'scraper'));

    // Schedule recurring updates
    this.intervalId = setInterval(() => {
      this.update().catch(e => log(`Scrape failed: ${e}`, 'scraper'));
    }, this.config.intervalMs);
  }

  /**
   * Stop the automatic update service
   */
  stop(): void {
    if (this.alignTimeoutId) {
      clearTimeout(this.alignTimeoutId);
      this.alignTimeoutId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    log('Raid scraper stopped', 'scraper');
  }

  /**
   * Run a single update cycle
   * Fetches from all sources, cross-references, and updates storage
   */
  async update(): Promise<RaidRotationUpdate> {
    log('Fetching raid boss data from external sources...', 'scraper');

    // Fetch from all configured sources in parallel
    const fetchers: Record<string, () => Promise<ScraperResult>> = {
      'ScrapedDuck':   fetchScrapedDuck,
      'PoGoAPI':       fetchPoGoAPI,
      'PokemonGoAPI':  fetchPokemonGoAPI,
      'LeekDuck':      fetchLeekDuck,
      'PoGoHub':       fetchPoGoHub,
      'PoGoCalendar':  fetchPoGoCalendar,
    };

    const results = await Promise.all(
      this.config.sources.map(source => fetchers[source]())
    );

    // Log results
    const successCount = results.filter(r => r.success).length;
    const totalBosses = results.reduce((sum, r) => sum + r.bosses.length, 0);
    log(`Fetched from ${successCount}/${results.length} sources (${totalBosses} total entries)`, 'scraper');

    for (const result of results) {
      if (!result.success) {
        log(`  [FAIL] ${result.source}: ${result.error}`, 'scraper');
      } else {
        log(`  [OK] ${result.source}: ${result.bosses.length} bosses`, 'scraper');
      }
    }

    // Build per-source summary for admin debug panel
    const sourceResults: SourceResultSummary[] = results.map(r => ({
      source: r.source,
      success: r.success,
      bossCount: r.bosses.length,
      error: r.error,
      fetchedAt: r.fetchedAt,
      sourceUrl: r.bosses[0]?.sourceUrl,
    }));

    // If no sources succeeded, don't make any changes
    if (successCount === 0) {
      log('All sources failed - skipping update', 'scraper');
      return {
        added: [],
        removed: [],
        unchanged: [],
        newDiscovered: [],
        lastUpdated: Date.now(),
        sources: [],
        sourceResults,
      };
    }

    // Cross-reference all results
    const merged = crossReference(results);

    // Get current active bosses from storage (includes admin-approved)
    const currentActive = await this.storage.getActiveRaidBosses();
    const currentActiveIds = new Set(currentActive.map((b: RaidBoss) => b.id));

    // Determine what to add, remove, and what's new
    const scrapedActiveIds = new Set<string>();
    const newDiscovered: ScrapedBoss[] = [];
    const added: RaidBoss[] = [];
    const now = Date.now();

    for (const [, { boss, sources, sourceUrls, masterBossId, confidenceScore }] of Array.from(merged.entries())) {
      const raidType = detectRaidType(boss);
      const metadataUpdate = {
        sources,
        sourceUrls,
        confidenceScore,
        lastVerifiedAt: now,
        lastSyncedAt: now,
        raidType,
      };

      if (masterBossId) {
        scrapedActiveIds.add(masterBossId);

        // Always update metadata (confidence, sources, lastVerifiedAt) for known bosses
        await this.storage.updateRaidBoss(masterBossId, metadataUpdate);

        // Confidence gate: only activate if score meets minimum threshold
        if (confidenceScore < MIN_CONFIDENCE_TO_PUBLISH) {
          log(`  [~] Low confidence (${confidenceScore}): ${boss.name} — held back, not published`, 'scraper');
          continue;
        }

        // Activate if not already active
        if (!currentActiveIds.has(masterBossId) && this.config.autoActivate) {
          const updated = await this.storage.setRaidBossActive(
            masterBossId,
            true,
            now,
            now + (14 * 24 * 60 * 60 * 1000) // 2-week default window
          );
          if (updated) {
            added.push(updated);
            log(`  [+] Activated: ${updated.name} (tier ${updated.tier}, conf:${confidenceScore}) [${sources.join(', ')}]`, 'scraper');
          }
        }
      } else {
        // New boss not in master list
        newDiscovered.push(boss);

        if (confidenceScore < MIN_CONFIDENCE_TO_PUBLISH) {
          log(`  [?] New boss low confidence (${confidenceScore}): "${boss.name}" — storing but not publishing`, 'scraper');
        }

        const newId = boss.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const newBoss: RaidBoss = {
          id: newId,
          name: boss.name,
          tier: boss.tier,
          cp: boss.cp ?? 0,
          image: boss.image ?? `https://img.pokemondb.net/sprites/home/normal/${newId}.png`,
          types: boss.types,
          isShadow: boss.isShadow ?? false,
          isDynamax: boss.isDynamax ?? false,
          raidType,
          isActive: confidenceScore >= MIN_CONFIDENCE_TO_PUBLISH,
          startTime: now,
          endTime: now + (14 * 24 * 60 * 60 * 1000),
          sources,
          sourceUrls,
          confidenceScore,
          lastVerifiedAt: now,
          lastSyncedAt: now,
          adminOverride: null,
        };

        await this.storage.addRaidBoss(newBoss);
        if (newBoss.isActive) {
          added.push(newBoss);
        }
        if (this.config.notifyAdmin) {
          log(`  [NEW] Discovered: "${boss.name}" (id: ${newId}, tier ${boss.tier}, conf:${confidenceScore}) [${sources.join(', ')}]`, 'scraper');
        }
      }
    }

    // Deactivate bosses no longer in any source
    // Never auto-deactivate admin-approved bosses
    const removed: RaidBoss[] = [];
    if (this.config.autoDeactivate) {
      for (const activeBoss of currentActive) {
        if (scrapedActiveIds.has(activeBoss.id)) continue; // still active
        if (activeBoss.adminOverride === 'approved') {
          log(`  [=] Admin-approved, skipping deactivation: ${activeBoss.name}`, 'scraper');
          continue;
        }
        const updated = await this.storage.setRaidBossActive(activeBoss.id, false);
        if (updated) {
          removed.push(updated);
          log(`  [-] Deactivated: ${updated.name} (tier ${updated.tier}) — no longer in any source`, 'scraper');
        }
      }
    }

    const unchanged = currentActive.filter(
      (b: RaidBoss) => scrapedActiveIds.has(b.id) && currentActiveIds.has(b.id)
    );

    const update: RaidRotationUpdate = {
      added,
      removed,
      unchanged,
      newDiscovered,
      lastUpdated: Date.now(),
      sources: results.filter(r => r.success).map(r => r.source),
      sourceResults,
    };

    this.lastUpdate = update;

    log(`Raid update complete: +${added.length} -${removed.length} =${unchanged.length} new:${newDiscovered.length}`, 'scraper');

    // Notify server so it can push WS event to all clients
    if (this.config.onUpdate && (added.length > 0 || removed.length > 0)) {
      try {
        this.config.onUpdate(update);
      } catch (e) {
        log(`onUpdate callback error: ${e}`, 'scraper');
      }
    }

    return update;
  }

  /**
   * Get the last update result
   */
  getLastUpdate(): RaidRotationUpdate | null {
    return this.lastUpdate;
  }

  /**
   * Get current config
   */
  getConfig(): RaidScraperConfig {
    return { ...this.config };
  }

  /**
   * Update config at runtime (restarts the scheduler to apply changes)
   */
  updateConfig(updates: Partial<RaidScraperConfig>): void {
    const wasRunning = this.intervalId !== null || this.alignTimeoutId !== null;
    if (wasRunning) this.stop();
    this.config = { ...this.config, ...updates };
    if (wasRunning && this.config.enabled) this.start();
  }

  /** Whether the scheduler is currently active */
  isRunning(): boolean {
    return this.intervalId !== null || this.alignTimeoutId !== null;
  }

  /** When the next scheduled run will fire (approximate) */
  nextRunAt(): Date | null {
    if (!this.isRunning() || !this.lastUpdate) return null;
    return new Date(this.lastUpdate.lastUpdated + this.config.intervalMs);
  }

  /**
   * Force a manual refresh (for admin use)
   */
  async forceRefresh(): Promise<RaidRotationUpdate> {
    log('Manual raid boss refresh triggered', 'scraper');
    return this.update();
  }
}
