// Moonshadow Castle game logic: player physics and abilities, combat, enemies, bosses, drops, levels, rooms.
// No DOM here: main.js feeds input and reads S; tools/test.mjs drives it headless.
import { TILE, CW, CH, AREAS, ROOM, ROOMS, RELICS, ENEMIES, BOSSES, ITEMS, SUB_SPOTS, LEVEL_EXP, ROOM_GEAR } from './data.js?v=2';
import { T, buildRoom, roomAt } from './world.js?v=3';
import * as I from './items.js?v=3';
import { DROPS } from './drops.js?v=1';

export const PH = { G: 900, JUMP: 335, DJUMP: 300, WALK: 112, FALL: 400, SLIDE: 230, DASH: 210, BAT: 125, MIST: 80, SWIM: 170, W: 10, H: 28, HC: 14 };
const roomCache = {};
export const getRoom = (id) => (roomCache[id] ||= buildRoom(id));

function mkRng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ------------------------------------------------------------------ new game / save
export const BAG_MAX = 60, STASH_MAX = 120;
const emptyEq = () => Object.fromEntries(I.SLOTS.map((s) => [s, null]));
export function newPlayer() {
  const eq = emptyEq();
  eq.weapon = I.makeItem('shortsword', 'n', 1, () => 0.99); eq.armor = I.makeItem('quilted', 'n', 1, () => 0.99);
  return {
    x: 0, y: 0, w: PH.W, h: PH.H, vx: 0, vy: 0, face: 1, ground: false, jumps: 0, crouch: false,
    atkT: 0, atkDur: 0, swing: 0, slideT: 0, dashT: 0, hurtT: 0, inv: 0, bat: false, anim: 0, dropT: 0, coyote: 0, jumpBuf: 0,
    lv: 1, exp: 0, hp: 80, mhp: 80, mp: 20, mmp: 20, hearts: 10, mhearts: 30, gold: 0,
    bhp: 72, bmp: 12, bhearts: 30, points: 0,
    str: 6, con: 4, int: 4, lck: 5, eq, bag: [], stash: [], gems: {},
    items: { potion: 2 }, relics: {}, kills: 0,
  };
}
export function newState(seed = Date.now()) {
  const S = {
    p: newPlayer(), roomId: null, R: null, ents: [], shots: [], eshots: [], drops: [], fx: [], texts: [], props: [],
    flags: { taken: {}, boss: {}, seen: {}, visited: {}, broken: {} }, time: 0, sealed: false, boss: null, ev: [], cam: { x: 0, y: 0 },
    shake: 0, rnd: mkRng(seed), saveRoom: 'r1', deaths: 0, playTime: 0, over: false, won: false, fade: 0,
  };
  loadRoom(S, 'r1', null);
  const r = S.R; S.p.x = 3 * TILE; S.p.y = r.floorY(0) * TILE - PH.H;
  return S;
}
// ------------------------------------------------------------------ stats from level, attributes and equipment
// Recomputed whenever the equipment or attributes change (memoised by a key); also sets mhp / mmp / mhearts.
const PER_ITEM = new Set(['ed', 'edef', 'maxd', 'mind', 'def', 'reach']);
export function stats(p) {
  const key = `${p.lv}|${p.str}|${p.con}|${p.int}|${p.lck}|${p.bhp}|${p.bmp}|${p.bhearts}|${I.SLOTS.map((s) => (p.eq[s] ? p.eq[s].u + (p.eq[s].g || []).join('') : '-')).join(',')}`;
  if (p._sk === key) return p._st;
  const m = {}, add = (k, v) => { m[k] = (m[k] || 0) + v; };
  const setCount = {};
  let weapon = null, def = 0, blk = 0;
  for (const s of I.SLOTS) {
    const it = p.eq[s]; if (!it) continue;
    const B = I.BASES[it.b], base = I.itemBase(it), perItem = B.min != null || (B.def != null && B.c !== 'ring' && B.c !== 'amulet');
    if (s === 'weapon') weapon = base;
    if (base.def != null && B.c !== 'ring' && B.c !== 'amulet') def += base.def;
    if (s === 'shield') blk += base.blk;
    for (const [k, v] of I.modsOf(it)) if (!(perItem && PER_ITEM.has(k) && s !== 'sub')) add(k, v);
    if (it.q === 'set') setCount[I.SET_ITEMS[it.id].set] = (setCount[I.SET_ITEMS[it.id].set] || 0) + 1;
  }
  for (const [sid, n] of Object.entries(setCount)) for (const [k, mods] of Object.entries(I.SETS[sid].bonus)) if (n >= (k === 'full' ? I.SETS[sid].pieces.length : +k)) for (const [s, v] of mods) add(s, v);
  const g = (k) => m[k] || 0;
  const str = p.str + g('str') + g('all'), con = p.con + g('con') + g('all'), int = p.int + g('int') + g('all'), lck = p.lck + g('lck') + g('all');
  const w = weapon || { min: 1, max: 3, time: 0.24, reach: 18 };
  const ed = g('ed');
  const dmin = Math.round(w.min * (1 + ed / 100)) + g('mind') + str, dmax = Math.max(dmin, Math.round(w.max * (1 + ed / 100)) + g('maxd') + str);
  const res = (k) => Math.min(75, g('res_' + k) + g('res_all'));
  const st = {
    str, con, int, lck, dmin, dmax, atk: Math.round((dmin + dmax) / 2), time: Math.max(w.time * 0.45, w.time / (1 + g('ias') / 100)), reach: w.reach + (weapon ? 0 : 0), two: !!w.two,
    def: Math.round(con + def * (1 + (weapon ? 0 : 0)) + g('def')), block: p.eq.shield ? Math.min(75, blk + g('block')) : 0,
    res: { fire: res('fire'), cold: res('cold'), ltng: res('ltng'), pois: res('pois') },
    elem: { fire: g('fire'), cold: g('cold'), ltng: g('ltng'), pois: g('pois'), holy: g('holy') },
    ls: g('ls'), ms: g('ms'), ds: Math.min(75, g('ds')), crush: Math.min(60, g('crush')), bleed: g('bleed'), stun: Math.min(60, g('stun')), freeze: Math.min(50, g('freeze')), ignore: g('ignore') > 0, kb: g('kb') > 0, crit: 4 + lck * 0.4 + g('crit'), frw: Math.min(60, g('frw')), mf: g('mf') + lck, gf: g('gf'),
    hpr: g('hpr'), mpr: g('mpr') + 1 + int * 0.05, thorns: g('thorns'), dr: g('dr'), exp: g('exp'), undead: g('undead') + (weapon && ['mace', 'hammer'].includes(I.BASES[p.eq.weapon.b].c) ? 50 : 0),
    subd: g('subd') + int, subc: g('subc'), jump: g('jump'), chain: g('chain'), reflect: g('reflect'), hok: g('hok'), heok: g('heok'), sets: setCount,
    mhp: Math.max(10, p.bhp + con * 2 + g('hp')), mmp: Math.max(5, p.bmp + int * 2 + g('mp')), mhearts: p.bhearts + g('hearts'),
  };
  p._sk = key; p._st = st;
  p.mhp = st.mhp; p.mmp = st.mmp; p.mhearts = st.mhearts;
  p.hp = Math.min(p.hp, p.mhp); p.mp = Math.min(p.mp, p.mmp); p.hearts = Math.min(p.hearts, p.mhearts);
  return st;
}
const SAVE_KEYS = ['lv', 'exp', 'hp', 'mhp', 'mp', 'mmp', 'hearts', 'mhearts', 'gold', 'str', 'con', 'int', 'lck', 'bhp', 'bmp', 'bhearts', 'points', 'eq', 'bag', 'stash', 'gems', 'items', 'relics', 'kills'];
export function toSave(S) {
  const p = {}; for (const k of SAVE_KEYS) p[k] = JSON.parse(JSON.stringify(S.p[k]));
  return { v: 2, p, flags: S.flags, room: S.saveRoom, deaths: S.deaths, playTime: S.playTime, world: S.world || 'normal' };
}
// version 1 saves kept gear as names and counts: turn them into items
function migrate(d) {
  const p = d.p; if (d.v >= 2) return d;
  const eq = emptyEq(), bag = [], rnd = () => 0.5;
  const mk = (id) => { const b = I.LEGACY[id]; if (!b) return null; const it = I.makeItem(b, id === 'moonblade' ? 'u' : 'n', 5, rnd, { id: 'moonblade' }); if (id === 'luckring' || id === 'powerring' || id === 'ironring') { it.q = 'm'; it.a = [[{ luckring: 'lck', powerring: 'str', ironring: 'con' }[id], 2, 0]]; } delete it.s; return it; };
  for (const [slot, id] of Object.entries(p.equip || {})) { if (!id) continue; const it = mk(id); if (it) eq[slot === 'acc' ? 'ring1' : slot] = it; }
  for (const [id, n] of Object.entries(p.gear || {})) { const worn = Object.values(p.equip || {}).filter((x) => x === id).length; for (let k = worn; k < n; k++) { const it = mk(id); if (it) bag.push(it); } }
  if (p.sub) eq.sub = I.makeItem(I.LEGACY_SUB[p.sub] || 'knives', 'n', 3, rnd);
  const con = p.con || 4;
  Object.assign(p, { eq, bag, stash: [], gems: {}, int: 4, points: 0, bhp: (p.mhp || 80) - con * 2, bmp: (p.mmp || 20) - 8, bhearts: p.mhearts || 30 });
  delete p.equip; delete p.gear; delete p.sub;
  d.v = 2; return d;
}
export function fromSave(d0, seed = Date.now()) {
  const d = migrate(JSON.parse(JSON.stringify(d0)));
  const S = newState(seed);
  Object.assign(S.p, d.p);
  for (const s of I.SLOTS) if (S.p.eq[s] === undefined) S.p.eq[s] = null;
  S.flags = d.flags; S.flags.visited ||= {}; S.flags.seen ||= {};
  S.deaths = d.deaths || 0; S.playTime = d.playTime || 0; S.saveRoom = d.room || 'r1';
  stats(S.p); S.p.hp = S.p.mhp; S.p.mp = S.p.mmp;
  // the gallery: everything you own counts as found (saves from before the gallery)
  for (const it of [...Object.values(S.p.eq), ...S.p.bag, ...S.p.stash]) if (it) noteFound(S, it);
  for (const g of Object.keys(S.p.gems || {})) (S.flags.found ||= {})['gem:' + g.replace(/\d/, '')] = 1;
  respawnAtSave(S);
  return S;
}
export function respawnAtSave(S) {
  loadRoom(S, S.saveRoom, null);
  const sp = S.props.find((q) => q.kind === 'save') || { x: 3 * TILE };
  sp.used = true;
  S.p.x = sp.x - PH.W / 2; S.p.y = S.R.floorY(0) * TILE - PH.H; S.p.vx = S.p.vy = 0;
  Object.assign(S.p, { bat: false, h: PH.H, hurtT: 0, inv: 1, atkT: 0, slideT: 0, dashT: 0 });
}

// ------------------------------------------------------------------ tiles & collision
export function tileAt(S, tx, ty) {
  const R = S.R;
  if (tx < 0 || tx >= R.W) { const yy = Math.min(R.H - 1, Math.max(0, ty)); return R.tiles[yy][tx < 0 ? 0 : R.W - 1] === T.AIR ? T.AIR : T.SOLID; }
  if (ty < 0) return R.tiles[0][tx] === T.SOLID ? T.SOLID : T.AIR;
  if (ty >= R.H) return R.tiles[R.H - 1][tx] === T.SOLID ? T.SOLID : T.AIR;
  return R.tiles[ty][tx];
}
const solidT = (S, t, mist) => t === T.SOLID || t === T.BREAK || (t === T.SEAL && S.sealed) || (t === T.GRATE && !mist);
function solidAt(S, px, py) { return solidT(S, tileAt(S, Math.floor(px / TILE), Math.floor(py / TILE))); }
function boxSolid(S, x, y, w, h, mist) {
  for (let ty = Math.floor(y / TILE); ty <= Math.floor((y + h - 0.01) / TILE); ty++)
    for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 0.01) / TILE); tx++) if (solidT(S, tileAt(S, tx, ty), mist)) return true;
  return false;
}
// move a body with tile collisions; platforms only catch from above. Returns {hitX, hitY, landed}
function moveBody(S, b0, dt, opts = {}) {
  const mist = b0 === S.p && !!S.p.mist;
  const b = b0, boxSolid0 = boxSolid, boxS = (S2, x, y, w, h) => boxSolid0(S2, x, y, w, h, mist);
  return moveBodyWith(S, b, dt, opts, boxS);
}
function moveBodyWith(S, b, dt, opts, boxSolid) {
  const res = { hitX: false, hitY: false, landed: false };
  let dx = b.vx * dt;
  const stepX = Math.sign(dx);
  while (dx !== 0) {
    const m = Math.abs(dx) > 4 ? 4 * stepX : dx;
    if (boxSolid(S, b.x + m, b.y, b.w, b.h)) {
      // nudge to the wall
      let k = 0; while (k < 8 && !boxSolid(S, b.x + stepX * 0.5, b.y, b.w, b.h)) { b.x += stepX * 0.5; k++; }
      res.hitX = true; b.vx = 0; break;
    }
    b.x += m; dx -= m;
  }
  let dy = b.vy * dt;
  const stepY = Math.sign(dy);
  while (dy !== 0) {
    const m = Math.abs(dy) > 4 ? 4 * stepY : dy;
    const bottom = b.y + b.h;
    let block = boxSolid(S, b.x, b.y + m, b.w, b.h);
    if (!block && m > 0 && !opts.noPlat) {
      // one-way platforms: crossing a tile top from above
      const ty = Math.floor((bottom + m) / TILE);
      if (Math.floor((bottom - 0.01) / TILE) < ty || bottom <= ty * TILE) {
        for (let tx = Math.floor(b.x / TILE); tx <= Math.floor((b.x + b.w - 0.01) / TILE); tx++)
          if (tileAt(S, tx, ty) === T.PLAT && bottom <= ty * TILE + 0.01) { block = true; b.y = ty * TILE - b.h; break; }
      }
      if (block) { res.hitY = true; res.landed = true; b.vy = 0; break; }
    }
    if (block) {
      if (m > 0) { b.y = Math.floor((b.y + b.h + m) / TILE) * TILE - b.h; let k = 0; while (k < 32 && boxSolid(S, b.x, b.y, b.w, b.h)) { b.y -= 0.5; k++; } res.landed = true; }
      else { let k = 0; while (k < 8 && !boxSolid(S, b.x, b.y - 0.5, b.w, b.h)) { b.y -= 0.5; k++; } }
      res.hitY = true; b.vy = 0; break;
    }
    b.y += m; dy -= m;
  }
  return res;
}
function onGroundCheck(S, b, noPlat) {
  const y = b.y + b.h + 0.5, ty = Math.floor(y / TILE);
  for (let tx = Math.floor(b.x / TILE); tx <= Math.floor((b.x + b.w - 0.01) / TILE); tx++) {
    const t = tileAt(S, tx, ty);
    if (solidT(S, t)) return true;
    if (!noPlat && t === T.PLAT && Math.abs(b.y + b.h - ty * TILE) < 1) return true;
  }
  return false;
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ------------------------------------------------------------------ rooms
export function worldCell(S) { const p = S.p, r = S.R.room; return { cx: r.x + Math.floor((p.x + p.w / 2) / (CW * TILE)), cy: r.y + Math.floor((p.y + p.h / 2) / (CH * TILE)) }; }
export function loadRoom(S, id, entry) {
  const R = getRoom(id), r = R.room, area = AREAS[r.area];
  for (const [x, y] of R.breakCells || []) { const want = S.flags.broken && S.flags.broken[id] ? T.AIR : T.BREAK; if (R.tiles[y][x] !== want) { R.tiles[y][x] = want; R.dirty = true; } }
  S.roomId = id; S.R = R; S.ents = []; S.shots = []; S.eshots = []; S.drops = []; S.props = []; S.texts = []; S.sealed = false; S.boss = null;
  S.fade = 0.25; S.freeze = 0; S.world = r.world || 'normal';
  const rnd = S.rnd, lv = areaLevel(S, r.area); S.mlvl = lv;
  const spot = (cx, row, f) => ({ x: (cx * CW + 3 + f * (CW - 6)) * TILE, y: R.floorY(row) * TILE });
  const entryCell = entry ? { cx: Math.floor(entry.x / (CW * TILE)), row: Math.floor(entry.y / (CH * TILE)) } : null;
  // candles: two per cell
  for (let row = 0; row < r.h; row++) for (let cx = 0; cx < r.w; cx++) for (const f of [0.18, 0.82]) {
    const s = spot(cx, row, f + (rnd() - 0.5) * 0.08);
    const cd = { kind: 'candle', x: s.x, y: s.y - 52, w: 8, h: 14 };
    const inWall = (q) => { for (let ty = Math.floor(q.y / TILE); ty <= Math.floor((q.y + q.h) / TILE); ty++) for (let tx = Math.floor(q.x / TILE); tx <= Math.floor((q.x + q.w) / TILE); tx++) { const t = R.tiles[ty]?.[tx]; if (t === T.SOLID || t === T.BREAK || t === undefined) return true; } return false; };
    for (let k = 1; k <= 6 && inWall(cd); k++) cd.x = s.x + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * TILE;   // step out of walls (e.g. a crawlspace)
    if (!inWall(cd)) S.props.push(cd);
  }
  if (SUB_SPOTS[id]) { const c = S.props.filter((q) => q.kind === 'candle')[1]; if (c) { c.sub = SUB_SPOTS[id]; c.big = true; } }
  if (r.special === 'save') { const s = spot(0, 0, 0.5); S.props.push({ kind: 'save', x: s.x, y: s.y - 40, w: 20, h: 40 }); }
  if (r.special === 'shop') { const s = spot(0, 0, 0.62); S.props.push({ kind: 'shop', x: s.x, y: s.y - 30, w: 16, h: 30 }); }
  if (r.special === 'warp') { const s = spot(0, 0, 0.5); S.props.push({ kind: 'warp', x: s.x - 16, y: s.y - 30, w: 32, h: 30 }); (S.flags.warps ||= {})[id] = 1; }
  // the way into the Reversed Castle (and back out)
  if ((id === 't5' && S.flags.boss.count && S.p.relics.moonEye) || id === 'R:r1') { const s = spot(id === 't5' ? 0 : r.w - 1, 0, 0.5); S.props.push({ kind: 'portal', to: id === 't5' ? 'R:r1' : 't5', x: s.x - 12, y: s.y - 44, w: 24, h: 44 }); }
  if (r.item && !S.flags.taken[id]) { const s = spot(r.w - 1, r.h - 1, 0.5); S.props.push(r.item === 'chest' ? { kind: 'chest', x: s.x - 10, y: s.y - 16, w: 20, h: 16 } : { kind: 'item', item: r.item, gear: ROOM_GEAR[r.item] ? 1 : 0, x: s.x - 6, y: s.y - 34, w: 12, h: 12, by: s.y - 34 }); }
  if (r.relic && !S.flags.taken[id]) { const s = spot(0, 0, 0.5); S.props.push({ kind: 'relic', relic: r.relic, x: s.x - 7, y: s.y - 40, w: 14, h: 14, by: s.y - 40 }); }
  // enemies
  if (r.boss && !S.flags.boss[r.boss]) { spawnBoss(S, r.boss, lv); }
  else if (!r.special && !r.boss) {
    const n = r.enemies ?? Math.min(7, Math.round(r.w * r.h * 1.6));
    const cells = [];
    for (let row = 0; row < r.h; row++) for (let cx = 0; cx < r.w; cx++) if (!entryCell || cx !== entryCell.cx || row !== entryCell.row || r.w * r.h === 1) cells.push([cx, row]);
    for (let i = 0; i < n && cells.length; i++) {
      const [cx, row] = cells[Math.floor(rnd() * cells.length)];
      const kind = area.enemies[Math.floor(rnd() * area.enemies.length)];
      let s = spot(cx, row, 0.15 + rnd() * 0.7);
      if (entryCell && r.w * r.h === 1) s = spot(cx, row, entry.x < CW * TILE / 2 ? 0.85 : 0.15);
      spawnEnemy(S, kind, s.x, s.y, lv);
    }
    promoteMonsters(S, rnd);
  }
  const cam = S.cam; cam.x = cam.y = null;
  S.ev.push({ t: 'room', id, area: r.area });
}
// monster level: the area's level (+25 in the Reversed Castle); stats grow with it
export function areaLevel(S, area) { return (AREAS[area].lv || 1) + (S.world === 'rev' ? 25 : 0); }
export function scale(base, m) {
  const k = m - 1;
  return { hp: Math.round(base.hp * (1 + 0.16 * k + 0.0025 * k * k)), atk: Math.round(base.atk * (1 + 0.03 * k) + 1.5 * k), def: base.def + Math.floor(k / 2), exp: Math.round(base.exp * (1 + 0.3 * k + 0.004 * k * k)) };
}
// Diablo II style champions (blue) and uniques (gold, with a name and special powers)
export const MMODS = {
  fast: { zh: '極速', en: 'Extra Fast' }, strong: { zh: '極強', en: 'Extra Strong' }, stone: { zh: '石膚', en: 'Stone Skin' },
  fireE: { zh: '火焰強化', en: 'Fire Enchanted' }, coldE: { zh: '冰冷強化', en: 'Cold Enchanted' }, ltngE: { zh: '閃電強化', en: 'Lightning Enchanted' },
  teleport: { zh: '瞬移', en: 'Teleportation' }, vamp: { zh: '吸血', en: 'Vampiric' },
};
const UN1 = [['屍', 'Gloom'], ['骨', 'Bone'], ['血', 'Blood'], ['暗', 'Dark'], ['腐', 'Rot'], ['鐵', 'Iron'], ['夜', 'Night'], ['惡', 'Vile'], ['冥', 'Grave'], ['霜', 'Frost'], ['灰', 'Ash'], ['毒', 'Bile']];
const UN2 = [['爪', 'claw'], ['牙', 'fang'], ['魂', 'soul'], ['咬', 'bite'], ['影', 'shade'], ['鴉', 'raven'], ['刃', 'blade'], ['顱', 'skull'], ['心', 'heart'], ['角', 'horn']];
const UN3 = [['飢餓者', 'the Hungry'], ['腐爛者', 'the Rotten'], ['狂怒者', 'the Wrathful'], ['無情者', 'the Merciless'], ['古老者', 'the Ancient'], ['不死者', 'the Undying'], ['冰冷者', 'the Cold'], ['屠夫', 'the Butcher'], ['低語者', 'the Whisperer'], ['吞噬者', 'the Devourer']];
function applyMod(e, m) {
  e.mods.push(m);
  if (m === 'fast') e.spd = 1.5;
  if (m === 'strong') e.atk = Math.round(e.atk * 1.5);
  if (m === 'stone') { e.def += 8 + e.mlvl; e.res.phys = Math.max(e.res.phys || 0, 0.3); }
  if (m === 'fireE' || m === 'coldE' || m === 'ltngE') { const el = { fireE: 'fire', coldE: 'cold', ltngE: 'ltng' }[m]; e.elem = el; e.res[el] = 0.75; }
}
// the elite form (強敵): a bigger, much tougher version of the species, with its own drops
function makeElite(S, e, rnd) {
  e.tier = 'elite'; e.mods = [];
  e.bw = e.w; e.bh = e.h; const k = 1.25;
  e.x -= (e.w * (k - 1)) / 2; e.y -= e.h * (k - 1); e.hy = e.y; e.w = Math.round(e.w * k); e.h = Math.round(e.h * k);
  e.hp = e.mhp = Math.round(e.mhp * 6); e.atk = Math.round(e.atk * 1.6); e.def += 2 + Math.floor(e.mlvl / 2); e.exp = Math.round(e.exp * 8);
  e.name = { zh: '強敵・' + ENEMIES[e.kind].zh, en: 'Elite ' + ENEMIES[e.kind].en };
  applyMod(e, ['fast', 'strong', 'stone', 'vamp'][Math.floor(rnd() * 4)]);
}
export function promote(S, e, tier, rnd = S.rnd) {
  if (tier === 'elite') { makeElite(S, e, rnd); return; }
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  e.tier = tier; e.mods = [];
  const k = tier === 'unique' ? 4 : 2.5;
  e.hp = e.mhp = Math.round(e.mhp * k); e.atk = Math.round(e.atk * (tier === 'unique' ? 1.4 : 1.25)); e.exp = Math.round(e.exp * (tier === 'unique' ? 6 : 3));
  if (tier === 'unique') {
    const a = pick(UN1), b = pick(UN2), c = pick(UN3);
    e.name = { zh: a[0] + b[0] + '．' + c[0], en: a[1] + b[1] + ' ' + c[1] };
    const pool = Object.keys(MMODS); const n = 1 + Math.floor(rnd() * (S.world === 'rev' ? 3 : 2));
    for (let i = 0; i < n; i++) { const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; applyMod(e, m); }
  } else if (rnd() < 0.5) applyMod(e, pick(['fast', 'strong', 'stone']));
}
function promoteMonsters(S, rnd) {
  const list = S.ents.filter((e) => !e.boss && e.kind !== 'bat'); if (!list.length) return;
  const boost = S.world === 'rev' ? 1.6 : 1;
  // sometimes one of the room's monsters is its elite form instead (not one hanging from the ceiling)
  const can = list.filter((e) => e.st !== 'hang' && DROPS[e.kind]);
  if (can.length && rnd() < 0.1 * boost) { const e = can[Math.floor(rnd() * can.length)]; makeElite(S, e, rnd); S.ev.push({ t: 'toast', key: 'eliteHere' }); return; }
  if (rnd() < 0.07 * boost) { const u = list[Math.floor(rnd() * list.length)]; promote(S, u, 'unique', rnd); for (const e of list) if (e !== u) { e.hp = e.mhp = Math.round(e.mhp * 1.3); } }
  else if (list.length >= 2 && rnd() < 0.1 * boost) for (const e of list.slice(0, 3)) promote(S, e, 'champion', rnd);
}
export function spawnEnemy(S, kind, x, floorPx, lv) {
  const b = ENEMIES[kind], sc = scale(b, lv);
  const e = { kind, x: x - b.w / 2, y: floorPx - b.h, w: b.w, h: b.h, vx: 0, vy: 0, hp: sc.hp, mhp: sc.hp, atk: sc.atk, def: sc.def, exp: sc.exp, lv, mlvl: lv,
    face: -1, t: S.rnd() * 2, st: 'idle', flash: 0, fly: !!b.fly, phase: !!b.phase, drops: b.drops, hx: x, hy: floorPx - b.h, swingHit: -1, kb: 0,
    undead: !!b.undead, res: { ...(b.res || {}) }, elem: b.elem || 'phys', tier: 'normal', mods: [], spd: 1, heavy: !!b.heavy };
  if (e.fly) { e.y = floorPx - 70 - S.rnd() * 40; e.hy = e.y; }
  if (kind === 'bat') { e.y = (Math.floor((floorPx - 1) / (CH * TILE)) * CH + 1) * TILE + 1; e.hy = e.y; e.st = 'hang'; }
  if (kind === 'zombie') { e.st = 'under'; e.t = 0.5 + S.rnd() * 2; }
  if (kind === 'medusa') { e.st = 'wave'; e.vx = (S.rnd() < 0.5 ? -1 : 1) * 70; e.face = Math.sign(e.vx); }
  if (b.ai === 'dropper') { e.y = (Math.floor((floorPx - 1) / (CH * TILE)) * CH + 1) * TILE + 1; e.st = 'hang'; }
  if (b.ai === 'mimic') { e.st = 'disguise'; }
  S.ents.push(e);
  return e;
}
// boss strength: the original five keep their numbers (stronger in the Reversed Castle); new bosses scale with the level
export function bossStats(S, kind, m) {
  const b = BOSSES[kind];
  if (b.body) { const k = b.k || 1; return { hp: Math.round((180 * m + 250) * k), atk: Math.round(12 + 2.4 * m), def: 1 + Math.floor(m / 3), exp: Math.round(60 * m ** 1.35 * k) }; }
  if (S.world !== 'rev') return b;
  const r = scale(b, m), base = scale(b, b.lv);
  return { hp: Math.round(b.hp * r.hp / base.hp * 1.4), atk: b.atk + r.atk - base.atk, def: b.def + r.def - base.def, exp: Math.round(b.exp * r.exp / base.exp) };
}
function spawnBoss(S, kind, lv) {
  const b = BOSSES[kind], R = S.R, bs = bossStats(S, kind, lv + 1);
  const fy = R.floorY(0) * TILE;
  const e = { kind, boss: true, x: R.W * TILE * 0.7 - b.w / 2, y: fy - b.h, w: b.w, h: b.h, vx: 0, vy: 0, hp: bs.hp, mhp: bs.hp, atk: bs.atk, def: bs.def, exp: bs.exp, mlvl: lv + 1,
    face: -1, t: 1.6, st: 'intro', flash: 0, fly: kind === 'greatbat' || kind === 'witch' || !!b.fly, swingHit: -1, phase2: false, n: 0, vis: 1, res: {}, elem: b.elem || 'phys', undead: kind === 'reaper' || kind === 'golem' };
  if (b.fly && b.body) e.y = fy - 92;
  if (kind === 'greatbat') e.y = 60;
  if (kind === 'witch') e.y = fy - 90;
  S.ents.push(e); S.boss = e;
}
export function enterBossFight(S) {
  if (!S.boss || S.sealed) return;
  S.sealed = true; S.ev.push({ t: 'boss', id: S.boss.kind });
}

// ------------------------------------------------------------------ helpers
function sfx(S, id) { S.ev.push({ t: 'sfx', id }); }
function addText(S, x, y, txt, col) { S.texts.push({ x, y, txt: String(txt), col, t: 0.9 }); }
function burst(S, x, y, col, n = 10, spd = 80) {
  for (let i = 0; i < n; i++) { const a = S.rnd() * Math.PI * 2, v = spd * (0.3 + S.rnd()); S.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0.5 + S.rnd() * 0.3, col }); }
}
export function expToNext(p) { return LEVEL_EXP(p.lv); }
export const LEVEL_CAP = 99, POINTS_PER_LEVEL = 3;
function gainExp(S, n) {
  const p = S.p; p.exp += Math.round(n * (1 + stats(p).exp / 100));
  while (p.exp >= expToNext(p) && p.lv < LEVEL_CAP) {
    p.exp -= expToNext(p); p.lv++;
    p.bhp += 9; p.bmp += 3; p.str += 1; p.con += 1; if (p.lv % 2) { p.lck += 1; p.int += 1; } p.points += POINTS_PER_LEVEL;
    const st = stats(p); p.hp = Math.min(st.mhp, p.hp + 30); p.mp = Math.min(st.mmp, p.mp + 10);
    S.ev.push({ t: 'levelup', lv: p.lv }); sfx(S, 'level');
    addText(S, p.x + p.w / 2, p.y - 10, 'LEVEL UP', '#ffe070');
  }
  if (p.lv >= LEVEL_CAP) p.exp = 0;
}
export function spendPoint(S, attr) {
  const p = S.p; if (p.points <= 0 || !['str', 'con', 'int', 'lck'].includes(attr)) return false;
  p[attr]++; p.points--; stats(p); return true;
}
export function giveItem(S, id, n = 1) {
  const p = S.p, it = ITEMS[id];
  if (it.kind === 'up') {
    if (id === 'hpup') p.bhp += 20; else if (id === 'mpup') p.bmp += 10; else p.bhearts += 10;
    const st = stats(p); if (id === 'hpup') p.hp = st.mhp; else if (id === 'mpup') p.mp = st.mmp; else p.hearts = st.mhearts;
  } else if (it.kind === 'use') p.items[id] = (p.items[id] || 0) + n;
}
// a rolled item into the bag (false when the bag is full)
// the gallery remembers every base, unique and set piece you have owned
export function noteFound(S, it) { const f = (S.flags.found ||= {}); f[it.b] = 1; if (it.q === 'u' || it.q === 'set') f[it.q + ':' + it.id] = 1; }
export function giveGear(S, it) {
  const p = S.p; if (p.bag.length >= BAG_MAX) return false;
  p.bag.push(it); noteFound(S, it); return true;
}
export function useItem(S, id) {
  const p = S.p, it = ITEMS[id];
  if (!p.items[id] || it.kind !== 'use') return false;
  if (id === 'warprune') { if (S.boss && S.sealed) return false; p.items[id]--; if (!p.items[id]) delete p.items[id]; S.ev.push({ t: 'warp' }); respawnAtSave(S); sfx(S, 'save'); return true; }
  if (it.heal && p.hp >= p.mhp && !(it.mp && p.mp < p.mmp)) return false;
  if (!it.heal && it.mp && p.mp >= p.mmp) return false;
  if (it.cure && !it.heal && !p.poisoned) return false;
  p.items[id]--; if (!p.items[id]) delete p.items[id];
  if (it.heal) { const h = Math.min(it.heal, p.mhp - p.hp); p.hp += h; addText(S, p.x + p.w / 2, p.y, '+' + h, '#7dff9a'); }
  if (it.mp) p.mp = Math.min(p.mmp, p.mp + it.mp);
  if (it.cure) p.poisoned = 0;
  sfx(S, 'heal'); burst(S, p.x + p.w / 2, p.y + 14, '#9effc0', 12, 50);
  return true;
}
// equip an item from the bag (ring: first free ring slot); returns an error key or null
export function canWear(S, it) { return I.reqLevel(it) <= S.p.lv; }
export function equipItem(S, uidOrIt, slotWanted) {
  const p = S.p, idx = p.bag.findIndex((x) => x === uidOrIt || x.u === uidOrIt), it = p.bag[idx];
  if (!it) return 'none';
  if (!canWear(S, it)) return 'level';
  let slot = I.slotOf(it);
  if (slot === 'ring') slot = slotWanted === 'ring2' || (p.eq.ring1 && !p.eq.ring2 && slotWanted !== 'ring1') ? 'ring2' : 'ring1';
  const out = [];
  if (p.eq[slot]) out.push(p.eq[slot]);
  // two-handed weapons and shields do not mix
  if (slot === 'weapon' && I.BASES[it.b].two && p.eq.shield) out.push(p.eq.shield);
  if (slot === 'shield' && p.eq.weapon && I.BASES[p.eq.weapon.b].two) out.push(p.eq.weapon);
  if (p.bag.length - 1 + out.length > BAG_MAX) return 'full';
  p.bag.splice(idx, 1);
  for (const o of out) { for (const s of I.SLOTS) if (p.eq[s] === o) p.eq[s] = null; p.bag.push(o); }
  p.eq[slot] = it; stats(p);
  return null;
}
export function unequip(S, slot) {
  const p = S.p, it = p.eq[slot]; if (!it) return 'none';
  if (p.bag.length >= BAG_MAX) return 'full';
  p.eq[slot] = null; p.bag.push(it); stats(p); return null;
}
export function dropItem(S, it) { const p = S.p, i = p.bag.indexOf(it); if (i < 0) return false; p.bag.splice(i, 1); dropAt(S, p.x + p.w / 2, p.y + 8, { k: 'gear', it }); return true; }
export function toStash(S, it) { const p = S.p, i = p.bag.indexOf(it); if (i < 0 || p.stash.length >= STASH_MAX) return false; p.bag.splice(i, 1); p.stash.push(it); return true; }
export function fromStash(S, it) { const p = S.p, i = p.stash.indexOf(it); if (i < 0 || p.bag.length >= BAG_MAX) return false; p.stash.splice(i, 1); p.bag.push(it); return true; }
// put a gem into a socket (forever, like Diablo II)
export function socketGem(S, it, gem) {
  const p = S.p; if (!it.s || (it.g || []).length >= it.s || !p.gems[gem]) return false;
  (it.g ||= []).push(gem); p.gems[gem]--; if (!p.gems[gem]) delete p.gems[gem]; stats(p); sfx(S, 'item'); return true;
}
// three gems of one kind and grade → one of the next grade
export const GEM_COMBINE_COST = (k) => 60 * k * k;
export function combineGems(S, gem) {
  const p = S.p, k = +gem.slice(-1); if (k >= 4 || (p.gems[gem] || 0) < 3 || p.gold < GEM_COMBINE_COST(k)) return false;
  p.gems[gem] -= 3; if (!p.gems[gem]) delete p.gems[gem]; p.gold -= GEM_COMBINE_COST(k);
  const up = gem.slice(0, -1) + (k + 1); p.gems[up] = (p.gems[up] || 0) + 1; sfx(S, 'buy'); return true;
}
// the shop: potions always; a few rolled items that change when a new area level is reached; gambling
export function shopLevel(S) { return Math.max(1, Math.min(60, S.p.lv)); }
export function shopStock(S) {
  const lvl = shopLevel(S), key = 'stock' + Math.floor(lvl / 3);
  if (S.flags.stockKey !== key || !S.flags.stock) {
    const rnd = mkRng(lvl * 7919 + (S.flags.stockN = (S.flags.stockN || 0) + 1)); S.flags.stockKey = key;
    S.flags.stock = Array.from({ length: 9 }, (_, i) => I.rollDrop(lvl, rnd, { boost: 1.5, filter: (b) => (i < 6 ? b.c !== 'sub' : b.c === 'sub' || b.c === 'ring' || b.c === 'amulet') })).filter((it) => it.q !== 'u' && it.q !== 'set');
  }
  return S.flags.stock;
}
export const buyPrice = (it) => I.itemValue(it);
export const sellValue = (it) => Math.max(1, Math.floor(I.itemValue(it) / 5));
export function buy(S, id) {
  const p = S.p, it = ITEMS[id];
  if (p.gold < it.price) return false;
  p.gold -= it.price; giveItem(S, id); sfx(S, 'buy');
  return true;
}
export function buyGear(S, it) {
  const p = S.p, price = buyPrice(it); if (p.gold < price || p.bag.length >= BAG_MAX) return false;
  p.gold -= price; S.flags.stock = S.flags.stock.filter((x) => x !== it); p.bag.push(it); noteFound(S, it); sfx(S, 'buy'); return true;
}
export const sellPrice = (id) => Math.floor((ITEMS[id].price || 100) / 3);
export function sell(S, id) {
  const p = S.p; if (!p.items[id]) return false;
  p.items[id]--; if (!p.items[id]) delete p.items[id];
  p.gold += sellPrice(id); sfx(S, 'buy');
  return true;
}
export function sellGear(S, it) { const p = S.p, i = p.bag.indexOf(it); if (i < 0) return false; p.bag.splice(i, 1); p.gold += sellValue(it); sfx(S, 'buy'); return true; }
// gambling (like Gheed): pay for a mystery item of a chosen kind; better odds than drops
export const GAMBLE = ['ring', 'amulet', 'helm', 'armor', 'shield', 'gloves', 'boots', 'cloak', 'sword', 'axe', 'mace', 'spear', 'katana', 'whip', 'sub'];
export const gamblePrice = (S, c) => Math.round((150 + shopLevel(S) * 45) * (c === 'ring' || c === 'amulet' ? 1.6 : 1));
export function gamble(S, c) {
  const p = S.p, price = gamblePrice(S, c); if (p.gold < price || p.bag.length >= BAG_MAX) return null;
  const lvl = Math.max(1, shopLevel(S) + Math.floor(S.rnd() * 6) - 2);
  const it = I.rollDrop(lvl, S.rnd, { boost: 2.5, filter: (b) => b.c === c || (c === 'sword' && b.c === 'greatsword') || (c === 'axe' && b.c === 'greataxe') || (c === 'mace' && b.c === 'hammer') });
  if (it.q === 'n' || it.q === 's') { const m = I.makeItem(it.b, 'm', it.l, S.rnd); Object.assign(it, m); }
  p.gold -= price; p.bag.push(it); noteFound(S, it); sfx(S, 'buy'); return it;
}

// ------------------------------------------------------------------ damage
// damage to the player: block (shield), resistances (elemental attacks), defence as a percentage against the
// attacker's level (like Diablo II), then flat damage reduction
export const RES_PENALTY = { normal: 0, rev: 40 };
function hurtPlayer(S, dmg, fromX, elem = 'phys', o = {}) {
  const p = S.p;
  if (p.inv > 0 || p.hp <= 0 || S.won || p.mist) return false;
  const st = stats(p), mlvl = o.lvl || S.mlvl || 1;
  if (st.block && !p.bat && p.atkT <= 0 && S.rnd() * 100 < st.block) {
    addText(S, p.x + p.w / 2, p.y - 4, L2('格擋', 'BLOCK'), '#c8d8ff'); sfx(S, 'block'); p.inv = 0.35;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 60;
    return 'block';
  }
  let d = dmg;
  if (elem !== 'phys') d *= 1 - Math.max(-100, Math.min(75, st.res[elem] - (RES_PENALTY[S.world || 'normal'] || 0))) / 100;
  else d *= 1 - st.def / (st.def + 20 + 8 * mlvl);
  d = Math.max(1, Math.round(d - st.dr));
  p.hp = Math.max(0, p.hp - d);
  addText(S, p.x + p.w / 2, p.y, d, { fire: '#ff8a3a', cold: '#7ac8ff', ltng: '#ffe85a', pois: '#7aff7a' }[elem] || '#ff6a6a');
  if (elem === 'pois') p.poisoned = Math.max(p.poisoned || 0, 3);
  p.inv = 1.1; S.shake = 0.18; sfx(S, 'hurt');
  if (!p.bat) {
    p.hurtT = 0.32; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 130; p.vy = -190; p.atkT = 0; p.slideT = 0; p.dashT = 0;
  }
  if (p.hp <= 0) { p.bat = false; p.mist = false; p.h = PH.H; p.w = PH.W; S.over = true; S.overT = 0; S.ev.push({ t: 'dead' }); sfx(S, 'dead'); }
  return true;
}
const L2 = (zh, en) => (S2lang() === 'zh' ? zh : en);
let S2lang = () => 'zh';
export function setLangFn(f) { S2lang = f; }
// a damage packet from the weapon (or a sub-weapon / a spell): physical plus elements
export function weaponPacket(S, mult = 1) {
  const st = stats(S.p), r = S.rnd;
  const pk = { phys: (st.dmin + r() * (st.dmax - st.dmin)) * mult };
  for (const k of I.ELEM) if (st.elem[k]) pk[k] = st.elem[k] * (k === 'ltng' ? 0.1 + r() * 0.9 : k === 'pois' ? 1 : 0.5 + r() * 0.5) * (k === 'pois' ? 1 : mult);
  return pk;
}
// a short label over the enemy for a special effect (crush, paralyze...)
function procText(S, e, txt, col) { addText(S, e.x + e.w / 2, e.y - 12, txt, col); }
function hitEnemy(S, e, pkIn, fromX, kind) {
  if (e.dead || e.hp <= 0 || (e.boss && e.vis === 0) || e.st === 'under') return false;
  const p = S.p, st = stats(p), pk = typeof pkIn === 'number' ? { phys: pkIn } : pkIn;
  const crit = S.rnd() * 100 < st.crit;
  const res = e.res || {};
  const melee = kind === 'sword', proc = (v) => melee && v && S.rnd() * 100 < v;
  let phys = Math.max(1, (pk.phys || 0) - (melee && st.ignore ? 0 : e.def)) * (1 - (res.phys || 0));
  if (e.undead && st.undead) phys *= 1 + st.undead / 100;
  let el = 0;
  for (const k of ['fire', 'cold', 'ltng', 'holy']) if (pk[k]) el += pk[k] * (1 - (res[k] || 0)) * (k === 'holy' && e.undead ? 1.5 : 1);
  const deadly = proc(st.ds);
  let d = Math.max(1, Math.round((phys + el) * (0.92 + S.rnd() * 0.16) * (crit ? 1.6 : 1) * (deadly ? 2 : 1)));
  // crushing blow: a quarter of what is left (much less on bosses)
  if (proc(st.crush)) { const c = Math.max(1, Math.round(Math.max(0, e.hp - d) * (e.boss ? 0.06 : 0.25))); d += c; procText(S, e, L2('粉碎！', 'Crush!'), '#ff6a3a'); burst(S, e.x + e.w / 2, e.y + e.h / 2, '#ffb070', 10, 90); }
  if (deadly) procText(S, e, L2('致命！', 'Deadly!'), '#ff3a5a');
  e.hp -= d; e.flash = 0.12;
  if (proc(st.bleed)) { e.bleed = { dps: Math.max(1, st.atk * 0.35 * (e.boss ? 0.5 : 1)), t: 3 }; procText(S, e, L2('撕裂', 'Bleeding'), '#e8304a'); }
  if (!(e.stunCd > 0) && proc(st.stun)) { e.stun = e.boss ? 0.5 : 1.6; e.stunCd = e.boss ? 4 : 0; procText(S, e, L2('麻痺！', 'Paralyzed!'), '#ffe85a'); }
  if (!(e.stunCd > 0) && proc(st.freeze)) { e.frozen = e.boss ? 0.4 : 1.2; e.stunCd = e.boss ? 4 : 0; procText(S, e, L2('冰凍！', 'Frozen!'), '#9ae0ff'); }
  const col = crit ? '#ffe070' : pk.fire > phys ? '#ff8a3a' : pk.cold > phys ? '#7ac8ff' : pk.ltng > phys ? '#ffe85a' : pk.holy > phys ? '#fff0b0' : '#ffffff';
  addText(S, e.x + e.w / 2, e.y - 2, d, col);
  if (pk.cold) e.slow = 2;
  if (pk.pois) e.pois = { dps: pk.pois * (1 - (res.pois || 0)) / 2, t: 2 };
  sfx(S, e.boss ? 'hitboss' : 'hit');
  // life and mana stolen from the physical part
  if (kind === 'sword' || kind === 'chain') {
    if (st.ls && p.hp < p.mhp) { const h = Math.min(p.mhp - p.hp, phys * st.ls / 100); p.hp += h; if (h >= 1) { for (let i = 0; i < 3; i++) S.fx.push({ k: 'spark', x: p.x + p.w / 2 + (S.rnd() - 0.5) * 8, y: p.y + 10, vx: (S.rnd() - 0.5) * 30, vy: -90 - S.rnd() * 40, t: 0.3, col: '#ff3a5a' }); } }
    if (st.ms) p.mp = Math.min(p.mmp, p.mp + phys * st.ms / 100);
  }
  if (kind === 'sword' && st.chain && S.rnd() * 100 < st.chain) chainLightning(S, e, st);
  if (!e.boss && kind !== 'holy' && (!e.heavy || (melee && st.kb)) && !(e.frozen > 0)) { const strong = melee && st.kb; e.kb = strong ? 0.22 : 0.12; e.kbv = (e.x + e.w / 2 < fromX ? -1 : 1) * (strong ? 210 : 90); }
  if (e.boss && !e.phase2 && e.kind === 'count' && e.hp <= e.mhp / 2) { e.phase2 = true; e.st = 'transform'; e.t = 2.2; e.vis = 1; S.ev.push({ t: 'dialog', id: 'count2' }); sfx(S, 'roar'); }
  if (e.hp <= 0) killEnemy(S, e);
  return true;
}
function chainLightning(S, from, st) {
  let last = from; const hit = new Set([from]);
  for (let k = 0; k < 3; k++) {
    let best = null, bd = 130;
    for (const e of S.ents) if (!e.dead && !hit.has(e)) { const dd = Math.hypot(e.x - last.x, e.y - last.y); if (dd < bd) { bd = dd; best = e; } }
    if (!best) break;
    S.fx.push({ k: 'zap', x: last.x + last.w / 2, y: last.y + last.h / 2, x2: best.x + best.w / 2, y2: best.y + best.h / 2, t: 0.25 });
    hit.add(best); hitEnemy(S, best, { ltng: st.atk * 0.8 + st.elem.ltng }, last.x, 'chain'); last = best;
  }
  sfx(S, 'thunder');
}
// treasure: monster level → item level; champions, uniques and bosses roll more and better
export function rollLoot(S, mlvl, tier, x, y) {
  const st = stats(S.p), r = S.rnd;
  const plan = { normal: [1, 0.11, 1], champion: [1, 0.6, 1.6], unique: [2, 1, 2.6], boss: [4, 1, 4] }[tier];
  for (let i = 0; i < plan[0]; i++) {
    if (r() > plan[1]) continue;
    const kind = r();
    if (kind < 0.58) dropAt(S, x, y, { k: 'gear', it: I.rollDrop(mlvl, r, { mf: st.mf, boost: plan[2], filter: (b) => b.c !== 'sub' }) });
    else if (kind < 0.68) dropAt(S, x, y, { k: 'gear', it: I.rollDrop(mlvl, r, { mf: st.mf, boost: plan[2], filter: (b) => b.c === 'sub' }) });
    else if (kind < 0.8) { const types = Object.keys(I.GEMS), g = types[Math.floor(r() * types.length)], grade = Math.min(4, 1 + Math.floor(mlvl / 14 + r() * 1.3)); dropAt(S, x, y, { k: 'gem', g: g + grade }); }
    else dropAt(S, x, y, { k: 'item', item: potionFor(mlvl, r) });
  }
}
function potionFor(m, r) { const x = r(); if (x < 0.12) return m > 20 ? 'elixir' : 'manaprism'; if (x < 0.2) return 'warprune'; if (x < 0.3) return 'antidote'; return m > 28 ? 'superpotion' : m > 12 ? 'hipotion' : 'potion'; }
function killEnemy(S, e) {
  e.dead = true; e.hp = 0;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, st = stats(S.p);
  burst(S, cx, cy, e.boss ? '#ffd070' : '#ff9a60', e.boss ? 40 : 14, e.boss ? 160 : 90);
  S.fx.push({ k: 'boom', x: cx, y: cy, t: 0.4, r: Math.max(e.w, e.h) });
  sfx(S, e.boss ? 'bossdie' : 'die');
  S.p.kills++; const dx = (S.flags.dex ||= {}); dx[e.kind] = (dx[e.kind] || 0) + 1; if (e.tier === 'elite') dx['elite:' + e.kind] = (dx['elite:' + e.kind] || 0) + 1;
  if (st.hok) S.p.hp = Math.min(S.p.mhp, S.p.hp + st.hok);
  if (st.heok) S.p.hearts = Math.min(S.p.mhearts, S.p.hearts + st.heok);
  if (e.exp) gainExp(S, e.exp);
  const mlvl = e.mlvl || S.mlvl || 1;
  if (e.boss) {
    S.flags.boss[e.kind] = 1; S.sealed = false; S.shake = 0.6;
    if (e.kind === 'count' && S.world !== 'rev') { S.won = true; S.wonT = 0; S.ev.push({ t: 'win' }); }
    else if (BOSSES[e.kind].final) { S.won = true; S.wonT = 0; S.trueEnd = true; S.ev.push({ t: 'win', true: 1 }); }
    else S.ev.push({ t: 'bossdown', id: e.kind });
    // a reward: a max-HP up, gold, hearts — and loot
    dropAt(S, cx, cy, { k: 'item', item: 'hpup' }); dropAt(S, cx - 20, cy, { k: 'gold', n: 150 + mlvl * 40 }); dropAt(S, cx + 20, cy, { k: 'heart', n: 5 });
    rollLoot(S, mlvl + 2, 'boss', cx, cy);
    return;
  }
  const r = S.rnd, drops = e.drops || {};
  if (drops.heart && r() < drops.heart) dropAt(S, cx, cy, { k: 'heart', n: r() < 0.15 ? 5 : 1 });
  if ((drops.gold || 0.25) && r() < (drops.gold || 0.25) * (e.tier && e.tier !== 'normal' ? 2 : 1)) dropAt(S, cx, cy, { k: 'gold', n: Math.round((5 + mlvl * 4 + r() * mlvl * 6) * (1 + st.gf / 100) * (e.tier === 'unique' ? 3 : 1)) });
  rollLoot(S, mlvl, e.tier === 'elite' ? 'unique' : e.tier || 'normal', cx, cy);
  // the species' own drops (the gallery lists them); magic find helps the rare ones
  const T = DROPS[e.kind]; if (!T) return;
  const luck = 1 + st.mf / 250;
  for (const slot of e.tier === 'elite' ? ['n', 'r', 'en', 'er'] : ['n', 'r']) {
    const d = T[slot]; if (r() >= d.p * (slot === 'r' || slot === 'er' ? luck : 1)) continue;
    (S.flags.drops ||= {})[e.kind + ':' + slot] = 1;
    if (d.t === 'item') dropAt(S, cx, cy, { k: 'item', item: d.id });
    else if (d.t === 'gem') dropAt(S, cx, cy, { k: 'gem', g: S.world === 'rev' ? d.g.replace(/\d/, (n) => Math.min(4, +n + 1)) : d.g });
    else if (d.t === 'gear') dropAt(S, cx, cy, { k: 'gear', it: I.makeItem(d.b, d.q, Math.max(mlvl, I.BASES[d.b].q), r) });
    else if (d.t === 'u') { const u = I.UNIQUES[d.id]; dropAt(S, cx, cy, { k: 'gear', it: I.makeItem(u.b, 'u', Math.max(mlvl, u.lvl), r, { id: d.id }) }); }
    if (slot === 'r' || slot === 'er') { sfx(S, 'relic'); addText(S, cx, e.y - 14, L2('稀有掉落！', 'Rare drop!'), '#ffd84a'); }
  }
}
function dropAt(S, x, y, d) {
  S.drops.push({ ...d, x: x - 5, y: y - 5, w: 10, h: 10, vx: (S.rnd() - 0.5) * 80, vy: -140 - S.rnd() * 60, t: d.k === 'heart' || d.k === 'gold' ? 9 : 9999 });
}

// ------------------------------------------------------------------ the update
export function update(S, dt, inp) {
  S.time += dt;
  if (S.fade > 0) S.fade -= dt;
  if (S.shake > 0) S.shake -= dt;
  if (S.won) { S.wonT += dt; updateFx(S, dt); return; }
  if (S.over) { S.overT += dt; updateFx(S, dt); return; }
  S.playTime += dt;
  if (S.freeze > 0) S.freeze -= dt;
  fairyTick(S, dt);
  updatePlayer(S, dt, inp);
  updateEnemies(S, dt);
  updateShots(S, dt);
  updateDrops(S, dt, inp);
  updateProps(S, dt, inp);
  updateFx(S, dt);
  // map exploration
  const c = worldCell(S); S.flags.visited[c.cx + ',' + c.cy] = 1;
  // boss fight starts once the player is well inside the room
  if (S.boss && !S.sealed && !S.boss.dead) {
    const p = S.p; if (p.x > 3 * TILE && p.x < S.R.W * TILE - 3 * TILE) enterBossFight(S);
  }
  checkExit(S);
}

function updatePlayer(S, dt, inp) {
  const p = S.p, st = stats(p);
  p.anim += dt;
  // regeneration (per 5 seconds) and poison
  if (p.hp > 0) { p.hp = Math.min(p.mhp, p.hp + st.hpr * dt / 5); p.mp = Math.min(p.mmp, p.mp + st.mpr * dt / 5); }
  if (p.poisoned > 0) { p.poisoned -= dt; if (p.hp > 1) p.hp = Math.max(1, p.hp - (2 + (S.mlvl || 1) * 0.4) * dt); }
  if (p.inv > 0) p.inv -= dt;
  if (p.jumpBuf > 0) p.jumpBuf -= dt;
  if (inp.pressed.jump) p.jumpBuf = 0.12;
  if (p.dropT > 0) p.dropT -= dt;
  // ---- deep water: with the snorkel you swim; without it the water throws you back out
  const inDeep = tileAt(S, Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h / 2) / TILE)) === T.DEEP;
  if (inDeep && !p.relics.snorkel) {
    // back to the last place you stood on dry ground (works for flooded corridors and flooded shafts alike)
    if (p.bat || p.mist) unform(S, true);
    p.hp = Math.max(1, p.hp - Math.ceil(p.mhp * 0.1)); sfx(S, 'hurt');
    const sx = p.safe && p.safe[2] === S.roomId ? p.safe[0] : 3 * TILE, sy = p.safe && p.safe[2] === S.roomId ? p.safe[1] : S.R.floorY(0) * TILE - PH.H;
    p.x = sx; p.y = sy; p.vx = p.vy = 0; p.hurtT = 0.3; p.inv = 0.8; p.h = PH.H; p.w = PH.W;
    addText(S, p.x + p.w / 2, p.y, L2('水太深了！', 'Too deep!'), '#7ac8ff');
    if (!S.flags.seen.deep) { S.flags.seen.deep = 1; S.ev.push({ t: 'toast', key: 'deepHint' }); }
    return;
  }
  if (p.ground && !p.bat && !p.mist && !inDeep && p.h === PH.H) p.safe = [p.x, p.y, S.roomId];
  // ---- bat form and mist form
  const toggleForm = (form) => {
    if (p[form]) { unform(S); return; }
    if (p.mp < 3) { sfx(S, 'no'); return; }
    if (p.bat || p.mist) { p.bat = p.mist = false; } else { p.h = 12; p.y += PH.H - 12; p.w = 12; p.x -= 1; }
    p[form] = true; p.atkT = 0; p.slideT = 0; burst(S, p.x + 6, p.y + 6, form === 'bat' ? '#b080ff' : '#d8e8ff', 14, 70); sfx(S, 'bat');
  };
  if (inp.pressed.bat && p.relics.wing && p.hurtT <= 0) toggleForm('bat');
  if (inp.pressed.mist && p.relics.mist && p.hurtT <= 0) toggleForm('mist');
  if (p.bat || p.mist) {
    p.mp -= (p.mist ? 4.5 : 3.2) * dt;
    if (p.mp <= 0) { p.mp = 0; unform(S); }
    else {
      const sp = p.mist ? PH.MIST : PH.BAT;
      let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      if (ax && ay) { ax *= 0.72; ay *= 0.72; }
      p.vx += (ax * sp - p.vx) * Math.min(1, dt * 10); p.vy += (ay * sp - p.vy) * Math.min(1, dt * 10);
      if (ax) p.face = Math.sign(ax);
      moveBody(S, p, dt, { noPlat: true });
      p.ground = false;
      if (inp.pressed.attack && p.bat && p.mp >= 4) { // a bat fireball
        p.mp -= 4; S.shots.push({ k: 'fire', x: p.x + 6 + p.face * 6, y: p.y + 4, w: 8, h: 6, vx: p.face * 260, vy: 0, dmg: st.atk * 0.8 + p.lv, life: 0.8, hit: new Set() });
        sfx(S, 'fire');
      }
      return;
    }
  }
  // ---- normal form
  const wasGround = p.ground;
  p.ground = onGroundCheck(S, p, p.dropT > 0);
  if (p.ground) { p.jumps = 0; p.coyote = 0.08; } else if (p.coyote > 0) p.coyote -= dt;
  if (!wasGround && p.ground && p.vy >= 0) sfx(S, 'land');
  const busy = p.hurtT > 0;
  if (p.hurtT > 0) p.hurtT -= dt;
  // crouch
  const wantCrouch = inp.down && p.ground && !busy && p.dashT <= 0;
  if (p.slideT > 0) {
    p.slideT -= dt; p.vx = p.face * PH.SLIDE * Math.min(1, p.slideT / 0.12 + 0.35);
    if (p.slideT <= 0 && !canStand(S, p)) p.slideT = 0.05;        // keep sliding while under a low ceiling
  }
  const sliding = p.slideT > 0;
  const lowNeeded = sliding || (wantCrouch) || !canStand(S, p);
  setHeight(S, p, lowNeeded ? PH.HC : PH.H);
  p.crouch = wantCrouch || (!sliding && p.h === PH.HC);
  // backdash
  if (p.dashT > 0) { p.dashT -= dt; p.vx = -p.face * PH.DASH * Math.min(1, p.dashT / 0.1 + 0.2); }
  else if (inp.pressed.dash && p.ground && !busy && !sliding && p.atkT <= 0) { p.dashT = 0.26; p.inv = Math.max(p.inv, 0.12); sfx(S, 'dash'); S.fx.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 }); }
  // walk
  if (!busy && !sliding && p.dashT <= 0) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const attacking = p.atkT > 0 && p.ground;
    if (dir && !(attacking)) p.face = dir;
    const target = attacking ? 0 : p.crouch ? (canStand(S, p) ? 0 : dir * 45) : dir * PH.WALK * (1 + st.frw / 100);
    const acc = p.ground ? 16 : 9;
    p.vx += (target - p.vx) * Math.min(1, dt * acc);
    if (Math.abs(p.vx) < 2 && !dir) p.vx = 0;
  } else if (busy) p.vx *= Math.pow(0.05, dt);
  // jump / slide / double jump / drop through
  if (p.jumpBuf > 0 && !busy) {
    if (p.crouch && p.ground && onPlatform(S, p)) { p.dropT = 0.22; p.y += 2; p.jumpBuf = 0; }
    else if (p.crouch && p.ground && p.relics.cloak) { p.slideT = 0.42; p.jumpBuf = 0; sfx(S, 'slide'); S.fx.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 }); }
    else if ((p.ground || p.coyote > 0) && !sliding) { p.vy = -PH.JUMP; p.ground = false; p.coyote = 0; p.jumps = 1; p.jumpBuf = 0; sfx(S, 'jump'); }
    else if (!p.ground && p.relics.leap && p.jumps < 2 + st.jump && !sliding) {
      p.vy = -PH.DJUMP; p.jumps = Math.max(2, p.jumps + 1); p.jumpBuf = 0; sfx(S, 'djump');
      S.fx.push({ k: 'ring', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 });
    }
  }
  if (p.boostT > 0) p.boostT -= dt; else if (!inp.jump && p.vy < -120 && p.hurtT <= 0) p.vy = -120;         // variable jump height
  if (inDeep && p.relics.snorkel) {
    p.vy = Math.min(90, p.vy + PH.G * 0.3 * dt); p.vx *= Math.pow(0.4, dt);
    // a stroke with your head out of the water leaps you out of the pool
    if (inp.pressed.jump && !busy) { const surf = tileAt(S, Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + 2) / TILE)) !== T.DEEP; p.vy = surf ? -PH.JUMP : -PH.SWIM; p.jumpBuf = 0; sfx(S, 'jump'); S.fx.push({ k: 'ring', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 }); }
  } else p.vy = Math.min(PH.FALL, p.vy + PH.G * dt);
  if (p.ground && p.vy > 0) p.vy = 0;
  const res = moveBody(S, p, dt, { noPlat: p.dropT > 0 });
  if (res.landed) p.ground = true;
  // attack
  if (p.atkT > 0) { p.atkT -= dt; }
  else if (inp.pressed.attack && !busy && !sliding) {
    if (inp.up && p.eq.sub) useSub(S);
    else { p.atkT = p.atkDur = st.time; p.swing++; p.atkLow = p.crouch; sfx(S, 'swing'); if (p.dashT > 0) p.dashT = 0; }
  }
  if (inp.pressed.sub && p.eq.sub && !busy && !sliding) useSub(S);
  if (p.atkT > 0) {
    const k = 1 - p.atkT / p.atkDur;
    if (k > 0.15 && k < 0.8) {
      const box = swordBox(p, st.reach);
      for (const e of S.ents) if (!e.dead && e.swingHit !== p.swing && overlap(box, e)) { e.swingHit = p.swing; hitEnemy(S, e, weaponPacket(S), p.x + p.w / 2, 'sword'); }
      for (const c of S.props) if (c.kind === 'candle' && !c.gone && overlap(box, c)) breakCandle(S, c);
      // breakable walls
      for (let ty = Math.floor(box.y / TILE); ty <= Math.floor((box.y + box.h) / TILE); ty++)
        for (let tx = Math.floor(box.x / TILE); tx <= Math.floor((box.x + box.w) / TILE); tx++)
          if (tx >= 0 && ty >= 0 && tx < S.R.W && ty < S.R.H && S.R.tiles[ty][tx] === T.BREAK) breakWall(S, tx, ty);
    }
  }
  // spikes of falling out (should not happen) — safety: put back in room
  if (p.y > S.R.H * TILE + 200) { p.y = 0; p.vy = 0; }
}
export function swordBox(p, reach) {
  const y = p.atkLow ? p.y + p.h - 12 : p.y + 7;
  return { x: p.face > 0 ? p.x + p.w - 2 : p.x - reach + 2, y, w: reach, h: 10 };
}
function canStand(S, p) { return !boxSolid(S, p.x, p.y + p.h - PH.H, p.w, PH.H); }
function setHeight(S, p, h) { if (p.h === h) return; const by = p.y + p.h; p.h = h; p.y = by - h; }
function onPlatform(S, p) {
  const ty = Math.floor((p.y + p.h + 0.5) / TILE); let plat = false;
  for (let tx = Math.floor(p.x / TILE); tx <= Math.floor((p.x + p.w - 0.01) / TILE); tx++) { const t = tileAt(S, tx, ty); if (solidT(S, t)) return false; if (t === T.PLAT) plat = true; }
  return plat;
}
function unbat(S) { unform(S); }
function unform(S, forced) {
  const p = S.p;
  // only if there is room to stand
  const nx = p.x - 1, ny = p.y + 12 - PH.H;
  if (boxSolid(S, nx, ny, PH.W, PH.H)) { if (p.mp <= 0 || forced) { /* forced: squeeze */ } else return; }
  p.bat = false; p.mist = false; p.w = PH.W; p.h = PH.H; p.x = nx; p.y = ny; p.vy = Math.min(p.vy, 0);
  burst(S, p.x + 5, p.y + 14, '#b080ff', 10, 60); sfx(S, 'bat');
}
// sub-weapons are items: the base decides how they fly, the item's level and mods how hard they hit
export const SUB_ELEM = { holy: 'holy', cross: 'holy', bible: 'holy', bomb: 'fire', bolt: 'ltng', crystal: 'holy' };
export function subCost(S) { const it = S.p.eq.sub; if (!it) return 0; const B = I.BASES[it.b]; return Math.max(B.k === 'watch' ? 2 : 1, B.cost - stats(S.p).subc); }
function useSub(S) {
  const p = S.p, it = p.eq.sub; if (!it) return;
  const B = I.BASES[it.b], k = B.k, cost = subCost(S);
  if (p.hearts < cost) { sfx(S, 'no'); return; }
  if (k === 'bible' ? S.shots.some((s) => s.k === 'bible') : S.shots.filter((s) => s.sub).length >= 3) return;
  p.hearts -= cost;
  const st = stats(p), base = I.itemBase(it).dmg * (1 + st.subd / 100) + st.atk * 0.3, x = p.x + p.w / 2, y = p.y + 8;
  const pk = () => { const q = { phys: base }; const el = SUB_ELEM[k]; if (el) { q[el] = base * 0.6; q.phys = base * 0.4; } for (const e of I.ELEM) if (st.elem[e]) q[e] = (q[e] || 0) + st.elem[e] * 0.6; return q; };
  const mk = (o) => S.shots.push({ sub: it.b, x: x - 4, y, w: 8, h: 6, vx: 0, vy: 0, dmg: pk(), life: 2, hit: new Set(), t: 0, ...o });
  if (k === 'dagger') mk({ k: 'dagger', vx: p.face * 330, w: 12, h: 4, life: 0.9 });
  if (k === 'axe') mk({ k: 'axe', vx: p.face * 110, vy: -360, grav: 820, w: 14, h: 14, life: 2 });
  if (k === 'holy') mk({ k: 'holy', vx: p.face * 120, vy: -150, grav: 700, w: 8, h: 8, life: 3 });
  if (k === 'cross') mk({ k: 'cross', vx: p.face * 300, w: 14, h: 14, life: 2.2, dir: p.face });
  if (k === 'boomerang') mk({ k: 'cross', boom: 1, vx: p.face * 240, w: 12, h: 12, life: 2, dir: p.face });
  if (k === 'bible') mk({ k: 'bible', w: 12, h: 12, life: 4, orbit: 0 });
  if (k === 'javelin') mk({ k: 'javelin', vx: p.face * 420, w: 20, h: 4, life: 1.2, pierce: 1 });
  if (k === 'bomb') mk({ k: 'bomb', vx: p.face * 150, vy: -260, grav: 760, w: 8, h: 8, life: 3 });
  if (k === 'stars') for (const a of [-0.16, 0, 0.16]) mk({ k: 'star', vx: p.face * 320 * Math.cos(a), vy: 320 * Math.sin(a), w: 8, h: 8, life: 0.9 });
  if (k === 'watch') { S.freeze = 2.6; S.fx.push({ k: 'clock', x, y, t: 0.8 }); sfx(S, 'magic'); return; }
  if (k === 'bolt') {
    let best = null, bd = 220; for (const e of S.ents) if (!e.dead) { const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y); if (d < bd) { bd = d; best = e; } }
    if (best) { S.fx.push({ k: 'zap', x, y, x2: best.x + best.w / 2, y2: best.y + best.h / 2, t: 0.3 }); hitEnemy(S, best, pk(), x, 'bolt'); chainLightning(S, best, { ...st, atk: base }); }
    else S.fx.push({ k: 'zap', x, y, x2: x + p.face * 160, y2: y - 10, t: 0.3 });
    sfx(S, 'thunder'); return;
  }
  if (k === 'crystal') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mk({ k: 'ray', vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, w: 8, h: 8, life: 0.7 }); }
  sfx(S, 'sub');
}
function breakWall(S, tx, ty) {
  const R = S.R;
  for (let y = 0; y < R.H; y++) if (R.tiles[y][tx] === T.BREAK) { R.tiles[y][tx] = T.AIR; burst(S, tx * TILE + 8, y * TILE + 8, '#9a8a7a', 6, 80); }
  R.dirty = true; sfx(S, 'crumble'); S.shake = 0.25; (S.flags.broken ||= {})[S.roomId] = 1;
  if (!S.flags.seen.secret) { S.flags.seen.secret = 1; S.ev.push({ t: 'toast', key: 'secretFound' }); }
}
function breakCandle(S, c) {
  c.gone = true; sfx(S, 'candle');
  burst(S, c.x + 4, c.y + 4, '#ffcf6a', 8, 60);
  const cx = c.x + 4, cy = c.y + 6, r = S.rnd();
  if (c.sub) dropAt(S, cx, cy, { k: 'sub', sub: c.sub });
  else if (r < 0.55) dropAt(S, cx, cy, { k: 'heart', n: S.rnd() < 0.12 ? 5 : 1 });
  else if (r < 0.85) dropAt(S, cx, cy, { k: 'gold', n: S.rnd() < 0.2 ? 50 : 10 });
}

// ------------------------------------------------------------------ enemies
function ground(S, e, dt) {
  e.vy = Math.min(PH.FALL, e.vy + PH.G * dt);
  const res = moveBody(S, e, dt);
  e.onG = res.landed || onGroundCheck(S, e);
  return res;
}
function ledgeAhead(S, e) {
  const fx = e.face > 0 ? e.x + e.w + 2 : e.x - 2;
  return !solidAt(S, fx, e.y + e.h + 4) && tileAt(S, Math.floor(fx / TILE), Math.floor((e.y + e.h + 4) / TILE)) !== T.PLAT;
}
function shoot(S, x, y, vx, vy, dmg, o = {}) { S.eshots.push({ x: x - (o.r || 4), y: y - (o.r || 4), w: (o.r || 4) * 2, h: (o.r || 4) * 2, vx, vy, dmg, life: o.life || 4, k: o.k || 'orb', grav: o.grav || 0, wall: o.wall ?? true, t: 0, ...o }); }

function updateEnemies(S, dt0) {
  const p = S.p, px = p.x + p.w / 2, py = p.y + p.h / 2;
  for (const e of S.ents) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt0;
    // poison ticks, the stopwatch freezes time, cold slows, "Extra Fast" speeds up
    if (e.pois) { e.pois.t -= dt0; e.hp -= e.pois.dps * dt0; if (e.pois.t <= 0) e.pois = null; if (e.hp <= 0) { killEnemy(S, e); continue; } }
    if (e.bleed) { e.bleed.t -= dt0; e.hp -= e.bleed.dps * dt0; if (e.bleed.t <= 0) e.bleed = null; if (e.hp <= 0) { killEnemy(S, e); continue; } }
    if (e.stunCd > 0) e.stunCd -= dt0;
    // paralyzed or frozen: no moving, no attacking, no touching (flyers hang in the air)
    if (e.stun > 0 || e.frozen > 0) { if (e.stun > 0) e.stun -= dt0; if (e.frozen > 0) e.frozen -= dt0; e.vx = 0; if (!e.fly && !e.boss) ground(S, e, dt0); continue; }
    if (S.freeze > (e.boss ? 1.3 : 0)) continue;
    if (e.slow > 0) e.slow -= dt0;
    const dt = dt0 * (e.slow > 0 ? 0.5 : 1) * (e.spd || 1);
    if (e.mods && e.mods.includes('teleport') && !e.boss) { e.tp = (e.tp ?? 2 + S.rnd() * 2) - dt; if (e.tp <= 0) { e.tp = 4; if (Math.abs(px - (e.x + e.w / 2)) > 90) { burst(S, e.x + e.w / 2, e.y + e.h / 2, '#c8a0ff', 10, 60); e.x = Math.max(TILE, Math.min(S.R.W * TILE - TILE - e.w, px + (S.rnd() < 0.5 ? -60 : 60))); if (!e.fly) e.y = p.y + p.h - e.h; } } }
    e.t -= dt;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = px - ex, dy = py - ey, dist = Math.hypot(dx, dy);
    if (e.kb > 0 && !e.boss) { e.kb -= dt; e.vx = e.kbv; if (e.fly) { e.x += e.vx * dt; } else ground(S, e, dt); continue; }
    if (e.boss) { bossAI(S, e, dt, px, py); }
    else switch (e.kind) {
      case 'bat':
        if (e.st === 'hang') { if (Math.abs(dx) < 110 && dy > -10) { e.st = 'fly'; e.t = 0; sfx(S, 'squeak'); } break; }
        e.face = Math.sign(dx) || 1;
        e.vx += (Math.sign(dx) * 95 - e.vx) * dt * 2; e.vy = Math.sin(S.time * 5 + e.hx) * 60 + Math.sign(dy) * 35;
        e.x += e.vx * dt; e.y += e.vy * dt; break;
      case 'zombie':
        if (e.st === 'under') { if (e.t <= 0 && Math.abs(dx) < 170) { e.st = 'rise'; e.t = 0.6; } break; }
        if (e.st === 'rise') { if (e.t <= 0) e.st = 'walk'; break; }
        if (e.t <= 0) { e.face = Math.sign(dx) || 1; e.t = 2 + S.rnd() * 2; }
        e.vx = e.face * 28; { const r = ground(S, e, dt); if (r.hitX || (e.onG && ledgeAhead(S, e))) { e.face *= -1; e.x += e.face * 2; } } break;
      case 'skeleton': case 'knight': {
        const sp = e.kind === 'knight' ? 30 : 44;
        if (e.st === 'swing') { e.vx = 0; ground(S, e, dt); if (e.t <= 0) { e.st = 'idle'; e.t = 0.6; } else if (e.t < 0.35 && !e.swung) { e.swung = true; const bx = { x: e.face > 0 ? e.x + e.w : e.x - 28, y: e.y + 6, w: 28, h: 14 }; if (overlap(bx, p)) hurtPlayer(S, e.atk * 1.2, ex); sfx(S, 'swing'); } break; }
        if (e.t <= 0) { e.face = Math.abs(dx) < 220 ? Math.sign(dx) || 1 : -e.face; e.t = 1 + S.rnd() * 1.5; if (e.kind === 'skeleton' && Math.abs(dx) < 60 && e.onG && S.rnd() < 0.4) { e.vy = -220; e.vx = -e.face * 70; } }
        if (e.kind === 'knight' && Math.abs(dx) < 36 && Math.abs(dy) < 30 && e.st !== 'swing') { e.st = 'swing'; e.t = 0.7; e.swung = false; e.face = Math.sign(dx) || 1; break; }
        if (e.onG) e.vx = e.face * sp * (Math.abs(dx) < 30 ? 0.3 : 1);
        const r = ground(S, e, dt); if (r.hitX || (e.onG && ledgeAhead(S, e))) { e.face *= -1; e.t = 0.8; } break;
      }
      case 'bonethrower':
        e.face = Math.sign(dx) || 1; e.vx = 0; ground(S, e, dt);
        if (e.t <= 0 && Math.abs(dx) < 260) { e.t = 2.2 + S.rnd(); const v = Math.min(220, Math.abs(dx) * 1.1 + 40); shoot(S, ex, e.y + 6, e.face * v * 0.7, -300, e.atk, { k: 'bone', grav: 800, r: 4, wall: false }); sfx(S, 'throw'); }
        break;
      case 'ghost':
        if (dist > 1) { e.vx += (dx / dist * 45 - e.vx) * dt; e.vy += (dy / dist * 45 - e.vy) * dt; }
        e.face = Math.sign(dx) || 1; e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(S.time * 3 + e.hx) * 0.4; break;
      case 'book':
        if (e.st === 'dash') { e.x += e.vx * dt; e.y += e.vy * dt; if (e.t <= 0) { e.st = 'idle'; e.t = 1.5 + S.rnd(); } break; }
        e.face = Math.sign(dx) || 1;
        e.x += Math.sign(dx) * 30 * dt; e.y += (e.hy + Math.sin(S.time * 2.5 + e.hx) * 18 - e.y) * dt * 2;
        if (e.t <= 0 && dist < 160) { e.st = 'dash'; e.t = 0.6; e.vx = dx / dist * 200; e.vy = dy / dist * 200; sfx(S, 'flap'); }
        break;
      case 'medusa':
        e.x += e.vx * dt; e.y = e.hy + Math.sin(S.time * 3.2 + e.hx) * 32;
        if (e.x < -20 || e.x > S.R.W * TILE + 20) { e.vx *= -1; e.face *= -1; e.hy = p.y - 10 + (S.rnd() - 0.5) * 40; }
        break;
      case 'gargoyle':
        if (e.st === 'dive') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy -= 260 * dt; if (e.t <= 0 || e.y < e.hy - 10) { e.st = 'idle'; e.t = 1.5 + S.rnd(); } break; }
        e.face = Math.sign(dx) || 1;
        e.x += (px - 70 * e.face - ex) * dt * 0.8; e.y += (e.hy + Math.sin(S.time * 2 + e.hx) * 10 - e.y) * dt * 2;
        if (e.t <= 0 && dist < 150) { e.st = 'dive'; e.t = 1.2; e.vx = dx * 1.3; e.vy = Math.max(120, dy * 2.2); sfx(S, 'flap'); }
        break;
      default: genericAI(S, e, dt, px, py, dx, dy, dist);
    }
    // keep flyers inside the room
    if (e.fly && !e.boss) { e.x = Math.max(0, Math.min(S.R.W * TILE - e.w, e.x)); e.y = Math.max(TILE * 0.5, Math.min(S.R.H * TILE - e.h - TILE, e.y)); }
    // contact damage
    if (e.st !== 'under' && e.st !== 'hang' && !(e.boss && (e.vis === 0 || e.st === 'intro')) && overlap(e, p)) {
      const r = hurtPlayer(S, e.atk, ex, e.elem || 'phys', { lvl: e.mlvl });
      if (r === true) { const st = stats(p); if (st.thorns && !e.boss) hitEnemy(S, e, { phys: st.thorns }, px, 'thorns'); if (e.mods && e.mods.includes('vamp')) e.hp = Math.min(e.mhp, e.hp + e.mhp * 0.05); }
    }
  }
  S.ents = S.ents.filter((e) => !e.dead);
}

// ------------------------------------------------------------------ bosses
function bossAI(S, e, dt, px, py) {
  const R = S.R, fy = R.floorY(0) * TILE, W = R.W * TILE, ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = px - ex;
  const half = e.hp < e.mhp / 2, rnd = S.rnd;
  if (!S.sealed) { if (e.kind === 'greatbat') e.y = 60 + Math.sin(S.time * 2) * 6; return; }
  if (e.st === 'intro') { e.t = Math.min(e.t, 1.2); e.st = 'idle'; }
  const pick = (opts) => opts[Math.floor(rnd() * opts.length)];
  if (BOSSES[e.kind].body) { gbossAI(S, e, dt, px, py); return; }
  switch (e.kind) {
    case 'greatbat': {
      if (e.st === 'idle' || e.st === 'hover') {
        e.st = 'hover';
        const tx = W / 2 + Math.sin(S.time * 0.9) * (W * 0.35), ty = 50 + Math.sin(S.time * 1.8) * 20;
        e.x += (tx - ex) * dt * 1.6; e.y += (ty - ey) * dt * 1.6; e.face = Math.sign(dx) || 1;
        if (e.t <= 0) {
          const a = pick(half ? ['swoop', 'swoop', 'fire', 'bats'] : ['swoop', 'swoop', 'bats']);
          e.st = a; e.t = a === 'swoop' ? 1.4 : 1;
          if (a === 'swoop') { e.sx = ex; e.sy = ey; e.tx = px; e.ty = py; e.k = 0; }
          if (a === 'bats') { for (let i = 0; i < 3; i++) { const b = spawnEnemy(S, 'bat', ex + (i - 1) * 20, ey + 80, 1); b.st = 'fly'; b.y = ey; b.exp = 0; b.drops = { heart: 0.5 }; } sfx(S, 'squeak'); }
          if (a === 'fire') { for (let i = -1; i <= 1; i++) { const ang = Math.atan2(py - ey, dx) + i * 0.3; shoot(S, ex, ey + 8, Math.cos(ang) * 150, Math.sin(ang) * 150, e.atk, { k: 'fire', r: 5 }); } sfx(S, 'fire'); }
        }
      } else if (e.st === 'swoop') {
        e.k = Math.min(1, e.k + dt / 1.3); const k = e.k;
        e.x = e.sx + (e.tx + (e.tx - e.sx) * 0.4 - e.sx) * k - e.w / 2; e.y = e.sy + (e.ty - e.sy) * Math.sin(k * Math.PI) * 1.05 - e.h / 2;
        if (k >= 1) { e.st = 'hover'; e.t = 1.2 + rnd() * 0.8; }
      } else if (e.t <= 0) { e.st = 'hover'; e.t = 1.4 + rnd(); }
      break;
    }
    case 'golem': {
      ground(S, e, dt);
      if (e.st === 'idle' || e.st === 'walk') {
        e.st = 'walk'; e.face = Math.sign(dx) || 1; e.vx = e.face * (half ? 52 : 38);
        if (e.t <= 0) {
          const a = Math.abs(dx) < 80 ? 'slam' : pick(half ? ['throw', 'leap', 'slam'] : ['throw', 'walk']);
          if (a !== 'walk') { e.st = a; e.t = a === 'slam' ? 0.9 : a === 'leap' ? 1.6 : 1.2; e.vx = 0; e.done = false; }
          else e.t = 1;
        }
      } else if (e.st === 'slam') {
        e.vx = 0;
        if (e.t < 0.35 && !e.done) { e.done = true; S.shake = 0.3; sfx(S, 'slam');
          const bx = { x: e.face > 0 ? e.x + e.w - 6 : e.x - 34, y: e.y + 20, w: 40, h: 44 }; if (overlap(bx, S.p)) hurtPlayer(S, e.atk * 1.2, ex);
          for (const d of [-1, 1]) shoot(S, ex + d * 24, fy - 8, d * 170, 0, e.atk * 0.8, { k: 'wave', r: 7, life: 2.5 });
        }
        if (e.t <= 0) { e.st = 'walk'; e.t = 1.5 + rnd(); }
      } else if (e.st === 'throw') {
        e.vx = 0;
        if (e.t < 0.8 && !e.done) { e.done = true; sfx(S, 'throw'); for (let i = 0; i < 3; i++) shoot(S, ex, e.y + 10, e.face * (80 + i * 70), -330 - i * 30, e.atk * 0.8, { k: 'rock', grav: 800, r: 6, wall: false }); }
        if (e.t <= 0) { e.st = 'walk'; e.t = 1.5 + rnd(); }
      } else if (e.st === 'leap') {
        if (!e.done && e.onG && e.t < 1.4) { e.done = true; e.vy = -420; e.vx = Math.max(-260, Math.min(260, dx * 1.2)); e.air = true; sfx(S, 'jump'); }
        if (e.air && e.onG && e.vy >= 0 && e.t < 1.3) { e.air = false; S.shake = 0.4; sfx(S, 'slam'); e.vx = 0;
          for (const d of [-1, 1]) shoot(S, ex + d * 24, fy - 8, d * 190, 0, e.atk * 0.8, { k: 'wave', r: 7, life: 2.5 });
          for (let i = 0; i < 4; i++) shoot(S, 40 + rnd() * (W - 80), 20, 0, 40, e.atk * 0.7, { k: 'rock', grav: 500, r: 6, wall: false }); }
        if (e.t <= 0) { e.st = 'walk'; e.t = 1.5; }
      }
      break;
    }
    case 'witch': {
      e.face = Math.sign(dx) || 1;
      if (e.st === 'idle') { e.st = 'float'; e.t = 1.2; }
      if (e.st === 'float') {
        e.y += Math.sin(S.time * 2) * 0.3;
        if (e.t <= 0) {
          const a = pick(half ? ['orbs', 'pillars', 'warp', 'summon', 'orbs'] : ['orbs', 'pillars', 'warp']);
          e.st = a; e.t = { orbs: 1.2, pillars: 1.6, warp: 1.1, summon: 1 }[a]; e.done = false;
        }
      } else if (e.st === 'orbs') {
        if (e.t < 0.6 && !e.done) { e.done = true; sfx(S, 'magic'); const n = half ? 5 : 3, ang = Math.atan2(py - ey, dx);
          for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.28; shoot(S, ex, ey, Math.cos(a) * 140, Math.sin(a) * 140, e.atk, { k: 'magic', r: 5, wall: false }); } }
        if (e.t <= 0) { e.st = 'float'; e.t = 0.9 + rnd() * 0.6; }
      } else if (e.st === 'pillars') {
        if (!e.done) { e.done = true; e.cols = [px, px - 70, px + 70].map((x) => Math.max(20, Math.min(W - 20, x))); for (const x of e.cols) S.fx.push({ k: 'warn', x, y: fy, t: 0.8 }); }
        if (e.t < 0.8 && e.cols) { sfx(S, 'thunder'); for (const x of e.cols) shoot(S, x, fy - 90, 0, 0, e.atk * 1.1, { k: 'pillar', w: 16, h: 180, x: x - 8, y: fy - 180, life: 0.45, wall: false }); e.cols = null; S.shake = 0.2; }
        if (e.t <= 0) { e.st = 'float'; e.t = 0.8 + rnd() * 0.6; }
      } else if (e.st === 'warp') {
        e.vis = e.t > 0.55 ? Math.max(0, (e.t - 0.55) / 0.55) : Math.min(1, (0.55 - e.t) / 0.55);
        if (e.t <= 0.55 && !e.done) { e.done = true; e.x = 50 + rnd() * (W - 100); e.y = fy - 80 - rnd() * 60; }
        if (e.vis < 0.3) e.vis = 0;
        if (e.t <= 0) { e.vis = 1; e.st = 'float'; e.t = 0.6; }
      } else if (e.st === 'summon') {
        if (!e.done) { e.done = true; sfx(S, 'magic'); for (const d of [-1, 1]) { const b = spawnEnemy(S, 'book', ex + d * 40, ey + 60, 3); b.exp = 0; b.drops = { heart: 0.5 }; } }
        if (e.t <= 0) { e.st = 'float'; e.t = 1; }
      }
      break;
    }
    case 'sentinel': {
      const gr = ground(S, e, dt);
      if (e.st === 'idle' || e.st === 'walk') {
        e.st = 'walk'; e.face = Math.sign(dx) || 1; e.vx = e.face * 34;
        if (e.t <= 0) { const a = pick(half ? ['charge', 'leap', 'gears', 'gears'] : ['charge', 'leap', 'gears']); e.st = a; e.t = { charge: 2.4, leap: 1.6, gears: 1.3 }[a]; e.done = false; e.vx = 0; }
      } else if (e.st === 'charge') {
        if (e.t > 1.8) { e.vx = 0; e.face = Math.sign(dx) || 1; }
        else { e.vx = e.face * 280; if (e.x <= TILE * 2 || e.x + e.w >= W - TILE * 2 || gr.hitX) { if (!e.done) { e.done = true; S.shake = 0.4; sfx(S, 'slam'); for (let i = 0; i < 5; i++) shoot(S, 40 + rnd() * (W - 80), 18, 0, 30, e.atk * 0.7, { k: 'gear', grav: 450, r: 6, wall: false }); } e.vx = 0; e.st = 'walk'; e.t = 1.2 + rnd(); } }
      } else if (e.st === 'leap') {
        if (!e.done && e.onG) { e.done = true; e.vy = -460; e.vx = Math.max(-280, Math.min(280, dx * 1.3)); e.air = true; sfx(S, 'jump'); }
        if (e.air && e.onG && e.vy >= 0 && e.t < 1.4) { e.air = false; S.shake = 0.4; sfx(S, 'slam'); e.vx = 0; for (const d of [-1, 1]) shoot(S, ex + d * 22, fy - 8, d * 200, 0, e.atk * 0.8, { k: 'wave', r: 7, life: 2.5 }); }
        if (e.t <= 0) { e.st = 'walk'; e.t = 1.4; }
      } else if (e.st === 'gears') {
        e.vx = 0;
        if (e.t < 0.9 && !e.done) { e.done = true; sfx(S, 'gear'); const n = half ? 12 : 8, off = rnd(); for (let i = 0; i < n; i++) { const a = (i / n + off) * Math.PI * 2; shoot(S, ex, e.y + 14, Math.cos(a) * 120, Math.sin(a) * 120, e.atk * 0.8, { k: 'gear', r: 6, wall: false, life: 3 }); } }
        if (e.t <= 0) { e.st = 'walk'; e.t = 1 + rnd(); }
      }
      break;
    }
    case 'count': {
      e.face = Math.sign(dx) || 1;
      if (e.st === 'transform') { e.vis = 1; if (e.t <= 0) { e.st = 'idle'; e.t = 0.6; } break; }
      if (!e.onAir) ground(S, e, dt);
      if (e.st === 'idle') {
        if (e.t <= 0) {
          const a = pick(e.phase2 ? ['hellfire', 'warp', 'meteor', 'beam', 'bats', 'warp'] : ['hellfire', 'warp', 'bats', 'warp']);
          e.st = a; e.t = { hellfire: 1.2, warp: 1.0, meteor: 1.8, beam: 1.9, bats: 1.2 }[a]; e.done = false;
        }
      } else if (e.st === 'warp') {
        e.vis = e.t > 0.5 ? (e.t - 0.5) / 0.5 : (0.5 - e.t) / 0.5;
        if (e.t <= 0.5 && !e.done) { e.done = true; let nx; do { nx = 50 + rnd() * (W - 100); } while (Math.abs(nx - px) < 80); e.x = nx - e.w / 2; e.y = fy - e.h; }
        if (e.vis < 0.3) e.vis = 0;
        if (e.t <= 0) { e.vis = 1; e.st = 'idle'; e.t = e.phase2 ? 0.2 : 0.5; }
      } else if (e.st === 'hellfire') {
        if (e.t < 0.6 && !e.done) { e.done = true; sfx(S, 'fire'); const n = e.phase2 ? 5 : 3, ang = Math.atan2(py - (e.y + 12), dx);
          for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.2; shoot(S, ex, e.y + 12, Math.cos(a) * 170, Math.sin(a) * 170, e.atk, { k: 'fire', r: 6 }); } }
        if (e.t <= 0) { e.st = 'idle'; e.t = 0.5 + rnd() * 0.5; }
      } else if (e.st === 'bats') {
        if (!e.done) { e.done = true; sfx(S, 'squeak'); for (let i = 0; i < 5; i++) shoot(S, e.face > 0 ? -10 : W + 10, fy - 30 - i * 26, (e.face > 0 ? 1 : -1) * (120 + i * 12), 0, e.atk * 0.8, { k: 'batshot', r: 6, wall: false, wave: 1 + i }); }
        if (e.t <= 0) { e.st = 'idle'; e.t = 0.5; }
      } else if (e.st === 'meteor') {
        if (e.t < 1.4 && !e.done) { e.done = true; sfx(S, 'magic'); for (let i = 0; i < 7; i++) { const x = 30 + (i + rnd() * 0.6) * (W - 60) / 7; S.fx.push({ k: 'warn', x, y: fy, t: 0.6 }); shoot(S, x, -20 - rnd() * 40, 0, 120, e.atk, { k: 'meteor', r: 7, wall: false, grav: 260, life: 3 }); } }
        if (e.t <= 0) { e.st = 'idle'; e.t = 0.4; }
      } else if (e.st === 'beam') {
        if (!e.done) { e.done = true; e.by = Math.min(fy - 14, py); S.fx.push({ k: 'warnline', y: e.by, t: 0.9 }); }
        if (e.t < 1.0 && e.by != null) { sfx(S, 'thunder'); shoot(S, W / 2, e.by, 0, 0, e.atk * 1.2, { k: 'beam', x: 0, y: e.by - 7, w: W, h: 14, life: 0.5, wall: false }); e.by = null; S.shake = 0.3; }
        if (e.t <= 0) { e.st = 'idle'; e.t = 0.4; }
      }
      break;
    }
  }
  if (e.kind !== 'golem' && e.kind !== 'sentinel' && e.kind !== 'count') { e.x = Math.max(TILE * 2, Math.min(W - TILE * 2 - e.w, e.x)); e.y = Math.max(8, Math.min(fy - e.h, e.y)); }
}

// ------------------------------------------------------------------ the expansion's monsters: behaviours from data
const PROJ = { magic: [140, 'magic', 'ltng'], fire: [150, 'fire', 'fire'], ice: [140, 'ice', 'cold'], light: [170, 'magic', 'ltng'], seed: [130, 'seed', 'pois'], venom: [130, 'venom', 'pois'] };
function aimShot(S, e, kind, n = 1) {
  const p = S.p, [spd, k, elem] = PROJ[kind] || PROJ.magic, ex = e.x + e.w / 2, ey = e.y + e.h * 0.4;
  const a0 = Math.atan2(p.y + p.h / 2 - ey, p.x + p.w / 2 - ex);
  for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.25; shoot(S, ex, ey, Math.cos(a) * spd, Math.sin(a) * spd, e.atk, { k, r: 4, elem, lvl: e.mlvl }); }
  sfx(S, kind === 'fire' ? 'fire' : 'magic');
}
function lob(S, e, kind) {
  const p = S.p, ex = e.x + e.w / 2, dx = p.x + p.w / 2 - ex, v = Math.min(230, Math.abs(dx) * 1.1 + 40);
  shoot(S, ex, e.y + 6, (Math.sign(dx) || e.face) * v * 0.7, -300, e.atk, { k: kind === 'pick' ? 'bone' : kind, grav: 800, r: kind === 'axe' ? 6 : 4, wall: false, lvl: e.mlvl, elem: 'phys' });
  sfx(S, 'throw');
}
function genericAI(S, e, dt, px, py, dx, dy, dist) {
  const B = ENEMIES[e.kind], ex = e.x + e.w / 2, multi = e.tier === 'unique' ? 3 : 1;
  const walk = (sp) => {
    if (e.t <= 0) { e.face = Math.abs(dx) < 240 ? Math.sign(dx) || 1 : -e.face; e.t = 1 + S.rnd(); }
    if (e.onG) e.vx = e.face * sp * (Math.abs(dx) < 22 ? 0.2 : 1);
    const r = ground(S, e, dt); if (r.hitX || (e.onG && ledgeAhead(S, e))) { e.face *= -1; e.t = 0.8; }
  };
  switch (B.ai) {
    case 'walker': walk(B.heavy ? 24 : 40); break;
    case 'charger':
      if (e.st === 'wind') { e.vx = 0; ground(S, e, dt); if (e.t <= 0) { e.st = 'dash'; e.t = 0.75; sfx(S, 'dash'); } break; }
      if (e.st === 'dash') { e.vx = e.face * 230; const r = ground(S, e, dt); if (r.hitX || e.t <= 0 || (e.onG && ledgeAhead(S, e))) { e.st = 'idle'; e.t = 1.3 + S.rnd(); } break; }
      if (e.t <= 0 && Math.abs(dx) < 160 && Math.abs(dy) < 40 && e.onG) { e.face = Math.sign(dx) || 1; e.st = 'wind'; e.t = 0.45; break; }
      walk(B.heavy ? 26 : 38); break;
    case 'hopper': {
      const r = ground(S, e, dt);
      if (e.onG) { e.vx = 0; if (e.t <= 0) { e.face = Math.sign(dx) || 1; e.vy = -250; e.vx = e.face * 75; e.t = 0.9 + S.rnd() * 0.8; } }
      if (r.hitX) e.vx = -e.vx; break;
    }
    case 'jumper':
      if (!e.onG) { ground(S, e, dt); break; }
      if (e.t <= 0 && dist < 170) { e.face = Math.sign(dx) || 1; e.vy = -340; e.vx = Math.max(-170, Math.min(170, dx * 1.4)); e.t = 1.8 + S.rnd(); ground(S, e, dt); break; }
      walk(36); break;
    case 'dropper':
      if (e.st === 'hang') { if (Math.abs(dx) < 26 && dy > 0) { e.st = 'fall'; sfx(S, 'flap'); } break; }
      if (e.st === 'fall') { e.vx = 0; ground(S, e, dt); if (e.onG) { e.st = 'walk'; e.t = 0.4; } break; }
      walk(48); break;
    case 'floater': {
      const sp = 42 * (B.slow || 1);
      if (dist > 1) { e.vx += (dx / dist * sp - e.vx) * dt; e.vy += (dy / dist * sp - e.vy) * dt; }
      e.face = Math.sign(dx) || 1; e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(S.time * 3 + e.hx) * 0.4; break;
    }
    case 'diver':
      if (e.st === 'dive') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy -= 260 * dt; if (e.t <= 0 || e.y < e.hy - 10) { e.st = 'idle'; e.t = 1.4 + S.rnd(); } break; }
      e.face = Math.sign(dx) || 1;
      e.x += (px - 70 * e.face - ex) * dt * 0.8; e.y += (e.hy + Math.sin(S.time * 2 + e.hx) * 10 - e.y) * dt * 2;
      if (e.t <= 0 && dist < 160) { e.st = 'dive'; e.t = 1.2; e.vx = dx * 1.3; e.vy = Math.max(120, dy * 2.2); sfx(S, 'flap'); }
      break;
    case 'flyer':
      e.face = Math.sign(dx) || 1;
      e.vx += (Math.sign(dx) * 105 - e.vx) * dt * 2; e.vy = Math.sin(S.time * 5 + e.hx) * 60 + Math.sign(dy) * 40;
      e.x += e.vx * dt; e.y += e.vy * dt; break;
    case 'caster':
      e.face = Math.sign(dx) || 1;
      if (e.fly) { const tx = px - e.face * 110, ty = py - 50 + Math.sin(S.time * 2 + e.hx) * 14; e.x += (tx - ex) * dt * 0.9; e.y += (ty - e.y) * dt * 1.2; }
      else { e.vx = 0; ground(S, e, dt); }
      if (e.t <= 0 && dist < 260) { e.t = 2.4 + S.rnd(); aimShot(S, e, B.proj, multi); }
      break;
    case 'thrower':
      e.face = Math.sign(dx) || 1; e.vx = 0; ground(S, e, dt);
      if (e.t <= 0 && Math.abs(dx) < 260) { e.t = 2.2 + S.rnd(); for (let i = 0; i < multi; i++) lob(S, e, B.proj); }
      break;
    case 'turret':
      e.face = Math.sign(dx) || 1; e.vx = 0; ground(S, e, dt);
      if (e.t <= 0 && dist < 280) { e.t = 2.2 + S.rnd() * 0.6; aimShot(S, e, B.proj, multi); }
      break;
    case 'mimic':
      if (e.st === 'disguise') { ground(S, e, dt); if (dist < 56) { e.st = 'hop'; e.face = Math.sign(dx) || 1; e.vy = -300; e.vx = e.face * 90; sfx(S, 'roar'); } break; }
      { const r = ground(S, e, dt); if (e.onG) { e.vx = 0; if (e.t <= 0) { e.face = Math.sign(dx) || 1; e.vy = -280; e.vx = e.face * 110; e.t = 0.8 + S.rnd() * 0.5; } } if (r.hitX) e.vx = -e.vx; }
      break;
    default: walk(40);
  }
}

// ------------------------------------------------------------------ the expansion's bosses: a body and a list of attacks
const GB_DUR = { fan: 1.1, ring: 1.2, charge: 2.2, leap: 1.6, swoop: 1.5, summon: 1.0, pillars: 1.6, meteor: 1.8, beam: 1.9, warp: 1.0, breath: 1.6, spikes: 1.5, bounce: 1.2, rain: 2.0 };
function gbossShot(S, e, x, y, vx, vy, o = {}) {
  const el = BOSSES[e.kind].elem, k = { fire: 'fire', cold: 'ice', ltng: 'magic', pois: 'venom', phys: 'orb' }[el];
  shoot(S, x, y, vx, vy, e.atk * (o.mult || 0.9), { k, r: 5, elem: el === 'phys' ? 'phys' : el, lvl: e.mlvl, ...o });
}
function gbossAI(S, e, dt, px, py) {
  const B = BOSSES[e.kind], R = S.R, fy = R.floorY(0) * TILE, W = R.W * TILE, ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = px - ex;
  const half = e.hp < e.mhp / 2, rnd = S.rnd;
  if (!S.sealed) return;
  if (e.st === 'intro') { e.st = 'idle'; e.t = 1; }
  const fly = !!B.fly;
  if (!fly && e.st !== 'leap' && e.st !== 'warp') ground(S, e, dt);
  const end = () => { e.st = 'idle'; e.t = (half ? 0.45 : 0.85) + rnd() * 0.5; e.vx = 0; };
  if (e.st === 'idle') {
    e.face = Math.sign(dx) || 1;
    if (fly) { const tx = W / 2 + Math.sin(S.time * 0.8) * W * 0.32, ty = fy - 80 + Math.sin(S.time * 1.6) * 18; e.x += (tx - ex) * dt * 1.4; e.y += (ty - ey) * dt * 1.4; }
    else e.vx = Math.abs(dx) > 50 ? e.face * (half ? 52 : 36) : 0;
    if (e.t <= 0) { let m = B.moves[Math.floor(rnd() * B.moves.length)]; if (m === 'charge' && fly) m = 'swoop'; if (m === 'swoop' && !fly) m = 'charge'; e.st = m; e.t = GB_DUR[m]; e.done = false; e.n = 0; }
    return;
  }
  const P = S.p;
  switch (e.st) {
    case 'fan':
      if (e.t < 0.7 && !e.done) { e.done = true; const n = half ? 7 : 5, a0 = Math.atan2(py - ey, dx); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.22; gbossShot(S, e, ex, ey, Math.cos(a) * 150, Math.sin(a) * 150); } sfx(S, 'magic'); }
      if (e.t <= 0) end(); break;
    case 'ring':
      if (e.t < 0.8 && !e.done) { e.done = true; const n = half ? 14 : 10, off = rnd(); for (let i = 0; i < n; i++) { const a = (i / n + off) * Math.PI * 2; gbossShot(S, e, ex, ey, Math.cos(a) * 125, Math.sin(a) * 125, { wall: false, life: 3 }); } sfx(S, 'magic'); }
      if (e.t <= 0) end(); break;
    case 'charge':
      if (e.t > 1.6) { e.vx = 0; e.face = Math.sign(dx) || 1; }
      else { e.vx = e.face * 290; const hitWall = e.x <= TILE * 2 || e.x + e.w >= W - TILE * 2; if (hitWall || e.t <= 0) { if (hitWall) { S.shake = 0.4; sfx(S, 'slam'); for (let i = 0; i < 4; i++) shoot(S, 40 + rnd() * (W - 80), 18, 0, 30, e.atk * 0.7, { k: 'rock', grav: 450, r: 6, wall: false, lvl: e.mlvl }); } end(); } }
      break;
    case 'leap':
      if (!e.done) { e.done = true; e.vy = -470; e.vx = Math.max(-270, Math.min(270, dx * 1.3)); e.air = true; sfx(S, 'jump'); }
      { const r = ground(S, e, dt); e.onG = r.landed || e.onG; }
      if (e.air && e.onG && e.vy >= 0 && e.t < GB_DUR.leap - 0.2) { e.air = false; S.shake = 0.4; sfx(S, 'slam'); e.vx = 0; for (const d of [-1, 1]) shoot(S, ex + d * 24, fy - 8, d * 200, 0, e.atk * 0.8, { k: 'wave', r: 7, life: 2.5, lvl: e.mlvl }); }
      if (e.t <= 0) { e.air = false; end(); } break;
    case 'swoop':
      if (!e.done) { e.done = true; e.sx = ex; e.sy = ey; e.tx = px; e.ty = py; e.k = 0; sfx(S, 'flap'); }
      e.k = Math.min(1, e.k + dt / 1.3);
      e.x = e.sx + (e.tx + (e.tx - e.sx) * 0.4 - e.sx) * e.k - e.w / 2; e.y = e.sy + (e.ty - e.sy) * Math.sin(e.k * Math.PI) * 1.05 - e.h / 2;
      if (e.k >= 1) end(); break;
    case 'summon':
      if (!e.done) { e.done = true; sfx(S, 'magic'); const kind = B.minion || AREAS[R.room.area].enemies[0]; for (let i = 0; i < (half ? 3 : 2); i++) { const m = spawnEnemy(S, kind, Math.max(40, Math.min(W - 40, ex + (i - 1) * 50)), fy, e.mlvl - 1); m.exp = 0; m.drops = { heart: 0.5 }; if (ENEMIES[kind].ai === 'mimic') m.st = 'hop'; } }
      if (e.t <= 0) end(); break;
    case 'pillars':
      if (!e.done) { e.done = true; e.cols = (half ? [px, px - 60, px + 60, px - 120, px + 120] : [px, px - 70, px + 70]).map((x) => Math.max(20, Math.min(W - 20, x))); for (const x of e.cols) S.fx.push({ k: 'warn', x, y: fy, t: 0.8 }); }
      if (e.t < 0.8 && e.cols) { sfx(S, 'thunder'); for (const x of e.cols) shoot(S, x, fy - 90, 0, 0, e.atk * 1.1, { k: 'pillar', w: 16, h: 180, x: x - 8, y: fy - 180, life: 0.45, wall: false, elem: 'ltng', lvl: e.mlvl }); e.cols = null; S.shake = 0.2; }
      if (e.t <= 0) end(); break;
    case 'meteor':
      if (e.t < 1.4 && !e.done) { e.done = true; sfx(S, 'magic'); for (let i = 0; i < (half ? 9 : 7); i++) { const x = 30 + (i + rnd() * 0.6) * (W - 60) / (half ? 9 : 7); S.fx.push({ k: 'warn', x, y: fy, t: 0.6 }); shoot(S, x, -20 - rnd() * 40, 0, 120, e.atk, { k: 'meteor', r: 7, wall: false, grav: 260, life: 3, elem: 'fire', lvl: e.mlvl }); } }
      if (e.t <= 0) end(); break;
    case 'beam':
      if (!e.done) { e.done = true; e.by = Math.min(fy - 14, py); S.fx.push({ k: 'warnline', y: e.by, t: 0.9 }); }
      if (e.t < 1.0 && e.by != null) { sfx(S, 'thunder'); shoot(S, W / 2, e.by, 0, 0, e.atk * 1.2, { k: 'beam', x: 0, y: e.by - 7, w: W, h: 14, life: 0.5, wall: false, elem: 'fire', lvl: e.mlvl }); e.by = null; S.shake = 0.3; }
      if (e.t <= 0) end(); break;
    case 'warp':
      e.vis = e.t > 0.5 ? (e.t - 0.5) / 0.5 : (0.5 - e.t) / 0.5;
      if (e.t <= 0.5 && !e.done) { e.done = true; let nx; do { nx = 50 + rnd() * (W - 100); } while (Math.abs(nx - px) < 90); e.x = nx - e.w / 2; e.y = fly ? fy - 80 - rnd() * 30 : fy - e.h; }
      if (e.vis < 0.3) e.vis = 0;
      if (e.t <= 0) { e.vis = 1; end(); } break;
    case 'breath':
      if (e.t < 1.3 && e.t > 0.2) { e.n += dt; if (e.n > 0.08) { e.n = 0; const a = Math.atan2(py - ey, dx) + (rnd() - 0.5) * 0.5; gbossShot(S, e, ex + e.face * e.w * 0.4, ey - e.h * 0.15, Math.cos(a) * 190, Math.sin(a) * 190, { mult: 0.6, life: 1.6 }); } if (!e.done) { e.done = true; sfx(S, 'fire'); } }
      if (e.t <= 0) end(); break;
    case 'spikes':
      if (!e.done) { e.done = true; e.cols = [px, px + 40 * (rnd() < 0.5 ? -1 : 1), px - 90, px + 90].map((x) => Math.max(20, Math.min(W - 20, x))); for (const x of e.cols) S.fx.push({ k: 'warn', x, y: fy, t: 0.7 }); }
      if (e.t < 0.8 && e.cols) { sfx(S, 'slam'); for (const x of e.cols) shoot(S, x, fy - 30, 0, 0, e.atk, { k: 'spike', w: 14, h: 60, x: x - 7, y: fy - 60, life: 0.5, wall: false, lvl: e.mlvl }); e.cols = null; S.shake = 0.2; }
      if (e.t <= 0) end(); break;
    case 'bounce':
      if (e.t < 0.9 && !e.done) { e.done = true; for (let i = 0; i < (half ? 3 : 2); i++) gbossShot(S, e, ex, ey, (Math.sign(dx) || 1) * (90 + i * 50), -260, { r: 9, grav: 520, bounce: 3, wall: false, life: 6, mult: 1 }); sfx(S, 'throw'); }
      if (e.t <= 0) end(); break;
    case 'rain':
      e.n += dt; if (e.n > (half ? 0.1 : 0.14) && e.t > 0.3) { e.n = 0; gbossShot(S, e, 20 + rnd() * (W - 40), -10, 0, 150, { wall: false, life: 3, mult: 0.7 }); }
      if (e.t <= 0) end(); break;
    default: end();
  }
  e.x = Math.max(TILE * 2, Math.min(W - TILE * 2 - e.w, e.x)); e.y = Math.max(8, Math.min(fy - e.h, e.y));
  void P;
}

// ------------------------------------------------------------------ projectiles
function updateShots(S, dt) {
  const p = S.p;
  for (const s of S.shots) {
    s.t += dt; s.life -= dt;
    if (s.k === 'cross') { s.vx -= s.dir * (s.boom ? 420 : 520) * dt; if (s.t > 0.4 && Math.abs((s.x + 7) - (p.x + p.w / 2)) < 14 && Math.abs((s.y + 7) - (p.y + 10)) < 24) s.life = 0; }
    if (s.k === 'bible') { s.orbit += dt * 5; s.x = p.x + p.w / 2 + Math.cos(s.orbit) * 30 - s.w / 2; s.y = p.y + 12 + Math.sin(s.orbit) * 30 - s.h / 2; s.vx = s.vy = 0; if (Math.floor(s.t * 3) !== s.tick) { s.tick = Math.floor(s.t * 3); s.hit = new Set(); } }
    if (s.grav) s.vy += s.grav * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    const landed = (solidAt(S, s.x + 4, s.y + 8) || tileAt(S, Math.floor((s.x + 4) / TILE), Math.floor((s.y + 8) / TILE)) === T.PLAT && s.vy > 0);
    if (s.k === 'holy' && !s.burn && landed) {
      s.burn = true; s.vx = s.vy = s.grav = 0; s.y = Math.floor((s.y + 8) / TILE) * TILE - 18; s.x -= 12; s.w = 32; s.h = 18; s.life = 1.2; s.hit = new Set(); sfx(S, 'burn');
    }
    if (s.k === 'bomb' && !s.boomed && (landed || S.ents.some((e) => !e.dead && overlap(s, e)))) {
      s.boomed = true; s.k = 'blast'; s.vx = s.vy = s.grav = 0; s.x -= 24; s.y -= 24; s.w = 56; s.h = 48; s.life = 0.35; s.hit = new Set(); S.shake = 0.2; sfx(S, 'slam');
    }
    if (s.burn && Math.floor(s.t * 4) !== s.tick) { s.tick = Math.floor(s.t * 4); s.hit = new Set(); }
    if ((s.k === 'dagger' || s.k === 'fire' || s.k === 'star' || s.k === 'javelin') && solidAt(S, s.x + s.w / 2, s.y + s.h / 2)) s.life = 0;
    if (s.k === 'bomb') continue;
    for (const e of S.ents) if (!e.dead && !s.hit.has(e) && overlap(s, e)) { s.hit.add(e); hitEnemy(S, e, s.dmg, s.x + s.w / 2, s.k); if (s.k === 'dagger' || s.k === 'fire' || s.k === 'star') { s.life = 0; break; } }
    for (const c of S.props) if (c.kind === 'candle' && !c.gone && overlap(s, c)) breakCandle(S, c);
  }
  S.shots = S.shots.filter((s) => s.life > 0 && s.x > -60 && s.x < S.R.W * TILE + 60 && s.y < S.R.H * TILE + 60);
  for (const s of S.eshots) {
    s.t += dt; s.life -= dt;
    if (s.grav) s.vy += s.grav * dt;
    if (s.wave) s.vy = Math.sin(s.t * 6 + s.wave) * 70;
    if (s.bounce && s.vy > 0 && solidAt(S, s.x + s.w / 2, s.y + s.h + s.vy * dt)) { s.vy = -Math.abs(s.vy) * 0.85; s.bounce--; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.wall && solidAt(S, s.x + s.w / 2, s.y + s.h / 2)) s.life = 0;
    if ((s.k === 'meteor' || s.k === 'rock' || s.k === 'gear') && s.vy > 0 && s.y > 0 && solidAt(S, s.x + s.w / 2, s.y + s.h)) { s.life = 0; burst(S, s.x + s.w / 2, s.y + s.h, s.k === 'meteor' ? '#c060ff' : '#c8b890', 6, 60); }
    if (overlap(s, p)) {
      const elem = s.elem || ({ fire: 'fire', orb: 'fire', meteor: 'fire', magic: 'ltng', pillar: 'ltng', beam: 'fire', ice: 'cold', venom: 'pois' }[s.k]) || 'phys';
      const r = hurtPlayer(S, s.dmg, s.x + s.w / 2, elem, { lvl: s.lvl });
      // a blocking shield with "reflect" sends small projectiles back
      if (r === 'block' && stats(p).reflect && s.k !== 'pillar' && s.k !== 'beam' && s.k !== 'wave') { S.shots.push({ k: 'fire', x: s.x, y: s.y, w: s.w, h: s.h, vx: -s.vx || p.face * 200, vy: -s.vy, dmg: s.dmg * 2, life: 1, hit: new Set(), t: 0 }); s.life = 0; continue; }
      if (s.k !== 'pillar' && s.k !== 'beam' && s.k !== 'wave') s.life = 0;
    }
  }
  S.eshots = S.eshots.filter((s) => s.life > 0 && s.x > -80 && s.x < S.R.W * TILE + 80 && s.y < S.R.H * TILE + 40);
}
// auto pick-up of gear: 'all', 'magic' (magic or better, the default) or 'rare'; anything else with ↑
export const PICKUP_RANK = { n: 0, s: 0, m: 1, r: 2, set: 3, u: 3 };
const autoPick = (S, it) => { const mode = S.flags.pickup || 'magic'; return mode === 'all' || PICKUP_RANK[it.q] >= (mode === 'rare' ? 2 : 1); };
function updateDrops(S, dt, inp) {
  const p = S.p;
  for (const d of S.drops) {
    d.t -= dt;
    if (!d.rest) { d.vy = Math.min(PH.FALL, d.vy + PH.G * dt); const r = moveBody(S, d, dt); if (r.landed || onGroundCheck(S, d)) { d.rest = true; d.vx = 0; } else d.vx *= Math.pow(0.3, dt); }
    d.near = overlap({ x: d.x - 4, y: d.y - 6, w: d.w + 8, h: d.h + 12 }, p) && !p.dead && !p.bat && !p.mist;
    if (!d.near) { d.full = false; continue; }
    if (d.k === 'gear') {
      if (!autoPick(S, d.it) && !(inp && inp.pressed.up)) continue;
      if (!giveGear(S, d.it)) { if (!d.full) { d.full = true; S.ev.push({ t: 'toast', key: 'bagFull' }); sfx(S, 'no'); } continue; }
      d.t = -1; S.ev.push({ t: 'gotgear', it: d.it }); sfx(S, d.it.q === 'u' || d.it.q === 'set' ? 'relic' : 'item'); continue;
    }
    d.t = -1;
    if (d.k === 'heart') { p.hearts = Math.min(p.mhearts, p.hearts + d.n); sfx(S, 'heart'); }
    if (d.k === 'gold') { p.gold += d.n; addText(S, d.x + 5, d.y - 4, d.n + 'G', '#ffd76a'); sfx(S, 'coin'); }
    if (d.k === 'item') { giveItem(S, d.item); S.ev.push({ t: 'got', item: d.item }); sfx(S, 'item'); }
    if (d.k === 'gem') { p.gems[d.g] = (p.gems[d.g] || 0) + 1; (S.flags.found ||= {})['gem:' + d.g.replace(/\d/, '')] = 1; S.ev.push({ t: 'gotgem', g: d.g }); sfx(S, 'item'); }
    if (d.k === 'sub') {   // a sub-weapon from a big candle: wield it now, the old one goes into the bag
      const it = I.makeItem(d.sub, 'n', S.mlvl || 1, S.rnd); delete it.s;
      if (p.eq.sub && !giveGear(S, p.eq.sub)) dropAt(S, p.x + p.w / 2, p.y, { k: 'gear', it: p.eq.sub });
      p.eq.sub = it; stats(p); S.ev.push({ t: 'gotsub', it }); sfx(S, 'item');
    }
  }
  S.drops = S.drops.filter((d) => d.t > 0);
}
function updateProps(S, dt, inp) {
  const p = S.p;
  for (const q of S.props) {
    if (q.gone) continue;
    if (q.kind === 'item' || q.kind === 'relic') {
      q.y = q.by + Math.sin(S.time * 3) * 2;
      if (overlap(q, p)) {
        q.gone = true; S.flags.taken[S.roomId] = 1;
        if (q.kind === 'item' && q.gear) {   // a placed weapon or armour: a rolled item of a set quality
          const [b, qq, uid] = ROOM_GEAR[q.item], it = I.makeItem(b, qq, Math.max(S.mlvl || 1, I.BASES[b].q + 2), S.rnd, { id: uid });
          if (!giveGear(S, it)) dropAt(S, q.x + 6, q.y + 6, { k: 'gear', it }); else S.ev.push({ t: 'gotgear', it, big: true });
          sfx(S, 'relic');
        } else if (q.kind === 'item') { giveItem(S, q.item); S.ev.push({ t: 'got', item: q.item, big: true }); sfx(S, 'item'); }
        else { p.relics[q.relic] = 1; S.ev.push({ t: 'relic', id: q.relic }); sfx(S, 'relic'); burst(S, q.x + 7, q.y + 7, '#c8b0ff', 30, 120); }
      }
    }
    if (q.kind === 'save') {
      const near = overlap({ x: q.x - 8, y: q.y, w: q.w + 16, h: q.h }, p);
      q.near = near;
      if (near && !q.used && !p.bat) {
        q.used = true; p.hp = p.mhp; p.mp = p.mmp; S.saveRoom = S.roomId;
        S.ev.push({ t: 'save' }); sfx(S, 'save'); burst(S, q.x + 10, q.y + 20, '#ff6a8a', 24, 80);
      }
      if (!near) q.used = false;
    }
    if (q.kind === 'warp') {
      const near = overlap(q, p); q.near = near;
      if (near && !q.used && p.ground && !p.bat && !p.mist) { q.used = true; S.ev.push({ t: 'warpmenu' }); sfx(S, 'magic'); }
      if (!near) q.used = false;
    }
    if (q.kind === 'chest' && !q.open && overlap(q, p)) {
      q.open = true; S.flags.taken[S.roomId] = 1; sfx(S, 'relic'); burst(S, q.x + 10, q.y + 4, '#ffe070', 24, 110);
      const m = (S.mlvl || 1) + 2; rollLoot(S, m, 'unique', q.x + 10, q.y); dropAt(S, q.x + 10, q.y, { k: 'gold', n: Math.round((40 + m * 25) * (1 + stats(p).gf / 100)) });
      if (S.rnd() < 0.5) dropAt(S, q.x + 10, q.y, { k: 'item', item: potionFor(m, S.rnd) });
    }
    if (q.kind === 'portal') {
      q.near = overlap(q, p);
      if (q.near && inp.pressed.up && p.ground) { goPortal(S, q.to); return; }
    }
    if (q.kind === 'shop') {
      q.near = overlap({ x: q.x - 16, y: q.y, w: q.w + 32, h: q.h }, p);
      if (q.near && inp.pressed.up && p.ground) S.ev.push({ t: 'shop' });
      if (q.near && !S.flags.seen.librarian) { S.flags.seen.librarian = 1; S.ev.push({ t: 'dialog', id: 'librarian' }); }
    }
  }
}
function updateFx(S, dt) {
  for (const f of S.fx) { f.t -= dt; if (f.k === 'spark') { f.vy += 260 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } }
  S.fx = S.fx.filter((f) => f.t > 0);
  for (const t of S.texts) { t.t -= dt; t.y -= 24 * dt; }
  S.texts = S.texts.filter((t) => t.t > 0);
}

// ------------------------------------------------------------------ warping
export function warpRooms(S) { return Object.keys(S.flags.warps || {}).filter((id) => ROOM[id] && (ROOM[id].world || 'normal') === (S.world || 'normal')); }
export function warpTo(S, id) {
  if (!ROOM[id] || ROOM[id].special !== 'warp') return false;
  loadRoom(S, id, null);
  const w = S.props.find((q) => q.kind === 'warp'); w.used = true;
  S.p.x = w.x + w.w / 2 - S.p.w / 2; S.p.y = S.R.floorY(0) * TILE - S.p.h; S.p.vx = S.p.vy = 0;
  burst(S, S.p.x + 5, S.p.y + 14, '#9ae8ff', 24, 90); sfx(S, 'save'); return true;
}
function goPortal(S, to) {
  const first = to === 'R:r1' && !S.flags.seen.reversed;
  loadRoom(S, to, null);
  const q = S.props.find((x) => x.kind === 'portal');
  S.p.x = (q ? q.x + q.w / 2 : 3 * TILE) - S.p.w / 2; S.p.y = S.R.floorY(0) * TILE - S.p.h; S.p.vx = S.p.vy = 0;
  sfx(S, 'relic'); S.shake = 0.4;
  if (first) { S.flags.seen.reversed = 1; S.ev.push({ t: 'dialog', id: 'reversed' }); }
}
// the faerie heals you when life runs low
function fairyTick(S, dt) {
  const p = S.p; if (!p.relics.fairy || p.hp <= 0) return;
  S.fairyT = (S.fairyT || 0) - dt;
  if (p.hp < p.mhp * 0.35 && S.fairyT <= 0) { const h = Math.round(p.mhp * 0.3); p.hp = Math.min(p.mhp, p.hp + h); S.fairyT = 40; addText(S, p.x + p.w / 2, p.y - 10, '+' + h, '#ffb0f0'); burst(S, p.x + p.w / 2, p.y, '#ffb0f0', 20, 70); sfx(S, 'heal'); S.ev.push({ t: 'toast', key: 'fairyHeal' }); }
}

// ------------------------------------------------------------------ room exits
function checkExit(S) {
  const p = S.p, R = S.R, r = R.room;
  const cxp = p.x + p.w / 2, cyp = p.y + p.h / 2;
  if (cxp >= 0 && cxp < R.W * TILE && cyp >= 0 && cyp < R.H * TILE) return;
  const wx = r.x * CW * TILE + cxp, wy = r.y * CH * TILE + cyp;
  const nr = roomAt(Math.floor(wx / (CW * TILE)), Math.floor(wy / (CH * TILE)));
  if (!nr) { p.x = Math.max(0, Math.min(R.W * TILE - p.w, p.x)); p.y = Math.max(0, Math.min(R.H * TILE - p.h, p.y)); return; }
  const lx = wx - nr.x * CW * TILE, ly = wy - nr.y * CH * TILE;
  loadRoom(S, nr.id, { x: lx, y: ly });
  p.x = lx - p.w / 2; p.y = ly - p.h / 2;
  if (cyp < 0 && !p.bat && !p.mist) { p.vy = Math.min(p.vy, -280); p.boostT = 0.25; }        // climbing up through a floor hole: a little help onto the ledge
  // first visits: story beats
  const rr = ROOM[nr.id];
  if (!S.flags.seen['room_' + nr.id]) {
    S.flags.seen['room_' + nr.id] = 1;
    if (nr.id === 't3') S.ev.push({ t: 'dialog', id: 'elise' });
    if (nr.id === 'c1') S.ev.push({ t: 'toast', key: 'catacombsHint' });
  }
  if (rr.boss && !S.flags.boss[rr.boss] && !S.flags.seen['boss_' + rr.boss]) { S.flags.seen['boss_' + rr.boss] = 1; S.ev.push({ t: 'dialog', id: 'boss_' + rr.boss }); }
}

// like Symphony of the Night: up to 100% for each castle, so up to 200% in all
let CELLS_PER_WORLD = 0; for (const r of ROOMS) if (r.world !== 'rev') CELLS_PER_WORLD += r.w * r.h;
export function explored(S) {
  return Math.round(Object.keys(S.flags.visited).length / CELLS_PER_WORLD * 1000) / 10;
}
