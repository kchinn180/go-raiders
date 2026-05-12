/**
 * WeatherService — maps real weather to Pokémon GO in-game conditions
 *
 * Uses the OpenWeatherMap free API (no key needed for current conditions
 * via the public endpoint, or set VITE_OWM_API_KEY for higher rate limits).
 *
 * Results are cached in localStorage for 30 minutes so we don't hammer the API.
 *
 * ─── SETUP ──────────────────────────────────────────────────────────────────
 * Optional: Get a free API key from https://openweathermap.org/api
 * Set VITE_OWM_API_KEY in your .env file.
 * Without a key, the service tries the public endpoint (limited to ~60 req/hr).
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { PgoWeather } from "@shared/schema";
import { WEATHER_BOOSTS } from "@shared/schema";

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined;
const CACHE_KEY   = "goraiders_weather_cache";
const CACHE_TTL   = 30 * 60 * 1000; // 30 minutes

interface WeatherCache {
  weather: PgoWeather;
  description: string;
  fetchedAt: number;
  lat: number;
  lon: number;
}

// ── OpenWeatherMap condition ID → PGO weather ────────────────────────────────
// https://openweathermap.org/weather-conditions
function owmIdToPgo(id: number, isDay: boolean): PgoWeather {
  if (id >= 200 && id < 300) return 'rainy';       // Thunderstorm → rainy
  if (id >= 300 && id < 400) return 'rainy';       // Drizzle
  if (id >= 500 && id < 600) return 'rainy';       // Rain
  if (id >= 600 && id < 700) return 'snow';        // Snow
  if (id === 701 || id === 741) return 'fog';      // Mist / Fog
  if (id >= 700 && id < 800) return 'cloudy';      // Atmospheric (haze, dust…)
  if (id === 800) return isDay ? 'sunny' : 'partly_cloudy'; // Clear
  if (id === 801 || id === 802) return isDay ? 'partly_cloudy' : 'cloudy';
  if (id === 803 || id === 804) return 'cloudy';
  return 'unknown';
}

// ── Geolocation helper ───────────────────────────────────────────────────────
async function getCoords(): Promise<{ lat: number; lon: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 15 * 60 * 1000 }
    );
  });
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
function readCache(): WeatherCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: WeatherCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt > CACHE_TTL) return null;
    return cache;
  } catch { return null; }
}

function writeCache(data: WeatherCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  pgoWeather: PgoWeather;
  description: string;        // human-readable, e.g. "Partly cloudy"
  boostedTypes: string[];     // e.g. ["Normal", "Rock"]
  isBoosted: (types: string[]) => boolean;
}

/**
 * Get the current Pokémon GO weather for the user's location.
 * Returns `null` if geolocation or the network request fails.
 */
export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  // 1. Try cache first
  const cached = readCache();
  if (cached) return buildResult(cached.weather, cached.description);

  // 2. Get coordinates
  const coords = await getCoords();
  if (!coords) return null;

  // 3. Fetch from OpenWeatherMap
  try {
    const keyParam = OWM_API_KEY ? `&appid=${OWM_API_KEY}` : '';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric${keyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const conditionId: number = data.weather?.[0]?.id ?? 800;
    const description: string = data.weather?.[0]?.description ?? 'unknown';
    const isDay = data.dt >= data.sys.sunrise && data.dt <= data.sys.sunset;

    const pgo = owmIdToPgo(conditionId, isDay);

    writeCache({ weather: pgo, description, fetchedAt: Date.now(), lat: coords.lat, lon: coords.lon });
    return buildResult(pgo, description);
  } catch {
    return null;
  }
}

function buildResult(pgo: PgoWeather, description: string): CurrentWeather {
  const boostedTypes = WEATHER_BOOSTS[pgo] ?? [];
  return {
    pgoWeather: pgo,
    description,
    boostedTypes,
    isBoosted: (types: string[]) =>
      boostedTypes.length > 0 && types.some(t => boostedTypes.includes(t)),
  };
}

/** Emoji icon for each PGO weather type (used in UI badges) */
export const WEATHER_ICONS: Record<PgoWeather, string> = {
  sunny:         '☀️',
  rainy:         '🌧️',
  partly_cloudy: '⛅',
  cloudy:        '☁️',
  windy:         '💨',
  snow:          '❄️',
  fog:           '🌫️',
  unknown:       '🌡️',
};

/** Short label for each PGO weather type */
export const WEATHER_LABELS: Record<PgoWeather, string> = {
  sunny:         'Sunny',
  rainy:         'Rainy',
  partly_cloudy: 'Partly Cloudy',
  cloudy:        'Cloudy',
  windy:         'Windy',
  snow:          'Snow',
  fog:           'Foggy',
  unknown:       'Unknown',
};
