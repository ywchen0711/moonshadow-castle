// Moonshadow Castle game logic: player physics and abilities, combat, enemies, bosses, drops, levels, rooms.
// No DOM here: main.js feeds input and reads S; tools/test.mjs drives it headless.
import { TILE, CW, CH, AREAS, ROOM, ROOMS, RELICS, ENEMIES, BOSSES, ITEMS, DROP_TABLE, SUBS, SUB_SPOTS, LEVEL_EXP } from './data.js?v=1';
import { T, buildRoom, roomAt } from './world.js?v=1';

export const PH = { G: 900, JUMP: 335, DJUMP: 300, WALK: 112, FALL: 400, SLIDE: 230, DASH: 210, BAT: 125, W: 10, H: 28, HC: 14 };
const roomCache = {};
export const getRoom = (id) => (roomCache[id] ||= buildRoom(id));

function mkRng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ------------------------------------------------------------------ new game / save
export function newPlayer() {
  return {
    x: 0, y: 0, w: PH.W, h: PH.H, vx: 0, vy: 0, face: 1, ground: false, jumps: 0, crouch: false,
    atkT: 0, atkDur: 0, swing: 0, slideT: 0, dashT: 0, hurtT: 0, inv: 0, bat: false, anim: 0, dropT: 0, coyote: 0, jumpBuf: 0,
    lv: 1, exp: 0, hp: 80, mhp: 80, mp: 20, mmp: 20, hearts: 10, mhearts: 30, gold: 0,
    str: 6, con: 4, lck: 5, equip: { weapon: 'shortsword', armor: 'tunic', acc: null },
    items: { potion: 2 }, gear: { shortsword: 1, tunic: 1 }, sub: null, relics: {}, kills: 0,
  };
}
export function newState(seed = Date.now()) {
  const S = {
    p: newPlayer(), roomId: null, R: null, ents: [], shots: [], eshots: [], drops: [], fx: [], texts: [], props: [],
    flags: { taken: {}, boss: {}, seen: {}, visited: {} }, time: 0, sealed: false, boss: null, ev: [], cam: { x: 0, y: 0 },
    shake: 0, rnd: mkRng(seed), saveRoom: 'r1', deaths: 0, playTime: 0, over: false, won: false, fade: 0,
  };
  loadRoom(S, 'r1', null);
  const r = S.R; S.p.x = 3 * TILE; S.p.y = r.floorY(0) * TILE - PH.H;
  return S;
}
export function stats(p) {
  const w = ITEMS[p.equip.weapon] || ITEMS.shortsword, a = ITEMS[p.equip.armor] || { def: 0 }, c = (p.equip.acc && ITEMS[p.equip.acc]) || {};
  return { atk: p.str + w.atk + (c.str || 0), def: p.con + a.def + (c.con || 0), lck: p.lck + (c.lck || 0), reach: w.reach, time: w.time };
}
const SAVE_KEYS = ['lv', 'exp', 'hp', 'mhp', 'mp', 'mmp', 'hearts', 'mhearts', 'gold', 'str', 'con', 'lck', 'equip', 'items', 'gear', 'sub', 'relics', 'kills'];
export function toSave(S) {
  const p = {}; for (const k of SAVE_KEYS) p[k] = JSON.parse(JSON.stringify(S.p[k]));
  return { v: 1, p, flags: S.flags, room: S.saveRoom, deaths: S.deaths, playTime: S.playTime };
}
export function fromSave(d, seed = Date.now()) {
  const S = newState(seed);
  Object.assign(S.p, JSON.parse(JSON.stringify(d.p)));
  S.flags = JSON.parse(JSON.stringify(d.flags)); S.flags.visited ||= {}; S.flags.seen ||= {};
  S.deaths = d.deaths || 0; S.playTime = d.playTime || 0; S.saveRoom = d.room || 'r1';
  S.p.hp = S.p.mhp; S.p.mp = S.p.mmp;
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
const solidT = (S, t) => t === T.SOLID || t === T.BREAK || (t === T.SEAL && S.sealed);
function solidAt(S, px, py) { return solidT(S, tileAt(S, Math.floor(px / TILE), Math.floor(py / TILE))); }
function boxSolid(S, x, y, w, h) {
  for (let ty = Math.floor(y / TILE); ty <= Math.floor((y + h - 0.01) / TILE); ty++)
    for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 0.01) / TILE); tx++) if (solidT(S, tileAt(S, tx, ty))) return true;
  return false;
}
// move a body with tile collisions; platforms only catch from above. Returns {hitX, hitY, landed}
function moveBody(S, b, dt, opts = {}) {
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
  S.roomId = id; S.R = R; S.ents = []; S.shots = []; S.eshots = []; S.drops = []; S.props = []; S.texts = []; S.sealed = false; S.boss = null;
  S.fade = 0.25;
  const rnd = S.rnd, lv = area.lv;
  const spot = (cx, row, f) => ({ x: (cx * CW + 3 + f * (CW - 6)) * TILE, y: R.floorY(row) * TILE });
  const entryCell = entry ? { cx: Math.floor(entry.x / (CW * TILE)), row: Math.floor(entry.y / (CH * TILE)) } : null;
  // candles: two per cell
  for (let row = 0; row < r.h; row++) for (let cx = 0; cx < r.w; cx++) for (const f of [0.18, 0.82]) {
    const s = spot(cx, row, f + (rnd() - 0.5) * 0.08);
    S.props.push({ kind: 'candle', x: s.x, y: s.y - 52, w: 8, h: 14 });
  }
  if (SUB_SPOTS[id]) { const c = S.props.filter((q) => q.kind === 'candle')[1]; if (c) { c.sub = SUB_SPOTS[id]; c.big = true; } }
  if (r.special === 'save') { const s = spot(0, 0, 0.5); S.props.push({ kind: 'save', x: s.x, y: s.y - 40, w: 20, h: 40 }); }
  if (r.special === 'shop') { const s = spot(0, 0, 0.62); S.props.push({ kind: 'shop', x: s.x, y: s.y - 30, w: 16, h: 30 }); }
  if (r.item && !S.flags.taken[id]) { const s = spot(r.w - 1, r.h - 1, 0.5); S.props.push({ kind: 'item', item: r.item, x: s.x - 6, y: s.y - 34, w: 12, h: 12, by: s.y - 34 }); }
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
  }
  const cam = S.cam; cam.x = cam.y = null;
  S.ev.push({ t: 'room', id, area: r.area });
}
function scale(base, lv) { return { hp: Math.round(base.hp * (1 + 0.32 * (lv - 1))), atk: base.atk + 3 * (lv - 1), def: base.def + Math.floor((lv - 1) / 2), exp: Math.round(base.exp * (1 + 0.6 * (lv - 1))) }; }
export function spawnEnemy(S, kind, x, floorPx, lv) {
  const b = ENEMIES[kind], sc = scale(b, lv);
  const e = { kind, x: x - b.w / 2, y: floorPx - b.h, w: b.w, h: b.h, vx: 0, vy: 0, hp: sc.hp, mhp: sc.hp, atk: sc.atk, def: sc.def, exp: sc.exp, lv,
    face: -1, t: S.rnd() * 2, st: 'idle', flash: 0, fly: !!b.fly, phase: !!b.phase, drops: b.drops, hx: x, hy: floorPx - b.h, swingHit: -1, kb: 0 };
  if (e.fly) { e.y = floorPx - 70 - S.rnd() * 40; e.hy = e.y; }
  if (kind === 'bat') { e.y = (Math.floor((floorPx - 1) / (CH * TILE)) * CH + 1) * TILE + 1; e.hy = e.y; e.st = 'hang'; }
  if (kind === 'zombie') { e.st = 'under'; e.t = 0.5 + S.rnd() * 2; }
  if (kind === 'medusa') { e.st = 'wave'; e.vx = (S.rnd() < 0.5 ? -1 : 1) * 70; e.face = Math.sign(e.vx); }
  S.ents.push(e);
  return e;
}
function spawnBoss(S, kind, lv) {
  const b = BOSSES[kind], R = S.R;
  const fy = R.floorY(0) * TILE;
  const e = { kind, boss: true, x: R.W * TILE * 0.7 - b.w / 2, y: fy - b.h, w: b.w, h: b.h, vx: 0, vy: 0, hp: b.hp, mhp: b.hp, atk: b.atk, def: b.def, exp: b.exp,
    face: -1, t: 1.6, st: 'intro', flash: 0, fly: kind === 'greatbat' || kind === 'witch', swingHit: -1, phase2: false, n: 0, vis: 1 };
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
function gainExp(S, n) {
  const p = S.p; p.exp += n;
  while (p.exp >= expToNext(p)) {
    p.exp -= expToNext(p); p.lv++;
    p.mhp += 9; p.mmp += 3; p.str += 1; p.con += 1; if (p.lv % 2) p.lck += 1;
    p.hp = Math.min(p.mhp, p.hp + 30); p.mp = Math.min(p.mmp, p.mp + 10);
    S.ev.push({ t: 'levelup', lv: p.lv }); sfx(S, 'level');
    addText(S, p.x + p.w / 2, p.y - 10, 'LEVEL UP', '#ffe070');
  }
}
export function giveItem(S, id, n = 1) {
  const p = S.p, it = ITEMS[id];
  if (it.kind === 'up') {
    if (id === 'hpup') { p.mhp += 20; p.hp = p.mhp; } else if (id === 'mpup') { p.mmp += 10; p.mp = p.mmp; } else { p.mhearts += 10; p.hearts = p.mhearts; }
  } else if (it.kind === 'use') p.items[id] = (p.items[id] || 0) + n;
  else p.gear[id] = (p.gear[id] || 0) + n;
}
export function useItem(S, id) {
  const p = S.p, it = ITEMS[id];
  if (!p.items[id] || it.kind !== 'use') return false;
  if (it.heal && p.hp >= p.mhp && !(it.mp && p.mp < p.mmp)) return false;
  if (!it.heal && it.mp && p.mp >= p.mmp) return false;
  p.items[id]--; if (!p.items[id]) delete p.items[id];
  if (it.heal) { const h = Math.min(it.heal, p.mhp - p.hp); p.hp += h; addText(S, p.x + p.w / 2, p.y, '+' + h, '#7dff9a'); }
  if (it.mp) p.mp = p.mmp;
  sfx(S, 'heal'); burst(S, p.x + p.w / 2, p.y + 14, '#9effc0', 12, 50);
  return true;
}
export function equip(S, id) {
  const p = S.p, it = ITEMS[id];
  if (!p.gear[id] && id !== null) return false;
  const slot = it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? 'armor' : 'acc';
  p.equip[slot] = p.equip[slot] === id && slot === 'acc' ? null : id;
  return true;
}
export function buy(S, id) {
  const p = S.p, it = ITEMS[id];
  if (p.gold < it.price) return false;
  p.gold -= it.price; giveItem(S, id); sfx(S, 'buy');
  return true;
}
export const sellPrice = (id) => Math.floor((ITEMS[id].price || 100) / 3);
export function sell(S, id) {
  const p = S.p, it = ITEMS[id];
  const bag = it.kind === 'use' ? p.items : p.gear;
  if (!bag[id]) return false;
  if (it.kind !== 'use' && Object.values(p.equip).includes(id) && bag[id] <= 1) return false;
  bag[id]--; if (!bag[id]) delete bag[id];
  p.gold += sellPrice(id); sfx(S, 'buy');
  return true;
}

// ------------------------------------------------------------------ damage
function hurtPlayer(S, dmg, fromX) {
  const p = S.p;
  if (p.inv > 0 || p.hp <= 0 || S.won) return;
  const d = Math.max(1, Math.round(dmg - stats(p).def * 0.6));
  p.hp = Math.max(0, p.hp - d);
  addText(S, p.x + p.w / 2, p.y, d, '#ff6a6a');
  p.inv = 1.1; S.shake = 0.18; sfx(S, 'hurt');
  if (!p.bat) {
    p.hurtT = 0.32; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 130; p.vy = -190; p.atkT = 0; p.slideT = 0; p.dashT = 0;
  }
  if (p.hp <= 0) { p.bat = false; p.h = PH.H; S.over = true; S.overT = 0; S.ev.push({ t: 'dead' }); sfx(S, 'dead'); }
}
function hitEnemy(S, e, base, fromX, kind) {
  if (e.dead || e.hp <= 0 || (e.boss && e.vis === 0) || e.st === 'under') return false;
  const p = S.p, st = stats(p);
  const crit = S.rnd() < 0.04 + st.lck * 0.004;
  let d = Math.max(1, Math.round((base - e.def) * (0.92 + S.rnd() * 0.16) * (crit ? 1.6 : 1)));
  e.hp -= d; e.flash = 0.12;
  addText(S, e.x + e.w / 2, e.y - 2, d, crit ? '#ffe070' : '#ffffff');
  sfx(S, e.boss ? 'hitboss' : 'hit');
  if (!e.boss && kind !== 'holy') { e.kb = 0.12; e.kbv = (e.x + e.w / 2 < fromX ? -1 : 1) * 90; }
  if (e.boss && !e.phase2 && e.kind === 'count' && e.hp <= e.mhp / 2) { e.phase2 = true; e.st = 'transform'; e.t = 2.2; e.vis = 1; S.ev.push({ t: 'dialog', id: 'count2' }); sfx(S, 'roar'); }
  if (e.hp <= 0) killEnemy(S, e);
  return true;
}
function killEnemy(S, e) {
  e.dead = true; e.hp = 0;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  burst(S, cx, cy, e.boss ? '#ffd070' : '#ff9a60', e.boss ? 40 : 14, e.boss ? 160 : 90);
  S.fx.push({ k: 'boom', x: cx, y: cy, t: 0.4, r: Math.max(e.w, e.h) });
  sfx(S, e.boss ? 'bossdie' : 'die');
  S.p.kills++;
  if (e.exp) gainExp(S, e.exp);
  if (e.boss) {
    S.flags.boss[e.kind] = 1; S.sealed = false; S.shake = 0.6;
    if (e.kind === 'count') { S.won = true; S.wonT = 0; S.ev.push({ t: 'win' }); return; }
    S.ev.push({ t: 'bossdown', id: e.kind });
    // a reward: a big heart and a chunk of gold, plus a max-HP up from every boss
    dropAt(S, cx, cy, { k: 'item', item: 'hpup' }); dropAt(S, cx - 20, cy, { k: 'gold', n: 300 }); dropAt(S, cx + 20, cy, { k: 'heart', n: 5 });
    return;
  }
  const r = S.rnd, lck = stats(S.p).lck;
  if (e.drops.heart && r() < e.drops.heart) dropAt(S, cx, cy, { k: 'heart', n: r() < 0.15 ? 5 : 1 });
  if (e.drops.gold && r() < e.drops.gold) dropAt(S, cx, cy, { k: 'gold', n: [10, 25, 50, 100][Math.min(3, Math.floor(r() * (1 + e.lv)))] });
  if (e.drops.item && r() < e.drops.item * (1 + lck / 30)) { const tbl = DROP_TABLE[e.lv] || DROP_TABLE[1]; dropAt(S, cx, cy, { k: 'item', item: tbl[Math.floor(r() * tbl.length)] }); }
}
function dropAt(S, x, y, d) {
  S.drops.push({ ...d, x: x - 5, y: y - 5, w: 10, h: 10, vx: (S.rnd() - 0.5) * 60, vy: -140, t: d.k === 'item' || d.k === 'sub' ? 9999 : 9 });
}

// ------------------------------------------------------------------ the update
export function update(S, dt, inp) {
  S.time += dt;
  if (S.fade > 0) S.fade -= dt;
  if (S.shake > 0) S.shake -= dt;
  if (S.won) { S.wonT += dt; updateFx(S, dt); return; }
  if (S.over) { S.overT += dt; updateFx(S, dt); return; }
  S.playTime += dt;
  updatePlayer(S, dt, inp);
  updateEnemies(S, dt);
  updateShots(S, dt);
  updateDrops(S, dt);
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
  if (p.inv > 0) p.inv -= dt;
  if (p.jumpBuf > 0) p.jumpBuf -= dt;
  if (inp.pressed.jump) p.jumpBuf = 0.12;
  if (p.dropT > 0) p.dropT -= dt;
  // ---- bat form
  if (inp.pressed.bat && p.relics.wing && p.hurtT <= 0) {
    if (!p.bat && p.mp >= 3) { p.bat = true; p.h = 12; p.y += PH.H - 12; p.w = 12; p.x -= 1; p.atkT = 0; p.slideT = 0; burst(S, p.x + 6, p.y + 6, '#b080ff', 14, 70); sfx(S, 'bat'); }
    else if (p.bat) unbat(S);
  }
  if (p.bat) {
    p.mp -= 3.2 * dt;
    if (p.mp <= 0) { p.mp = 0; unbat(S); }
    else {
      let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      if (ax && ay) { ax *= 0.72; ay *= 0.72; }
      p.vx += (ax * PH.BAT - p.vx) * Math.min(1, dt * 10); p.vy += (ay * PH.BAT - p.vy) * Math.min(1, dt * 10);
      if (ax) p.face = Math.sign(ax);
      moveBody(S, p, dt, { noPlat: true });
      p.ground = false;
      if (inp.pressed.attack && p.mp >= 4) { // a bat fireball
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
    const target = attacking ? 0 : p.crouch ? (canStand(S, p) ? 0 : dir * 45) : dir * PH.WALK;
    const acc = p.ground ? 16 : 9;
    p.vx += (target - p.vx) * Math.min(1, dt * acc);
    if (Math.abs(p.vx) < 2 && !dir) p.vx = 0;
  } else if (busy) p.vx *= Math.pow(0.05, dt);
  // jump / slide / double jump / drop through
  if (p.jumpBuf > 0 && !busy) {
    if (p.crouch && p.ground && onPlatform(S, p)) { p.dropT = 0.22; p.y += 2; p.jumpBuf = 0; }
    else if (p.crouch && p.ground && p.relics.cloak) { p.slideT = 0.42; p.jumpBuf = 0; sfx(S, 'slide'); S.fx.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 }); }
    else if ((p.ground || p.coyote > 0) && !sliding) { p.vy = -PH.JUMP; p.ground = false; p.coyote = 0; p.jumps = 1; p.jumpBuf = 0; sfx(S, 'jump'); }
    else if (!p.ground && p.relics.leap && p.jumps < 2 && !sliding) {
      p.vy = -PH.DJUMP; p.jumps = 2; p.jumpBuf = 0; sfx(S, 'djump');
      S.fx.push({ k: 'ring', x: p.x + p.w / 2, y: p.y + p.h, t: 0.3 });
    }
  }
  if (p.boostT > 0) p.boostT -= dt; else if (!inp.jump && p.vy < -120 && p.hurtT <= 0) p.vy = -120;         // variable jump height
  p.vy = Math.min(PH.FALL, p.vy + PH.G * dt);
  if (p.ground && p.vy > 0) p.vy = 0;
  const res = moveBody(S, p, dt, { noPlat: p.dropT > 0 });
  if (res.landed) p.ground = true;
  // attack
  if (p.atkT > 0) { p.atkT -= dt; }
  else if (inp.pressed.attack && !busy && !sliding) {
    if (inp.up && p.sub) useSub(S);
    else { p.atkT = p.atkDur = st.time; p.swing++; p.atkLow = p.crouch; sfx(S, 'swing'); if (p.dashT > 0) p.dashT = 0; }
  }
  if (inp.pressed.sub && p.sub && !busy && !sliding) useSub(S);
  if (p.atkT > 0) {
    const k = 1 - p.atkT / p.atkDur;
    if (k > 0.15 && k < 0.8) {
      const box = swordBox(p, st.reach);
      for (const e of S.ents) if (!e.dead && e.swingHit !== p.swing && overlap(box, e)) { e.swingHit = p.swing; hitEnemy(S, e, st.atk, p.x + p.w / 2, 'sword'); }
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
function unbat(S) {
  const p = S.p;
  // only if there is room to stand
  const nx = p.x - 1, ny = p.y + 12 - PH.H;
  if (boxSolid(S, nx, ny, PH.W, PH.H)) { if (p.mp <= 0) { /* forced: squeeze */ p.mp = 0; } else return; }
  p.bat = false; p.w = PH.W; p.h = PH.H; p.x = nx; p.y = ny; p.vy = Math.min(p.vy, 0);
  burst(S, p.x + 5, p.y + 14, '#b080ff', 10, 60); sfx(S, 'bat');
}
function useSub(S) {
  const p = S.p, sub = SUBS[p.sub];
  if (p.hearts < sub.cost) { sfx(S, 'no'); return; }
  if (S.shots.filter((s) => s.sub).length >= 3) return;
  p.hearts -= sub.cost;
  const st = stats(p), dmg = sub.dmg + st.atk * 0.5, x = p.x + p.w / 2, y = p.y + 8;
  const sh = { sub: p.sub, x: x - 4, y, w: 8, h: 6, vx: 0, vy: 0, dmg, life: 2, hit: new Set(), t: 0 };
  if (p.sub === 'dagger') Object.assign(sh, { k: 'dagger', vx: p.face * 330, w: 12, h: 4, life: 0.9 });
  if (p.sub === 'axe') Object.assign(sh, { k: 'axe', vx: p.face * 110, vy: -360, grav: 820, w: 14, h: 14, life: 2 });
  if (p.sub === 'holy') Object.assign(sh, { k: 'holy', vx: p.face * 120, vy: -150, grav: 700, w: 8, h: 8, life: 3 });
  if (p.sub === 'cross') Object.assign(sh, { k: 'cross', vx: p.face * 300, w: 14, h: 14, life: 2.2, dir: p.face });
  S.shots.push(sh); sfx(S, 'sub');
}
function breakWall(S, tx, ty) {
  const R = S.R;
  for (let y = 0; y < R.H; y++) if (R.tiles[y][tx] === T.BREAK) { R.tiles[y][tx] = T.AIR; burst(S, tx * TILE + 8, y * TILE + 8, '#9a8a7a', 6, 80); }
  R.dirty = true; sfx(S, 'crumble'); S.shake = 0.25;
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

function updateEnemies(S, dt) {
  const p = S.p, px = p.x + p.w / 2, py = p.y + p.h / 2;
  for (const e of S.ents) {
    if (e.dead) continue;
    e.t -= dt; if (e.flash > 0) e.flash -= dt;
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
    }
    // keep flyers inside the room
    if (e.fly && !e.boss) { e.x = Math.max(0, Math.min(S.R.W * TILE - e.w, e.x)); e.y = Math.max(TILE * 0.5, Math.min(S.R.H * TILE - e.h - TILE, e.y)); }
    // contact damage
    if (e.st !== 'under' && e.st !== 'hang' && !(e.boss && (e.vis === 0 || e.st === 'intro')) && overlap(e, p)) hurtPlayer(S, e.atk, ex);
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

// ------------------------------------------------------------------ projectiles
function updateShots(S, dt) {
  const p = S.p;
  for (const s of S.shots) {
    s.t += dt; s.life -= dt;
    if (s.k === 'cross') { s.vx -= s.dir * 520 * dt; if (s.t > 0.4 && Math.abs((s.x + 7) - (p.x + p.w / 2)) < 14 && Math.abs((s.y + 7) - (p.y + 10)) < 24) s.life = 0; }
    if (s.grav) s.vy += s.grav * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.k === 'holy' && !s.burn && (solidAt(S, s.x + 4, s.y + 8) || tileAt(S, Math.floor((s.x + 4) / TILE), Math.floor((s.y + 8) / TILE)) === T.PLAT && s.vy > 0)) {
      s.burn = true; s.vx = s.vy = s.grav = 0; s.y = Math.floor((s.y + 8) / TILE) * TILE - 18; s.x -= 12; s.w = 32; s.h = 18; s.life = 1.2; s.hit = new Set(); sfx(S, 'burn');
    }
    if (s.burn && Math.floor(s.t * 4) !== s.tick) { s.tick = Math.floor(s.t * 4); s.hit = new Set(); }
    if ((s.k === 'dagger' || s.k === 'fire') && solidAt(S, s.x + s.w / 2, s.y + s.h / 2)) s.life = 0;
    for (const e of S.ents) if (!e.dead && !s.hit.has(e) && overlap(s, e)) { s.hit.add(e); hitEnemy(S, e, s.dmg, s.x + s.w / 2, s.k); if (s.k === 'dagger' || s.k === 'fire') { s.life = 0; break; } }
    for (const c of S.props) if (c.kind === 'candle' && !c.gone && overlap(s, c)) breakCandle(S, c);
  }
  S.shots = S.shots.filter((s) => s.life > 0 && s.x > -60 && s.x < S.R.W * TILE + 60 && s.y < S.R.H * TILE + 60);
  for (const s of S.eshots) {
    s.t += dt; s.life -= dt;
    if (s.grav) s.vy += s.grav * dt;
    if (s.wave) s.vy = Math.sin(s.t * 6 + s.wave) * 70;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.wall && solidAt(S, s.x + s.w / 2, s.y + s.h / 2)) s.life = 0;
    if ((s.k === 'meteor' || s.k === 'rock' || s.k === 'gear') && s.vy > 0 && s.y > 0 && solidAt(S, s.x + s.w / 2, s.y + s.h)) { s.life = 0; burst(S, s.x + s.w / 2, s.y + s.h, s.k === 'meteor' ? '#c060ff' : '#c8b890', 6, 60); }
    if (overlap(s, p)) { hurtPlayer(S, s.dmg, s.x + s.w / 2); if (s.k !== 'pillar' && s.k !== 'beam' && s.k !== 'wave') s.life = 0; }
  }
  S.eshots = S.eshots.filter((s) => s.life > 0 && s.x > -80 && s.x < S.R.W * TILE + 80 && s.y < S.R.H * TILE + 40);
}
function updateDrops(S, dt) {
  const p = S.p;
  for (const d of S.drops) {
    d.t -= dt;
    if (!d.rest) { d.vy = Math.min(PH.FALL, d.vy + PH.G * dt); const r = moveBody(S, d, dt); if (r.landed || onGroundCheck(S, d)) { d.rest = true; d.vx = 0; } else d.vx *= Math.pow(0.3, dt); }
    if (overlap(d, p) && !p.dead) {
      d.t = -1;
      if (d.k === 'heart') { p.hearts = Math.min(p.mhearts, p.hearts + d.n); sfx(S, 'heart'); }
      if (d.k === 'gold') { p.gold += d.n; addText(S, d.x + 5, d.y - 4, d.n + 'G', '#ffd76a'); sfx(S, 'coin'); }
      if (d.k === 'item') { giveItem(S, d.item); S.ev.push({ t: 'got', item: d.item }); sfx(S, 'item'); }
      if (d.k === 'sub') { p.sub = d.sub; S.ev.push({ t: 'gotsub', sub: d.sub }); sfx(S, 'item'); }
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
        if (q.kind === 'item') { giveItem(S, q.item); S.ev.push({ t: 'got', item: q.item, big: true }); sfx(S, 'item'); }
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
  if (cyp < 0 && !p.bat) { p.vy = Math.min(p.vy, -280); p.boostT = 0.25; }        // climbing up through a floor hole: a little help onto the ledge
  // first visits: story beats
  const rr = ROOM[nr.id];
  if (!S.flags.seen['room_' + nr.id]) {
    S.flags.seen['room_' + nr.id] = 1;
    if (nr.id === 't3') S.ev.push({ t: 'dialog', id: 'elise' });
    if (nr.id === 'c1') S.ev.push({ t: 'toast', key: 'catacombsHint' });
  }
  if (rr.boss && !S.flags.boss[rr.boss] && !S.flags.seen['boss_' + rr.boss]) { S.flags.seen['boss_' + rr.boss] = 1; S.ev.push({ t: 'dialog', id: 'boss_' + rr.boss }); }
}

export function explored(S) {
  let total = 0; for (const r of ROOMS) total += r.w * r.h;
  return Math.min(100, Math.round(Object.keys(S.flags.visited).length / total * 1000) / 10);
}
