// Builds each room's tile map from the castle data: walls, floors between cell rows (with a hole and stepping
// platforms), door openings, ability gates, breakable walls, boss seals, decorations. Pure: tools/check.mjs uses it.
import { CW, CH, ROOMS, DOORS, ROOM } from './data.js?v=1';

// tiles
export const T = { AIR: 0, SOLID: 1, PLAT: 2, BREAK: 3, SEAL: 4, WATER: 5 };
export const isSolid = (t, sealed) => t === T.SOLID || t === T.BREAK || (t === T.SEAL && sealed);

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export function roomAt(cx, cy) { return ROOMS.find((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h); }

// exits per room: { side: 'L'|'R'|'U'|'D', i (row for L/R, column for U/D, local), gate, to (room id) }
export const EXITS = {};
for (const r of ROOMS) EXITS[r.id] = [];
for (const [x, y, d, gate] of DOORS) {
  const a = roomAt(x, y), b = d === 'R' ? roomAt(x + 1, y) : roomAt(x, y + 1);
  if (!a || !b) throw new Error(`door ${x},${y},${d} has no room on one side`);
  if (d === 'R') { EXITS[a.id].push({ side: 'R', i: y - a.y, gate, to: b.id }); EXITS[b.id].push({ side: 'L', i: y - b.y, gate, to: a.id }); }
  else { EXITS[a.id].push({ side: 'D', i: x - a.x, gate, to: b.id }); EXITS[b.id].push({ side: 'U', i: x - b.x, gate, to: a.id }); }
}

const HOLE = [11, 12, 13];          // hole / shaft columns inside a cell (3 wide, centred)

export function buildRoom(id) {
  const r = ROOM[id], W = r.w * CW, H = r.h * CH, rnd = rng(hash(id));
  const t = Array.from({ length: H }, () => new Array(W).fill(T.SOLID));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v; };
  const floorY = (row) => (row + 1) * CH - 2;          // the surface tile row of a cell row's floor
  const exits = EXITS[id];
  const noPlat = exits.some((e) => e.gate === 'bat' && e.side === 'D') || id === 't1';
  // 1) carve every cell row: air above each 2-tile floor slab (the top row of the room is the ceiling)
  for (let row = 0; row < r.h; row++) for (let y = row === 0 ? (r.outside ? 0 : 1) : row * CH; y < floorY(row); y++) for (let x = 1; x < W - 1; x++) t[y][x] = T.AIR;
  const shaft = new Set();             // cells with a way up through their ceiling: no decorative platforms there
  // stepping platforms (one-way) from the floor yFloor up to an opening whose landing surface is at yTarget.
  // Built from the top down: the top step is 3 tiles below the landing, inside the shaft columns only (so your head
  // fits under the slab), and never on the room's top row (standing there would put you in the room above).
  // The double-jump gate leaves a 5-tile gap above the floor.
  const stairs = (cx, yTarget, yFloor, gate) => {
    if (noPlat || gate === 'bat') return;
    const steps = [];
    for (let y = yTarget + 3; y <= yFloor - 2; y += 3) steps.push(y);
    if (gate === 'dj') { while (steps.length && steps[steps.length - 1] > yFloor - 5) steps.pop(); if (steps[steps.length - 1] < yFloor - 6) steps.push(yFloor - 5); }
    else if (yFloor - (steps.length ? steps[steps.length - 1] : yTarget) > 3) steps.push(yFloor - 2);   // never more than 3 tiles from the floor to the first step
    steps.forEach((y, k) => {
      const x0 = cx * CW + (k === 0 ? 11 : k % 2 ? 9 : 12), len = k === 0 ? 3 : 4;
      for (let x = x0; x < x0 + len; x++) set(x, y, T.PLAT);
    });
  };
  // 2) connect the cell rows inside the room: a hole in the slab (one-way platform) and steps below it
  for (let row = 0; row < r.h - 1; row++) {
    const col = r.w === 1 ? 0 : Math.floor(rnd() * r.w);
    const slabTop = floorY(row);
    for (const h of HOLE) { set(col * CW + h, slabTop, T.PLAT); set(col * CW + h, slabTop + 1, T.AIR); }
    stairs(col, slabTop, floorY(row + 1), null);
    shaft.add(col + ',' + (row + 1));
  }
  // 3) doors
  for (const e of exits) {
    if (e.side === 'L' || e.side === 'R') {
      const x = e.side === 'L' ? 0 : W - 1, fy = floorY(e.i);
      const h = e.gate === 'slide' ? 1 : 4;
      for (let y = fy - h; y < fy; y++) set(x, y, e.gate === 'break' && !r.secret ? T.BREAK : T.AIR);
      if (e.gate === 'slide') {       // a low crawlspace leading to the opening
        const dir = e.side === 'L' ? 1 : -1;
        for (let k = 1; k <= 5; k++) for (let y = fy - 4; y < fy - 1; y++) set(x + dir * k, y, T.SOLID);
      }
      if (r.boss) for (let y = fy - h; y < fy; y++) set(e.side === 'L' ? 1 : W - 2, y, T.SEAL);
    } else if (e.side === 'U') {
      for (const h of HOLE) set(e.i * CW + h, 0, T.AIR);
      stairs(e.i, -1, floorY(0), e.gate);
      shaft.add(e.i + ',0');
    } else {
      const fy = floorY(r.h - 1);
      for (const h of HOLE) { set(e.i * CW + h, fy, T.AIR); set(e.i * CW + h, fy + 1, T.PLAT); }
    }
  }
  // 4) decorative one-way ledges
  if (!noPlat) for (let row = 0; row < r.h; row++) for (let cx = 0; cx < r.w; cx++) {
    const roll = rnd(), len = 3 + Math.floor(rnd() * 4), x0 = cx * CW + 4 + Math.floor(rnd() * (CW - 8 - len)), y = floorY(row) - 4 - Math.floor(rnd() * 2);
    if (roll > 0.55 || shaft.has(cx + ',' + row)) continue;
    for (let x = x0; x < x0 + len; x++) if (t[y][x] === T.AIR) set(x, y, T.PLAT);
  }
  // 5) water in the waterway (decoration over the floor)
  if (r.water) for (let x = 1; x < W - 1; x++) for (const y of [floorY(r.h - 1) - 1]) if (t[y][x] === T.AIR) t[y][x] = T.WATER;
  const breakCells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (t[y][x] === T.BREAK) breakCells.push([x, y]);
  return { id, W, H, tiles: t, exits, floorY, room: r, breakCells };
}

// spots for things: the floor surface of a cell (tile x, tile y of the air just above the floor)
export function floorSpot(room, cx, row, fx = 0.5) {
  const x = Math.floor(cx * CW + 3 + fx * (CW - 6)), y = room.floorY(row) - 1;
  return { x, y };
}
