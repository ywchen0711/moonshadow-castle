// Moonshadow Castle: the expansion's monsters and bosses (data). Monsters are built from a behaviour ("ai") and a
// drawing template ("art") with colours; bosses from a body shape and a list of attack patterns. Stats are given at
// monster level 1 and grow with the area's level (game.js scale()).
// ai: walker charger hopper jumper dropper floater diver caster thrower turret mimic flyer
export const ENEMIES2 = {
  slime: { zh: '黏液怪', en: 'Slime', hp: 16, atk: 8, def: 0, exp: 6, w: 14, h: 10, ai: 'hopper', art: 'slime', col: ['#6ad84a', '#3a8a2a'], drops: { heart: 0.3, gold: 0.3 } },
  homunculus: { zh: '人造人', en: 'Homunculus', hp: 18, atk: 9, def: 0, exp: 7, w: 10, h: 20, ai: 'walker', art: 'imp', col: ['#d8a8a0', '#8a5a5a'], drops: { heart: 0.3, gold: 0.3 } },
  eyeball: { zh: '浮游魔眼', en: 'Floating Eye', hp: 14, atk: 9, def: 0, exp: 8, w: 14, h: 14, fly: true, ai: 'caster', proj: 'magic', art: 'eye', col: ['#f0e8e0', '#c83a5a'], drops: { heart: 0.4 } },
  spider: { zh: '巨蛛', en: 'Giant Spider', hp: 22, atk: 10, def: 1, exp: 10, w: 18, h: 12, ai: 'dropper', art: 'spider', col: ['#3a2a3a', '#a83a3a'], elem: 'pois', drops: { heart: 0.3, gold: 0.3 } },
  miner: { zh: '骷髏礦工', en: 'Skeleton Miner', hp: 28, atk: 11, def: 2, exp: 12, w: 12, h: 28, ai: 'thrower', proj: 'pick', art: 'skeleton', hat: 'helmet', col: ['#e8e0cc', '#a89c84'], undead: true, drops: { gold: 0.5, heart: 0.2 } },
  lady: { zh: '幽靈貴婦', en: 'Phantom Lady', hp: 26, atk: 12, def: 0, exp: 12, w: 14, h: 22, fly: true, phase: true, ai: 'floater', art: 'ghost', col: ['#ffc8e8', '#a04a7a'], undead: true, res: { phys: 0.3 }, drops: { heart: 0.4 } },
  axeknight: { zh: '斧騎士', en: 'Axe Armor', hp: 60, atk: 16, def: 4, exp: 26, w: 16, h: 30, ai: 'thrower', proj: 'axe', art: 'armor', col: ['#8a90a8', '#c8cee0', '#3a5ac8'], drops: { gold: 0.5 } },
  harpy: { zh: '鳥身女妖', en: 'Harpy', hp: 24, atk: 12, def: 1, exp: 13, w: 18, h: 16, fly: true, ai: 'diver', art: 'harpy', col: ['#c89a6a', '#e8d0b0'], drops: { heart: 0.4 } },
  plant: { zh: '食人花', en: 'Man-eating Plant', hp: 30, atk: 12, def: 2, exp: 12, w: 16, h: 24, ai: 'turret', proj: 'seed', art: 'plant', col: ['#3a8a3a', '#e83a6a'], elem: 'pois', drops: { heart: 0.3 } },
  imp: { zh: '小惡魔', en: 'Imp', hp: 22, atk: 12, def: 1, exp: 14, w: 12, h: 14, fly: true, ai: 'caster', proj: 'fire', art: 'imp', col: ['#d83a2a', '#5a1010'], drops: { heart: 0.3, gold: 0.3 } },
  magmagolem: { zh: '熔岩傀儡', en: 'Magma Golem', hp: 80, atk: 18, def: 5, exp: 32, w: 22, h: 34, ai: 'walker', heavy: true, art: 'golem', col: ['#5a2a1a', '#ff8a2a'], elem: 'fire', res: { fire: 0.75 }, drops: { gold: 0.6 } },
  werewolf: { zh: '狼人', en: 'Werewolf', hp: 60, atk: 18, def: 3, exp: 28, w: 16, h: 28, ai: 'charger', art: 'beast', col: ['#6a4a2a', '#c8a070'], drops: { gold: 0.5, heart: 0.2 } },
  bigbat: { zh: '吸血大蝙蝠', en: 'Vampire Bat', hp: 20, atk: 13, def: 0, exp: 12, w: 16, h: 12, fly: true, ai: 'flyer', art: 'bat', col: ['#5a1020', '#a82a3a'], drops: { heart: 0.5 } },
  owl: { zh: '夜梟', en: 'Night Owl', hp: 26, atk: 13, def: 1, exp: 14, w: 16, h: 14, fly: true, ai: 'diver', art: 'bird', col: ['#7a5a3a', '#e8c890'], drops: { heart: 0.4 } },
  clockman: { zh: '發條兵', en: 'Clockwork Soldier', hp: 50, atk: 16, def: 5, exp: 24, w: 14, h: 28, ai: 'thrower', proj: 'gear', art: 'armor', col: ['#a8884a', '#e8d090', '#6a4a20'], drops: { gold: 0.6 } },
  angel: { zh: '墮天使', en: 'Fallen Angel', hp: 40, atk: 16, def: 2, exp: 22, w: 16, h: 24, fly: true, ai: 'caster', proj: 'light', art: 'angel', col: ['#e8e0f0', '#ffd84a'], elem: 'ltng', drops: { heart: 0.4 } },
  priest: { zh: '骷髏祭司', en: 'Skeleton Priest', hp: 44, atk: 16, def: 2, exp: 22, w: 12, h: 28, ai: 'caster', proj: 'magic', art: 'skeleton', hat: 'hood', col: ['#e8e0cc', '#5a2a7a'], undead: true, drops: { gold: 0.5 } },
  gladiator: { zh: '角鬥士', en: 'Gladiator', hp: 90, atk: 20, def: 6, exp: 34, w: 16, h: 30, ai: 'charger', heavy: true, art: 'armor', col: ['#b8864a', '#e8c890', '#a82020'], drops: { gold: 0.6 } },
  lizardman: { zh: '蜥蜴人', en: 'Lizardman', hp: 60, atk: 18, def: 4, exp: 28, w: 14, h: 28, ai: 'jumper', art: 'lizard', col: ['#3a7a4a', '#c8d890'], drops: { gold: 0.4, heart: 0.2 } },
  merman: { zh: '魚人', en: 'Merman', hp: 40, atk: 15, def: 2, exp: 20, w: 14, h: 26, ai: 'jumper', art: 'fish', col: ['#3a7a8a', '#9ad8c8'], drops: { heart: 0.4 } },
  jelly: { zh: '電水母', en: 'Shock Jelly', hp: 30, atk: 14, def: 0, exp: 16, w: 14, h: 16, fly: true, ai: 'floater', slow: 0.6, art: 'jelly', col: ['#a8a0ff', '#ffe85a'], elem: 'ltng', res: { ltng: 0.75 }, drops: { heart: 0.4 } },
  frostspirit: { zh: '冰靈', en: 'Frost Spirit', hp: 36, atk: 16, def: 1, exp: 22, w: 14, h: 18, fly: true, ai: 'caster', proj: 'ice', art: 'wisp', col: ['#c8f0ff', '#4aa8e8'], elem: 'cold', res: { cold: 0.75 }, drops: { heart: 0.4 } },
  iceknight: { zh: '冰霜騎士', en: 'Frost Knight', hp: 90, atk: 20, def: 7, exp: 36, w: 16, h: 30, ai: 'walker', art: 'armor', col: ['#8ab8d8', '#e0f4ff', '#2a6aa8'], elem: 'cold', res: { cold: 0.5 }, drops: { gold: 0.5 } },
  frostwolf: { zh: '霜狼', en: 'Frost Wolf', hp: 60, atk: 18, def: 3, exp: 28, w: 18, h: 16, ai: 'charger', art: 'beast', col: ['#d8e8f0', '#8aa8c0'], elem: 'cold', res: { cold: 0.5 }, drops: { heart: 0.3 } },
  mimic: { zh: '寶箱怪', en: 'Mimic', hp: 80, atk: 22, def: 6, exp: 40, w: 18, h: 16, ai: 'mimic', art: 'chest', col: ['#8a5a2a', '#ffd84a'], drops: { gold: 1, heart: 0.2 } },
  goldgolem: { zh: '黃金傀儡', en: 'Gold Golem', hp: 110, atk: 22, def: 8, exp: 44, w: 22, h: 34, ai: 'walker', heavy: true, art: 'golem', col: ['#a8842a', '#ffe85a'], drops: { gold: 1 } },
  frogman: { zh: '蛙人', en: 'Frogman', hp: 46, atk: 16, def: 2, exp: 22, w: 16, h: 16, ai: 'jumper', art: 'frog', col: ['#4a8a3a', '#e8d84a'], elem: 'pois', drops: { heart: 0.4 } },
  skullpile: { zh: '骷髏塔', en: 'Bone Pillar', hp: 70, atk: 18, def: 4, exp: 30, w: 16, h: 32, ai: 'turret', proj: 'fire', art: 'skullpile', col: ['#e8e0cc', '#a89c84'], undead: true, heavy: true, drops: { gold: 0.5 } },
  wraith: { zh: '怨靈', en: 'Wraith', hp: 50, atk: 20, def: 2, exp: 32, w: 16, h: 24, fly: true, phase: true, ai: 'floater', art: 'wraith', col: ['#3a2a4a', '#8a4ad8'], undead: true, res: { phys: 0.4 }, drops: { heart: 0.4 } },
  demon: { zh: '惡魔', en: 'Demon', hp: 90, atk: 24, def: 5, exp: 44, w: 18, h: 32, ai: 'charger', art: 'demon', col: ['#8a1a1a', '#ff8a2a'], elem: 'fire', res: { fire: 0.5 }, drops: { gold: 0.6 } },
};

// bosses: body, colours, how big, which attacks (and more of them below half health), the element of their magic
// hp, atk, def, exp come from the area level in game.js (bossStats); k scales the health
export const BOSSES2 = {
  chimera: { zh: '奇美拉', en: 'Chimera', body: 'beast', col: ['#8a5a3a', '#e8b03a', '#ff3a2a'], w: 44, h: 34, moves: ['charge', 'breath', 'leap'], elem: 'fire', k: 1 },
  arachne: { zh: '蜘蛛女王 阿拉克涅', en: 'Arachne', body: 'spider', col: ['#3a2a3a', '#a83aa8', '#ff4a4a'], w: 48, h: 30, moves: ['fan', 'summon', 'leap'], elem: 'pois', k: 1, minion: 'spider' },
  doppel: { zh: '鏡像騎士', en: 'Doppelganger', body: 'knight', col: ['#1a1a2a', '#6a3aa8', '#ff3a3a'], w: 18, h: 34, moves: ['charge', 'warp', 'fan'], elem: 'phys', k: 0.9 },
  treant: { zh: '古樹精', en: 'Elder Treant', body: 'treant', col: ['#5a3a1a', '#4a8a3a', '#ffe85a'], w: 40, h: 60, moves: ['spikes', 'summon', 'rain'], elem: 'pois', k: 1.1, minion: 'plant' },
  armorlord: { zh: '巨鎧武者', en: 'Armor Lord', body: 'knight', col: ['#5a6078', '#c8cee0', '#ff6a2a'], w: 30, h: 56, moves: ['charge', 'leap', 'ring'], elem: 'phys', k: 1.1 },
  ironmaster: { zh: '熔爐巨人', en: 'Forge Master', body: 'golem', col: ['#4a2a1a', '#ff8a2a', '#ffe85a'], w: 44, h: 60, moves: ['meteor', 'ring', 'leap'], elem: 'fire', k: 1.1 },
  duke: { zh: '吸血公爵', en: 'The Vampire Duke', body: 'vampire', col: ['#1a0a14', '#8a1a3a', '#ff2a2a'], w: 22, h: 40, moves: ['warp', 'fan', 'summon', 'beam'], elem: 'fire', k: 1, minion: 'bigbat' },
  gargoylelord: { zh: '石像鬼王', en: 'Gargoyle King', body: 'winged', col: ['#5a5a64', '#9a9aa6', '#ff6a2a'], w: 50, h: 34, fly: true, moves: ['swoop', 'rain', 'fan'], elem: 'phys', k: 1 },
  seraph: { zh: '墮落熾天使', en: 'Fallen Seraph', body: 'angel', col: ['#e8e0f0', '#ffd84a', '#3a8aff'], w: 26, h: 44, fly: true, moves: ['pillars', 'beam', 'ring', 'warp'], elem: 'ltng', k: 1.1 },
  minotaur: { zh: '牛頭人', en: 'Minotaur', body: 'minotaur', col: ['#6a3a1a', '#d8c8a0', '#ff2a2a'], w: 30, h: 50, moves: ['charge', 'leap', 'spikes'], elem: 'phys', k: 1.2 },
  scylla: { zh: '斯庫拉', en: 'Scylla', body: 'serpent', col: ['#2a5a6a', '#8ad8c8', '#ff4a4a'], w: 40, h: 56, moves: ['breath', 'bounce', 'summon'], elem: 'cold', k: 1.1, minion: 'merman' },
  frostwyrm: { zh: '霜之巨龍', en: 'Frost Wyrm', body: 'winged', col: ['#6a9ac8', '#e0f4ff', '#2a4aa8'], w: 60, h: 36, fly: true, moves: ['breath', 'rain', 'ring', 'swoop'], elem: 'cold', k: 1.2 },
  mimicking: { zh: '寶箱王', en: 'King Mimic', body: 'chest', col: ['#8a5a2a', '#ffd84a', '#ff2a2a'], w: 44, h: 36, moves: ['leap', 'rain', 'summon'], elem: 'phys', k: 1.2, minion: 'mimic' },
  kraken: { zh: '深海巨妖', en: 'Kraken', body: 'serpent', col: ['#4a2a5a', '#c87ad8', '#ffe85a'], w: 50, h: 56, moves: ['spikes', 'bounce', 'summon', 'ring'], elem: 'cold', k: 1.2, minion: 'jelly' },
  reaper: { zh: '死神', en: 'Death', body: 'reaper', col: ['#1a1a24', '#e8e0cc', '#ff2a2a'], w: 26, h: 48, fly: true, moves: ['fan', 'bounce', 'warp', 'summon', 'pillars'], elem: 'phys', k: 1.3, minion: 'wraith' },
  moonlord: { zh: '月之魔王', en: 'The Moon Sovereign', body: 'vampire', col: ['#0a0a1a', '#4a3aa8', '#ffe8a0'], w: 30, h: 52, moves: ['meteor', 'beam', 'pillars', 'ring', 'warp', 'fan', 'summon'], elem: 'fire', k: 2.4, minion: 'wraith', final: true },
};
