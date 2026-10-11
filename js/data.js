// Moonshadow Castle: the castle map, gates, enemies, bosses, equipment and items. Pure data.
// The castle is a grid of map cells; one cell is one screen of 24 x 14 tiles of 16 px.
export const TILE = 16, CW = 24, CH = 14;
export const SCREEN_W = CW * TILE, SCREEN_H = CH * TILE;

export const AREAS = {
  entrance: { zh: '城門大廳', en: 'Entrance Hall', lv: 1, wall: '#2a2e48', brick: '#3a3f60', trim: '#8a92b8', sky: ['#0a0c22', '#2a1a40'], moon: true, enemies: ['bat', 'zombie', 'skeleton'], music: 'entrance' },
  catacombs: { zh: '地下墓穴', en: 'Underground Catacombs', lv: 2, wall: '#1e2a26', brick: '#2e3e36', trim: '#6a8a70', sky: ['#05080a', '#0c1a16'], water: true, enemies: ['skeleton', 'bonethrower', 'zombie', 'bat'], music: 'catacombs' },
  library: { zh: '漫長圖書館', en: 'Long Library', lv: 3, wall: '#3a2414', brick: '#4e3420', trim: '#c8a060', sky: ['#120806', '#2a160c'], books: true, enemies: ['ghost', 'book', 'knight'], music: 'library' },
  clock: { zh: '鐘樓', en: 'Clock Tower', lv: 4, wall: '#2c2c34', brick: '#3e3e4a', trim: '#b8a070', sky: ['#0a1430', '#3a2a50'], gears: true, moon: true, enemies: ['medusa', 'gargoyle', 'knight', 'bat'], music: 'clock' },
  keep: { zh: '王座之塔', en: 'Castle Keep', lv: 5, wall: '#3a0e18', brick: '#541624', trim: '#d8a040', sky: ['#1a0408', '#4a0a14'], moon: true, enemies: ['knight', 'gargoyle', 'ghost', 'medusa', 'bonethrower'], music: 'keep' },
};

// rooms: [id, area, x, y, w, h, extra]
// extra: special: 'save' | 'shop' | 'start'; boss; item; relic; name
const R = (id, area, x, y, w, h, o = {}) => ({ id, area, x, y, w, h, ...o });
export const ROOMS = [
  R('r1', 'entrance', 0, 8, 3, 1, { special: 'start', outside: true, enemies: 0 }),
  R('r2', 'entrance', 3, 7, 4, 2, { item: 'potion' }),
  R('r8', 'entrance', 2, 7, 1, 1, { item: 'hpup', enemies: 0, secret: true }),
  R('r3', 'entrance', 7, 7, 1, 1, { special: 'save' }),
  R('r4', 'entrance', 7, 8, 3, 1),
  R('r6', 'entrance', 10, 8, 2, 1, { boss: 'greatbat' }),
  R('r7', 'entrance', 12, 8, 3, 1),
  R('r9', 'entrance', 15, 8, 1, 1, { item: 'shortsword2', enemies: 1 }),
  R('c1', 'catacombs', 8, 9, 1, 3),
  R('c2', 'catacombs', 9, 11, 4, 1),
  R('c3', 'catacombs', 13, 11, 1, 1, { special: 'save' }),
  R('c4', 'catacombs', 9, 12, 5, 1, { water: true }),
  R('c9', 'catacombs', 14, 12, 1, 1, { item: 'chainmail', enemies: 1 }),
  R('c5', 'catacombs', 5, 11, 3, 1, { item: 'leather' }),
  R('c6', 'catacombs', 4, 12, 3, 2, { item: 'mpup' }),
  R('c7', 'catacombs', 7, 13, 3, 1, { boss: 'golem' }),
  R('c8', 'catacombs', 10, 13, 1, 1, { relic: 'leap', enemies: 0 }),
  R('l1', 'library', 13, 6, 1, 2),
  R('l2', 'library', 14, 6, 5, 1, { item: 'rapier' }),
  R('l6', 'library', 15, 5, 3, 1, { item: 'heartup' }),
  R('l3', 'library', 19, 6, 1, 1, { special: 'shop' }),
  R('l4', 'library', 20, 6, 2, 2, { item: 'hpup' }),
  R('l5', 'library', 22, 7, 2, 1, { boss: 'witch' }),
  R('l7', 'library', 24, 7, 1, 1, { relic: 'cloak', enemies: 0 }),
  R('k1', 'clock', 12, 5, 3, 1),
  R('k2', 'clock', 12, 1, 1, 4),
  R('k8', 'clock', 13, 1, 2, 1, { item: 'mpup' }),
  R('k3', 'clock', 13, 2, 3, 1, { item: 'claymore' }),
  R('k4', 'clock', 16, 2, 1, 1, { special: 'save' }),
  R('k5', 'clock', 17, 2, 2, 1, { item: 'silverplate' }),
  R('k6', 'clock', 19, 2, 2, 1, { boss: 'sentinel' }),
  R('k7', 'clock', 21, 2, 1, 1, { relic: 'wing', enemies: 0 }),
  R('t1', 'keep', 21, -2, 1, 4, { enemies: 2 }),
  R('t2', 'keep', 22, -2, 3, 1, { item: 'hpup' }),
  R('t3', 'keep', 25, -2, 1, 1, { special: 'save' }),
  R('t4', 'keep', 26, -2, 2, 1, { item: 'moonblade' }),
  R('t5', 'keep', 28, -2, 2, 1, { boss: 'count', enemies: 0 }),
];
export const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// doors between two map cells: [x, y, 'R' (to x+1) | 'D' (to y+1), gate]
// gates: 'dj' needs the double jump, 'slide' a 1-tile-high crawlspace, 'bat' a shaft only flight can climb, 'break' a breakable wall
export const DOORS = [
  [2, 8, 'R'], [2, 7, 'R', 'break'], [6, 7, 'R'], [6, 8, 'R'], [9, 8, 'R'], [11, 8, 'R'], [14, 8, 'R'], [8, 8, 'D'],
  [13, 7, 'D', 'dj'],
  [8, 11, 'R'], [7, 11, 'R'], [12, 11, 'R'], [11, 11, 'D'], [13, 12, 'R'], [5, 11, 'D'], [6, 13, 'R'], [9, 13, 'R'],
  [13, 6, 'R'], [18, 6, 'R'], [19, 6, 'R'], [21, 7, 'R'], [23, 7, 'R'], [16, 5, 'D'], [14, 5, 'R', 'slide'],
  [12, 4, 'D'], [12, 2, 'R'], [12, 1, 'R'], [15, 2, 'R'], [16, 2, 'R'], [18, 2, 'R'], [20, 2, 'R'],
  [21, 1, 'D', 'bat'], [21, -2, 'R'], [24, -2, 'R'], [25, -2, 'R'], [27, -2, 'R'],
];

export const RELICS = {
  leap: { zh: '躍石', en: 'Leap Stone', d: { zh: '在空中再按一次跳躍：二段跳！', en: 'Press jump again in mid-air: a double jump!' } },
  cloak: { zh: '影之披風', en: 'Shadow Cloak', d: { zh: '蹲下時按跳躍：滑鏟，可以鑽過低矮的通道。', en: 'Jump while crouching to slide through low crawlspaces.' } },
  wing: { zh: '蝙蝠之翼', en: 'Bat Wing', d: { zh: '按「變身」化成蝙蝠，自由飛行（消耗 MP）。', en: 'Press Transform to become a bat and fly freely (uses MP).' } },
};

// ------------------------------------------------------------------ enemies (stats grow with the area level)
export const ENEMIES = {
  bat: { zh: '蝙蝠', en: 'Bat', hp: 8, atk: 6, def: 0, exp: 4, w: 14, h: 10, fly: true, drops: { heart: 0.4 } },
  zombie: { zh: '殭屍', en: 'Zombie', hp: 16, atk: 8, def: 0, exp: 6, w: 12, h: 28, drops: { heart: 0.3, gold: 0.3 } },
  skeleton: { zh: '骷髏兵', en: 'Skeleton', hp: 22, atk: 10, def: 1, exp: 9, w: 12, h: 28, drops: { heart: 0.3, gold: 0.4, item: 0.04 } },
  bonethrower: { zh: '擲骨骷髏', en: 'Bone Thrower', hp: 26, atk: 11, def: 1, exp: 12, w: 12, h: 28, drops: { heart: 0.3, gold: 0.4, item: 0.05 } },
  ghost: { zh: '幽靈', en: 'Ghost', hp: 20, atk: 12, def: 0, exp: 12, w: 14, h: 18, fly: true, phase: true, drops: { heart: 0.35, item: 0.04 } },
  book: { zh: '飛書', en: 'Flying Tome', hp: 24, atk: 12, def: 2, exp: 14, w: 14, h: 12, fly: true, drops: { heart: 0.3, gold: 0.3, item: 0.06 } },
  knight: { zh: '鎧甲騎士', en: 'Armor Knight', hp: 70, atk: 18, def: 5, exp: 30, w: 16, h: 30, drops: { gold: 0.6, item: 0.12 } },
  medusa: { zh: '梅杜莎頭', en: 'Medusa Head', hp: 12, atk: 14, def: 0, exp: 10, w: 14, h: 14, fly: true, drops: { heart: 0.5 } },
  gargoyle: { zh: '石像鬼', en: 'Gargoyle', hp: 45, atk: 16, def: 3, exp: 24, w: 18, h: 16, fly: true, drops: { gold: 0.5, item: 0.08 } },
};

export const BOSSES = {
  greatbat: { zh: '巨蝙蝠', en: 'Giant Bat', hp: 260, atk: 14, def: 1, exp: 200, w: 48, h: 26 },
  golem: { zh: '骸骨巨像', en: 'Bone Golem', hp: 560, atk: 20, def: 3, exp: 500, w: 44, h: 64 },
  witch: { zh: '魔女莫莉甘', en: 'Morrigan the Witch', hp: 720, atk: 24, def: 4, exp: 900, w: 20, h: 34 },
  sentinel: { zh: '鋼鐵哨兵', en: 'Iron Sentinel', hp: 1000, atk: 30, def: 8, exp: 1500, w: 36, h: 56 },
  count: { zh: '伯爵 沃拉斯', en: 'Count Vorlath', hp: 1500, atk: 34, def: 8, exp: 0, w: 22, h: 40 },
};

// ------------------------------------------------------------------ equipment and items
export const ITEMS = {
  // weapons: atk, reach (px), speed (attack time s)
  shortsword: { kind: 'weapon', zh: '短劍', en: 'Short Sword', atk: 6, reach: 26, time: 0.28, price: 0 },
  shortsword2: { kind: 'weapon', zh: '騎士短劍', en: "Knight's Sword", atk: 10, reach: 28, time: 0.28, price: 400 },
  rapier: { kind: 'weapon', zh: '細劍', en: 'Rapier', atk: 13, reach: 32, time: 0.2, price: 900 },
  claymore: { kind: 'weapon', zh: '雙手巨劍', en: 'Claymore', atk: 24, reach: 40, time: 0.42, price: 1800 },
  moonblade: { kind: 'weapon', zh: '月影之刃', en: 'Moonshadow Blade', atk: 34, reach: 36, time: 0.24, price: 0 },
  // armour
  tunic: { kind: 'armor', zh: '旅人外衣', en: "Traveller's Coat", def: 1, price: 0 },
  leather: { kind: 'armor', zh: '皮甲', en: 'Leather Armor', def: 4, price: 300 },
  chainmail: { kind: 'armor', zh: '鎖子甲', en: 'Chain Mail', def: 8, price: 800 },
  silverplate: { kind: 'armor', zh: '白銀鎧甲', en: 'Silver Plate', def: 14, price: 2000 },
  // accessories
  luckring: { kind: 'acc', zh: '幸運戒指', en: 'Ring of Luck', lck: 10, price: 600 },
  powerring: { kind: 'acc', zh: '力量戒指', en: 'Power Ring', str: 6, price: 1200 },
  ironring: { kind: 'acc', zh: '鐵壁戒指', en: 'Iron Ring', con: 6, price: 1200 },
  // consumables
  potion: { kind: 'use', zh: '藥水', en: 'Potion', heal: 60, price: 80 },
  hipotion: { kind: 'use', zh: '高級藥水', en: 'High Potion', heal: 200, price: 300 },
  elixir: { kind: 'use', zh: '萬靈藥', en: 'Elixir', heal: 9999, mp: 9999, price: 1500 },
  manaprism: { kind: 'use', zh: '魔力稜鏡', en: 'Mana Prism', mp: 9999, price: 400 },
  // permanent upgrades found in rooms
  hpup: { kind: 'up', zh: '生命上限 +20', en: 'Max HP +20' }, mpup: { kind: 'up', zh: '魔力上限 +10', en: 'Max MP +10' }, heartup: { kind: 'up', zh: '愛心上限 +10', en: 'Max Hearts +10' },
};
export const SHOP = ['potion', 'hipotion', 'manaprism', 'elixir', 'shortsword2', 'leather', 'chainmail', 'luckring', 'powerring', 'ironring'];
// random drops from enemies by area level
export const DROP_TABLE = { 1: ['potion', 'luckring'], 2: ['potion', 'leather', 'shortsword2'], 3: ['potion', 'hipotion', 'rapier', 'chainmail'], 4: ['hipotion', 'powerring', 'ironring', 'manaprism'], 5: ['hipotion', 'elixir', 'claymore', 'silverplate'] };

// sub-weapons (use hearts)
export const SUBS = {
  dagger: { zh: '飛刀', en: 'Dagger', cost: 1, dmg: 10 },
  axe: { zh: '斧頭', en: 'Axe', cost: 2, dmg: 22 },
  holy: { zh: '聖水', en: 'Holy Water', cost: 2, dmg: 9 },
  cross: { zh: '十字架', en: 'Cross', cost: 3, dmg: 18 },
};
// sub-weapons sitting in rooms (picked up instead of the current one)
export const SUB_SPOTS = { r4: 'dagger', c2: 'axe', l2: 'holy', k5: 'cross' };

export const LEVEL_EXP = (lv) => Math.floor(30 * lv ** 2.1);
