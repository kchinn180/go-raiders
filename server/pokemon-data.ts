/**
 * Pokemon Data Service
 * 
 * This module contains comprehensive Pokémon data including:
 * - Type information for all raid bosses
 * - Move pools (fast and charged moves)
 * - Base stats (Attack, Defense, Stamina)
 * - Counter Pokémon database for recommendations
 * 
 * All data is structured for dynamic type effectiveness calculations
 * and counter recommendations based on DPS and type matchups.
 */

import type { 
  PokemonType, 
  PokemonMove, 
  PokemonStats, 
  PokemonDetails,
  CounterPokemon 
} from "@shared/schema";
import { TYPE_EFFECTIVENESS, POKEMON_TYPES } from "@shared/schema";

/**
 * Extended raid boss data with types, stats, and moves
 * This augments the basic boss data with battle-relevant information
 */
interface ExtendedBossData {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  fastMoves: PokemonMove[];
  chargedMoves: PokemonMove[];
  tier: number;
  cp: number;
  image: string;
}

/**
 * Counter Pokémon base data for recommendation calculations
 */
interface CounterBaseData {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  image: string;
  fastMoves: PokemonMove[];
  chargedMoves: PokemonMove[];
}

/**
 * Complete raid boss database with types, moves, and stats
 * Data sourced from Pokémon GO game mechanics
 */
export const RAID_BOSS_DATA: ExtendedBossData[] = [
  {
    id: 'rayquaza',
    name: 'Rayquaza',
    types: ['dragon', 'flying'],
    stats: { attack: 284, defense: 170, stamina: 213 },
    tier: 5,
    cp: 49808,
    image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png',
    fastMoves: [
      { name: 'Air Slash', type: 'flying', damage: 14, energy: 10, duration: 1.2 },
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }
    ],
    chargedMoves: [
      { name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 },
      { name: 'Aerial Ace', type: 'flying', damage: 55, energy: 33, duration: 2.4 },
      { name: 'Ancient Power', type: 'rock', damage: 70, energy: 33, duration: 3.5 },
      { name: 'Hurricane', type: 'flying', damage: 110, energy: 50, duration: 2.7, isElite: true },
      { name: 'Breaking Swipe', type: 'dragon', damage: 35, energy: 35, duration: 1.0 }
    ]
  },
  {
    id: 'mewtwo',
    name: 'Mewtwo',
    types: ['psychic'],
    stats: { attack: 300, defense: 182, stamina: 214 },
    tier: 5,
    cp: 54148,
    image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png',
    fastMoves: [
      { name: 'Psycho Cut', type: 'psychic', damage: 5, energy: 8, duration: 0.6 },
      { name: 'Confusion', type: 'psychic', damage: 20, energy: 15, duration: 1.6 }
    ],
    chargedMoves: [
      { name: 'Psystrike', type: 'psychic', damage: 90, energy: 50, duration: 2.3, isLegacy: true },
      { name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0, isLegacy: true },
      { name: 'Focus Blast', type: 'fighting', damage: 140, energy: 100, duration: 3.5 },
      { name: 'Psychic', type: 'psychic', damage: 90, energy: 50, duration: 2.8 },
      { name: 'Ice Beam', type: 'ice', damage: 90, energy: 50, duration: 3.3 },
      { name: 'Thunderbolt', type: 'electric', damage: 90, energy: 50, duration: 2.5 },
      { name: 'Flamethrower', type: 'fire', damage: 90, energy: 50, duration: 2.2 }
    ]
  },
  {
    id: 'dialga',
    name: 'Dialga',
    types: ['steel', 'dragon'],
    stats: { attack: 275, defense: 211, stamina: 205 },
    tier: 5,
    cp: 53394,
    image: 'https://img.pokemondb.net/sprites/home/normal/dialga.png',
    fastMoves: [
      { name: 'Dragon Breath', type: 'dragon', damage: 6, energy: 4, duration: 0.5 },
      { name: 'Metal Claw', type: 'steel', damage: 8, energy: 7, duration: 0.7 }
    ],
    chargedMoves: [
      { name: 'Draco Meteor', type: 'dragon', damage: 150, energy: 100, duration: 3.6 },
      { name: 'Iron Head', type: 'steel', damage: 60, energy: 50, duration: 1.9 },
      { name: 'Thunder', type: 'electric', damage: 100, energy: 100, duration: 2.4 },
      { name: 'Roar of Time', type: 'dragon', damage: 110, energy: 50, duration: 2.0, isElite: true }
    ]
  },
  {
    id: 'palkia',
    name: 'Palkia',
    types: ['water', 'dragon'],
    stats: { attack: 280, defense: 215, stamina: 189 },
    tier: 5,
    cp: 54793,
    image: 'https://img.pokemondb.net/sprites/home/normal/palkia.png',
    fastMoves: [
      { name: 'Dragon Breath', type: 'dragon', damage: 6, energy: 4, duration: 0.5 },
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }
    ],
    chargedMoves: [
      { name: 'Draco Meteor', type: 'dragon', damage: 150, energy: 100, duration: 3.6 },
      { name: 'Hydro Pump', type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Aqua Tail', type: 'water', damage: 50, energy: 35, duration: 1.9 },
      { name: 'Spacial Rend', type: 'dragon', damage: 100, energy: 50, duration: 2.0, isElite: true }
    ]
  },
  {
    id: 'lugia',
    name: 'Shadow Lugia',
    types: ['psychic', 'flying'],
    stats: { attack: 193, defense: 310, stamina: 235 },
    tier: 5,
    cp: 45000,
    image: 'https://img.pokemondb.net/sprites/home/normal/lugia.png',
    fastMoves: [
      { name: 'Extrasensory', type: 'psychic', damage: 12, energy: 12, duration: 1.1 },
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }
    ],
    chargedMoves: [
      { name: 'Sky Attack', type: 'flying', damage: 80, energy: 50, duration: 2.0 },
      { name: 'Hydro Pump', type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Future Sight', type: 'psychic', damage: 120, energy: 100, duration: 2.7 },
      { name: 'Aeroblast', type: 'flying', damage: 180, energy: 100, duration: 2.6, isElite: true }
    ]
  },
  {
    id: 'giratina',
    name: 'Giratina',
    types: ['ghost', 'dragon'],
    stats: { attack: 187, defense: 225, stamina: 284 },
    tier: 5,
    cp: 41776,
    image: 'https://img.pokemondb.net/sprites/home/normal/giratina-altered.png',
    fastMoves: [
      { name: 'Shadow Claw', type: 'ghost', damage: 9, energy: 6, duration: 0.7 },
      { name: 'Dragon Breath', type: 'dragon', damage: 6, energy: 4, duration: 0.5 }
    ],
    chargedMoves: [
      { name: 'Dragon Claw', type: 'dragon', damage: 50, energy: 35, duration: 1.6 },
      { name: 'Ancient Power', type: 'rock', damage: 70, energy: 33, duration: 3.5 },
      { name: 'Shadow Sneak', type: 'ghost', damage: 50, energy: 33, duration: 2.9 },
      { name: 'Shadow Force', type: 'ghost', damage: 120, energy: 50, duration: 2.0, isElite: true }
    ]
  },
  {
    id: 'darkrai',
    name: 'Darkrai',
    types: ['dark'],
    stats: { attack: 285, defense: 198, stamina: 172 },
    tier: 5,
    cp: 53623,
    image: 'https://img.pokemondb.net/sprites/home/normal/darkrai.png',
    fastMoves: [
      { name: 'Snarl', type: 'dark', damage: 12, energy: 12, duration: 1.1 },
      { name: 'Feint Attack', type: 'dark', damage: 10, energy: 9, duration: 0.9 }
    ],
    chargedMoves: [
      { name: 'Dark Pulse', type: 'dark', damage: 80, energy: 50, duration: 3.0 },
      { name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0 },
      { name: 'Focus Blast', type: 'fighting', damage: 140, energy: 100, duration: 3.5 },
      { name: 'Sludge Bomb', type: 'poison', damage: 80, energy: 50, duration: 2.3 }
    ]
  },
  {
    id: 'ho-oh',
    name: 'Ho-Oh',
    types: ['fire', 'flying'],
    stats: { attack: 239, defense: 244, stamina: 214 },
    tier: 5,
    cp: 50064,
    image: 'https://img.pokemondb.net/sprites/home/normal/ho-oh.png',
    fastMoves: [
      { name: 'Extrasensory', type: 'psychic', damage: 12, energy: 12, duration: 1.1 },
      { name: 'Steel Wing', type: 'steel', damage: 11, energy: 6, duration: 0.8 },
      { name: 'Incinerate', type: 'fire', damage: 29, energy: 20, duration: 2.3 }
    ],
    chargedMoves: [
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Brave Bird', type: 'flying', damage: 130, energy: 50, duration: 2.0 },
      { name: 'Solar Beam', type: 'grass', damage: 180, energy: 100, duration: 4.9 },
      { name: 'Sacred Fire', type: 'fire', damage: 130, energy: 50, duration: 2.0, isElite: true },
      { name: 'Earthquake', type: 'ground', damage: 140, energy: 100, duration: 3.6 }
    ]
  },
  {
    id: 'groudon',
    name: 'Primal Groudon',
    types: ['ground', 'fire'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    tier: 6,
    cp: 92860,
    image: 'https://img.pokemondb.net/sprites/home/normal/groudon-primal.png',
    fastMoves: [
      { name: 'Mud Shot', type: 'ground', damage: 5, energy: 7, duration: 0.6 },
      { name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }
    ],
    chargedMoves: [
      { name: 'Earthquake', type: 'ground', damage: 140, energy: 100, duration: 3.6 },
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Solar Beam', type: 'grass', damage: 180, energy: 100, duration: 4.9 },
      { name: 'Fire Punch', type: 'fire', damage: 55, energy: 33, duration: 2.2 },
      { name: 'Precipice Blades', type: 'ground', damage: 130, energy: 50, duration: 1.7, isElite: true }
    ]
  },
  {
    id: 'kyogre',
    name: 'Primal Kyogre',
    types: ['water'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    tier: 6,
    cp: 92860,
    image: 'https://img.pokemondb.net/sprites/home/normal/kyogre-primal.png',
    fastMoves: [
      { name: 'Waterfall', type: 'water', damage: 16, energy: 8, duration: 1.2 }
    ],
    chargedMoves: [
      { name: 'Hydro Pump', type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Thunder', type: 'electric', damage: 100, energy: 100, duration: 2.4 },
      { name: 'Blizzard', type: 'ice', damage: 140, energy: 100, duration: 3.1 },
      { name: 'Surf', type: 'water', damage: 65, energy: 40, duration: 1.7 },
      { name: 'Origin Pulse', type: 'water', damage: 130, energy: 50, duration: 1.7, isElite: true }
    ]
  },
  {
    id: 'mega-charizard-x',
    name: 'Mega Charizard X',
    types: ['fire', 'dragon'],
    stats: { attack: 273, defense: 213, stamina: 186 },
    tier: 4,
    cp: 48895,
    image: 'https://img.pokemondb.net/sprites/home/normal/charizard-mega-x.png',
    fastMoves: [
      { name: 'Fire Spin', type: 'fire', damage: 14, energy: 10, duration: 1.1 },
      { name: 'Dragon Breath', type: 'dragon', damage: 6, energy: 4, duration: 0.5 },
      { name: 'Air Slash', type: 'flying', damage: 14, energy: 10, duration: 1.2 }
    ],
    chargedMoves: [
      { name: 'Dragon Claw', type: 'dragon', damage: 50, energy: 35, duration: 1.6 },
      { name: 'Overheat', type: 'fire', damage: 160, energy: 100, duration: 4.0 },
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Flamethrower', type: 'fire', damage: 90, energy: 50, duration: 2.2 },
      { name: 'Blast Burn', type: 'fire', damage: 110, energy: 50, duration: 3.3, isElite: true }
    ]
  },
  {
    id: 'mega-blastoise',
    name: 'Mega Blastoise',
    types: ['water'],
    stats: { attack: 264, defense: 237, stamina: 188 },
    tier: 4,
    cp: 44074,
    image: 'https://img.pokemondb.net/sprites/home/normal/blastoise-mega.png',
    fastMoves: [
      { name: 'Water Gun', type: 'water', damage: 5, energy: 5, duration: 0.5 },
      { name: 'Bite', type: 'dark', damage: 6, energy: 4, duration: 0.5 }
    ],
    chargedMoves: [
      { name: 'Hydro Pump', type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Flash Cannon', type: 'steel', damage: 100, energy: 100, duration: 2.7 },
      { name: 'Ice Beam', type: 'ice', damage: 90, energy: 50, duration: 3.3 },
      { name: 'Skull Bash', type: 'normal', damage: 130, energy: 100, duration: 3.1 },
      { name: 'Hydro Cannon', type: 'water', damage: 90, energy: 40, duration: 1.9, isElite: true }
    ]
  },
  {
    id: 'mega-venusaur',
    name: 'Mega Venusaur',
    types: ['grass', 'poison'],
    stats: { attack: 241, defense: 246, stamina: 190 },
    tier: 4,
    cp: 42178,
    image: 'https://img.pokemondb.net/sprites/home/normal/venusaur-mega.png',
    fastMoves: [
      { name: 'Vine Whip', type: 'grass', damage: 7, energy: 6, duration: 0.6 },
      { name: 'Razor Leaf', type: 'grass', damage: 13, energy: 7, duration: 1.0 }
    ],
    chargedMoves: [
      { name: 'Solar Beam', type: 'grass', damage: 180, energy: 100, duration: 4.9 },
      { name: 'Petal Blizzard', type: 'grass', damage: 110, energy: 100, duration: 2.6 },
      { name: 'Sludge Bomb', type: 'poison', damage: 80, energy: 50, duration: 2.3 },
      { name: 'Frenzy Plant', type: 'grass', damage: 100, energy: 50, duration: 2.6, isElite: true }
    ]
  },
  {
    id: 'machamp',
    name: 'Machamp',
    types: ['fighting'],
    stats: { attack: 234, defense: 159, stamina: 207 },
    tier: 3,
    cp: 19707,
    image: 'https://img.pokemondb.net/sprites/home/normal/machamp.png',
    fastMoves: [
      { name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 },
      { name: 'Bullet Punch', type: 'steel', damage: 9, energy: 10, duration: 0.9 },
      { name: 'Karate Chop', type: 'fighting', damage: 8, energy: 10, duration: 0.8, isLegacy: true }
    ],
    chargedMoves: [
      { name: 'Dynamic Punch', type: 'fighting', damage: 90, energy: 50, duration: 2.7 },
      { name: 'Cross Chop', type: 'fighting', damage: 50, energy: 35, duration: 1.5 },
      { name: 'Close Combat', type: 'fighting', damage: 100, energy: 100, duration: 2.3 },
      { name: 'Rock Slide', type: 'rock', damage: 80, energy: 50, duration: 2.7 },
      { name: 'Payback', type: 'dark', damage: 110, energy: 100, duration: 2.2, isElite: true }
    ]
  },
  {
    id: 'tyranitar',
    name: 'Tyranitar',
    types: ['rock', 'dark'],
    stats: { attack: 251, defense: 207, stamina: 225 },
    tier: 4,
    cp: 37599,
    image: 'https://img.pokemondb.net/sprites/home/normal/tyranitar.png',
    fastMoves: [
      { name: 'Bite', type: 'dark', damage: 6, energy: 4, duration: 0.5 },
      { name: 'Iron Tail', type: 'steel', damage: 15, energy: 7, duration: 1.1 },
      { name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2, isElite: true }
    ],
    chargedMoves: [
      { name: 'Crunch', type: 'dark', damage: 70, energy: 33, duration: 3.2 },
      { name: 'Stone Edge', type: 'rock', damage: 100, energy: 100, duration: 2.3 },
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Brutal Swing', type: 'dark', damage: 65, energy: 40, duration: 2.2, isElite: true }
    ]
  },
  {
    id: 'suicune',
    name: 'Suicune',
    types: ['water'],
    stats: { attack: 180, defense: 235, stamina: 225 },
    tier: 5,
    cp: 37761,
    image: 'https://img.pokemondb.net/sprites/home/normal/suicune.png',
    fastMoves: [
      { name: 'Extrasensory', type: 'psychic', damage: 12, energy: 12, duration: 1.1 },
      { name: 'Snarl', type: 'dark', damage: 12, energy: 12, duration: 1.1 },
      { name: 'Ice Fang', type: 'ice', damage: 12, energy: 8, duration: 0.9 }
    ],
    chargedMoves: [
      { name: 'Hydro Pump', type: 'water', damage: 130, energy: 100, duration: 3.3 },
      { name: 'Bubble Beam', type: 'water', damage: 45, energy: 33, duration: 1.9 },
      { name: 'Water Pulse', type: 'water', damage: 70, energy: 50, duration: 3.2 },
      { name: 'Ice Beam', type: 'ice', damage: 90, energy: 50, duration: 3.3 }
    ]
  },
  {
    id: 'raikou',
    name: 'Raikou',
    types: ['electric'],
    stats: { attack: 241, defense: 195, stamina: 207 },
    tier: 5,
    cp: 45435,
    image: 'https://img.pokemondb.net/sprites/home/normal/raikou.png',
    fastMoves: [
      { name: 'Thunder Shock', type: 'electric', damage: 5, energy: 8, duration: 0.6 },
      { name: 'Volt Switch', type: 'electric', damage: 14, energy: 21, duration: 2.3 }
    ],
    chargedMoves: [
      { name: 'Thunder', type: 'electric', damage: 100, energy: 100, duration: 2.4 },
      { name: 'Thunderbolt', type: 'electric', damage: 90, energy: 50, duration: 2.5 },
      { name: 'Wild Charge', type: 'electric', damage: 90, energy: 50, duration: 2.6 },
      { name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0 }
    ]
  },
  {
    id: 'entei',
    name: 'Entei',
    types: ['fire'],
    stats: { attack: 235, defense: 171, stamina: 251 },
    tier: 5,
    cp: 46073,
    image: 'https://img.pokemondb.net/sprites/home/normal/entei.png',
    fastMoves: [
      { name: 'Fire Spin', type: 'fire', damage: 14, energy: 10, duration: 1.1 },
      { name: 'Fire Fang', type: 'fire', damage: 11, energy: 8, duration: 0.9 }
    ],
    chargedMoves: [
      { name: 'Flamethrower', type: 'fire', damage: 90, energy: 50, duration: 2.2 },
      { name: 'Fire Blast', type: 'fire', damage: 140, energy: 100, duration: 4.2 },
      { name: 'Overheat', type: 'fire', damage: 160, energy: 100, duration: 4.0 },
      { name: 'Iron Head', type: 'steel', damage: 60, energy: 50, duration: 1.9 },
      { name: 'Flame Charge', type: 'fire', damage: 70, energy: 33, duration: 2.9 }
    ]
  },
  {
    id: 'beldum',
    name: 'Beldum (Max)',
    types: ['steel', 'psychic'],
    stats: { attack: 96, defense: 132, stamina: 120 },
    tier: 1,
    cp: 5000,
    image: 'https://img.pokemondb.net/sprites/home/normal/beldum.png',
    fastMoves: [
      { name: 'Take Down', type: 'normal', damage: 8, energy: 8, duration: 1.2 }
    ],
    chargedMoves: [
      { name: 'Struggle', type: 'normal', damage: 35, energy: 33, duration: 2.2 }
    ]
  },
  {
    id: 'shinx',
    name: 'Shinx',
    types: ['electric'],
    stats: { attack: 117, defense: 64, stamina: 128 },
    tier: 1,
    cp: 2753,
    image: 'https://img.pokemondb.net/sprites/home/normal/shinx.png',
    fastMoves: [
      { name: 'Tackle', type: 'normal', damage: 5, energy: 5, duration: 0.5 },
      { name: 'Spark', type: 'electric', damage: 6, energy: 9, duration: 0.7 }
    ],
    chargedMoves: [
      { name: 'Discharge', type: 'electric', damage: 65, energy: 33, duration: 2.5 },
      { name: 'Thunderbolt', type: 'electric', damage: 90, energy: 50, duration: 2.5 },
      { name: 'Swift', type: 'normal', damage: 60, energy: 50, duration: 2.8 }
    ]
  },
  {
    id: 'timburr',
    name: 'Timburr',
    types: ['fighting'],
    stats: { attack: 134, defense: 87, stamina: 181 },
    tier: 1,
    cp: 4707,
    image: 'https://img.pokemondb.net/sprites/home/normal/timburr.png',
    fastMoves: [
      { name: 'Low Kick', type: 'fighting', damage: 6, energy: 6, duration: 0.6 },
      { name: 'Pound', type: 'normal', damage: 7, energy: 6, duration: 0.6 }
    ],
    chargedMoves: [
      { name: 'Brick Break', type: 'fighting', damage: 40, energy: 33, duration: 1.6 },
      { name: 'Low Sweep', type: 'fighting', damage: 40, energy: 33, duration: 1.9 },
      { name: 'Rock Tomb', type: 'rock', damage: 70, energy: 50, duration: 3.2 }
    ]
  },
  {
    id: 'klink',
    name: 'Klink',
    types: ['steel'],
    stats: { attack: 98, defense: 121, stamina: 120 },
    tier: 1,
    cp: 3227,
    image: 'https://img.pokemondb.net/sprites/home/normal/klink.png',
    fastMoves: [
      { name: 'Volt Switch', type: 'electric', damage: 14, energy: 21, duration: 2.3 },
      { name: 'Charge Beam', type: 'electric', damage: 8, energy: 15, duration: 1.1 }
    ],
    chargedMoves: [
      { name: 'Zap Cannon', type: 'electric', damage: 150, energy: 100, duration: 3.7 },
      { name: 'Discharge', type: 'electric', damage: 65, energy: 33, duration: 2.5 },
      { name: 'Vice Grip', type: 'normal', damage: 40, energy: 33, duration: 1.9 }
    ]
  }
];

/**
 * Counter Pokémon database for recommendations
 * These are top-tier counters commonly used in raids
 */
export const COUNTER_POKEMON: CounterBaseData[] = [
  {
    id: 'shadow-mamoswine',
    name: 'Shadow Mamoswine',
    types: ['ice', 'ground'],
    stats: { attack: 247, defense: 146, stamina: 242 },
    image: 'https://img.pokemondb.net/sprites/home/normal/mamoswine.png',
    fastMoves: [{ name: 'Powder Snow', type: 'ice', damage: 6, energy: 8, duration: 1.0 }],
    chargedMoves: [{ name: 'Avalanche', type: 'ice', damage: 90, energy: 45, duration: 2.7 }]
  },
  {
    id: 'shadow-weavile',
    name: 'Shadow Weavile',
    types: ['dark', 'ice'],
    stats: { attack: 243, defense: 171, stamina: 172 },
    image: 'https://img.pokemondb.net/sprites/home/normal/weavile.png',
    fastMoves: [{ name: 'Ice Shard', type: 'ice', damage: 12, energy: 12, duration: 1.2 }],
    chargedMoves: [{ name: 'Avalanche', type: 'ice', damage: 90, energy: 45, duration: 2.7 }]
  },
  {
    id: 'galarian-darmanitan',
    name: 'Galarian Darmanitan',
    types: ['ice'],
    stats: { attack: 263, defense: 114, stamina: 233 },
    image: 'https://img.pokemondb.net/sprites/home/normal/darmanitan-galarian-standard.png',
    fastMoves: [{ name: 'Ice Fang', type: 'ice', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Avalanche', type: 'ice', damage: 90, energy: 45, duration: 2.7 }]
  },
  {
    id: 'mega-rayquaza',
    name: 'Mega Rayquaza',
    types: ['dragon', 'flying'],
    stats: { attack: 377, defense: 210, stamina: 213 },
    image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png',
    fastMoves: [{ name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }],
    chargedMoves: [{ name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 }]
  },
  {
    id: 'mega-salamence',
    name: 'Mega Salamence',
    types: ['dragon', 'flying'],
    stats: { attack: 310, defense: 251, stamina: 216 },
    image: 'https://img.pokemondb.net/sprites/home/normal/salamence-mega.png',
    fastMoves: [{ name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }],
    chargedMoves: [{ name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 }]
  },
  {
    id: 'mega-garchomp',
    name: 'Mega Garchomp',
    types: ['dragon', 'ground'],
    stats: { attack: 339, defense: 222, stamina: 239 },
    image: 'https://img.pokemondb.net/sprites/home/normal/garchomp-mega.png',
    fastMoves: [{ name: 'Dragon Tail', type: 'dragon', damage: 15, energy: 9, duration: 1.1 }],
    chargedMoves: [{ name: 'Outrage', type: 'dragon', damage: 110, energy: 50, duration: 3.9 }]
  },
  {
    id: 'mega-gengar',
    name: 'Mega Gengar',
    types: ['ghost', 'poison'],
    stats: { attack: 349, defense: 199, stamina: 155 },
    image: 'https://img.pokemondb.net/sprites/home/normal/gengar-mega.png',
    fastMoves: [{ name: 'Shadow Claw', type: 'ghost', damage: 9, energy: 6, duration: 0.7 }],
    chargedMoves: [{ name: 'Shadow Ball', type: 'ghost', damage: 100, energy: 50, duration: 3.0 }]
  },
  {
    id: 'shadow-tyranitar',
    name: 'Shadow Tyranitar',
    types: ['rock', 'dark'],
    stats: { attack: 251, defense: 207, stamina: 225 },
    image: 'https://img.pokemondb.net/sprites/home/normal/tyranitar.png',
    fastMoves: [{ name: 'Bite', type: 'dark', damage: 6, energy: 4, duration: 0.5 }],
    chargedMoves: [{ name: 'Crunch', type: 'dark', damage: 70, energy: 33, duration: 3.2 }]
  },
  {
    id: 'shadow-mewtwo',
    name: 'Shadow Mewtwo',
    types: ['psychic'],
    stats: { attack: 300, defense: 182, stamina: 214 },
    image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png',
    fastMoves: [{ name: 'Psycho Cut', type: 'psychic', damage: 5, energy: 8, duration: 0.6 }],
    chargedMoves: [{ name: 'Psystrike', type: 'psychic', damage: 90, energy: 50, duration: 2.3 }]
  },
  {
    id: 'mega-lucario',
    name: 'Mega Lucario',
    types: ['fighting', 'steel'],
    stats: { attack: 310, defense: 175, stamina: 172 },
    image: 'https://img.pokemondb.net/sprites/home/normal/lucario.png',
    fastMoves: [{ name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Aura Sphere', type: 'fighting', damage: 90, energy: 50, duration: 1.8 }]
  },
  {
    id: 'shadow-machamp',
    name: 'Shadow Machamp',
    types: ['fighting'],
    stats: { attack: 234, defense: 159, stamina: 207 },
    image: 'https://img.pokemondb.net/sprites/home/normal/machamp.png',
    fastMoves: [{ name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Dynamic Punch', type: 'fighting', damage: 90, energy: 50, duration: 2.7 }]
  },
  {
    id: 'mega-blaziken',
    name: 'Mega Blaziken',
    types: ['fire', 'fighting'],
    stats: { attack: 329, defense: 168, stamina: 190 },
    image: 'https://img.pokemondb.net/sprites/home/normal/blaziken-mega.png',
    fastMoves: [{ name: 'Counter', type: 'fighting', damage: 12, energy: 8, duration: 0.9 }],
    chargedMoves: [{ name: 'Focus Blast', type: 'fighting', damage: 140, energy: 100, duration: 3.5 }]
  },
  {
    id: 'terrakion',
    name: 'Terrakion',
    types: ['rock', 'fighting'],
    stats: { attack: 260, defense: 192, stamina: 209 },
    image: 'https://img.pokemondb.net/sprites/home/normal/terrakion.png',
    fastMoves: [{ name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Sacred Sword', type: 'fighting', damage: 55, energy: 35, duration: 1.2 }]
  },
  {
    id: 'zacian',
    name: 'Zacian',
    types: ['fairy'],
    stats: { attack: 254, defense: 236, stamina: 192 },
    image: 'https://img.pokemondb.net/sprites/home/normal/zacian-hero.png',
    fastMoves: [{ name: 'Snarl', type: 'dark', damage: 12, energy: 12, duration: 1.1 }],
    chargedMoves: [{ name: 'Play Rough', type: 'fairy', damage: 90, energy: 50, duration: 2.9 }]
  },
  {
    id: 'shadow-gardevoir',
    name: 'Shadow Gardevoir',
    types: ['psychic', 'fairy'],
    stats: { attack: 237, defense: 195, stamina: 169 },
    image: 'https://img.pokemondb.net/sprites/home/normal/gardevoir.png',
    fastMoves: [{ name: 'Charm', type: 'fairy', damage: 20, energy: 6, duration: 1.5 }],
    chargedMoves: [{ name: 'Dazzling Gleam', type: 'fairy', damage: 100, energy: 50, duration: 3.5 }]
  },
  {
    id: 'primal-kyogre',
    name: 'Primal Kyogre',
    types: ['water'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    image: 'https://img.pokemondb.net/sprites/home/normal/kyogre-primal.png',
    fastMoves: [{ name: 'Waterfall', type: 'water', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Origin Pulse', type: 'water', damage: 130, energy: 50, duration: 1.7 }]
  },
  {
    id: 'primal-groudon',
    name: 'Primal Groudon',
    types: ['ground', 'fire'],
    stats: { attack: 353, defense: 268, stamina: 218 },
    image: 'https://img.pokemondb.net/sprites/home/normal/groudon-primal.png',
    fastMoves: [{ name: 'Mud Shot', type: 'ground', damage: 5, energy: 7, duration: 0.6 }],
    chargedMoves: [{ name: 'Precipice Blades', type: 'ground', damage: 130, energy: 50, duration: 1.7 }]
  },
  {
    id: 'shadow-rampardos',
    name: 'Shadow Rampardos',
    types: ['rock'],
    stats: { attack: 295, defense: 109, stamina: 219 },
    image: 'https://img.pokemondb.net/sprites/home/normal/rampardos.png',
    fastMoves: [{ name: 'Smack Down', type: 'rock', damage: 16, energy: 8, duration: 1.2 }],
    chargedMoves: [{ name: 'Rock Slide', type: 'rock', damage: 80, energy: 50, duration: 2.7 }]
  },
  {
    id: 'mega-diancie',
    name: 'Mega Diancie',
    types: ['rock', 'fairy'],
    stats: { attack: 342, defense: 235, stamina: 137 },
    image: 'https://img.pokemondb.net/sprites/home/normal/diancie.png',
    fastMoves: [{ name: 'Rock Throw', type: 'rock', damage: 12, energy: 7, duration: 0.9 }],
    chargedMoves: [{ name: 'Rock Slide', type: 'rock', damage: 80, energy: 50, duration: 2.7 }]
  },
  {
    id: 'shadow-swampert',
    name: 'Shadow Swampert',
    types: ['water', 'ground'],
    stats: { attack: 208, defense: 175, stamina: 225 },
    image: 'https://img.pokemondb.net/sprites/home/normal/swampert.png',
    fastMoves: [{ name: 'Water Gun', type: 'water', damage: 5, energy: 5, duration: 0.5 }],
    chargedMoves: [{ name: 'Hydro Cannon', type: 'water', damage: 90, energy: 40, duration: 1.9 }]
  }
];

/**
 * Calculates type effectiveness multiplier for an attacking type against defending types
 * 
 * @param attackType - The type of the attacking move
 * @param defenseTypes - Array of the defender's types
 * @returns Combined effectiveness multiplier
 */
export function calculateTypeEffectiveness(attackType: PokemonType, defenseTypes: PokemonType[]): number {
  let multiplier = 1.0;
  for (const defType of defenseTypes) {
    const effectiveness = TYPE_EFFECTIVENESS[attackType]?.[defType];
    if (effectiveness !== undefined) {
      multiplier *= effectiveness;
    }
  }
  return multiplier;
}

/**
 * Calculates all weaknesses for a given set of types
 * 
 * @param types - The Pokémon's types
 * @returns Array of types that deal super effective damage, sorted by multiplier
 */
export function calculateWeaknesses(types: PokemonType[]): { type: PokemonType; multiplier: number }[] {
  const weaknesses: { type: PokemonType; multiplier: number }[] = [];
  
  for (const attackType of POKEMON_TYPES) {
    const multiplier = calculateTypeEffectiveness(attackType, types);
    if (multiplier > 1.0) {
      weaknesses.push({ type: attackType, multiplier });
    }
  }
  
  return weaknesses.sort((a, b) => b.multiplier - a.multiplier);
}

/**
 * Calculates all resistances for a given set of types
 * 
 * @param types - The Pokémon's types
 * @returns Array of types that deal reduced damage, sorted by resistance strength
 */
export function calculateResistances(types: PokemonType[]): { type: PokemonType; multiplier: number }[] {
  const resistances: { type: PokemonType; multiplier: number }[] = [];
  
  for (const attackType of POKEMON_TYPES) {
    const multiplier = calculateTypeEffectiveness(attackType, types);
    if (multiplier < 1.0) {
      resistances.push({ type: attackType, multiplier });
    }
  }
  
  return resistances.sort((a, b) => a.multiplier - b.multiplier);
}

/**
 * Calculates DPS (Damage Per Second) for a Pokémon with specific moves
 * Uses simplified Pokémon GO damage formula
 * 
 * @param attackStat - The Pokémon's attack stat
 * @param fastMove - The fast move being used
 * @param chargedMove - The charged move being used
 * @param typeEffectiveness - Multiplier for type effectiveness
 * @returns Estimated DPS value
 */
export function calculateDPS(
  attackStat: number,
  fastMove: PokemonMove,
  chargedMove: PokemonMove,
  typeEffectiveness: number
): number {
  const fastDPS = (fastMove.damage * typeEffectiveness) / fastMove.duration;
  const chargedDPS = (chargedMove.damage * typeEffectiveness) / chargedMove.duration;
  const chargeTime = (chargedMove.energy / fastMove.energy) * fastMove.duration;
  
  const cycleTime = chargeTime + chargedMove.duration;
  const cycleDamage = (fastMove.damage * typeEffectiveness * (chargeTime / fastMove.duration)) + 
                      (chargedMove.damage * typeEffectiveness);
  
  const baseDPS = cycleDamage / cycleTime;
  const statModifier = attackStat / 200;
  
  return baseDPS * statModifier;
}

/**
 * Calculates the top counters for a raid boss
 * 
 * @param bossTypes - The raid boss's types
 * @param limit - Maximum number of counters to return (default 6)
 * @returns Array of counter Pokémon sorted by effectiveness
 */
export function calculateTopCounters(bossTypes: PokemonType[], limit: number = 6): CounterPokemon[] {
  const counters: CounterPokemon[] = [];
  
  for (const counter of COUNTER_POKEMON) {
    let bestFastMove = counter.fastMoves[0];
    let bestChargedMove = counter.chargedMoves[0];
    let bestScore = 0;
    
    for (const fastMove of counter.fastMoves) {
      for (const chargedMove of counter.chargedMoves) {
        const fastEffectiveness = calculateTypeEffectiveness(fastMove.type, bossTypes);
        const chargedEffectiveness = calculateTypeEffectiveness(chargedMove.type, bossTypes);
        const avgEffectiveness = (fastEffectiveness + chargedEffectiveness * 2) / 3;
        
        const dps = calculateDPS(counter.stats.attack, fastMove, chargedMove, avgEffectiveness);
        const score = dps * avgEffectiveness;
        
        if (score > bestScore) {
          bestScore = score;
          bestFastMove = fastMove;
          bestChargedMove = chargedMove;
        }
      }
    }
    
    const avgEffectiveness = (
      calculateTypeEffectiveness(bestFastMove.type, bossTypes) +
      calculateTypeEffectiveness(bestChargedMove.type, bossTypes) * 2
    ) / 3;
    
    counters.push({
      id: counter.id,
      name: counter.name,
      types: counter.types,
      stats: counter.stats,
      image: counter.image,
      fastMove: bestFastMove,
      chargedMove: bestChargedMove,
      effectivenessScore: bestScore,
      dps: calculateDPS(counter.stats.attack, bestFastMove, bestChargedMove, avgEffectiveness)
    });
  }
  
  return counters
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, limit);
}

/**
 * Estimates minimum recommended players for a raid based on tier
 * 
 * @param tier - The raid tier (1-6)
 * @returns Estimated minimum players needed
 */
export function estimatePlayersNeeded(tier: number): number {
  switch (tier) {
    case 1: return 1;
    case 3: return 2;
    case 4: return 3;
    case 5: return 4;
    case 6: return 6;
    default: return 3;
  }
}

/**
 * Gets detailed information for a specific raid boss
 * 
 * @param bossId - The boss ID to look up
 * @param raidEndTime - Optional timestamp when the raid ends
 * @returns Complete raid boss details or null if not found
 */
export function getRaidBossDetails(bossId: string, raidEndTime?: number): { 
  pokemon: PokemonDetails; 
  counters: CounterPokemon[]; 
  estimatedPlayers: number 
} | null {
  const boss = RAID_BOSS_DATA.find(b => b.id === bossId);
  if (!boss) return null;
  
  const weaknesses = calculateWeaknesses(boss.types);
  const resistances = calculateResistances(boss.types);
  const counters = calculateTopCounters(boss.types);
  const estimatedPlayers = estimatePlayersNeeded(boss.tier);
  
  return {
    pokemon: {
      id: boss.id,
      name: boss.name,
      types: boss.types,
      stats: boss.stats,
      fastMoves: boss.fastMoves,
      chargedMoves: boss.chargedMoves,
      weaknesses,
      resistances,
      tier: boss.tier,
      cp: boss.cp,
      image: boss.image,
      raidEndTime
    },
    counters,
    estimatedPlayers
  };
}

/**
 * Gets detailed information for a counter Pokémon
 * 
 * @param counterId - The counter Pokémon ID to look up
 * @returns Complete Pokémon details or null if not found
 */
export function getCounterPokemonDetails(counterId: string): PokemonDetails | null {
  const counter = COUNTER_POKEMON.find(c => c.id === counterId);
  if (!counter) return null;
  
  const weaknesses = calculateWeaknesses(counter.types);
  const resistances = calculateResistances(counter.types);
  
  return {
    id: counter.id,
    name: counter.name,
    types: counter.types,
    stats: counter.stats,
    fastMoves: counter.fastMoves,
    chargedMoves: counter.chargedMoves,
    weaknesses,
    resistances,
    image: counter.image
  };
}
