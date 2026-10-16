// Moonshadow Castle loot, Diablo II style: item bases with item levels, qualities (normal, superior, magic, rare,
// set, unique), prefixes and suffixes with tiers, sockets and gems, sets with set bonuses, uniques, and the
// sub-weapons as items. Pure data + functions: game.js rolls drops with it, main.js shows it, tests check it.

// ------------------------------------------------------------------ slots
export const SLOTS = ['weapon', 'shield', 'helm', 'armor', 'cloak', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'sub'];
// base classes → which slot they go in, and the letter used by affix tables
export const CLASS = {
  dagger: { slot: 'weapon', L: 'W' }, sword: { slot: 'weapon', L: 'W' }, rapier: { slot: 'weapon', L: 'W' }, greatsword: { slot: 'weapon', L: 'W' },
  axe: { slot: 'weapon', L: 'W' }, greataxe: { slot: 'weapon', L: 'W' }, mace: { slot: 'weapon', L: 'W' }, hammer: { slot: 'weapon', L: 'W' },
  spear: { slot: 'weapon', L: 'W' }, katana: { slot: 'weapon', L: 'W' }, whip: { slot: 'weapon', L: 'W' },
  shield: { slot: 'shield', L: 'S' }, helm: { slot: 'helm', L: 'H' }, armor: { slot: 'armor', L: 'A' }, cloak: { slot: 'cloak', L: 'C' },
  gloves: { slot: 'gloves', L: 'G' }, boots: { slot: 'boots', L: 'B' }, ring: { slot: 'ring', L: 'R' }, amulet: { slot: 'amulet', L: 'M' }, sub: { slot: 'sub', L: 'X' },
};
export const slotOf = (it) => CLASS[BASES[it.b].c].slot;

// ------------------------------------------------------------------ bases
// weapons: [id, zh, en, class, qlvl, min, max, attack time (s), reach (px), two-handed]
const WEAPONS = [
  ['dagger', '匕首', 'Dagger', 'dagger', 1, 2, 5, 0.17, 20], ['kris', '波刃短劍', 'Kris', 'dagger', 10, 4, 9, 0.17, 20], ['stiletto', '細刺短劍', 'Stiletto', 'dagger', 20, 7, 14, 0.16, 21],
  ['boneknife', '骨刃', 'Bone Knife', 'dagger', 32, 11, 20, 0.16, 21], ['mithrildirk', '秘銀短劍', 'Mithril Dirk', 'dagger', 44, 15, 28, 0.15, 22],
  ['shortsword', '短劍', 'Short Sword', 'sword', 1, 4, 8, 0.26, 28], ['broadsword', '寬劍', 'Broad Sword', 'sword', 5, 6, 11, 0.27, 29], ['longsword', '長劍', 'Long Sword', 'sword', 11, 9, 17, 0.27, 31],
  ['falchion', '彎刀', 'Falchion', 'sword', 19, 13, 24, 0.26, 31], ['runicsword', '符文劍', 'Runic Sword', 'sword', 28, 18, 32, 0.26, 32], ['phaseblade', '相位之刃', 'Phase Blade', 'sword', 40, 25, 42, 0.24, 32],
  ['ancientsword', '遠古之劍', 'Ancient Sword', 'sword', 52, 32, 54, 0.25, 33],
  ['rapier', '細劍', 'Rapier', 'rapier', 6, 5, 10, 0.2, 32], ['estoc', '刺劍', 'Estoc', 'rapier', 17, 10, 18, 0.2, 34], ['duelblade', '決鬥之劍', 'Duelist Blade', 'rapier', 30, 16, 28, 0.19, 35],
  ['spiritrapier', '靈魂細劍', 'Spirit Rapier', 'rapier', 46, 24, 40, 0.18, 36],
  ['claymore', '雙手巨劍', 'Claymore', 'greatsword', 8, 12, 22, 0.42, 40, 1], ['zweihander', '雙手大劍', 'Zweihander', 'greatsword', 18, 18, 34, 0.42, 42, 1],
  ['executioner', '處刑者之劍', "Executioner's Sword", 'greatsword', 30, 28, 50, 0.43, 43, 1], ['colossusblade', '巨像之刃', 'Colossus Blade', 'greatsword', 44, 40, 72, 0.44, 45, 1],
  ['titanblade', '泰坦之刃', 'Titan Blade', 'greatsword', 54, 52, 90, 0.45, 46, 1],
  ['handaxe', '手斧', 'Hand Axe', 'axe', 3, 5, 11, 0.32, 28], ['waraxe', '戰斧', 'War Axe', 'axe', 14, 11, 22, 0.32, 30], ['tomahawk', '投斧', 'Tomahawk', 'axe', 26, 17, 33, 0.31, 30],
  ['berserkeraxe', '狂戰士之斧', 'Berserker Axe', 'axe', 42, 26, 50, 0.31, 31],
  ['battleaxe', '雙刃戰斧', 'Battle Axe', 'greataxe', 12, 15, 30, 0.46, 38, 1], ['greataxe', '巨斧', 'Great Axe', 'greataxe', 24, 24, 46, 0.46, 39, 1],
  ['giantaxe', '巨人之斧', 'Giant Axe', 'greataxe', 38, 34, 66, 0.47, 40, 1], ['gloriousaxe', '榮耀之斧', 'Glorious Axe', 'greataxe', 50, 46, 86, 0.47, 41, 1],
  ['club', '棍棒', 'Club', 'mace', 1, 4, 9, 0.3, 26], ['mace', '鎚矛', 'Mace', 'mace', 7, 7, 14, 0.3, 27], ['morningstar', '流星錘', 'Morning Star', 'mace', 16, 11, 21, 0.3, 28],
  ['flail', '連枷', 'Flail', 'mace', 24, 14, 28, 0.31, 30], ['devilstar', '惡魔之星', 'Devil Star', 'mace', 38, 22, 40, 0.3, 30], ['reinforcedmace', '強化鎚矛', 'Reinforced Mace', 'mace', 50, 30, 54, 0.3, 31],
  ['warhammer', '戰鎚', 'War Hammer', 'hammer', 20, 22, 40, 0.48, 34, 1], ['maul', '大槌', 'Maul', 'hammer', 34, 32, 58, 0.48, 35, 1], ['thundermaul', '雷霆巨槌', 'Thunder Maul', 'hammer', 48, 46, 82, 0.49, 36, 1],
  ['spear', '長矛', 'Spear', 'spear', 9, 9, 17, 0.34, 52, 1], ['pike', '長槍', 'Pike', 'spear', 21, 15, 28, 0.34, 54, 1], ['halberd', '戟', 'Halberd', 'spear', 33, 22, 42, 0.35, 54, 1],
  ['hyperionspear', '海柏利昂之矛', 'Hyperion Spear', 'spear', 47, 32, 58, 0.34, 56, 1],
  ['katana', '太刀', 'Katana', 'katana', 16, 10, 19, 0.22, 34], ['tachi', '野太刀', 'Tachi', 'katana', 30, 17, 30, 0.22, 35], ['odachi', '大太刀', 'Odachi', 'katana', 44, 30, 52, 0.3, 44, 1],
  ['leatherwhip', '皮鞭', 'Leather Whip', 'whip', 4, 4, 8, 0.36, 62], ['chainwhip', '鎖鏈鞭', 'Chain Whip', 'whip', 14, 8, 15, 0.36, 64], ['thornwhip', '荊棘鞭', 'Thorn Whip', 'whip', 26, 13, 24, 0.36, 66],
  ['holywhip', '聖鞭', 'Holy Whip', 'whip', 40, 20, 36, 0.35, 68],
];
// armour: [id, zh, en, class, qlvl, defence, block% (shields)]
const ARMOUR = [
  ['buckler', '圓盾', 'Buckler', 'shield', 1, 3, 10], ['roundshield', '木製圓盾', 'Round Shield', 'shield', 6, 7, 14], ['kiteshield', '鳶形盾', 'Kite Shield', 'shield', 14, 13, 18],
  ['towershield', '塔盾', 'Tower Shield', 'shield', 24, 22, 24], ['gothicshield', '哥德盾', 'Gothic Shield', 'shield', 34, 30, 22], ['boneshield', '白骨盾', 'Bone Shield', 'shield', 42, 36, 26],
  ['aegis', '神盾', 'Aegis', 'shield', 50, 46, 30],
  ['cap', '布帽', 'Cap', 'helm', 1, 2], ['skullcap', '骷髏帽', 'Skull Cap', 'helm', 5, 4], ['helm', '頭盔', 'Helm', 'helm', 11, 7], ['greathelm', '巨盔', 'Great Helm', 'helm', 20, 11],
  ['crown', '王冠', 'Crown', 'helm', 28, 14], ['bonevisage', '白骨面甲', 'Bone Visage', 'helm', 38, 20], ['corona', '日冕', 'Corona', 'helm', 50, 28],
  ['quilted', '縫製布甲', 'Quilted Armor', 'armor', 1, 3], ['leatherarmor', '皮甲', 'Leather Armor', 'armor', 4, 6], ['ringmail', '環甲', 'Ring Mail', 'armor', 9, 10],
  ['chainmail', '鎖子甲', 'Chain Mail', 'armor', 15, 15], ['breastplate', '胸甲', 'Breast Plate', 'armor', 20, 19], ['plate', '板甲', 'Plate Mail', 'armor', 26, 24],
  ['gothicplate', '哥德板甲', 'Gothic Plate', 'armor', 34, 31], ['ornateplate', '華麗板甲', 'Ornate Plate', 'armor', 44, 40], ['sacredarmor', '神聖鎧甲', 'Sacred Armor', 'armor', 54, 52],
  ['clothcape', '布披風', 'Cloth Cape', 'cloak', 2, 2], ['velvetcape', '絲絨披風', 'Velvet Cape', 'cloak', 12, 5], ['twilightcloak', '暮光斗篷', 'Twilight Cloak', 'cloak', 26, 9],
  ['royalcloak', '皇家斗篷', 'Royal Cloak', 'cloak', 40, 14], ['abysscloak', '深淵斗篷', 'Abyss Cloak', 'cloak', 52, 20],
  ['leathergloves', '皮手套', 'Leather Gloves', 'gloves', 2, 1], ['chaingloves', '鎖鏈手套', 'Chain Gloves', 'gloves', 12, 3], ['gauntlets', '護手', 'Gauntlets', 'gloves', 22, 6],
  ['vampiregloves', '吸血鬼骨手套', 'Vampirebone Gloves', 'gloves', 38, 9],
  ['boots', '靴子', 'Boots', 'boots', 2, 1], ['heavyboots', '厚重長靴', 'Heavy Boots', 'boots', 10, 3], ['chainboots', '鎖鏈靴', 'Chain Boots', 'boots', 18, 5],
  ['greaves', '脛甲', 'Greaves', 'boots', 30, 8], ['wyrmboots', '飛龍皮靴', 'Wyrmhide Boots', 'boots', 44, 12],
  ['ring', '戒指', 'Ring', 'ring', 1, 0], ['amulet', '護身符', 'Amulet', 'amulet', 1, 0],
];
// sub-weapons: [id, zh, en, qlvl, damage, heart cost, behaviour]
const SUBW = [
  ['knives', '飛刀', 'Throwing Knives', 1, 10, 1, 'dagger'], ['axes', '飛斧', 'Throwing Axes', 3, 22, 2, 'axe'], ['holywater', '聖水', 'Holy Water', 6, 9, 2, 'holy'],
  ['cross', '十字架', 'Cross', 10, 18, 3, 'cross'], ['bible', '聖經', 'Holy Bible', 14, 14, 3, 'bible'], ['boomerang', '迴旋鏢', 'Boomerang', 18, 16, 2, 'boomerang'],
  ['javelin', '標槍', 'Javelin', 22, 30, 2, 'javelin'], ['firebomb', '火焰彈', 'Fire Bomb', 26, 34, 3, 'bomb'], ['shuriken', '手裏劍', 'Shuriken', 30, 14, 2, 'stars'],
  ['stopwatch', '懷錶', 'Stopwatch', 34, 0, 5, 'watch'], ['lightningorb', '雷光球', 'Lightning Orb', 40, 40, 4, 'bolt'], ['crystal', '水晶', 'Crystal', 48, 26, 6, 'crystal'],
];
export const BASES = {};
for (const [id, zh, en, c, q, min, max, time, reach, two] of WEAPONS) BASES[id] = { id, zh, en, c, q, min, max, time, reach, two: !!two };
for (const [id, zh, en, c, q, def, blk] of ARMOUR) BASES[id] = { id, zh, en, c, q, def, blk: blk || 0 };
for (const [id, zh, en, q, dmg, cost, k] of SUBW) BASES[id] = { id, zh, en, c: 'sub', q, dmg, cost, k };
const MAXSOCK = { W: 3, S: 3, H: 2, A: 4, C: 0, G: 0, B: 0, R: 0, M: 0, X: 0 };
const BASE_LIST = Object.values(BASES);

// ------------------------------------------------------------------ stats (what a mod does)
// v is a number; elemental damage mods (fire, cold, ltng, pois, holy) give their v as maximum added damage
export const STAT = {
  ed: { zh: '+{v}% 增強傷害', en: '+{v}% Enhanced Damage' }, edef: { zh: '+{v}% 增強防禦', en: '+{v}% Enhanced Defense' },
  maxd: { zh: '+{v} 最大傷害', en: '+{v} to Maximum Damage' }, mind: { zh: '+{v} 最小傷害', en: '+{v} to Minimum Damage' }, def: { zh: '+{v} 防禦', en: '+{v} Defense' },
  fire: { zh: '附加 {a}-{v} 火焰傷害', en: 'Adds {a}-{v} Fire Damage' }, cold: { zh: '附加 {a}-{v} 冰冷傷害（緩速）', en: 'Adds {a}-{v} Cold Damage (slows)' },
  ltng: { zh: '附加 {a}-{v} 閃電傷害', en: 'Adds {a}-{v} Lightning Damage' }, pois: { zh: '{v} 毒素傷害（持續 2 秒）', en: '{v} Poison Damage over 2 seconds' },
  holy: { zh: '附加 {a}-{v} 神聖傷害', en: 'Adds {a}-{v} Holy Damage' },
  res_fire: { zh: '火焰抗性 +{v}%', en: 'Fire Resist +{v}%' }, res_cold: { zh: '冰冷抗性 +{v}%', en: 'Cold Resist +{v}%' }, res_ltng: { zh: '閃電抗性 +{v}%', en: 'Lightning Resist +{v}%' },
  res_pois: { zh: '毒素抗性 +{v}%', en: 'Poison Resist +{v}%' }, res_all: { zh: '所有抗性 +{v}%', en: 'All Resistances +{v}%' },
  str: { zh: '+{v} 力量', en: '+{v} to Strength' }, con: { zh: '+{v} 體質', en: '+{v} to Constitution' }, int: { zh: '+{v} 智力', en: '+{v} to Intelligence' }, lck: { zh: '+{v} 幸運', en: '+{v} to Luck' },
  all: { zh: '+{v} 所有屬性', en: '+{v} to All Attributes' }, hp: { zh: '+{v} 生命', en: '+{v} to Life' }, mp: { zh: '+{v} 魔力', en: '+{v} to Mana' },
  hpr: { zh: '每 5 秒回復 {v} 生命', en: 'Replenish {v} Life every 5 seconds' }, mpr: { zh: '每 5 秒回復 {v} 魔力', en: 'Regenerate {v} Mana every 5 seconds' },
  ls: { zh: '{v}% 生命偷取', en: '{v}% Life Stolen per Hit' }, ms: { zh: '{v}% 魔力偷取', en: '{v}% Mana Stolen per Hit' },
  ias: { zh: '+{v}% 攻擊速度', en: '+{v}% Increased Attack Speed' }, frw: { zh: '+{v}% 移動速度', en: '+{v}% Faster Run/Walk' }, crit: { zh: '{v}% 爆擊率', en: '{v}% Chance of Critical Strike' },
  block: { zh: '+{v}% 格擋率', en: '+{v}% Increased Chance of Blocking' }, thorns: { zh: '攻擊者受到 {v} 點反傷', en: 'Attacker Takes Damage of {v}' },
  mf: { zh: '+{v}% 找到魔法物品機率', en: '+{v}% Better Chance of Getting Magic Items' }, gf: { zh: '+{v}% 額外金幣', en: '+{v}% Extra Gold from Monsters' },
  hearts: { zh: '+{v} 愛心上限', en: '+{v} to Maximum Hearts' }, subd: { zh: '+{v}% 副武器傷害', en: '+{v}% Sub-weapon Damage' }, subc: { zh: '副武器消耗 -{v} 愛心', en: 'Sub-weapons cost {v} fewer Hearts' },
  exp: { zh: '+{v}% 經驗值', en: '+{v}% to Experience Gained' }, undead: { zh: '+{v}% 對不死生物傷害', en: '+{v}% Damage to Undead' }, dr: { zh: '受到傷害減少 {v}', en: 'Damage Reduced by {v}' },
  jump: { zh: '+{v} 空中跳躍次數', en: '+{v} Mid-air Jump' }, chain: { zh: '{v}% 機率在命中時施放連鎖閃電', en: '{v}% Chance to cast Chain Lightning on Hit' },
  reflect: { zh: '格擋時反彈投射物', en: 'Reflects projectiles when blocking' }, hok: { zh: '每次擊殺回復 {v} 生命', en: '+{v} Life after each Kill' }, heok: { zh: '每次擊殺 +{v} 愛心', en: '+{v} Hearts after each Kill' },
  reach: { zh: '+{v} 攻擊距離', en: '+{v} Attack Reach' }, sock: { zh: '鑲孔 ({v})', en: 'Socketed ({v})' },
};
export const ELEM = ['fire', 'cold', 'ltng', 'pois', 'holy'];

// ------------------------------------------------------------------ affixes: [id, pre|suf, stat, slot letters, tiers [[lvl, min, max, zh, en], …]]
const AFX = [
  ['ed', 'pre', 'ed', 'W', [[1, 20, 30, '鋸齒', 'Jagged'], [6, 31, 45, '致命', 'Deadly'], [12, 46, 65, '兇惡', 'Vicious'], [20, 66, 85, '殘暴', 'Brutal'], [30, 86, 110, '野蠻', 'Savage'], [40, 111, 150, '無情', 'Merciless'], [48, 151, 200, '殘酷', 'Cruel']]],
  ['maxd', 'pre', 'maxd', 'WG', [[1, 2, 3, '銳利', 'Sharp'], [10, 4, 8, '精工', 'Fine'], [25, 9, 15, '大師', "Master's"]]],
  ['edef', 'pre', 'edef', 'SHACGB', [[1, 10, 20, '堅固', 'Sturdy'], [8, 21, 30, '強韌', 'Strong'], [16, 31, 40, '光榮', 'Glorious'], [26, 41, 55, '祝福', 'Blessed'], [36, 56, 70, '聖者', 'Saintly'], [46, 71, 90, '神聖', 'Holy']]],
  ['def', 'pre', 'def', 'SHACGB', [[1, 3, 8, '加固', 'Reinforced'], [10, 9, 18, '鋼鐵', 'Iron'], [22, 19, 32, '精鋼', 'Steel'], [35, 33, 50, '秘銀', 'Mithril']]],
  ['rf', 'pre', 'res_fire', 'SHACGBRM', [[1, 10, 15, '紅色', 'Red'], [12, 16, 25, '深紅', 'Crimson'], [24, 26, 35, '石榴', 'Garnet'], [36, 36, 45, '紅寶', 'Ruby']]],
  ['rc', 'pre', 'res_cold', 'SHACGBRM', [[1, 10, 15, '藍色', 'Blue'], [12, 16, 25, '蔚藍', 'Azure'], [24, 26, 35, '青金', 'Lapis'], [36, 36, 45, '藍寶', 'Sapphire']]],
  ['rl', 'pre', 'res_ltng', 'SHACGBRM', [[1, 10, 15, '黃色', 'Yellow'], [12, 16, 25, '赭黃', 'Ochre'], [24, 26, 35, '琥珀', 'Amber'], [36, 36, 45, '黃玉', 'Topaz']]],
  ['rp', 'pre', 'res_pois', 'SHACGBRM', [[1, 10, 15, '綠色', 'Green'], [12, 16, 25, '翠玉', 'Jade'], [24, 26, 35, '孔雀石', 'Malachite'], [36, 36, 45, '祖母綠', 'Emerald']]],
  ['ra', 'pre', 'res_all', 'SHACRM', [[8, 5, 8, '微光', 'Shimmering'], [20, 9, 15, '彩虹', 'Rainbow'], [32, 16, 22, '閃耀', 'Scintillating'], [44, 23, 30, '稜鏡', 'Prismatic']]],
  ['mp', 'pre', 'mp', 'HCRMX', [[1, 5, 10, '蜥蜴', "Lizard's"], [8, 11, 18, '毒蛇', "Snake's"], [16, 19, 28, '巨蛇', "Serpent's"], [28, 29, 40, '飛龍', "Drake's"], [40, 41, 60, '巨龍', "Dragon's"]]],
  ['mf', 'pre', 'mf', 'HRMGB', [[6, 5, 10, '幸運', 'Lucky'], [18, 11, 20, '好運', 'Fortuitous'], [34, 21, 35, '天命', 'Fated']]],
  ['gf', 'pre', 'gf', 'RMGB', [[3, 20, 40, '鍍金', 'Gilded'], [15, 41, 80, '黃金', 'Golden'], [30, 81, 120, '帝王', 'Imperial']]],
  ['fire', 'pre', 'fire', 'WX', [[3, 4, 8, '灼熱', 'Smoldering'], [12, 9, 18, '火焰', 'Fiery'], [24, 19, 32, '烈焰', 'Blazing'], [38, 33, 50, '煉獄', 'Infernal']]],
  ['cold', 'pre', 'cold', 'WX', [[3, 3, 6, '寒冷', 'Chilling'], [12, 7, 14, '冰霜', 'Frozen'], [24, 15, 26, '凜冬', 'Wintry'], [38, 27, 42, '冰河', 'Glacial']]],
  ['ltng', 'pre', 'ltng', 'WX', [[3, 6, 12, '靜電', 'Static'], [12, 13, 24, '電擊', 'Shocking'], [24, 25, 40, '暴風', 'Stormy'], [38, 41, 60, '天雷', 'Thundering']]],
  ['pois', 'pre', 'pois', 'WX', [[3, 6, 12, '毒性', 'Toxic'], [12, 13, 26, '劇毒', 'Venomous'], [24, 27, 44, '致命毒', 'Pestilent'], [38, 45, 70, '瘟疫', 'Plagued']]],
  ['holy', 'pre', 'holy', 'WX', [[8, 4, 10, '受祝福', 'Hallowed'], [22, 11, 22, '聖光', 'Sacred'], [40, 23, 38, '天使', 'Angelic']]],
  ['subd', 'pre', 'subd', 'XMR', [[1, 10, 20, '投擲者', "Thrower's"], [14, 21, 35, '獵人', "Hunter's"], [30, 36, 60, '神射', "Marksman's"]]],
  ['block', 'pre', 'block', 'S', [[1, 5, 10, '穩固', 'Steady'], [16, 11, 18, '守護', 'Guarding'], [32, 19, 25, '堡壘', 'Bulwark']]],
  ['str', 'suf', 'str', 'WHAGBRM', [[1, 1, 3, '力量', 'of Strength'], [8, 4, 6, '威力', 'of Might'], [16, 7, 10, '蠻牛', 'of the Ox'], [28, 11, 15, '巨人', 'of the Giant'], [42, 16, 22, '泰坦', 'of the Titan']]],
  ['con', 'suf', 'con', 'SHACBRM', [[1, 1, 3, '活力', 'of Vigor'], [8, 4, 6, '耐力', 'of Stamina'], [16, 7, 10, '磐石', 'of the Rock'], [28, 11, 15, '山岳', 'of the Mountain'], [42, 16, 22, '不朽', 'of Immortality']]],
  ['int', 'suf', 'int', 'HCRMX', [[1, 1, 3, '心智', 'of the Mind'], [8, 4, 6, '學者', 'of the Scholar'], [16, 7, 10, '賢者', 'of the Sage'], [28, 11, 15, '法師', 'of the Magus'], [42, 16, 22, '大法師', 'of the Archmage']]],
  ['lck', 'suf', 'lck', 'WHRMGB', [[1, 1, 3, '幸運', 'of Luck'], [10, 4, 7, '機運', 'of Chance'], [24, 8, 12, '命運', 'of Fortune'], [38, 13, 18, '奇蹟', 'of Miracles']]],
  ['hp', 'suf', 'hp', 'SHACGBRM', [[1, 5, 10, '胡狼', 'of the Jackal'], [8, 11, 20, '狐狸', 'of the Fox'], [16, 21, 30, '狼', 'of the Wolf'], [26, 31, 45, '猛虎', 'of the Tiger'], [38, 46, 65, '猛獁', 'of the Mammoth'], [50, 66, 90, '巨神', 'of the Colossus']]],
  ['ias', 'suf', 'ias', 'WG', [[4, 10, 15, '迅捷', 'of Readiness'], [14, 16, 25, '敏捷', 'of Alacrity'], [28, 26, 35, '疾速', 'of Swiftness'], [42, 36, 45, '神速', 'of Quickness']]],
  ['ls', 'suf', 'ls', 'WGRM', [[5, 3, 4, '水蛭', 'of the Leech'], [18, 5, 6, '蝗蟲', 'of the Locust'], [32, 7, 9, '七鰓鰻', 'of the Lamprey'], [46, 10, 12, '吸血鬼', 'of the Vampire']]],
  ['ms', 'suf', 'ms', 'WRM', [[5, 2, 3, '蝙蝠', 'of the Bat'], [22, 4, 6, '幽魂', 'of the Wraith'], [40, 7, 9, '夜魔', 'of the Night']]],
  ['frw', 'suf', 'frw', 'B', [[3, 10, 15, '疾行', 'of Haste'], [16, 16, 25, '奔馳', 'of Speed'], [32, 26, 35, '疾風', 'of the Wind']]],
  ['crit', 'suf', 'crit', 'WGRM', [[6, 3, 5, '精準', 'of Precision'], [20, 6, 9, '屠戮', 'of Slaying'], [38, 10, 14, '死神', 'of Death']]],
  ['thorns', 'suf', 'thorns', 'AS', [[3, 3, 6, '荊棘', 'of Thorns'], [16, 7, 14, '尖刺', 'of Spikes'], [32, 15, 28, '剃刀', 'of Razors']]],
  ['hpr', 'suf', 'hpr', 'AHRMB', [[2, 1, 2, '回復', 'of Regeneration'], [14, 3, 5, '再生', 'of Regrowth'], [30, 6, 9, '復甦', 'of Revivification']]],
  ['mpr', 'suf', 'mpr', 'HCRMX', [[2, 1, 2, '冥想', 'of Meditation'], [14, 3, 5, '專注', 'of Focus'], [30, 6, 9, '永恆', 'of Eternity']]],
  ['hearts', 'suf', 'hearts', 'RMX', [[1, 5, 10, '心', 'of Hearts'], [18, 11, 20, '奉獻', 'of Devotion'], [36, 21, 30, '聖心', 'of the Sacred Heart']]],
  ['subc', 'suf', 'subc', 'X', [[10, 1, 1, '節約', 'of Economy'], [34, 2, 2, '無窮', 'of Plenty']]],
  ['exp', 'suf', 'exp', 'RMH', [[10, 3, 5, '學徒', 'of the Apprentice'], [28, 6, 10, '導師', 'of the Mentor']]],
  ['undead', 'suf', 'undead', 'W', [[4, 20, 35, '驅魔', 'of Exorcism'], [20, 36, 60, '淨化', 'of Purification'], [38, 61, 90, '聖戰', 'of the Crusade']]],
  ['dr', 'suf', 'dr', 'ASB', [[10, 1, 2, '防護', 'of Warding'], [26, 3, 5, '庇護', 'of Sanctuary'], [44, 6, 9, '不滅', 'of the Unbreakable']]],
  ['allst', 'suf', 'all', 'RM', [[24, 1, 2, '和諧', 'of Harmony'], [40, 3, 5, '完美', 'of Perfection']]],
];
export const AFFIX = Object.fromEntries(AFX.map(([id, t, stat, slots, tiers]) => [id, { id, t, stat, slots, tiers }]));

// ------------------------------------------------------------------ gems (stack in p.gems as 'ruby2' etc.; grade 1-4)
export const GEMS = {
  ruby: { zh: '紅寶石', en: 'Ruby', col: '#e8304a', W: ['fire', [6, 12, 20, 32]], A: ['hp', [10, 18, 26, 38]] },
  sapphire: { zh: '藍寶石', en: 'Sapphire', col: '#3a6ae8', W: ['cold', [4, 8, 14, 22]], A: ['mp', [10, 18, 26, 38]] },
  topaz: { zh: '黃玉', en: 'Topaz', col: '#f0c030', W: ['ltng', [10, 20, 32, 50]], A: ['mf', [6, 10, 16, 24]] },
  emerald: { zh: '祖母綠', en: 'Emerald', col: '#30c860', W: ['pois', [8, 16, 26, 40]], A: ['con', [2, 4, 6, 9]] },
  diamond: { zh: '鑽石', en: 'Diamond', col: '#e8f0ff', W: ['undead', [20, 30, 45, 65]], A: ['res_all', [5, 8, 12, 18]] },
  amethyst: { zh: '紫水晶', en: 'Amethyst', col: '#a050e0', W: ['maxd', [2, 4, 7, 11]], A: ['def', [8, 14, 22, 34]] },
  skull: { zh: '骷髏', en: 'Skull', col: '#d8d0c0', W: ['ls', [2, 3, 4, 5]], A: ['hpr', [1, 2, 3, 4]] },
};
export const GEM_GRADE = [null, { zh: '碎裂的', en: 'Chipped' }, { zh: '瑕疵的', en: 'Flawed' }, { zh: '', en: '' }, { zh: '完美的', en: 'Perfect' }];
export const gemName = (g, lang) => { const t = GEMS[g.replace(/\d/, '')], k = +g.slice(-1); return lang === 'zh' ? GEM_GRADE[k].zh + t.zh : (GEM_GRADE[k].en ? GEM_GRADE[k].en + ' ' : '') + t.en; };
export function gemMods(gem, letter) {
  const t = GEMS[gem.replace(/\d/, '')], k = +gem.slice(-1) - 1, e = letter === 'W' ? t.W : t.A;
  return [[e[0], e[1][k]]];
}

// ------------------------------------------------------------------ sets: pieces and bonuses (2 / 3 / full)
export const SETS = {
  hunter: { zh: '月影獵人', en: 'Moon Hunter', lvl: 8, bonus: { 2: [['crit', 5]], 3: [['holy', 12]], full: [['undead', 50], ['frw', 15]] },
    pieces: [['hunterblade', '月影獵人之刃', "Moon Hunter's Blade", 'broadsword', [['ed', 60], ['holy', 8]]], ['hunterhood', '月影獵人之兜', "Moon Hunter's Hood", 'skullcap', [['def', 10], ['lck', 4]]],
      ['huntercoat', '月影獵人之衣', "Moon Hunter's Coat", 'leatherarmor', [['def', 18], ['hp', 15]]], ['hunterboots', '月影獵人之靴', "Moon Hunter's Boots", 'boots', [['frw', 15], ['res_cold', 15]]]] },
  warden: { zh: '鋼鐵守衛', en: 'Iron Warden', lvl: 12, bonus: { 2: [['def', 30]], 3: [['block', 10], ['dr', 2]], full: [['thorns', 20], ['hp', 40]] },
    pieces: [['wardenhelm', '鋼鐵守衛之盔', "Iron Warden's Helm", 'helm', [['edef', 60], ['con', 4]]], ['wardenplate', '鋼鐵守衛之鎧', "Iron Warden's Mail", 'ringmail', [['edef', 80], ['res_all', 8]]],
      ['wardenfists', '鋼鐵守衛之拳', "Iron Warden's Fists", 'leathergloves', [['def', 12], ['str', 5]]], ['wardenwall', '鋼鐵守衛之牆', "Iron Warden's Wall", 'kiteshield', [['block', 12], ['edef', 60]]]] },
  nightqueen: { zh: '夜之女王', en: 'Night Queen', lvl: 20, bonus: { 2: [['mp', 30]], 3: [['subd', 35], ['ms', 4]], full: [['int', 15], ['subc', 1], ['mpr', 6]] },
    pieces: [['queencirclet', '夜之女王之冠', "Night Queen's Circlet", 'crown', [['int', 8], ['mp', 25]]], ['queenveil', '夜之女王之紗', "Night Queen's Veil", 'velvetcape', [['res_all', 12], ['frw', 10]]],
      ['queenring', '夜之女王之戒', "Night Queen's Signet", 'ring', [['subd', 20], ['ms', 3]]], ['queenpendant', '夜之女王之墜', "Night Queen's Pendant", 'amulet', [['int', 6], ['hearts', 15]]]] },
  storm: { zh: '雷霆使徒', en: 'Storm Apostle', lvl: 26, bonus: { 2: [['ltng', 30]], 3: [['ias', 20]], full: [['chain', 15], ['res_ltng', 40]] },
    pieces: [['stormhammer', '雷霆使徒之槌', "Storm Apostle's Hammer", 'warhammer', [['ed', 120], ['ltng', 40]]], ['stormhelm', '雷霆使徒之盔', "Storm Apostle's Helm", 'greathelm', [['edef', 80], ['res_ltng', 25]]],
      ['stormgrip', '雷霆使徒之握', "Storm Apostle's Grip", 'chaingloves', [['ias', 20], ['str', 8]]], ['stormstride', '雷霆使徒之履', "Storm Apostle's Stride", 'chainboots', [['frw', 20], ['dr', 3]]]] },
  boneking: { zh: '骸骨之王', en: 'Bone King', lvl: 32, bonus: { 2: [['hp', 50]], 3: [['ls', 6]], full: [['undead', 80], ['hpr', 8], ['all', 5]] },
    pieces: [['bonecrown', '骸骨之王的王冠', "Bone King's Crown", 'bonevisage', [['edef', 100], ['hp', 30]]], ['bonecage', '骸骨之王的胸骨', "Bone King's Ribcage", 'gothicplate', [['edef', 120], ['dr', 4]]],
      ['bonebuckler', '骸骨之王的骨盾', "Bone King's Aegis", 'boneshield', [['block', 15], ['thorns', 25]]], ['bonering', '骸骨之王的指環', "Bone King's Knuckle", 'ring', [['ls', 5], ['con', 8]]]] },
  dragoon: { zh: '赤焰龍騎', en: 'Crimson Dragoon', lvl: 40, bonus: { 2: [['fire', 40]], 3: [['str', 15]], full: [['res_fire', 50], ['ed', 80], ['jump', 1]] },
    pieces: [['dragoonspear', '赤焰龍騎之槍', "Crimson Dragoon's Lance", 'halberd', [['ed', 160], ['fire', 45]]], ['dragoonhelm', '赤焰龍騎之盔', "Crimson Dragoon's Helm", 'crown', [['edef', 120], ['res_fire', 30]]],
      ['dragoonmail', '赤焰龍騎之鎧', "Crimson Dragoon's Mail", 'ornateplate', [['edef', 130], ['str', 10]]], ['dragooncloak', '赤焰龍騎之氅', "Crimson Dragoon's Mantle", 'royalcloak', [['res_all', 18], ['hp', 40]]],
      ['dragoongreaves', '赤焰龍騎之脛甲', "Crimson Dragoon's Greaves", 'greaves', [['frw', 25], ['def', 30]]]] },
  frost: { zh: '霜語者', en: 'Frostwhisper', lvl: 46, bonus: { 2: [['cold', 40]], 3: [['ias', 25], ['crit', 8]], full: [['res_cold', 60], ['frw', 25], ['all', 8]] },
    pieces: [['frostblade', '霜語者之刃', "Frostwhisper's Edge", 'odachi', [['ed', 180], ['cold', 45]]], ['frostcloak', '霜語者之氅', "Frostwhisper's Shroud", 'royalcloak', [['res_all', 22], ['int', 10]]],
      ['frostgloves', '霜語者之手', "Frostwhisper's Touch", 'vampiregloves', [['ias', 25], ['cold', 20]]], ['frostamulet', '霜語者之心', "Frostwhisper's Heart", 'amulet', [['all', 6], ['res_cold', 30]]]] },
  count: { zh: '伯爵的遺產', en: "The Count's Legacy", lvl: 55, bonus: { 2: [['ls', 8]], 3: [['ms', 8], ['hp', 80]], full: [['ed', 150], ['all', 12], ['mf', 50]] },
    pieces: [['countsword', '伯爵的長劍', "The Count's Sword", 'ancientsword', [['ed', 220], ['ls', 8]]], ['countcape', '伯爵的披風', "The Count's Cape", 'abysscloak', [['res_all', 30], ['frw', 20]]],
      ['countring', '伯爵的印戒', "The Count's Signet", 'ring', [['all', 8], ['ms', 6]]], ['countamulet', '伯爵的血之墜', "The Count's Blood Pendant", 'amulet', [['ls', 6], ['hp', 60]]],
      ['countcrown', '伯爵的冠冕', "The Count's Diadem", 'corona', [['edef', 160], ['mf', 40]]]] },
};
export const SET_ITEMS = {};
for (const [sid, s] of Object.entries(SETS)) for (const [id, zh, en, base, mods] of s.pieces) SET_ITEMS[id] = { id, set: sid, zh, en, b: base, lvl: s.lvl + Math.floor(BASES[base].q / 10), mods };

// ------------------------------------------------------------------ uniques: [id, zh, en, base, lvl, mods ([stat, v] or [stat, min, max])]
const UNI = [
  ['nightfang', '夜牙', 'Nightfang', 'dagger', 3, [['ed', 60, 80], ['ls', 5], ['crit', 8]]],
  ['vampirekiss', '吸血鬼之吻', "Vampire's Kiss", 'rapier', 9, [['ed', 70, 100], ['ls', 8], ['ias', 20]]],
  ['knightsoath', '騎士誓約', "Knight's Oath", 'broadsword', 6, [['ed', 80, 100], ['str', 5], ['res_all', 10]]],
  ['gravecleaver', '墳墓劈裂者', 'Grave Cleaver', 'claymore', 11, [['ed', 100, 140], ['undead', 80], ['hp', 20]]],
  ['emberbite', '餘燼之咬', 'Emberbite', 'handaxe', 7, [['ed', 70, 90], ['fire', 18], ['res_fire', 20]]],
  ['skullsplitter', '碎顱者', 'Skullsplitter', 'mace', 10, [['ed', 80, 110], ['undead', 100], ['str', 6]]],
  ['vipertongue', '毒蛇之舌', 'Viper Tongue', 'leatherwhip', 8, [['ed', 60, 90], ['pois', 40], ['reach', 8]]],
  ['moonblade', '月影之刃', 'Moonshadow Blade', 'longsword', 16, [['ed', 140, 180], ['holy', 20], ['crit', 10], ['lck', 8]]],
  ['frostbrand', '霜之烙印', 'Frostbrand', 'falchion', 22, [['ed', 130, 160], ['cold', 30], ['ias', 20]]],
  ['stormcaller', '喚雷者', 'Stormcaller', 'warhammer', 24, [['ed', 140, 180], ['ltng', 60], ['chain', 20]]],
  ['dragontooth', '龍牙', "Dragon's Tooth", 'pike', 25, [['ed', 150, 190], ['fire', 40], ['str', 10]]],
  ['muramasa', '村正', 'Muramasa', 'katana', 28, [['ed', 160, 200], ['ls', 10], ['crit', 12], ['hp', -20]]],
  ['vampirekiller', '吸血鬼殺手', 'Vampire Killer', 'chainwhip', 30, [['ed', 150, 200], ['holy', 40], ['undead', 100], ['reach', 12]]],
  ['executionerjustice', '處刑人的正義', "Executioner's Justice", 'executioner', 34, [['ed', 180, 230], ['crit', 15], ['ls', 6]]],
  ['soulreaver', '奪魂者', 'Soul Reaver', 'runicsword', 36, [['ed', 170, 220], ['ls', 8], ['ms', 6], ['hok', 8]]],
  ['earthshaker', '撼地者', 'Earthshaker', 'maul', 38, [['ed', 200, 250], ['str', 15], ['dr', 4]]],
  ['windforce', '風之力', 'Windforce', 'hyperionspear', 50, [['ed', 220, 280], ['ias', 30], ['frw', 20], ['ltng', 50]]],
  ['crimsonmoon', '赤月', 'Crimson Moon', 'phaseblade', 44, [['ed', 200, 260], ['fire', 50], ['ls', 9], ['crit', 10]]],
  ['azathoth', '混沌之核', 'Heart of Chaos', 'colossusblade', 52, [['ed', 240, 300], ['all', 10], ['res_all', 20]]],
  ['holyavenger', '神聖復仇者', 'Holy Avenger', 'spiritrapier', 48, [['ed', 200, 250], ['holy', 60], ['undead', 120], ['hpr', 8]]],
  ['oathkeeper', '誓約守護', 'Oathkeeper', 'ancientsword', 54, [['ed', 250, 320], ['ls', 10], ['all', 10], ['crit', 12]]],
  ['ironwall', '鐵壁', 'Ironwall', 'roundshield', 8, [['edef', 100, 140], ['block', 15], ['res_all', 10]]],
  ['mirrorshield', '鏡之盾', 'Mirror of Medusa', 'towershield', 26, [['edef', 140, 180], ['block', 20], ['reflect', 1], ['res_ltng', 30]]],
  ['dragonscale', '龍鱗盾', 'Dragonscale Ward', 'aegis', 50, [['edef', 180, 220], ['block', 20], ['res_all', 30], ['hp', 50]]],
  ['crownofages', '萬古之冠', 'Crown of Ages', 'corona', 52, [['edef', 150, 200], ['res_all', 25], ['dr', 6], ['sock', 2]]],
  ['harlequin', '小丑之冠', 'Harlequin Crest', 'skullcap', 14, [['all', 2], ['mf', 50], ['hp', 25], ['mp', 25]]],
  ['bloodfist', '血拳之盔', 'Bloodfist Helm', 'helm', 18, [['edef', 90, 120], ['ls', 5], ['str', 8]]],
  ['skullofthelich', '巫妖之顱', 'Skull of the Lich', 'bonevisage', 40, [['edef', 140, 180], ['int', 15], ['mp', 60], ['subd', 40]]],
  ['shroud', '亡者裹屍布', 'Shroud of the Dead', 'quilted', 4, [['edef', 80, 100], ['res_all', 12], ['hp', 15]]],
  ['stoneheart', '石之心', 'Stoneheart', 'chainmail', 18, [['edef', 110, 140], ['dr', 4], ['con', 10], ['res_pois', 30]]],
  ['skinofvipers', '毒蛇之皮', 'Skin of the Vipermagi', 'ringmail', 22, [['edef', 100, 130], ['res_all', 25], ['ias', 15]]],
  ['templar', '聖殿騎士', "Templar's Might", 'plate', 32, [['edef', 140, 170], ['str', 12], ['hp', 50], ['thorns', 20]]],
  ['tyraelmight', '天使的榮光', "Archangel's Glory", 'sacredarmor', 56, [['edef', 180, 240], ['all', 15], ['res_all', 30], ['frw', 20]]],
  ['moonlitveil', '月光面紗', 'Moonlit Veil', 'clothcape', 6, [['def', 15], ['res_all', 12], ['mp', 15]]],
  ['batwing', '蝙蝠之翼', 'Batwing Mantle', 'twilightcloak', 30, [['res_all', 25], ['ms', 6], ['jump', 1]]],
  ['nightcloak', '永夜斗篷', 'Cloak of Eternal Night', 'abysscloak', 54, [['res_all', 40], ['ls', 6], ['int', 15], ['frw', 20]]],
  ['magefist', '法師之拳', 'Magefist', 'leathergloves', 9, [['def', 12], ['ias', 15], ['fire', 12], ['mpr', 4]]],
  ['dracul', '德古拉之握', "Dracul's Grasp", 'vampiregloves', 42, [['edef', 120, 150], ['ls', 8], ['str', 12], ['hok', 10]]],
  ['steelgrip', '鋼鐵之握', 'Steelgrip', 'gauntlets', 26, [['ed', 30], ['str', 10], ['crit', 8]]],
  ['windwalker', '風行者', 'Windwalker', 'boots', 7, [['frw', 30], ['jump', 1], ['res_ltng', 20]]],
  ['goblintoe', '哥布林腳趾', 'Goblin Toe', 'heavyboots', 14, [['edef', 80, 100], ['crit', 10], ['mf', 20]]],
  ['shadowdancer', '暗影舞者', 'Shadow Dancer', 'wyrmboots', 46, [['edef', 120, 160], ['frw', 35], ['jump', 1], ['all', 6]]],
  ['ringofmoon', '月之戒', 'Ring of the Moon', 'ring', 10, [['mp', 30], ['int', 6], ['mpr', 5]]],
  ['ravenfrost', '寒鴉之霜', 'Raven Frost', 'ring', 24, [['cold', 18], ['lck', 10], ['res_cold', 25]]],
  ['bulkathos', '血之戒', 'Ring of Blood', 'ring', 32, [['ls', 6], ['str', 10], ['hp', 40]]],
  ['stonejordan', '喬丹之石', 'Stone of Jordan', 'ring', 40, [['mp', 60], ['all', 5], ['subd', 30], ['int', 10]]],
  ['nagelring', '奈吉戒指', 'Nagelring', 'ring', 16, [['mf', 30], ['lck', 8], ['thorns', 6]]],
  ['catseye', '貓眼護符', "The Cat's Eye", 'amulet', 18, [['frw', 30], ['ias', 20], ['lck', 10]]],
  ['mara', '瑪拉的萬花筒', "Mara's Kaleidoscope", 'amulet', 44, [['all', 8], ['res_all', 25], ['hp', 40]]],
  ['highlord', '至高領主之怒', "Highlord's Wrath", 'amulet', 50, [['crit', 15], ['ias', 20], ['ltng', 40], ['res_ltng', 35]]],
  ['saintheart', '聖者之心', "Saint's Heart", 'amulet', 12, [['hearts', 25], ['subd', 25], ['heok', 1]]],
  ['endlessknives', '無盡飛刀', 'Endless Knives', 'knives', 12, [['subd', 60], ['subc', 1], ['crit', 10]]],
  ['vulcanaxe', '火神之斧', "Vulcan's Axes", 'axes', 20, [['subd', 80], ['fire', 30]]],
  ['grandcross', '大十字', 'Grand Cross', 'cross', 30, [['subd', 100], ['holy', 40], ['hearts', 20]]],
  ['chronos', '時之懷錶', 'Chronos', 'stopwatch', 40, [['subc', 2], ['frw', 15], ['int', 10]]],
  ['zeusorb', '宙斯之眼', 'Eye of Zeus', 'lightningorb', 46, [['subd', 120], ['ltng', 40], ['chain', 20]]],
];
export const UNIQUES = Object.fromEntries(UNI.map(([id, zh, en, b, lvl, mods]) => [id, { id, zh, en, b, lvl, mods }]));

// ------------------------------------------------------------------ rare names
const RARE1 = [['毀滅', 'Doom'], ['冷酷', 'Grim'], ['鮮血', 'Blood'], ['風暴', 'Storm'], ['暗影', 'Shadow'], ['月光', 'Moon'], ['永夜', 'Night'], ['骸骨', 'Bone'], ['死亡', 'Death'], ['符文', 'Rune'],
  ['靈魂', 'Spirit'], ['怨魂', 'Wraith'], ['地獄', 'Hell'], ['天譴', 'Bane'], ['雷霆', 'Thunder'], ['寒霜', 'Frost'], ['烈焰', 'Pyre'], ['腐朽', 'Rot'], ['星辰', 'Star'], ['混沌', 'Chaos'], ['鴉', 'Raven'], ['蛇', 'Viper']];
const RARE2 = {
  W: [['之牙', 'Fang'], ['之刃', 'Edge'], ['之咬', 'Bite'], ['之渴', 'Thirst'], ['之痕', 'Scar'], ['之怒', 'Wrath'], ['之吻', 'Kiss'], ['之爪', 'Claw']],
  S: [['之護', 'Ward'], ['之衛', 'Guard'], ['之牆', 'Wall'], ['之塔', 'Tower'], ['之盾', 'Aegis']], H: [['之面甲', 'Visor'], ['之冠', 'Crown'], ['之兜', 'Cowl'], ['之角', 'Horn'], ['之面具', 'Mask']],
  A: [['之殼', 'Shell'], ['之皮', 'Hide'], ['之衣', 'Coat'], ['之甲', 'Carapace'], ['之袍', 'Robe']], C: [['之裹布', 'Shroud'], ['之面紗', 'Veil'], ['之翼', 'Wings'], ['之斗篷', 'Mantle']],
  G: [['之握', 'Grip'], ['之手', 'Hand'], ['之拳', 'Fist'], ['之觸', 'Touch']], B: [['之步', 'Stride'], ['之蹤', 'Track'], ['之徑', 'Trail'], ['之履', 'Tread']],
  R: [['之環', 'Band'], ['之圈', 'Loop'], ['之捲', 'Coil'], ['之輪', 'Circle']], M: [['之眼', 'Eye'], ['之心', 'Heart'], ['之星', 'Star'], ['之符', 'Charm']], X: [['之雹', 'Hail'], ['之雨', 'Rain'], ['之暴', 'Storm'], ['之擲', 'Volley']],
};

// ------------------------------------------------------------------ rolling items
let uidN = 0;
const uid = () => (Date.now() % 1e9).toString(36) + (uidN++).toString(36);
const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
export const letterOf = (b) => CLASS[BASES[b].c].L;
// a random base whose quality level fits the item level (recent bases more likely)
export function pickBase(ilvl, rng, filter) {
  const list = BASE_LIST.filter((b) => b.q <= ilvl && (!filter || filter(b)));
  if (!list.length) return 'shortsword';
  let tot = 0; const w = list.map((b) => { const x = 1 + Math.max(0, 12 - (ilvl - b.q)) * 0.35 + (b.c === 'ring' || b.c === 'amulet' ? 1.5 : 0); tot += x; return x; });
  let r = rng() * tot; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i].id; }
  return list[list.length - 1].id;
}
function rollAffix(id, ilvl, rng) {
  const tiers = AFFIX[id].tiers.filter((t) => t[0] <= ilvl);
  if (!tiers.length) return null;
  // usually one of the two best tiers available
  const k = Math.max(0, tiers.length - 1 - (rng() < 0.6 ? 0 : rng() < 0.7 ? 1 : Math.floor(rng() * tiers.length)));
  const t = tiers[k];
  return [id, ri(rng, t[1], t[2]), k];
}
function affixPool(letter, type, ilvl, taken) {
  return Object.values(AFFIX).filter((a) => a.t === type && a.slots.includes(letter) && a.tiers[0][0] <= ilvl && !taken.has(a.stat));
}
// q: 'n' normal, 's' superior, 'm' magic, 'r' rare, 'set', 'u' unique
export function makeItem(baseId, q, ilvl, rng = Math.random, opts = {}) {
  const B = BASES[baseId], L = CLASS[B.c].L, it = { u: uid(), b: baseId, q, l: ilvl, a: [] };
  if (q === 's') { if (L === 'W') it.a.push(['sup_ed', ri(rng, 5, 15)]); else if (B.def) it.a.push(['sup_def', ri(rng, 5, 15)]); }
  if (q === 'm' || q === 'r') {
    const taken = new Set(), n = q === 'm' ? { pre: rng() < 0.6 ? 1 : 0, suf: 0 } : { pre: ri(rng, 1, 3), suf: 0 };
    if (q === 'm') n.suf = n.pre && rng() < 0.5 ? 0 : 1; else n.suf = Math.max(1, Math.min(3, ri(rng, 3, 6) - n.pre));
    for (const type of ['pre', 'suf']) for (let i = 0; i < n[type]; i++) {
      const pool = affixPool(L, type, ilvl, taken); if (!pool.length) break;
      const a = pool[Math.floor(rng() * pool.length)], r = rollAffix(a.id, ilvl, rng);
      if (r) { it.a.push(r); taken.add(a.stat); }
    }
    if (!it.a.length) { const pool = affixPool(L, 'suf', ilvl, taken).concat(affixPool(L, 'pre', ilvl, taken)); if (pool.length) { const r = rollAffix(pool[0].id, ilvl, rng); if (r) it.a.push(r); } }
    if (q === 'r') { const w2 = RARE2[L]; it.nm = [Math.floor(rng() * RARE1.length), Math.floor(rng() * w2.length)]; }
  }
  if (q === 'u') { const U = UNIQUES[opts.id]; it.id = U.id; it.a = U.mods.map(([s, a, b]) => [s, b != null ? ri(rng, a, b) : a]); }
  if (q === 'set') it.id = opts.id;
  // sockets: normal and superior gear often, magic sometimes, rare rarely
  const max = MAXSOCK[L];
  if (max && (q === 'n' || q === 's') && rng() < 0.3) it.s = ri(rng, 1, Math.min(max, 1 + Math.floor(ilvl / 12)));
  else if (max && q === 'm' && rng() < 0.1) it.s = ri(rng, 1, 2);
  else if (max && q === 'r' && rng() < 0.08) it.s = 1;
  if (q === 'u') { const sk = it.a.find((m) => m[0] === 'sock'); if (sk) it.s = sk[1]; }
  if (it.s) it.g = [];
  return it;
}
// what drops: a base, then a quality — magic find improves the odds (with diminishing returns like Diablo II)
export function rollDrop(ilvl, rng = Math.random, o = {}) {
  const mf = o.mf || 0, boost = o.boost || 1;
  const mfU = (mf * 250) / (mf + 250), mfS = (mf * 500) / (mf + 500), mfR = (mf * 600) / (mf + 600);
  const base = o.base || pickBase(ilvl, rng, o.filter);
  const B = BASES[base];
  const pU = 0.012 * boost * (1 + mfU / 100), pS = 0.022 * boost * (1 + mfS / 100), pR = 0.07 * boost * (1 + mfR / 100), pM = 0.32 * Math.min(2, boost) * (1 + mf / 100);
  const r = rng();
  if (r < pU) {
    const cands = Object.values(UNIQUES).filter((u) => u.b === base && u.lvl <= ilvl + 2);
    const any = cands.length ? cands : Object.values(UNIQUES).filter((u) => u.lvl <= ilvl + 2 && u.lvl >= ilvl - 25 && BASES[u.b].c === B.c);
    if (any.length) { const U = any[Math.floor(rng() * any.length)]; return makeItem(U.b, 'u', ilvl, rng, { id: U.id }); }
  }
  if (r < pU + pS) {
    const cands = Object.values(SET_ITEMS).filter((s) => s.lvl <= ilvl + 2 && s.lvl >= ilvl - 30 && (s.b === base || rng() < 0.4));
    if (cands.length) { const s = cands[Math.floor(rng() * cands.length)]; return makeItem(s.b, 'set', ilvl, rng, { id: s.id }); }
  }
  if (r < pU + pS + pR && B.c !== 'sub') return makeItem(base, 'r', ilvl, rng);
  if (r < pU + pS + pR + pM) return makeItem(base, 'm', ilvl, rng);
  return makeItem(base, B.c === 'ring' || B.c === 'amulet' ? 'm' : rng() < 0.15 ? 's' : 'n', ilvl, rng);
}

// ------------------------------------------------------------------ reading an item
export const QCOL = { n: '#e8e8e8', s: '#e8e8e8', m: '#7a8cff', r: '#ffe85a', set: '#4ad84a', u: '#d8b878', sock: '#a8a8a8' };
export const qcol = (it) => (it.q === 'n' && it.s ? QCOL.sock : QCOL[it.q]);
// every stat the item gives: [stat, value]
export function modsOf(it) {
  const B = BASES[it.b], L = CLASS[B.c].L, out = [];
  for (const [id, v] of it.a) {
    if (id === 'sup_ed') out.push(['ed', v]); else if (id === 'sup_def') out.push(['edef', v]);
    else if (AFFIX[id]) out.push([AFFIX[id].stat, v]); else out.push([id, v]);
  }
  if (it.q === 'set') for (const m of SET_ITEMS[it.id].mods) out.push(m);
  for (const g of it.g || []) out.push(...gemMods(g, L));
  return out.filter((m) => m[0] !== 'sock');
}
export function itemName(it, lang) {
  const B = BASES[it.b], base = lang === 'zh' ? B.zh : B.en;
  if (it.q === 'u') return UNIQUES[it.id][lang === 'zh' ? 'zh' : 'en'];
  if (it.q === 'set') return SET_ITEMS[it.id][lang === 'zh' ? 'zh' : 'en'];
  if (it.q === 'r') { const a = RARE1[it.nm[0]], b = RARE2[CLASS[B.c].L][it.nm[1]]; return lang === 'zh' ? a[0] + b[0] : `${a[1]} ${b[1]}`; }
  if (it.q === 'm') {
    let pre = '', suf = '';
    for (const [id, , k] of it.a) { const A = AFFIX[id]; if (!A) continue; const t = A.tiers[k ?? 0]; if (A.t === 'pre') pre = lang === 'zh' ? t[3] : t[4]; else suf = lang === 'zh' ? t[3] : t[4]; }
    return lang === 'zh' ? (pre ? pre + '的' : '') + base + (suf ? '之' + suf : '') : [pre, base, suf].filter(Boolean).join(' ');
  }
  if (it.q === 's') return lang === 'zh' ? '精良的' + base : 'Superior ' + base;
  return base;
}
// the level needed to equip it
export function reqLevel(it) {
  const B = BASES[it.b];
  let r = Math.floor(B.q * 0.6);
  for (const [id, , k] of it.a) if (AFFIX[id]) r = Math.max(r, Math.floor(AFFIX[id].tiers[k ?? 0][0] * 0.8));
  if (it.q === 'u') r = Math.max(r, UNIQUES[it.id].lvl);
  if (it.q === 'set') r = Math.max(r, SET_ITEMS[it.id].lvl);
  return Math.max(1, r);
}
export function itemValue(it) {
  const B = BASES[it.b], q = { n: 1, s: 1.3, m: 2.5, r: 5, set: 8, u: 12 }[it.q];
  return Math.round((20 + B.q * 14 + it.l * 6) * q * (1 + (it.s || 0) * 0.15));
}
// defence and weapon numbers of one item with its own enhanced damage / defence applied
export function itemBase(it) {
  const B = BASES[it.b], m = modsOf(it), sum = (k) => m.filter((x) => x[0] === k).reduce((a, x) => a + x[1], 0);
  if (B.min != null) { const ed = sum('ed'), mx = sum('maxd'), mn = sum('mind'); return { min: Math.round(B.min * (1 + ed / 100)) + mn, max: Math.round(B.max * (1 + ed / 100)) + mx, time: B.time, reach: B.reach + sum('reach'), two: B.two }; }
  if (B.def != null) return { def: Math.round(B.def * (1 + sum('edef') / 100)) + sum('def'), blk: B.blk };
  return { dmg: Math.round(B.dmg * (1 + it.l / 40)), cost: B.cost, k: B.k };
}
// text lines for an item card: [text, colour]
export function describe(it, lang) {
  const B = BASES[it.b], lines = [], base = itemBase(it), L = lang === 'zh' ? 'zh' : 'en';
  const fmt = (stat, v) => { const T = STAT[stat]; if (!T) return `${stat} ${v}`; return T[L].replace('{v}', v).replace('{a}', Math.max(1, Math.round(v * (stat === 'ltng' ? 0.1 : 0.5)))); };
  if (base.min != null) lines.push([`${lang === 'zh' ? '傷害' : 'Damage'}: ${base.min}-${base.max}${base.two ? (lang === 'zh' ? '（雙手）' : ' (two-handed)') : ''}`, '#e8e8e8'], [`${lang === 'zh' ? '攻擊速度' : 'Speed'}: ${speedName(B.time, lang)} · ${lang === 'zh' ? '距離' : 'Reach'} ${base.reach}`, '#a8a8b8']);
  if (base.def != null && B.c !== 'ring' && B.c !== 'amulet') lines.push([`${lang === 'zh' ? '防禦' : 'Defense'}: ${base.def}`, '#e8e8e8']);
  if (base.blk) lines.push([`${lang === 'zh' ? '格擋率' : 'Chance to Block'}: ${base.blk}%`, '#e8e8e8']);
  if (base.dmg != null) lines.push([`${lang === 'zh' ? '傷害' : 'Damage'}: ${base.dmg || '—'} · ♥ ${base.cost}`, '#e8e8e8']);
  lines.push([`${lang === 'zh' ? '需要等級' : 'Required Level'}: ${reqLevel(it)} · ${lang === 'zh' ? '物品等級' : 'Item Level'} ${it.l}`, '#a8a8b8']);
  for (const [s, v] of modsOf(it)) if (!['ed', 'edef', 'maxd', 'mind', 'def'].includes(s) || it.q !== 'n') lines.push([fmt(s, v), '#7a8cff']);
  if (it.s) lines.push([fmt('sock', `${(it.g || []).length}/${it.s}`), '#a8a8a8']);
  return lines;
}
export const speedName = (t, lang) => (t <= 0.18 ? (lang === 'zh' ? '極快' : 'Very Fast') : t <= 0.24 ? (lang === 'zh' ? '快' : 'Fast') : t <= 0.32 ? (lang === 'zh' ? '普通' : 'Normal') : t <= 0.4 ? (lang === 'zh' ? '慢' : 'Slow') : (lang === 'zh' ? '很慢' : 'Very Slow'));
export function setLines(setId, worn, lang) {
  const S = SETS[setId], L = lang === 'zh' ? 'zh' : 'en', out = [[`${S[L]} (${worn}/${S.pieces.length})`, '#4ad84a']];
  for (const [k, mods] of Object.entries(S.bonus)) {
    const need = k === 'full' ? S.pieces.length : +k, on = worn >= need;
    for (const [s, v] of mods) out.push([(k === 'full' ? (lang === 'zh' ? '完整：' : 'Full: ') : `(${need}) `) + STAT[s][L].replace('{v}', v).replace('{a}', Math.round(v / 2)), on ? '#4ad84a' : '#5a6a5a']);
  }
  return out;
}

// ------------------------------------------------------------------ the old saves' gear (before items were rolled)
export const LEGACY = { shortsword: 'shortsword', shortsword2: 'broadsword', rapier: 'rapier', claymore: 'claymore', moonblade: 'longsword', tunic: 'quilted', leather: 'leatherarmor', chainmail: 'chainmail', silverplate: 'plate', luckring: 'ring', powerring: 'ring', ironring: 'ring' };
export const LEGACY_SUB = { dagger: 'knives', axe: 'axes', holy: 'holywater', cross: 'cross' };
