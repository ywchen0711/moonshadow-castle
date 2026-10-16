// Level audit with the real game physics: every stairwell and shaft climbed, every hole dropped through, every door
// walked through both ways, and every place to stand checked for "standing here puts you in the next room".
import { TILE, CW, CH, ROOMS, ROOM, AREAS, BOSSES } from '../js/data.js?v=2';
import { T, EXITS } from '../js/world.js?v=3';
import * as G from '../js/game.js?v=4';

const DT = 1 / 60, bad = [], good = [];
const blank = () => ({ left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, sub: 0, dash: 0, bat: 0, mist: 0, pressed: {} });
// the relics you must already hold to stand in an area at all (its entrance gate and those of the areas it hangs from)
const GATE_RELIC = { dj: 'leap', slide: 'cloak', bat: 'wing', grate: 'mist', deep: 'snorkel' };
function areaAbilities(id) {
  const out = {}; let a = AREAS[ROOM[id].area];
  for (let k = 0; a && a.attach && k < 10; k++) { if (GATE_RELIC[a.attach.gate]) out[GATE_RELIC[a.attach.gate]] = 1; a = AREAS[a.attach.area]; }
  return out;
}
const report = (okk, msg) => (okk ? good : bad).push(msg);
function run(S, frames, ctl) {
  let prev = blank(), changes = 0, room = S.roomId;
  for (let i = 0; i < frames; i++) {
    const inp = Object.assign(blank(), ctl(S, i)); inp.pressed = {};
    for (const k of ['jump', 'attack', 'sub', 'dash', 'bat', 'mist', 'up']) inp.pressed[k] = inp[k] && !prev[k];
    prev = inp; S.ents = []; S.eshots = []; S.p.hp = S.p.mhp; S.p.inv = 1; G.update(S, DT, inp); S.ev.length = 0;
    if (S.roomId !== room) { changes++; room = S.roomId; }
    if (S.stop) break;
  }
  return changes;
}
function fresh(abilities = {}) { const S = G.newState(7); Object.assign(S.p, { relics: { ...abilities }, mp: 999, mmp: 999 }); return S; }
function place(S, id, tx, surfaceRow) { G.loadRoom(S, id, null); S.ents = []; S.p.x = tx * TILE + 3; S.p.y = surfaceRow * TILE - S.p.h; S.p.vx = S.p.vy = 0; S.p.bat = false; S.p.h = 28; S.p.w = 10; }
const standing = (S) => S.p.ground && Math.abs(S.p.vy) < 1;

// ---- A. surfaces you can stand on whose standing centre is outside the room (the game flips to the next room)
for (const r of ROOMS) {
  const R = G.getRoom(r.id);
  for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
    const t = R.tiles[y][x]; if (t !== T.PLAT) continue;            // ceiling blocks cannot be stood on from inside
    const above = y === 0 ? T.AIR : R.tiles[y - 1][x]; if (above === T.SOLID || above === T.BREAK) continue;
    if (y * TILE - 14 < 0 && !r.outside) bad.push(`A ${r.id}: a ${t === T.PLAT ? 'platform' : 'block'} at (${x},${y}) is on the top row: standing on it puts you in the room above, so you flicker between rooms and cannot jump`);
  }
}
// ---- B. climbing every stairwell (inside rooms) and every shaft into the room above
function climb(id, cx, floorRow, targetId, targetRow, abilities, label) {
  const S = fresh(abilities); const R = G.getRoom(id), wx = (ROOM[id].x + cx) * CW + 12;      // the shaft column, in castle tiles
  place(S, id, cx * CW + 12, R.floorY(floorRow));
  let okFrames = 0, changes = 0, room = S.roomId;
  run(S, 60 * 12, (S2, i) => {
    const p = S2.p, row = Math.floor((p.y + p.h / 2) / (CH * TILE)), inTarget = S2.roomId === targetId && row === targetRow;
    if (S2.roomId !== room) { changes++; room = S2.roomId; }
    if (inTarget && (standing(S2) || (abilities.swim && p.vy > -40 && p.y + p.h < G.getRoom(targetId).floorY(targetRow) * TILE + 2))) { okFrames++; if (okFrames > 20) S2.stop = 1; } else okFrames = 0;
    const lx = (wx - ROOM[S2.roomId].x * CW) * TILE + 3, dx = lx - p.x;
    const above = inTarget && p.y + p.h < G.getRoom(targetId).floorY(targetRow) * TILE - 4;    // fully above the landing
    if (abilities.mistUp) { if (i === 2) return { mist: 1 }; return { up: above ? 0 : 1, left: dx < -2 ? 1 : 0, right: dx > 2 ? 1 : 0 }; }
    if (abilities.swim && G.getRoom(S2.roomId).tiles[Math.floor((p.y + p.h / 2) / TILE)]?.[Math.floor((p.x + p.w / 2) / TILE)] >= T.WATER) return { left: dx < -2 ? 1 : 0, right: dx > 2 ? 1 : 0, jump: !inTarget && i % 10 < 5 ? 1 : 0 };
    if (abilities.wing) { if (i === 2) return { bat: 1 }; if (above && p.bat) return { bat: i % 2 }; return { up: above ? 0 : 1, left: dx < -2 ? 1 : 0, right: dx > 2 ? 1 : 0 }; }
    // stay under the shaft and keep jumping (double jump at the top of each jump) until arrived
    const t = i % 40;
    return { left: dx < -2 ? 1 : 0, right: dx > 2 ? 1 : 0, jump: inTarget && standing(S2) ? 0 : t < 22 || (p.relics.leap && t > 26 && t < 36) ? 1 : 0 };
  });
  report(S.stop, `B ${label}: climb ${id} → ${targetId}${S.stop ? '' : ` FAILED (ended in ${S.roomId} at ${Math.round(S.p.x / TILE)},${Math.round(S.p.y / TILE)}, standing ${S.p.ground})`}${changes > 6 ? ` — flickered between rooms ${changes} times` : ''}`);
}
for (const r of ROOMS) {
  const R = G.getRoom(r.id);
  // stairwells inside a room: a one-way hole in the slab between two cell rows
  const own = areaAbilities(r.id); if (own.snorkel) own.swim = 1;
  for (let row = 0; row < r.h - 1; row++) for (let cx = 0; cx < r.w; cx++) if (R.tiles[R.floorY(row)][cx * CW + 12] === T.PLAT) climb(r.id, cx, row + 1, r.id, row, r.id === 't1' ? { wing: 1 } : own, `stairwell in ${r.id} cell ${cx}`);
  // shafts up into the room above
  for (const e of EXITS[r.id]) if (e.side === 'U') {
    const ab = e.gate === 'dj' ? { leap: 1 } : e.gate === 'bat' ? { wing: 1 } : e.gate === 'grate' ? { mist: 1, mistUp: 1 } : e.gate === 'deep' ? { snorkel: 1, swim: 1, leap: 1 } : { ...own };
    const up = ROOM[e.to];
    climb(r.id, e.i, 0, e.to, up.y + up.h - 1 - up.y, ab, `shaft ${r.id}→${e.to}${e.gate ? ' (' + e.gate + ')' : ''}`);
    if (e.gate === 'dj') { const S = fresh({}); place(S, r.id, e.i * CW + 12, R.floorY(0)); run(S, 60 * 8, (S2, i) => ({ jump: i % 40 < 22 ? 1 : 0 })); report(S.roomId === r.id, `B gate: without the Leap Stone ${r.id}→${e.to} stays closed${S.roomId === r.id ? '' : ' FAILED'}`); }
  }
}
// ---- C. dropping down through every hole (down + jump on the one-way platform)
for (const r of ROOMS) for (const e of EXITS[r.id]) if (e.side === 'D') {
  const ab = { ...areaAbilities(r.id), ...areaAbilities(e.to), ...(e.gate === 'grate' ? { mist: 1 } : e.gate === 'deep' ? { snorkel: 1 } : {}) };
  const S = fresh(ab); const R = G.getRoom(r.id); place(S, r.id, e.i * CW + 12, R.floorY(r.h - 1));
  let okFrames = 0;
  // in deep water you never "stand", so arriving in the room below and sinking is enough there
  const arrived = (S2) => S2.roomId === e.to && (standing(S2) || (ab.snorkel && S2.p.y > 4));
  run(S, 60 * 8, (S2, i) => { if (arrived(S2)) { okFrames++; if (okFrames > 20) S2.stop = 1; } else okFrames = 0;
    if (e.gate === 'grate') { if (i === 2) return { mist: 1 }; if (S2.roomId === e.to && S2.p.mist && i % 30 === 0) return { mist: 1 }; return { down: S2.roomId === r.id ? 1 : 0 }; }
    return { down: i < 40 ? 1 : 0, jump: i === 20 ? 1 : 0 }; });
  report(S.stop, `C drop ${r.id} → ${e.to}${S.stop ? '' : ` FAILED (ended in ${S.roomId})`}`);
}
// ---- D. every door, both ways
for (const r of ROOMS) for (const e of EXITS[r.id]) if (e.side === 'L' || e.side === 'R') {
  const S = fresh({ leap: 1, cloak: 1, wing: 1, mist: 1, snorkel: 1 }); const R = G.getRoom(r.id); const dir = e.side === 'R' ? 1 : -1;
  S.flags.boss = Object.fromEntries(Object.keys(BOSSES).map((k) => [k, 1]));
  const startX = e.gate === 'break' ? (e.side === 'R' ? R.W - 3 : 2) : e.side === 'R' ? R.W - 9 : 8;
  place(S, r.id, startX, R.floorY(e.i)); S.p.face = dir;
  let okFrames = 0;
  run(S, 60 * 5, (S2, i) => {
    if (S2.roomId === e.to && standing(S2)) { okFrames++; if (okFrames > 20) S2.stop = 1; } else okFrames = 0;
    const k = { right: dir > 0 ? 1 : 0, left: dir < 0 ? 1 : 0 };
    if (e.gate === 'break' && i < 60) return { attack: i % 12 === 0 ? 1 : 0, ...(i < 3 ? k : {}) };
    if (e.gate === 'slide') return { ...k, down: 1, jump: i % 20 === 0 ? 1 : 0 };
    return k;
  });
  report(S.stop, `D door ${r.id} → ${e.to}${e.gate ? ' (' + e.gate + ')' : ''}${S.stop ? '' : ` FAILED (ended in ${S.roomId} at ${Math.round(S.p.x / TILE)},${Math.round(S.p.y / TILE)})`}`);
}
// ---- E. things in rooms: items, relics, candles, save statues and the shop are in open space and within reach
for (const r of ROOMS) {
  const S = fresh({}); G.loadRoom(S, r.id, null); const R = S.R;
  const solidAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return tx < 0 || ty < 0 || tx >= R.W || ty >= R.H || R.tiles[ty][tx] === T.SOLID || R.tiles[ty][tx] === T.BREAK; };
  for (const q of S.props) {
    const name = `${q.kind}${q.item ? ' ' + q.item : q.relic ? ' ' + q.relic : ''}`;
    const inWall = [[q.x + 1, q.y + 1], [q.x + q.w - 1, q.y + 1], [q.x + 1, q.y + q.h - 1], [q.x + q.w - 1, q.y + q.h - 1]].some(([x, y]) => solidAt(x, y));
    // the floor under it: the first solid or platform tile below its bottom
    let fy = Math.floor((q.y + q.h) / TILE); while (fy < R.H && R.tiles[fy][Math.floor((q.x + q.w / 2) / TILE)] === T.AIR) fy++;
    const reach = (fy * TILE - (q.y + q.h)) / TILE;   // tiles between the floor below and the thing's bottom
    report(!inWall && reach <= 4.2, `E ${r.id}: ${name}${inWall ? ' is inside a wall' : ''}${reach > 4.2 ? ` floats ${reach.toFixed(1)} tiles above the floor (out of reach)` : ''}`);
  }
}
console.log(`${good.length} ok, ${bad.length} problems`);
for (const b of bad) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);
