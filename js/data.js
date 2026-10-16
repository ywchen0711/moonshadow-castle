// Moonshadow Castle: the castle map, gates, enemies, bosses, relics and consumables. Pure data.
// The castle is a grid of map cells; one cell is one screen of 24 x 14 tiles of 16 px. The original hand-made
// rooms are below; castle.js grows the expansion around them and builds the Reversed Castle.
import { NEW_AREAS, buildCastle, reverseCastle, REV } from './castle.js?v=1';
import { ENEMIES2, BOSSES2 } from './monsters.js?v=1';
export const TILE = 16, CW = 24, CH = 14;
export const SCREEN_W = CW * TILE, SCREEN_H = CH * TILE;

// lv: the monster level of the area (item level of what drops there); style: how rooms are decorated
export const AREAS = {
  entrance: { zh: '城門大廳', en: 'Entrance Hall', lv: 1, style: 'hall', wall: '#2a2e48', brick: '#3a3f60', trim: '#8a92b8', sky: ['#0a0c22', '#2a1a40'], moon: true, enemies: ['bat', 'zombie', 'skeleton'], music: 'entrance' },
  catacombs: { zh: '地下墓穴', en: 'Underground Catacombs', lv: 3, style: 'crypt', wall: '#1e2a26', brick: '#2e3e36', trim: '#6a8a70', sky: ['#05080a', '#0c1a16'], water: true, enemies: ['skeleton', 'bonethrower', 'zombie', 'bat'], music: 'catacombs' },
  library: { zh: '漫長圖書館', en: 'Long Library', lv: 5, style: 'library', wall: '#3a2414', brick: '#4e3420', trim: '#c8a060', sky: ['#120806', '#2a160c'], books: true, enemies: ['ghost', 'book', 'knight'], music: 'library' },
  clock: { zh: '鐘樓', en: 'Clock Tower', lv: 7, style: 'clock', wall: '#2c2c34', brick: '#3e3e4a', trim: '#b8a070', sky: ['#0a1430', '#3a2a50'], gears: true, moon: true, enemies: ['medusa', 'gargoyle', 'knight', 'bat'], music: 'clock' },
  keep: { zh: '王座之塔', en: 'Castle Keep', lv: 9, style: 'keep', wall: '#3a0e18', brick: '#541624', trim: '#d8a040', sky: ['#1a0408', '#4a0a14'], moon: true, enemies: ['knight', 'gargoyle', 'ghost', 'medusa', 'bonethrower'], music: 'keep' },
  ...NEW_AREAS,
};

// rooms: [id, area, x, y, w, h, extra]
// extra: special: 'save' | 'shop' | 'warp' | 'start'; boss; item; relic; secret
const R = (id, area, x, y, w, h, o = {}) => ({ id, area, x, y, w, h, ...o });
const BASE_ROOMS = [
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
// doors between two map cells: [x, y, 'R' (to x+1) | 'D' (to y+1), gate]
// gates: 'dj' needs the double jump, 'slide' a 1-tile-high crawlspace, 'bat' a shaft only flight can climb,
// 'break' a breakable wall, 'grate' iron bars only mist passes, 'deep' flooded water that needs the snorkel
const BASE_DOORS = [
  [2, 8, 'R'], [2, 7, 'R', 'break'], [6, 7, 'R'], [6, 8, 'R'], [9, 8, 'R'], [11, 8, 'R'], [14, 8, 'R'], [8, 8, 'D'],
  [13, 7, 'D', 'dj'],
  [8, 11, 'R'], [7, 11, 'R'], [12, 11, 'R'], [11, 11, 'D'], [13, 12, 'R'], [5, 11, 'D'], [6, 13, 'R'], [9, 13, 'R'],
  [13, 6, 'R'], [18, 6, 'R'], [19, 6, 'R'], [21, 7, 'R'], [23, 7, 'R'], [16, 5, 'D'], [14, 5, 'R', 'slide'],
  [12, 4, 'D'], [12, 2, 'R'], [12, 1, 'R'], [15, 2, 'R'], [16, 2, 'R'], [18, 2, 'R'], [20, 2, 'R'],
  [21, 1, 'D', 'bat'], [21, -2, 'R'], [24, -2, 'R'], [25, -2, 'R'], [27, -2, 'R'],
];
const normal = buildCastle(BASE_ROOMS, BASE_DOORS);
const rev = reverseCastle(normal.rooms, normal.doors);
for (const r of rev.rooms) { if (r.boss === 'count') r.boss = 'moonlord'; const o = normal.rooms.find((n) => REV + n.id === r.id); if (o && o.relic) { r.item = 'chest'; r.enemies = 0; } }
export const ROOMS = [...normal.rooms, ...rev.rooms];
export const DOORS = [...normal.doors, ...rev.doors];
export const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
export const NORMAL_ROOMS = normal.rooms.length;

export const RELICS = {
  leap: { zh: '躍石', en: 'Leap Stone', d: { zh: '在空中再按一次跳躍：二段跳！', en: 'Press jump again in mid-air: a double jump!' } },
  cloak: { zh: '影之披風', en: 'Shadow Cloak', d: { zh: '蹲下時按跳躍：滑鏟，可以鑽過低矮的通道。', en: 'Jump while crouching to slide through low crawlspaces.' } },
  wing: { zh: '蝙蝠之翼', en: 'Bat Wing', d: { zh: '按「變身」化成蝙蝠，自由飛行（消耗 MP）。', en: 'Press Transform to become a bat and fly freely (uses MP).' } },
  echo: { zh: '回音之石', en: 'Echo Stone', d: { zh: '地圖上會顯示所在城堡的所有房間。', en: 'The map shows every room of the castle you are in.' } },
  fairy: { zh: '妖精的祝福', en: "Faerie's Blessing", d: { zh: '一位小妖精跟著你：生命過低時會幫你回復（有冷卻時間）。', en: 'A faerie follows you and heals you when your life runs low (with a cooldown).' } },
  mist: { zh: '霧化之戒', en: 'Ring of Mist', d: { zh: '按「霧化」化成一團霧：穿過鐵柵欄，不會受傷（消耗 MP）。', en: 'Press Mist to turn into mist: pass through iron grates and take no damage (uses MP).' } },
  snorkel: { zh: '聖水呼吸器', en: 'Holy Snorkel', d: { zh: '可以潛入深水，在水中按跳躍游泳。', en: 'Dive into deep water; press jump to swim.' } },
  moonEye: { zh: '月之瞳', en: 'Eye of the Moon', d: { zh: '看穿城堡的真相……打倒伯爵後，王座之間會開啟通往「逆轉城」的門。', en: "See the castle's true face... after the Count falls, the throne room opens a way to the Reversed Castle." } },
};

// ------------------------------------------------------------------ enemies (stats grow with the area level)
// undead take more from holy damage, maces and hammers; res: resistances (0..1)
export const ENEMIES = {
  bat: { zh: '蝙蝠', en: 'Bat', hp: 8, atk: 6, def: 0, exp: 4, w: 14, h: 10, fly: true, drops: { heart: 0.4 } },
  zombie: { zh: '殭屍', en: 'Zombie', hp: 16, atk: 8, def: 0, exp: 6, w: 12, h: 28, undead: true, drops: { heart: 0.3, gold: 0.3 } },
  skeleton: { zh: '骷髏兵', en: 'Skeleton', hp: 22, atk: 10, def: 1, exp: 9, w: 12, h: 28, undead: true, drops: { heart: 0.3, gold: 0.4 } },
  bonethrower: { zh: '擲骨骷髏', en: 'Bone Thrower', hp: 26, atk: 11, def: 1, exp: 12, w: 12, h: 28, undead: true, drops: { heart: 0.3, gold: 0.4 } },
  ghost: { zh: '幽靈', en: 'Ghost', hp: 20, atk: 12, def: 0, exp: 12, w: 14, h: 18, fly: true, phase: true, undead: true, res: { phys: 0.25 }, drops: { heart: 0.35 } },
  book: { zh: '飛書', en: 'Flying Tome', hp: 24, atk: 12, def: 2, exp: 14, w: 14, h: 12, fly: true, drops: { heart: 0.3, gold: 0.3 } },
  knight: { zh: '鎧甲騎士', en: 'Armor Knight', hp: 70, atk: 18, def: 5, exp: 30, w: 16, h: 30, drops: { gold: 0.6 } },
  medusa: { zh: '梅杜莎頭', en: 'Medusa Head', hp: 12, atk: 14, def: 0, exp: 10, w: 14, h: 14, fly: true, drops: { heart: 0.5 } },
  gargoyle: { zh: '石像鬼', en: 'Gargoyle', hp: 45, atk: 16, def: 3, exp: 24, w: 18, h: 16, fly: true, drops: { gold: 0.5 } },
  ...ENEMIES2,
};

export const BOSSES = {
  greatbat: { zh: '巨蝙蝠', en: 'Giant Bat', hp: 260, atk: 14, def: 1, exp: 200, w: 48, h: 26, lv: 1 },
  golem: { zh: '骸骨巨像', en: 'Bone Golem', hp: 560, atk: 20, def: 3, exp: 500, w: 44, h: 64, lv: 3 },
  witch: { zh: '魔女莫莉甘', en: 'Morrigan the Witch', hp: 720, atk: 24, def: 4, exp: 900, w: 20, h: 34, lv: 5 },
  sentinel: { zh: '鋼鐵哨兵', en: 'Iron Sentinel', hp: 1000, atk: 30, def: 8, exp: 1500, w: 36, h: 56, lv: 7 },
  count: { zh: '伯爵 沃拉斯', en: 'Count Vorlath', hp: 1500, atk: 34, def: 8, exp: 2400, w: 22, h: 40, lv: 9 },
  ...BOSSES2,
};

// ------------------------------------------------------------------ consumables and things found in rooms
// (weapons and armour are rolled items: see items.js)
export const ITEMS = {
  potion: { kind: 'use', zh: '藥水', en: 'Potion', heal: 60, price: 80 },
  hipotion: { kind: 'use', zh: '高級藥水', en: 'High Potion', heal: 200, price: 300 },
  superpotion: { kind: 'use', zh: '超級藥水', en: 'Super Potion', heal: 600, price: 900 },
  elixir: { kind: 'use', zh: '萬靈藥', en: 'Elixir', heal: 9999, mp: 9999, price: 1500 },
  manaprism: { kind: 'use', zh: '魔力稜鏡', en: 'Mana Prism', mp: 9999, price: 400 },
  antidote: { kind: 'use', zh: '解毒草', en: 'Antidote', cure: 1, price: 60 },
  warprune: { kind: 'use', zh: '回歸符文', en: 'Warp Rune', price: 250 },
  hpup: { kind: 'up', zh: '生命上限 +20', en: 'Max HP +20' }, mpup: { kind: 'up', zh: '魔力上限 +10', en: 'Max MP +10' }, heartup: { kind: 'up', zh: '愛心上限 +10', en: 'Max Hearts +10' },
  chest: { kind: 'chest', zh: '寶箱', en: 'Treasure Chest' },
};
export const SHOP = ['potion', 'hipotion', 'superpotion', 'manaprism', 'elixir', 'antidote', 'warprune'];
// weapons and armour placed in the original rooms: [base, quality, unique id]
export const ROOM_GEAR = {
  shortsword2: ['broadsword', 's'], leather: ['leatherarmor', 'm'], chainmail: ['chainmail', 'm'], rapier: ['rapier', 'm'],
  claymore: ['claymore', 'r'], silverplate: ['plate', 'r'], moonblade: ['longsword', 'u', 'moonblade'],
};
// sub-weapons in big candles (picked up instead of the current one)
export const SUB_SPOTS = { r4: 'knives', c2: 'axes', l2: 'holywater', k5: 'cross' };
{
  const pickRoom = (area, n) => normal.rooms.filter((r) => r.area === area && !r.boss && !r.special && !r.relic)[n];
  for (const [area, sub] of [['lab', 'knives'], ['gallery', 'bible'], ['garden', 'boomerang'], ['outer', 'javelin'], ['forge', 'firebomb'], ['quarters', 'shuriken'], ['belfry', 'stopwatch'], ['chapel', 'cross'], ['caverns', 'lightningorb'], ['abyss', 'crystal']]) {
    const r = pickRoom(area, 3); if (r) SUB_SPOTS[r.id] = sub;
  }
  for (const [id, sub] of Object.entries({ ...SUB_SPOTS })) SUB_SPOTS[REV + id] = sub;
}

export const LEVEL_EXP = (lv) => Math.floor(30 * lv ** 2.1);
