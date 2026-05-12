/**
 * Test Raids Utility
 *
 * Generates realistic-looking fake lobbies for testing the Join Feed
 * without needing live server data. Test lobbies are only injected when
 * the admin toggles them on; they live only on the local device.
 *
 * LocalStorage key: "goraiders_test_raids"
 */

import { BOSSES } from "@shared/schema";
import type { Lobby, TeamId } from "@shared/schema";

const LS_KEY = "goraiders_test_raids";

export function isTestRaidsEnabled(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "true";
  } catch {
    return false;
  }
}

export function setTestRaidsEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LS_KEY, "true");
    } else {
      localStorage.removeItem(LS_KEY);
    }
  } catch {}
}

const FAKE_HOSTS: Array<{ name: string; team: TeamId; level: number; code: string }> = [
  { name: "TrainerRed",    team: "valor",    level: 50, code: "1234 5678 9012" },
  { name: "AshKetchum",   team: "instinct", level: 42, code: "9876 5432 1098" },
  { name: "MistyBlue",    team: "mystic",   level: 47, code: "1111 2222 3333" },
  { name: "BlueOak",      team: "valor",    level: 50, code: "4444 5555 6666" },
  { name: "LanceDragon",  team: "mystic",   level: 49, code: "7777 8888 9999" },
  { name: "ErikaLeaf",    team: "instinct", level: 38, code: "2468 1357 9246" },
];

const FAKE_PLAYERS: Array<{ name: string; team: TeamId; level: number; code: string }> = [
  { name: "Brock",      team: "valor",    level: 35, code: "1122 3344 5566" },
  { name: "May",        team: "mystic",   level: 40, code: "9988 7766 5544" },
  { name: "Serena",     team: "instinct", level: 44, code: "1357 2468 1357" },
  { name: "Gary",       team: "valor",    level: 48, code: "8642 9753 8642" },
  { name: "Dawn",       team: "mystic",   level: 37, code: "1234 9876 5678" },
  { name: "Cilan",      team: "instinct", level: 41, code: "5678 1234 9012" },
  { name: "Clemont",    team: "neutral",  level: 33, code: "3333 6666 9999" },
  { name: "Sophocles",  team: "instinct", level: 29, code: "1010 2020 3030" },
];

/** Pick n random items from array without duplicates */
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/** Build a realistic fake lobby for a given boss */
function makeTestLobby(boss: typeof BOSSES[number], seed: number): Lobby {
  const host = FAKE_HOSTS[seed % FAKE_HOSTS.length];
  const playerCount = 1 + (seed % 3); // 1-3 extra players
  const extraPlayers = sample(FAKE_PLAYERS, playerCount);

  const players = [
    {
      id: `test-host-${seed}`,
      name: host.name,
      level: host.level,
      team: host.team,
      isReady: true,
      isHost: true,
      isPremium: seed % 3 === 0,
      friendCode: host.code,
      hasSentRequest: false,
    },
    ...extraPlayers.map((p, i) => ({
      id: `test-player-${seed}-${i}`,
      name: p.name,
      level: p.level,
      team: p.team,
      isReady: i % 2 === 0,
      isHost: false,
      isPremium: false,
      friendCode: p.code,
      hasSentRequest: i % 2 === 0,
    })),
  ];

  return {
    id: `test-lobby-${boss.id}-${seed}`,
    bossId: boss.id,
    hostId: `test-host-${seed}`,
    hostName: host.name,
    hostRating: (4.2 + (seed % 8) * 0.1).toFixed(1),
    players,
    maxPlayers: 6,
    team: host.team,
    minLevel: 20 + (seed % 3) * 5,
    weather: seed % 4 === 0,
    createdAt: Date.now() - seed * 15_000,
    timeLeft: 15 - (seed % 10),
    raidStarted: false,
    invitesSent: false,
  };
}

/** Generate a varied set of fake lobbies covering different tiers */
export function generateTestLobbies(): Lobby[] {
  // Pick a spread of bosses: some 5-star, some mega, some shadow, some tier-1/3
  const picks = [
    ...sample(BOSSES.filter(b => b.tier === 5 && !b.isShadow), 3),
    ...sample(BOSSES.filter(b => b.name.toLowerCase().includes("mega")), 2),
    ...sample(BOSSES.filter(b => b.isShadow), 2),
    ...sample(BOSSES.filter(b => b.tier === 1 || b.tier === 3), 2),
  ];

  return picks.map((boss, i) => makeTestLobby(boss, i));
}
