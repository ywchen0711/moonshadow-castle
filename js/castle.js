// Moonshadow Castle, expanded: 15 new areas grown around the original hand-made rooms from a fixed seed (the same
// castle for everyone), each with a boss, save and warp rooms, treasure, secrets and an ability gate at its
// entrance; then the Reversed Castle — the whole castle turned upside down, harder, with new treasure.
//
// Progression: (start) Alchemy Lab, Abandoned Mine → Leap Stone: Marble Gallery → Shadow Cloak: Moonlit Garden,
// Outer Wall, Duke's Quarters, Forge → Bat Wing: Belfry, Royal Chapel (Mist Form) → Mist: Colosseum, Crystal
// Caverns (Holy Snorkel), Frozen Vault, Treasury → Snorkel: Underground Waterway, the Abyss (Moon Eye) →
// Moon Eye + the Count defeated: the Reversed Castle.

// area: name, monster level, art style and colours, monsters, boss, relic reward, size (map cells), the region
// of the map it grows in, and how it attaches (a parent cell or a parent area + side) with which gate
export const NEW_AREAS = {
  lab: { zh: '煉金實驗室', en: 'Alchemy Laboratory', lv: 2, style: 'lab', wall: '#1e2c30', brick: '#2e424a', trim: '#7ab0a4', sky: ['#04080c', '#0c1a20'], enemies: ['slime', 'homunculus', 'eyeball', 'zombie'], music: 'catacombs', boss: 'chimera', size: 40, region: [-16, 7, 0, 14], attach: { cell: [0, 8], dir: 'L' } },
  mine: { zh: '廢棄礦坑', en: 'Abandoned Mine', lv: 6, style: 'mine', wall: '#2a2218', brick: '#3e3222', trim: '#a8865a', sky: ['#050402', '#140e08'], enemies: ['spider', 'miner', 'skeleton', 'bat'], music: 'catacombs', boss: 'arachne', size: 50, region: [-6, 14, 16, 26], attach: { cell: [5, 13], dir: 'D' } },
  gallery: { zh: '大理石迴廊', en: 'Marble Gallery', lv: 5, style: 'gallery', wall: '#3a3646', brick: '#6a6478', trim: '#e8e0d0', sky: ['#0c0a1a', '#2a2040'], moon: true, enemies: ['lady', 'axeknight', 'medusa', 'book'], music: 'library', boss: 'doppel', relic: 'echo', size: 60, region: [-14, -10, 12, 7], attach: { cell: [5, 7], dir: 'U', gate: 'dj' } },
  garden: { zh: '月光庭園', en: 'Moonlit Garden', lv: 7, style: 'garden', wall: '#1a2a22', brick: '#2e4232', trim: '#9ac08a', sky: ['#060c18', '#1a2a3a'], moon: true, enemies: ['harpy', 'plant', 'ghost', 'zombie'], music: 'entrance', boss: 'treant', relic: 'fairy', size: 40, region: [16, 8, 30, 14], attach: { cell: [15, 8], dir: 'R', gate: 'slide' } },
  outer: { zh: '城堡外牆', en: 'Outer Wall', lv: 9, style: 'outer', wall: '#262a36', brick: '#3c4252', trim: '#a8b0c8', sky: ['#0a1430', '#3a3060'], moon: true, enemies: ['harpy', 'axeknight', 'gargoyle', 'medusa'], music: 'clock', boss: 'armorlord', size: 45, region: [30, -14, 38, 14], attach: { area: 'garden', dir: 'R' } },
  forge: { zh: '鍛造工坊', en: 'The Forge', lv: 10, style: 'forge', wall: '#2a1810', brick: '#44261a', trim: '#e88a3a', sky: ['#100402', '#3a1006'], enemies: ['imp', 'magmagolem', 'miner', 'axeknight'], music: 'keep', boss: 'ironmaster', size: 35, region: [-20, 14, -6, 26], attach: { area: 'mine', dir: 'L', gate: 'slide' } },
  quarters: { zh: '吸血公爵之館', en: "Duke's Quarters", lv: 11, style: 'quarters', wall: '#2a0e18', brick: '#441628', trim: '#c88a5a', sky: ['#12040a', '#3a0a1a'], enemies: ['werewolf', 'bigbat', 'lady', 'knight'], music: 'keep', boss: 'duke', shop: true, size: 50, region: [38, -14, 50, 14], attach: { area: 'outer', dir: 'R' } },
  belfry: { zh: '鐘樓頂端', en: 'The Belfry', lv: 12, style: 'belfry', wall: '#2a2a32', brick: '#3e3e4a', trim: '#c8b080', sky: ['#081028', '#3a2a50'], moon: true, enemies: ['owl', 'clockman', 'gargoyle', 'medusa'], music: 'clock', boss: 'gargoylelord', size: 30, region: [12, -12, 21, 1], attach: { cell: [12, 1], dir: 'U', gate: 'bat' } },
  chapel: { zh: '皇家禮拜堂', en: 'Royal Chapel', lv: 13, style: 'chapel', wall: '#2a2238', brick: '#40345a', trim: '#e8d090', sky: ['#0a0a20', '#2a2a5a'], moon: true, enemies: ['angel', 'priest', 'ghost', 'knight'], music: 'library', boss: 'seraph', relic: 'mist', size: 45, region: [21, -14, 30, -2], attach: { cell: [23, -2], dir: 'U', gate: 'bat' } },
  colosseum: { zh: '鬥技場', en: 'Colosseum', lv: 15, style: 'colosseum', wall: '#3a2e22', brick: '#5a4632', trim: '#d8b880', sky: ['#1a1008', '#5a3018'], moon: true, enemies: ['gladiator', 'lizardman', 'axeknight', 'werewolf'], music: 'keep', boss: 'minotaur', size: 40, region: [38, 14, 50, 26], attach: { area: 'quarters', dir: 'D', gate: 'grate' } },
  caverns: { zh: '水晶洞窟', en: 'Crystal Caverns', lv: 16, style: 'caverns', wall: '#14202e', brick: '#22344a', trim: '#6ac0e0', sky: ['#020610', '#081a2a'], water: true, enemies: ['merman', 'spider', 'lizardman', 'jelly'], music: 'catacombs', boss: 'scylla', relic: 'snorkel', shop: true, size: 70, region: [-6, 26, 30, 38], attach: { area: 'mine', dir: 'D', gate: 'grate' } },
  frozen: { zh: '冰封地窖', en: 'Frozen Vault', lv: 18, style: 'frozen', wall: '#1c2a3a', brick: '#2e4660', trim: '#c8f0ff', sky: ['#04101c', '#183048'], enemies: ['frostspirit', 'iceknight', 'frostwolf', 'ghost'], music: 'library', boss: 'frostwyrm', size: 45, region: [-14, -22, 12, -10], attach: { area: 'gallery', dir: 'U', gate: 'grate' } },
  treasury: { zh: '寶物庫', en: 'The Treasury', lv: 19, style: 'treasury', wall: '#2a2410', brick: '#4a3e18', trim: '#ffd84a', sky: ['#100c02', '#3a2a08'], enemies: ['mimic', 'goldgolem', 'knight', 'gargoyle'], music: 'keep', boss: 'mimicking', size: 35, region: [21, -26, 34, -14], attach: { area: 'chapel', dir: 'U', gate: 'grate' } },
  waterway: { zh: '地下水道', en: 'Underground Waterway', lv: 20, style: 'waterway', wall: '#12222a', brick: '#1e3640', trim: '#5aa0a8', sky: ['#02080a', '#06181e'], water: true, enemies: ['merman', 'frogman', 'jelly', 'skullpile'], music: 'catacombs', boss: 'kraken', size: 55, region: [16, 14, 38, 26], attach: { area: 'caverns', dir: 'U', gate: 'deep' } },
  abyss: { zh: '無底深淵', en: 'The Abyss', lv: 22, style: 'abyss', wall: '#1a0808', brick: '#300e0e', trim: '#c83a3a', sky: ['#060000', '#2a0204'], enemies: ['wraith', 'demon', 'skullpile', 'eyeball'], music: 'keep', boss: 'reaper', relic: 'moonEye', size: 50, region: [30, 26, 46, 40], attach: { area: 'waterway', dir: 'D', gate: 'deep' } },
};
// the order areas are grown in (parents first)
const ORDER = ['lab', 'mine', 'gallery', 'garden', 'outer', 'forge', 'quarters', 'belfry', 'chapel', 'colosseum', 'caverns', 'frozen', 'treasury', 'waterway', 'abyss'];

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const SHAPES = [[1, 1, 9], [2, 1, 10], [3, 1, 12], [4, 1, 9], [5, 1, 5], [6, 1, 3], [1, 2, 6], [1, 3, 5], [1, 4, 3], [2, 2, 6], [3, 2, 4], [2, 3, 2]];
const SHAPE_W = SHAPES.reduce((a, s) => a + s[2], 0);
const key = (x, y) => x + ',' + y;

// grow every new area; base: the original rooms and doors (left untouched)
export function buildCastle(baseRooms, baseDoors, seed = 20261015) {
  const rooms = baseRooms.map((r) => ({ ...r })), doors = baseDoors.map((d) => [...d]);
  const occ = new Map();                                   // cell → room id
  const mark = (r) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) occ.set(key(x, y), r.id); };
  rooms.forEach(mark);
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const rnd = rng(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shape = () => { let r = rnd() * SHAPE_W; for (const s of SHAPES) { r -= s[2]; if (r <= 0) return s; } return SHAPES[0]; };
  const doorCells = (d) => (d[2] === 'R' ? [[d[0], d[1]], [d[0] + 1, d[1]]] : [[d[0], d[1]], [d[0], d[1] + 1]]);
  for (const name of ORDER) {
    const A = NEW_AREAS[name], [rx0, ry0, rx1, ry1] = A.region;
    const inReg = (x, y) => x >= rx0 && x < rx1 && y >= ry0 && y < ry1;
    const free = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!inReg(xx, yy) || occ.has(key(xx, yy))) return false; return true; };
    const mine = [];
    let n = 0;
    const add = (x, y, w, h, o = {}) => { const r = { id: `${name}${++n}`, area: name, x, y, w, h, ...o }; rooms.push(r); mine.push(r); byId[r.id] = r; mark(r); return r; };
    // the entrance: a door from a parent cell into this area (through a short passage if the parent area does not
    // reach this area's region)
    const dir = A.attach.dir, [sx, sy] = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[dir];
    let parent = null, path = 0;
    if (A.attach.cell) parent = A.attach.cell;
    else {
      let best = Infinity; const cands = [];
      for (const r of rooms) if (r.area === A.attach.area && !r.boss && !r.special && !r.relic && !r.item) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        let cx = x + sx, cy = y + sy, len = 0, ok = true;
        while (!inReg(cx, cy) && len < 12) { if (occ.has(key(cx, cy))) { ok = false; break; } cx += sx; cy += sy; len++; }
        if (!ok || !inReg(cx, cy) || occ.has(key(cx, cy))) continue;
        if (len < best) { best = len; cands.length = 0; }
        if (len === best) cands.push([x, y]);
      }
      if (!cands.length) throw new Error(`no way into ${name}`);
      parent = cands[Math.floor(rnd() * cands.length)]; path = best;
    }
    const [px, py] = parent;
    const doorTo = (ax, ay) => (dir === 'L' ? [ax - 1, ay, 'R'] : dir === 'R' ? [ax, ay, 'R'] : dir === 'U' ? [ax, ay - 1, 'D'] : [ax, ay, 'D']);
    const entryDoor = doorTo(px, py);
    if (A.attach.gate) entryDoor.push(A.attach.gate);
    let seed2 = [px + sx, py + sy], connector = null;
    if (path > 0) {   // a passage outside the region, part of this area
      const xs = [px + sx, px + sx * path], ys = [py + sy, py + sy * path];
      connector = add(Math.min(...xs), Math.min(...ys), Math.abs(xs[1] - xs[0]) + 1, Math.abs(ys[1] - ys[0]) + 1);
      seed2 = [px + sx * (path + 1), py + sy * (path + 1)];
    }
    // first room: a corridor leading away from the entrance
    let first = null;
    for (let tries = 0; tries < 200 && !first; tries++) {
      const [w, h] = tries < 40 ? (dir === 'L' || dir === 'R' ? [2 + Math.floor(rnd() * 3), 1] : [1, 2 + Math.floor(rnd() * 2)]) : shape();
      const x = dir === 'L' ? seed2[0] - w + 1 : dir === 'R' ? seed2[0] : seed2[0] - Math.floor(rnd() * w);
      const y = dir === 'U' ? seed2[1] - h + 1 : dir === 'D' ? seed2[1] : seed2[1] - Math.floor(rnd() * h);
      if (free(x, y, w, h)) first = add(x, y, w, h);
    }
    if (!first) throw new Error(`cannot start ${name}`);
    doors.push(entryDoor);
    // grow
    const myDoors = [];
    const link = (d) => { doors.push(d); myDoors.push(d); };
    if (connector) link(doorTo(seed2[0] - sx, seed2[1] - sy));
    let cells = first.w * first.h, guard = 0;
    while (cells < A.size && guard++ < 8000) {
      const a = mine.length > 4 && rnd() < 0.5 ? mine[mine.length - 1 - Math.floor(rnd() * 4)] : pick(mine);
      const side = rnd() < 0.74 ? (rnd() < 0.5 ? 'L' : 'R') : (rnd() < 0.5 ? 'U' : 'D');
      const [w, h] = shape();
      let x, y, d;
      if (side === 'R' || side === 'L') {
        const row = a.y + Math.floor(rnd() * a.h);
        y = row - Math.floor(rnd() * h); x = side === 'R' ? a.x + a.w : a.x - w;
        d = side === 'R' ? [a.x + a.w - 1, row, 'R'] : [a.x - 1, row, 'R'];
      } else {
        const col = a.x + Math.floor(rnd() * a.w);
        x = col - Math.floor(rnd() * w); y = side === 'D' ? a.y + a.h : a.y - h;
        d = side === 'D' ? [col, a.y + a.h - 1, 'D'] : [col, a.y - 1, 'D'];
      }
      if (!free(x, y, w, h)) continue;
      add(x, y, w, h); link(d); cells += w * h;
    }
    // a few loops between neighbouring rooms of the area
    const linked = new Set(myDoors.map((d) => doorCells(d).map(([x, y]) => occ.get(key(x, y))).sort().join('|')));
    for (const r of mine) for (let y = r.y; y < r.y + r.h; y++) {
      const nb = occ.get(key(r.x + r.w, y)), other = nb && byId[nb];
      if (!other || other.area !== name) continue;
      const k = [r.id, other.id].sort().join('|');
      if (!linked.has(k) && rnd() < 0.18) { linked.add(k); link([r.x + r.w - 1, y, 'R']); }
    }
    // the boss: two or three cells wide, past the farthest room, with the treasure (or relic) room beyond it
    const adj = {};
    for (const d of [entryDoor, ...myDoors]) { const [a2, b2] = doorCells(d).map(([x, y]) => occ.get(key(x, y))); (adj[a2] ||= []).push(b2); (adj[b2] ||= []).push(a2); }
    const dist = { [first.id]: 0 }, q = [first.id];
    while (q.length) { const id = q.shift(); for (const nb of adj[id] || []) if (dist[nb] == null && byId[nb].area === name) { dist[nb] = dist[id] + 1; q.push(nb); } }
    const far = mine.slice().sort((a2, b2) => (dist[b2.id] ?? 0) - (dist[a2.id] ?? 0));
    let bossDone = false;
    for (const c of far) {
      for (const side of ['R', 'L']) for (let y = c.y; y < c.y + c.h && !bossDone; y++) for (const bw of [3, 2]) {
        if (bossDone) break;
        const bx = side === 'R' ? c.x + c.w : c.x - bw, tx = side === 'R' ? bx + bw : bx - 1;
        if (!free(bx, y, bw, 1) || !free(tx, y, 1, 1)) continue;
        const boss = add(bx, y, bw, 1, { boss: A.boss, enemies: 0 });
        const prize = add(tx, y, 1, 1, A.relic ? { relic: A.relic, enemies: 0 } : { item: 'chest', enemies: 0 });
        if (side === 'R') { link([c.x + c.w - 1, y, 'R']); link([bx + bw - 1, y, 'R']); }
        else { link([bx + bw - 1, y, 'R']); link([tx, y, 'R']); }
        adj[boss.id] = [c.id, prize.id]; adj[prize.id] = [boss.id]; (adj[c.id] ||= []).push(boss.id);
        dist[boss.id] = (dist[c.id] || 0) + 1; dist[prize.id] = dist[boss.id] + 1;
        bossDone = true;
      }
      if (bossDone) break;
    }
    if (!bossDone) throw new Error(`no room for the boss of ${name}`);
    // save, warp and shop rooms: single cells reached only through side doors
    const sideOnly = (r) => r.w === 1 && r.h === 1 && !r.boss && !r.relic && !r.item && !r.special &&
      ![entryDoor, ...myDoors].some((d) => d[2] === 'D' && doorCells(d).some(([x, y]) => x === r.x && y === r.y));
    const singles = mine.filter(sideOnly).sort((a2, b2) => (dist[a2.id] ?? 0) - (dist[b2.id] ?? 0));
    const want = ['save', 'warp', ...(A.shop ? ['shop'] : []), 'save'];
    const placeSingle = (special, near) => {
      // reuse a single cell if one exists, otherwise build one on a free side of a room
      let r = near === 'far' ? singles.pop() : singles.shift();
      if (!r) {
        const hosts = near === 'far' ? far : far.slice().reverse();
        for (const h0 of hosts) { if (h0.boss || h0.relic || h0.item === 'chest') continue;
          for (let y = h0.y; y < h0.y + h0.h && !r; y++) for (const side of ['L', 'R']) { const x = side === 'R' ? h0.x + h0.w : h0.x - 1; if (!r && free(x, y, 1, 1)) { r = add(x, y, 1, 1); link(side === 'R' ? [h0.x + h0.w - 1, y, 'R'] : [x, y, 'R']); (adj[r.id] ||= []).push(h0.id); (adj[h0.id] ||= []).push(r.id); } }
          if (r) break; }
      }
      if (r) { r.special = special; r.enemies = 0; }
    };
    want.forEach((sp, i) => placeSingle(sp, i === want.length - 1 ? 'far' : 'near'));
    // dead ends: power-ups and treasure chests, some behind breakable walls
    const ups = ['hpup', name.length % 2 ? 'mpup' : 'heartup', 'chest', 'chest', 'hpup', 'chest', 'chest', 'chest'];
    let u = 0;
    for (const r of mine) {
      if (r.boss || r.relic || r.item || r.special || (adj[r.id] || []).length !== 1 || r === first) continue;
      r.item = ups[u++ % ups.length]; r.enemies = r.item === 'chest' ? 1 : 0;
      const d = [entryDoor, ...myDoors].find((dd) => dd[2] === 'R' && doorCells(dd).some(([x, y]) => occ.get(key(x, y)) === r.id));
      if (d && !d[3] && rnd() < 0.35) { d[3] = 'break'; r.secret = true; }
    }
  }
  return { rooms, doors };
}

// ------------------------------------------------------------------ the Reversed Castle: everything turned 180°
export const REV_OX = 200, REV_OY = 200, REV = 'R:';
export function reverseCastle(rooms, doors) {
  const rr = rooms.map((r) => ({ ...r, id: REV + r.id, world: 'rev', x: REV_OX - r.x - r.w + 1, y: REV_OY - r.y - r.h + 1, outside: false,
    special: r.special === 'start' ? null : r.special, relic: null, boss: r.boss ? r.boss : null }));
  const dd = doors.map(([x, y, d, gate]) => {
    const g = gate === 'break' ? 'break' : undefined;          // every relic is yours by now: only secrets stay hidden
    return d === 'R' ? [REV_OX - x - 1, REV_OY - y, 'R', g] : [REV_OX - x, REV_OY - y - 1, 'D', g];
  }).map((d) => (d[3] ? d : d.slice(0, 3)));
  // the breakable wall is built on the non-secret side, which stays correct after turning
  return { rooms: rr, doors: dd };
}
