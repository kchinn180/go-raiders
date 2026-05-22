/**
 * Client-side Raid Boss Data
 *
 * All raid boss details, counter recommendations, and calculations run
 * entirely on the client. No server round-trip needed for static game data.
 *
 * Current rotation: May 2026
 */

import type {
  PokemonType,
  PokemonMove,
  PokemonStats,
  PokemonDetails,
  CounterPokemon,
  RaidBossDetails,
} from "@shared/schema";
import { TYPE_EFFECTIVENESS, POKEMON_TYPES } from "@shared/schema";

// ─── Internal data shapes ────────────────────────────────────────────────────

interface BossData {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  fastMoves: PokemonMove[];
  chargedMoves: PokemonMove[];
  tier: number;
  cp: number;
  image: string;
  isShadow?: boolean;
}

interface CounterData {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  image: string;
  fastMoves: PokemonMove[];
  chargedMoves: PokemonMove[];
}

// ─── Current raid rotation bosses (May 2026) ─────────────────────────────────

export const RAID_BOSS_DATA: BossData[] = [
  // ── Tier 5 / Legendary ───────────────────────────────────────────────────
  {
    id: 'nihilego',
    name: 'Nihilego',
    types: ['rock', 'poison'],
    stats: { attack: 249, defense: 210, stamina: 172 },
    tier: 5, cp: 48499, isShadow: false,
    image: 'https://img.pokemondb.net/sprites/home/normal/nihilego.png',
    fastMoves: [
      { name: 'Poison Jab',  type: 'poison',   damage: 12, energy: 7,  duration: 0.8 },
      { name: 'Rock Smash',  type: 'fighting',  damage: 15, energy: 10, duration: 1.3 },
    ],
    chargedMoves: [
      { name: 'Sludge Bomb',   type: 'poison',   damage: 80,  energy: 50,  duration: 2.3 },
      { name: 'Power Gem',     type: 'rock',     damage: 80,  energy: 50,  duration: 2.9 },
      { name: 'Gunk Shot',     type: 'poison',   damage: 130, energy: 100, duration: 3.1 },
      { name: 'Thunderbolt',   type: 'electric', damage: 90,  energy: 50,  duration: 2.5 },
    ],
  },
  {
    id: 'tapu-bulu',
    name: 'Tapu Bulu',
    types: ['grass', 'fairy'],
    stats: { attack: 244, defense: 172, stamina: 188 },
    tier: 5, cp: 46044,
    image: 'https://img.pokemondb.net/sprites/home/normal/tapu-bulu.png',
    fastMoves: [
      { name: 'Bullet Seed', type: 'grass',    damage: 8,  energy: 13, duration: 1.1 },
      { name: 'Rock Smash',  type: 'fighting', damage: 15, energy: 10, duration: 1.3 },
    ],
    chargedMoves: [
      { name: 'Grass Knot',      type: 'grass', damage: 90,  energy: 50,  duration: 2.6 },
      { name: 'Solar Beam',      type: 'grass', damage: 180, energy: 100, duration: 4.9 },
      { name: 'Dazzling Gleam',  type: 'fairy', damage: 110, energy: 70,  duration: 3.5 },
      { name: 'Megahorn',        type: 'bug',   damage: 110, energy: 100, duration: 2.2 },
    ],
  },
  {
    id: 'tapu-fini',
    name: 'Tapu Fini',
    types: ['water', 'fairy'],
    stats: { attack: 185, defense: 253, stamina: 172 },
    tier: 5, cp: 40765,
    image: 'https://img.pokemondb.net/sprites/home/normal/tapu-fini.png',
    fastMoves: [
      { name: 'Water Gun',    type: 'water',  damage: 5,  energy: 5,  duration: 0.5 },
      { name: 'Hidden Power', type: 'normal', damage: 15, energy: 15, duration: 1.5 },
    ],
    chargedMoves: [
      { name: 'Surf',        type: 'water', damage: 65,  energy: 40,  duration: 1.7 },
      { name: 'Hydro Pump',  type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Moonblast',   type: 'fairy', damage: 130, energy: 100, duration: 3.9 },
      { name: 'Ice Beam',    type: 'ice',   damage: 90,  energy: 50,  duration: 3.3 },
    ],
  },
  {
    id: 'shadow-cresselia',
    name: 'Shadow Cresselia',
    types: ['psychic'],
    stats: { attack: 152, defense: 258, stamina: 260 },
    tier: 5, cp: 33794, isShadow: true,
    image: 'https://img.pokemondb.net/sprites/home/normal/cresselia.png',
    fastMoves: [
      { name: 'Confusion',     type: 'psychic', damage: 20, energy: 15, duration: 1.6 },
      { name: 'Psycho Cut',    type: 'psychic', damage: 5,  energy: 8,  duration: 0.6 },
    ],
    chargedMoves: [
      { name: 'Moonblast',    type: 'fairy',   damage: 130, energy: 100, duration: 3.9 },
      { name: 'Future Sight', type: 'psychic', damage: 120, energy: 100, duration: 2.7 },
      { name: 'Aurora Beam',  type: 'ice',     damage: 80,  energy: 50,  duration: 3.3 },
    ],
  },

  // ── Mega Raids (Tier 4) ───────────────────────────────────────────────────
  {
    id: 'mega-camerupt',
    name: 'Mega Camerupt',
    types: ['fire', 'ground'],
    stats: { attack: 252, defense: 197, stamina: 207 },
    tier: 4, cp: 31532,
    image: 'https://img.pokemondb.net/sprites/home/normal/camerupt-mega.png',
    fastMoves: [
      { name: 'Ember',      type: 'fire',     damage: 10, energy: 10, duration: 1.0 },
      { name: 'Rock Smash', type: 'fighting', damage: 15, energy: 10, duration: 1.3 },
    ],
    chargedMoves: [
      { name: 'Overheat',      type: 'fire',  damage: 160, energy: 100, duration: 4.0 },
      { name: 'Earth Power',   type: 'ground', damage: 100, energy: 55, duration: 3.5 },
      { name: 'Solar Beam',    type: 'grass', damage: 180, energy: 100, duration: 4.9 },
      { name: 'Ancient Power', type: 'rock',  damage: 70,  energy: 33,  duration: 3.5 },
    ],
  },
  {
    id: 'mega-glalie',
    name: 'Mega Glalie',
    types: ['ice'],
    stats: { attack: 252, defense: 168, stamina: 190 },
    tier: 4, cp: 27892,
    image: 'https://img.pokemondb.net/sprites/home/normal/glalie-mega.png',
    fastMoves: [
      { name: 'Ice Shard',    type: 'ice', damage: 12, energy: 10, duration: 1.1 },
      { name: 'Frost Breath', type: 'ice', damage: 9,  energy: 8,  duration: 0.9 },
    ],
    chargedMoves: [
      { name: 'Avalanche',  type: 'ice',   damage: 90,  energy: 45, duration: 3.0 },
      { name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0 },
      { name: 'Gyro Ball',  type: 'steel', damage: 80,  energy: 50, duration: 2.6 },
      { name: 'Freeze-Dry', type: 'ice',   damage: 80,  energy: 50, duration: 2.5 },
    ],
  },
  {
    id: 'mega-altaria',
    name: 'Mega Altaria',
    types: ['dragon', 'fairy'],
    stats: { attack: 222, defense: 218, stamina: 181 },
    tier: 4, cp: 35621,
    image: 'https://img.pokemondb.net/sprites/home/normal/altaria-mega.png',
    fastMoves: [
      { name: 'Dragon Breath', type: 'dragon', damage: 6,  energy: 4,  duration: 0.5 },
      { name: 'Peck',          type: 'flying', damage: 10, energy: 10, duration: 1.0 },
    ],
    chargedMoves: [
      { name: 'Dazzling Gleam', type: 'fairy',  damage: 110, energy: 70,  duration: 3.5 },
      { name: 'Dragon Pulse',   type: 'dragon', damage: 90,  energy: 60,  duration: 3.6 },
      { name: 'Moonblast',      type: 'fairy',  damage: 130, energy: 100, duration: 3.9 },
      { name: 'Sky Attack',     type: 'flying', damage: 80,  energy: 50,  duration: 2.0 },
    ],
  },
  {
    id: 'mega-medicham',
    name: 'Mega Medicham',
    types: ['fighting', 'psychic'],
    stats: { attack: 228, defense: 211, stamina: 155 },
    tier: 4, cp: 28005,
    image: 'https://img.pokemondb.net/sprites/home/normal/medicham-mega.png',
    fastMoves: [
      { name: 'Counter',   type: 'fighting', damage: 12, energy: 8,  duration: 0.9 },
      { name: 'Confusion', type: 'psychic',  damage: 20, energy: 15, duration: 1.6 },
    ],
    chargedMoves: [
      { name: 'Ice Punch',      type: 'ice',      damage: 55, energy: 33,  duration: 1.9 },
      { name: 'Psychic',        type: 'psychic',  damage: 90, energy: 50,  duration: 2.8 },
      { name: 'Dynamic Punch',  type: 'fighting', damage: 90, energy: 50,  duration: 2.7 },
      { name: 'Power-Up Punch', type: 'fighting', damage: 20, energy: 35,  duration: 2.0 },
    ],
  },

  // ── Tier 3 ────────────────────────────────────────────────────────────────
  {
    id: 'nidoqueen',
    name: 'Nidoqueen',
    types: ['poison', 'ground'],
    stats: { attack: 180, defense: 174, stamina: 207 },
    tier: 3, cp: 22796,
    image: 'https://img.pokemondb.net/sprites/home/normal/nidoqueen.png',
    fastMoves: [
      { name: 'Poison Jab', type: 'poison', damage: 12, energy: 7, duration: 0.8 },
      { name: 'Bite',       type: 'dark',   damage: 6,  energy: 4, duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Stone Edge',  type: 'rock',   damage: 100, energy: 100, duration: 2.3 },
      { name: 'Earthquake',  type: 'ground', damage: 140, energy: 100, duration: 3.6 },
      { name: 'Sludge Wave', type: 'poison', damage: 110, energy: 65,  duration: 3.2 },
      { name: 'Poison Fang', type: 'poison', damage: 35,  energy: 33,  duration: 1.7 },
    ],
  },
  {
    id: 'starmie',
    name: 'Starmie',
    types: ['water', 'psychic'],
    stats: { attack: 210, defense: 184, stamina: 155 },
    tier: 3, cp: 20445,
    image: 'https://img.pokemondb.net/sprites/home/normal/starmie.png',
    fastMoves: [
      { name: 'Water Gun', type: 'water',  damage: 5, energy: 5, duration: 0.5 },
      { name: 'Tackle',    type: 'normal', damage: 5, energy: 5, duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Hydro Pump',  type: 'water',    damage: 130, energy: 100, duration: 3.3 },
      { name: 'Thunderbolt', type: 'electric', damage: 90,  energy: 50,  duration: 2.5 },
      { name: 'Psybeam',     type: 'psychic',  damage: 70,  energy: 50,  duration: 3.2 },
      { name: 'Power Gem',   type: 'rock',     damage: 80,  energy: 50,  duration: 2.9 },
    ],
  },
  {
    id: 'druddigon',
    name: 'Druddigon',
    types: ['dragon'],
    stats: { attack: 213, defense: 166, stamina: 194 },
    tier: 3, cp: 20508,
    image: 'https://img.pokemondb.net/sprites/home/normal/druddigon.png',
    fastMoves: [
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 },
      { name: 'Bite',        type: 'dark',   damage: 6,  energy: 4, duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Dragon Claw', type: 'dragon', damage: 50,  energy: 35,  duration: 1.6 },
      { name: 'Hyper Beam',  type: 'normal', damage: 150, energy: 100, duration: 3.8 },
      { name: 'Night Slash', type: 'dark',   damage: 50,  energy: 35,  duration: 2.2 },
      { name: 'Outrage',     type: 'dragon', damage: 110, energy: 50,  duration: 3.9 },
    ],
  },

  // ── Tier 1 ────────────────────────────────────────────────────────────────
  {
    id: 'hisuian-voltorb',
    name: 'Hisuian Voltorb',
    types: ['electric', 'grass'],
    stats: { attack: 109, defense: 111, stamina: 120 },
    tier: 1, cp: 7459,
    image: 'https://img.pokemondb.net/sprites/home/normal/voltorb-hisuian.png',
    fastMoves: [
      { name: 'Spark',  type: 'electric', damage: 6, energy: 9, duration: 0.7 },
      { name: 'Tackle', type: 'normal',   damage: 5, energy: 5, duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Thunderbolt', type: 'electric', damage: 90, energy: 50, duration: 2.5 },
      { name: 'Energy Ball',  type: 'grass',   damage: 90, energy: 50, duration: 3.9 },
    ],
  },
  {
    id: 'bagon',
    name: 'Bagon',
    types: ['dragon'],
    stats: { attack: 134, defense: 93, stamina: 128 },
    tier: 1, cp: 6099,
    image: 'https://img.pokemondb.net/sprites/home/normal/bagon.png',
    fastMoves: [
      { name: 'Bite',  type: 'dark', damage: 6,  energy: 4,  duration: 0.5 },
      { name: 'Ember', type: 'fire', damage: 10, energy: 10, duration: 1.0 },
    ],
    chargedMoves: [
      { name: 'Dragon Claw',  type: 'dragon', damage: 50, energy: 35, duration: 1.6 },
      { name: 'Flamethrower', type: 'fire',   damage: 90, energy: 50, duration: 2.2 },
    ],
  },
  {
    id: 'shieldon',
    name: 'Shieldon',
    types: ['rock', 'steel'],
    stats: { attack: 76, defense: 182, stamina: 102 },
    tier: 1, cp: 4813,
    image: 'https://img.pokemondb.net/sprites/home/normal/shieldon.png',
    fastMoves: [
      { name: 'Iron Tail', type: 'steel',  damage: 15, energy: 7, duration: 1.1 },
      { name: 'Tackle',    type: 'normal', damage: 5,  energy: 5, duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Ancient Power', type: 'rock',  damage: 70,  energy: 33,  duration: 3.5 },
      { name: 'Flash Cannon',  type: 'steel', damage: 100, energy: 100, duration: 2.7 },
    ],
  },
  {
    id: 'espurr',
    name: 'Espurr',
    types: ['psychic'],
    stats: { attack: 120, defense: 114, stamina: 128 },
    tier: 1, cp: 8608,
    image: 'https://img.pokemondb.net/sprites/home/normal/espurr.png',
    fastMoves: [
      { name: 'Confusion', type: 'psychic', damage: 20, energy: 15, duration: 1.6 },
      { name: 'Scratch',   type: 'normal',  damage: 6,  energy: 4,  duration: 0.5 },
    ],
    chargedMoves: [
      { name: 'Psybeam',    type: 'psychic', damage: 70,  energy: 50, duration: 3.2 },
      { name: 'Shadow Ball', type: 'ghost',  damage: 100, energy: 50, duration: 3.0 },
    ],
  },
  {
    id: 'shadow-larvitar',
    name: 'Shadow Larvitar',
    types: ['rock', 'ground'],
    stats: { attack: 115, defense: 93, stamina: 137 },
    tier: 1, cp: 5765, isShadow: true,
    image: 'https://img.pokemondb.net/sprites/home/normal/larvitar.png',
    fastMoves: [
      { name: 'Bite',       type: 'dark',     damage: 6,  energy: 4,  duration: 0.5 },
      { name: 'Rock Smash', type: 'fighting', damage: 15, energy: 10, duration: 1.3 },
    ],
    chargedMoves: [
      { name: 'Ancient Power', type: 'rock',   damage: 70, energy: 33, duration: 3.5 },
      { name: 'Crunch',        type: 'dark',   damage: 70, energy: 33, duration: 3.2 },
      { name: 'Stomp',         type: 'normal', damage: 55, energy: 33, duration: 1.7 },
    ],
  },
];

// ─── Counter Pokémon database ─────────────────────────────────────────────────

const COUNTER_POKEMON: CounterData[] = [
  {
    id: 'mega-rayquaza',
    name: 'Mega Rayquaza',
    types: ['dragon', 'flying'],
    stats: { attack: 377, defense: 210, stamina: 213 },
    image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png',
    fastMoves: [{ name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }],
    chargedMoves: [{ name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 }],
  },
  {
    id: 'shadow-mewtwo',
    name: 'Shadow Mewtwo',
    types: ['psychic'],
    stats: { attack: 300, defense: 182, stamina: 214 },
    image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png',
    fastMoves: [{ name: 'Psycho Cut', type: 'psychic', damage: 5, energy: 8, duration: 0.6 }],
    chargedMoves: [{ name: 'Psystrike', type: 'psychic', damage: 90, energy: 50, duration: 2.3 }],
  },
  {
    id: 'mega-garchomp',
    name: 'Mega Garchomp',
    types: ['dragon', 'ground'],
    stats: { attack: 339, defense: 222, stamina: 239 },
    image: 'https://img.pokemondb.net/sprites/home/normal/garchomp-mega.png',
    fastMoves: [
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 },
      { name: 'Mud Shot',    type: 'ground', damage: 5,  energy: 7, duration: 0.6 },
    ],
    chargedMoves: [
      { name: 'Outrage',     type: 'dragon', damage: 110, energy: 50, duration: 3.9 },
      { name: 'Earth Power', type: 'ground', damage: 100, energy: 55, duration: 3.5 },
    ],
  },
  {
    id: 'mega-gengar',
    name: 'Mega Gengar',
    types: ['ghost', 'poison'],
    stats: { attack: 349, defense: 199, stamina: 155 },
    image: 'https://img.pokemondb.net/sprites/home/normal/gengar-mega.png',
    fastMoves: [{ name: 'Shadow Claw', type: 'ghost', damage: 9, energy: 6, duration: 0.7 }],
    chargedMoves: [{ name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0 }],
  },
  {
    id: 'primal-groudon',
    name: 'Primal Groudon',
    types: ['ground', 'fire'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    image: 'https://img.pokemondb.net/sprites/home/normal/groudon-primal.png',
    fastMoves: [{ name: 'Mud Shot', type: 'ground', damage: 5, energy: 7, duration: 0.6 }],
    chargedMoves: [{ name: 'Precipice Blades', type: 'ground', damage: 130, energy: 50, duration: 1.7 }],
  },
  {
    id: 'primal-kyogre',
    name: 'Primal Kyogre',
    types: ['water'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    image: 'https://img.pokemondb.net/sprites/home/normal/kyogre-primal.png',
    fastMoves: [{ name: 'Waterfall', type: 'water', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Origin Pulse', type: 'water', damage: 130, energy: 50, duration: 1.7 }],
  },
  {
    id: 'mega-lucario',
    name: 'Mega Lucario',
    types: ['fighting', 'steel'],
    stats: { attack: 310, defense: 175, stamina: 172 },
    image: 'https://img.pokemondb.net/sprites/home/normal/lucario.png',
    fastMoves: [{ name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Aura Sphere', type: 'fighting', damage: 90, energy: 50, duration: 1.8 }],
  },
  {
    id: 'mega-blaziken',
    name: 'Mega Blaziken',
    types: ['fire', 'fighting'],
    stats: { attack: 329, defense: 168, stamina: 190 },
    image: 'https://img.pokemondb.net/sprites/home/normal/blaziken-mega.png',
    fastMoves: [
      { name: 'Counter',  type: 'fighting', damage: 12, energy: 8,  duration: 0.9 },
      { name: 'Fire Spin', type: 'fire',    damage: 14, energy: 10, duration: 1.1 },
    ],
    chargedMoves: [
      { name: 'Focus Blast',  type: 'fighting', damage: 140, energy: 100, duration: 3.5 },
      { name: 'Blast Burn',   type: 'fire',     damage: 110, energy: 50,  duration: 3.3 },
    ],
  },
  {
    id: 'shadow-tyranitar',
    name: 'Shadow Tyranitar',
    types: ['rock', 'dark'],
    stats: { attack: 251, defense: 207, stamina: 225 },
    image: 'https://img.pokemondb.net/sprites/home/normal/tyranitar.png',
    fastMoves: [{ name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Stone Edge', type: 'rock', damage: 100, energy: 100, duration: 2.3 }],
  },
  {
    id: 'mega-diancie',
    name: 'Mega Diancie',
    types: ['rock', 'fairy'],
    stats: { attack: 342, defense: 235, stamina: 137 },
    image: 'https://img.pokemondb.net/sprites/home/normal/diancie.png',
    fastMoves: [{ name: 'Rock Throw', type: 'rock', damage: 12, energy: 7, duration: 0.9 }],
    chargedMoves: [
      { name: 'Rock Slide',      type: 'rock',  damage: 80, energy: 50, duration: 2.7 },
      { name: 'Dazzling Gleam',  type: 'fairy', damage: 110, energy: 70, duration: 3.5 },
    ],
  },
  {
    id: 'shadow-mamoswine',
    name: 'Shadow Mamoswine',
    types: ['ice', 'ground'],
    stats: { attack: 247, defense: 146, stamina: 242 },
    image: 'https://img.pokemondb.net/sprites/home/normal/mamoswine.png',
    fastMoves: [{ name: 'Powder Snow', type: 'ice', damage: 6, energy: 8, duration: 1.0 }],
    chargedMoves: [{ name: 'Avalanche', type: 'ice', damage: 90, energy: 45, duration: 2.7 }],
  },
  {
    id: 'galarian-darmanitan',
    name: 'Galarian Darmanitan',
    types: ['ice'],
    stats: { attack: 263, defense: 114, stamina: 233 },
    image: 'https://img.pokemondb.net/sprites/home/normal/darmanitan-galarian-standard.png',
    fastMoves: [{ name: 'Ice Fang', type: 'ice', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Avalanche', type: 'ice', damage: 90, energy: 45, duration: 2.7 }],
  },
  {
    id: 'zacian',
    name: 'Zacian',
    types: ['fairy'],
    stats: { attack: 254, defense: 236, stamina: 192 },
    image: 'https://img.pokemondb.net/sprites/home/normal/zacian-hero.png',
    fastMoves: [
      { name: 'Snarl',  type: 'dark',  damage: 12, energy: 12, duration: 1.1 },
      { name: 'Quick Attack', type: 'normal', damage: 8, energy: 10, duration: 0.8 },
    ],
    chargedMoves: [
      { name: 'Play Rough',      type: 'fairy',    damage: 90,  energy: 50,  duration: 2.9 },
      { name: 'Close Combat',    type: 'fighting', damage: 100, energy: 45,  duration: 2.3 },
    ],
  },
  {
    id: 'shadow-gardevoir',
    name: 'Shadow Gardevoir',
    types: ['psychic', 'fairy'],
    stats: { attack: 237, defense: 195, stamina: 169 },
    image: 'https://img.pokemondb.net/sprites/home/normal/gardevoir.png',
    fastMoves: [
      { name: 'Charm',     type: 'fairy',   damage: 20, energy: 6,  duration: 1.5 },
      { name: 'Confusion', type: 'psychic', damage: 20, energy: 15, duration: 1.6 },
    ],
    chargedMoves: [
      { name: 'Dazzling Gleam', type: 'fairy',   damage: 110, energy: 70, duration: 3.5 },
      { name: 'Psychic',        type: 'psychic', damage: 90,  energy: 50, duration: 2.8 },
    ],
  },
  {
    id: 'terrakion',
    name: 'Terrakion',
    types: ['rock', 'fighting'],
    stats: { attack: 260, defense: 192, stamina: 209 },
    image: 'https://img.pokemondb.net/sprites/home/normal/terrakion.png',
    fastMoves: [{ name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Sacred Sword', type: 'fighting', damage: 55, energy: 35, duration: 1.2 }],
  },
  {
    id: 'shadow-machamp',
    name: 'Shadow Machamp',
    types: ['fighting'],
    stats: { attack: 234, defense: 159, stamina: 207 },
    image: 'https://img.pokemondb.net/sprites/home/normal/machamp.png',
    fastMoves: [{ name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Dynamic Punch', type: 'fighting', damage: 90, energy: 50, duration: 2.7 }],
  },
  {
    id: 'mega-salamence',
    name: 'Mega Salamence',
    types: ['dragon', 'flying'],
    stats: { attack: 310, defense: 251, stamina: 216 },
    image: 'https://img.pokemondb.net/sprites/home/normal/salamence-mega.png',
    fastMoves: [{ name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }],
    chargedMoves: [{ name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 }],
  },
  {
    id: 'shadow-swampert',
    name: 'Shadow Swampert',
    types: ['water', 'ground'],
    stats: { attack: 208, defense: 175, stamina: 225 },
    image: 'https://img.pokemondb.net/sprites/home/normal/swampert.png',
    fastMoves: [{ name: 'Water Gun', type: 'water', damage: 5, energy: 5, duration: 0.5 }],
    chargedMoves: [{ name: 'Hydro Cannon', type: 'water', damage: 90, energy: 40, duration: 1.9 }],
  },
  {
    id: 'shadow-rampardos',
    name: 'Shadow Rampardos',
    types: ['rock'],
    stats: { attack: 295, defense: 109, stamina: 219 },
    image: 'https://img.pokemondb.net/sprites/home/normal/rampardos.png',
    fastMoves: [{ name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Rock Slide', type: 'rock', damage: 80, energy: 50, duration: 2.7 }],
  },
  {
    id: 'excadrill',
    name: 'Excadrill',
    types: ['ground', 'steel'],
    stats: { attack: 255, defense: 129, stamina: 242 },
    image: 'https://img.pokemondb.net/sprites/home/normal/excadrill.png',
    fastMoves: [{ name: 'Mud-Slap', type: 'ground', damage: 18, energy: 8, duration: 1.4 }],
    chargedMoves: [{ name: 'Drill Run', type: 'ground', damage: 80, energy: 45, duration: 2.8 }],
  },
  {
    id: 'roserade',
    name: 'Roserade',
    types: ['grass', 'poison'],
    stats: { attack: 243, defense: 185, stamina: 155 },
    image: 'https://img.pokemondb.net/sprites/home/normal/roserade.png',
    fastMoves: [{ name: 'Razor Leaf', type: 'grass', damage: 13, energy: 7, duration: 1.0 }],
    chargedMoves: [{ name: 'Solar Beam', type: 'grass', damage: 180, energy: 100, duration: 4.9 }],
  },
  {
    id: 'kartana',
    name: 'Kartana',
    types: ['grass', 'steel'],
    stats: { attack: 323, defense: 237, stamina: 139 },
    image: 'https://img.pokemondb.net/sprites/home/normal/kartana.png',
    fastMoves: [{ name: 'Razor Leaf', type: 'grass', damage: 13, energy: 7, duration: 1.0 }],
    chargedMoves: [{ name: 'Leaf Blade', type: 'grass', damage: 70, energy: 35, duration: 2.4 }],
  },
];

// ─── Calculation functions ───────────────────────────────────────────────────

function calcTypeEffectiveness(attackType: PokemonType, defenseTypes: PokemonType[]): number {
  let multiplier = 1.0;
  for (const defType of defenseTypes) {
    const eff = TYPE_EFFECTIVENESS[attackType]?.[defType];
    if (eff !== undefined) multiplier *= eff;
  }
  return multiplier;
}

function calcWeaknesses(types: PokemonType[]) {
  return POKEMON_TYPES
    .map(t => ({ type: t, multiplier: calcTypeEffectiveness(t, types) }))
    .filter(x => x.multiplier > 1.0)
    .sort((a, b) => b.multiplier - a.multiplier);
}

function calcResistances(types: PokemonType[]) {
  return POKEMON_TYPES
    .map(t => ({ type: t, multiplier: calcTypeEffectiveness(t, types) }))
    .filter(x => x.multiplier < 1.0)
    .sort((a, b) => a.multiplier - b.multiplier);
}

function calcDPS(
  attack: number,
  fast: PokemonMove,
  charged: PokemonMove,
  effectiveness: number,
): number {
  const chargeTime = (charged.energy / fast.energy) * fast.duration;
  const cycleTime = chargeTime + charged.duration;
  const cycleDmg =
    fast.damage * effectiveness * (chargeTime / fast.duration) +
    charged.damage * effectiveness;
  return (cycleDmg / cycleTime) * (attack / 200);
}

export function calcTopCountersFromTypes(bossTypes: PokemonType[], limit = 6): CounterPokemon[] {
  return calcTopCounters(bossTypes, limit);
}

function calcTopCounters(bossTypes: PokemonType[], limit = 6): CounterPokemon[] {
  const results: CounterPokemon[] = [];

  for (const counter of COUNTER_POKEMON) {
    let bestFast = counter.fastMoves[0];
    let bestCharged = counter.chargedMoves[0];
    let bestScore = 0;

    for (const fast of counter.fastMoves) {
      for (const charged of counter.chargedMoves) {
        const fe = calcTypeEffectiveness(fast.type, bossTypes);
        const ce = calcTypeEffectiveness(charged.type, bossTypes);
        const avg = (fe + ce * 2) / 3;
        const score = calcDPS(counter.stats.attack, fast, charged, avg) * avg;
        if (score > bestScore) {
          bestScore = score;
          bestFast = fast;
          bestCharged = charged;
        }
      }
    }

    const avgEff =
      (calcTypeEffectiveness(bestFast.type, bossTypes) +
        calcTypeEffectiveness(bestCharged.type, bossTypes) * 2) /
      3;

    results.push({
      id: counter.id,
      name: counter.name,
      types: counter.types,
      stats: counter.stats,
      image: counter.image,
      fastMove: bestFast,
      chargedMove: bestCharged,
      effectivenessScore: bestScore,
      dps: calcDPS(counter.stats.attack, bestFast, bestCharged, avgEff),
    });
  }

  return results.sort((a, b) => b.effectivenessScore - a.effectivenessScore).slice(0, limit);
}

/**
 * CP multipliers per level (Pokémon GO values)
 */
const CPM: Record<number, number> = {
  1: 0.0939, 5: 0.2585, 10: 0.4225, 15: 0.5188, 20: 0.5974,
  25: 0.6671, 30: 0.7317, 35: 0.7799, 40: 0.7903, 50: 0.8403,
};

/**
 * Calculates catch CP range for a raid boss.
 * Returns [min, max] at level 20 (normal) and level 25 (weather boost).
 */
export function calcCatchCPRange(stats: PokemonStats): {
  normal: { min: number; max: number };
  weatherBoosted: { min: number; max: number };
} {
  const cpAtLevel = (iv_atk: number, iv_def: number, iv_sta: number, level: number) => {
    const cpm = CPM[level] ?? CPM[20];
    return Math.max(
      10,
      Math.floor(
        ((stats.attack + iv_atk) *
          Math.sqrt(stats.defense + iv_def) *
          Math.sqrt(stats.stamina + iv_sta) *
          cpm * cpm) /
          10,
      ),
    );
  };

  return {
    normal: {
      min: cpAtLevel(10, 10, 10, 20),
      max: cpAtLevel(15, 15, 15, 20),
    },
    weatherBoosted: {
      min: cpAtLevel(10, 10, 10, 25),
      max: cpAtLevel(15, 15, 15, 25),
    },
  };
}

function estimatePlayers(tier: number): number {
  if (tier === 1) return 1;
  if (tier === 3) return 2;
  if (tier === 4) return 3;
  if (tier === 5) return 4;
  return 3;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns full raid boss details computed entirely on the client.
 * Falls back to null if the boss ID is unknown (shouldn't happen for active bosses).
 */
export function getRaidBossDetailsClient(
  bossId: string,
  raidEndTime?: number,
): RaidBossDetails | null {
  const boss = RAID_BOSS_DATA.find(b => b.id === bossId);
  if (!boss) return null;

  const weaknesses  = calcWeaknesses(boss.types);
  const resistances = calcResistances(boss.types);
  const counters    = calcTopCounters(boss.types);
  const estimatedPlayers = estimatePlayers(boss.tier);

  const pokemon: PokemonDetails = {
    id:           boss.id,
    name:         boss.name,
    types:        boss.types,
    stats:        boss.stats,
    fastMoves:    boss.fastMoves,
    chargedMoves: boss.chargedMoves,
    weaknesses,
    resistances,
    tier:         boss.tier,
    cp:           boss.cp,
    image:        boss.image,
    raidEndTime,
  };

  return { pokemon, counters, estimatedPlayers };
}

/**
 * Returns counter Pokémon details for nested modals.
 */
export function getCounterDetailsClient(counterId: string): PokemonDetails | null {
  const c = COUNTER_POKEMON.find(x => x.id === counterId);
  if (!c) return null;

  return {
    id:           c.id,
    name:         c.name,
    types:        c.types,
    stats:        c.stats,
    fastMoves:    c.fastMoves,
    chargedMoves: c.chargedMoves,
    weaknesses:   calcWeaknesses(c.types),
    resistances:  calcResistances(c.types),
    image:        c.image,
  };
}
