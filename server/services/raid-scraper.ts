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
 * - A boss must appear in at least 1 source to be considered active
 * - If 2+ sources agree, confidence is "high"
 * - New bosses not in the master list are flagged for admin review
 * - Bosses removed from ALL sources are automatically deactivated
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
  confidence: 'high' | 'medium' | 'low';
}

interface ScraperResult {
  bosses: ScrapedBoss[];
  source: string;
  fetchedAt: number;
  success: boolean;
  error?: string;
}

interface RaidRotationUpdate {
  added: RaidBoss[];
  removed: RaidBoss[];
  unchanged: RaidBoss[];
  newDiscovered: ScrapedBoss[];  // Bosses not in master list
  lastUpdated: number;
  sources: string[];
}

// ============================================================================
// DATA SOURCE FETCHERS
// ============================================================================

/**
 * Fetch from ScrapedDuck (automated Leek Duck scraper)
 * https://github.com/bigfoott/ScrapedDuck
 * Data branch: https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raid-bosses.json
 */
async function fetchScrapedDuck(): Promise<ScraperResult> {
  const source = 'ScrapedDuck';
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raid-bosses.json',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const bosses: ScrapedBoss[] = [];

    // ScrapedDuck format: { "currentList": [ { "name", "tier", "image", ... } ] }
    const entries = data.currentList || data.current || data;
    const bossArray = Array.isArray(entries) ? entries : [];

    for (const entry of bossArray) {
      bosses.push({
        name: entry.name || entry.pokemon || '',
        tier: parseTier(entry.tier || entry.raidTier || entry.level),
        image: entry.image || entry.imageUrl || entry.img,
        cp: entry.cp || entry.raidCp || entry.maxCp,
        types: entry.types || entry.type ? [].concat(entry.types || entry.type) : undefined,
        isShadow: entry.isShadow || entry.shadow || (entry.name || '').toLowerCase().includes('shadow'),
        isDynamax: entry.isDynamax || entry.dynamax || (entry.name || '').toLowerCase().includes('max'),
        isActive: true,
        source,
        confidence: 'high',
      });
    }

    return { bosses, source, fetchedAt: Date.now(), success: true };
  } catch (error: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: error.message };
  }
}

/**
 * Fetch from PoGoAPI.net
 * https://pogoapi.net/api/v1/raid_bosses.json
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

    const bosses: ScrapedBoss[] = [];

    // PoGoAPI format: { "current": { "1": [...], "3": [...], "5": [...] } }
    const current = data.current || data;

    for (const [tierStr, tierBosses] of Object.entries(current)) {
      const tier = parseInt(tierStr);
      if (isNaN(tier) || !Array.isArray(tierBosses)) continue;

      for (const entry of tierBosses as any[]) {
        bosses.push({
          name: entry.pokemon_name || entry.name || '',
          tier,
          cp: entry.cp || entry.raid_cp,
          types: entry.type ? [].concat(entry.type) : undefined,
          isShadow: (entry.pokemon_name || entry.name || '').toLowerCase().includes('shadow'),
          isDynamax: (entry.pokemon_name || entry.name || '').toLowerCase().includes('max'),
          isActive: true,
          source,
          confidence: 'medium',
        });
      }
    }

    return { bosses, source, fetchedAt: Date.now(), success: true };
  } catch (error: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: error.message };
  }
}

/**
 * Fetch from Pokemon-GO-API GitHub
 * https://pokemon-go-api.github.io/pokemon-go-api/api/raids.json
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

    const bosses: ScrapedBoss[] = [];

    // Format varies - handle both array and object formats
    const entries = Array.isArray(data) ? data : (data.raids || data.current || []);

    for (const entry of entries) {
      bosses.push({
        name: entry.name || entry.pokemon || '',
        tier: parseTier(entry.tier || entry.raidLevel || entry.level),
        image: entry.image || entry.imageUrl,
        cp: entry.cp || entry.raidCp,
        types: entry.types || [],
        isShadow: entry.isShadow || (entry.name || '').toLowerCase().includes('shadow'),
        isDynamax: entry.isDynamax || (entry.name || '').toLowerCase().includes('max'),
        isActive: true,
        source,
        confidence: 'medium',
      });
    }

    return { bosses, source, fetchedAt: Date.now(), success: true };
  } catch (error: any) {
    return { bosses: [], source, fetchedAt: Date.now(), success: false, error: error.message };
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

/**
 * Cross-reference results from multiple sources
 * Returns a merged, deduplicated list with confidence scores
 */
function crossReference(results: ScraperResult[]): Map<string, { boss: ScrapedBoss; sources: string[]; masterBossId: string | null }> {
  const merged = new Map<string, { boss: ScrapedBoss; sources: string[]; masterBossId: string | null }>();

  for (const result of results) {
    if (!result.success) continue;

    for (const boss of result.bosses) {
      const masterBossId = matchToMasterList(boss);
      const key = masterBossId || `new-${normalizeName(boss.name)}-t${boss.tier}`;

      const existing = merged.get(key);
      if (existing) {
        existing.sources.push(result.source);
        // Upgrade confidence if multiple sources agree
        if (existing.sources.length >= 2) {
          existing.boss.confidence = 'high';
        }
      } else {
        merged.set(key, {
          boss: { ...boss },
          sources: [result.source],
          masterBossId,
        });
      }
    }
  }

  return merged;
}

// ============================================================================
// MAIN SCRAPER SERVICE
// ============================================================================

/** Parse various tier formats into a number */
function parseTier(tier: any): number {
  if (typeof tier === 'number') return tier;
  const str = String(tier).toLowerCase();
  if (str.includes('mega') || str === '4') return 4;
  if (str.includes('5') || str.includes('legendary')) return 5;
  if (str.includes('3')) return 3;
  if (str.includes('1')) return 1;
  return 5; // default to 5-star
}

export interface RaidScraperConfig {
  enabled: boolean;         // Whether auto-update is active
  sources: ('ScrapedDuck' | 'PoGoAPI' | 'PokemonGoAPI')[];
  autoActivate: boolean;    // Auto-activate matched bosses
  autoDeactivate: boolean;  // Auto-deactivate bosses removed from all sources
  notifyAdmin: boolean;     // Log new discovered bosses for admin review
  onTheHour: boolean;       // Sync runs to the top of each hour (default: true)
}

const DEFAULT_CONFIG: RaidScraperConfig = {
  enabled: true,
  sources: ['ScrapedDuck', 'PoGoAPI', 'PokemonGoAPI'],
  autoActivate: true,
  autoDeactivate: true,
  notifyAdmin: true,
  onTheHour: true,
};

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Returns milliseconds until the next :00:00 (top of the next hour) */
function msUntilNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
}

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
   * When onTheHour=true (default), the first scheduled run fires at the next
   * :00 mark and every hour after that — so the roster always updates at
   * the same wall-clock time regardless of when the server started.
   * An immediate "warm-up" fetch always runs on start regardless.
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

    // Always do an immediate fetch so bosses are current on startup
    log('Raid scraper starting — running initial fetch now', 'scraper');
    this.update().catch(e => log(`Initial scrape failed: ${e}`, 'scraper'));

    if (this.config.onTheHour) {
      const wait = msUntilNextHour();
      const nextHour = new Date(Date.now() + wait);
      log(
        `Raid scraper will sync on the hour — next run at ${nextHour.toLocaleTimeString()} (in ${Math.round(wait / 60000)} min)`,
        'scraper'
      );

      // Sleep until the next :00, then tick every hour
      this.alignTimeoutId = setTimeout(() => {
        this.alignTimeoutId = null;
        this.runHourlyTick();
        this.intervalId = setInterval(() => this.runHourlyTick(), ONE_HOUR_MS);
      }, wait);
    } else {
      // Legacy: just run every hour from now
      this.intervalId = setInterval(() => {
        this.update().catch(e => log(`Scrape failed: ${e}`, 'scraper'));
      }, ONE_HOUR_MS);
    }
  }

  private runHourlyTick(): void {
    const hour = new Date().getHours();
    log(`Hourly raid boss sync triggered (${hour}:00)`, 'scraper');
    this.update().catch(e => log(`Hourly scrape failed: ${e}`, 'scraper'));
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
      'ScrapedDuck': fetchScrapedDuck,
      'PoGoAPI': fetchPoGoAPI,
      'PokemonGoAPI': fetchPokemonGoAPI,
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
      };
    }

    // Cross-reference all results
    const merged = crossReference(results);

    // Get current active bosses from storage
    const currentActive = await this.storage.getActiveRaidBosses();
    const currentActiveIds = new Set(currentActive.map((b: RaidBoss) => b.id));

    // Determine what to add, remove, and what's new
    const scrapedActiveIds = new Set<string>();
    const newDiscovered: ScrapedBoss[] = [];
    const added: RaidBoss[] = [];

    for (const [key, { boss, sources, masterBossId }] of Array.from(merged.entries())) {
      if (masterBossId) {
        scrapedActiveIds.add(masterBossId);

        // Activate if not already active
        if (!currentActiveIds.has(masterBossId) && this.config.autoActivate) {
          const updated = await this.storage.setRaidBossActive(
            masterBossId,
            true,
            Date.now(),
            Date.now() + (14 * 24 * 60 * 60 * 1000) // 2 weeks default
          );
          if (updated) {
            added.push(updated);
            log(`  [+] Activated: ${updated.name} (tier ${updated.tier}) [${sources.join(', ')}]`, 'scraper');
          }
        }
      } else {
        // New boss not in master list
        newDiscovered.push(boss);
        if (this.config.notifyAdmin) {
          log(`  [NEW] Discovered unknown boss: "${boss.name}" (tier ${boss.tier}) [${sources.join(', ')}]`, 'scraper');
        }
      }
    }

    // Deactivate bosses no longer in any source
    const removed: RaidBoss[] = [];
    if (this.config.autoDeactivate) {
      for (const activeBoss of currentActive) {
        if (!scrapedActiveIds.has(activeBoss.id)) {
          const updated = await this.storage.setRaidBossActive(activeBoss.id, false);
          if (updated) {
            removed.push(updated);
            log(`  [-] Deactivated: ${updated.name} (tier ${updated.tier})`, 'scraper');
          }
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
    };

    this.lastUpdate = update;

    log(`Raid update complete: +${added.length} -${removed.length} =${unchanged.length} new:${newDiscovered.length}`, 'scraper');

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
    if (!this.config.onTheHour || !this.isRunning()) return null;
    const now = new Date();
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 0, 0);
    return next;
  }

  /**
   * Force a manual refresh (for admin use)
   */
  async forceRefresh(): Promise<RaidRotationUpdate> {
    log('Manual raid boss refresh triggered', 'scraper');
    return this.update();
  }
}
