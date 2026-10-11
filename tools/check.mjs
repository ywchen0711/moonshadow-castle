// Progression check: stitches every room into one world tile grid and runs a reachability search for each
// set of relics. Positive checks use cautious jump numbers, negative checks (a gate must hold) generous ones.
import { CW, CH, ROOMS } from '../js/data.js?v=1';
import { T, buildRoom } from '../js/world.js?v=1';

const minX = Math.min(...ROOMS.map((r) => r.x)), minY = Math.min(...ROOMS.map((r) => r.y));
const maxX = Math.max(...ROOMS.map((r) => r.x + r.w)), maxY = Math.max(...ROOMS.map((r) => r.y + r.h));
const GW = (maxX - minX) * CW, GH = (maxY - minY) * CH;
const G = new Uint8Array(GW * GH).fill(T.SOLID), owner = new Array(GW * GH).fill(null);
for (const r of ROOMS) {
  const b = buildRoom(r.id), ox = (r.x - minX) * CW, oy = (r.y - minY) * CH;
  for (let y = 0; y < b.H; y++) for (let x = 0; x < b.W; x++) { G[(oy + y) * GW + ox + x] = b.tiles[y][x]; owner[(oy + y) * GW + ox + x] = r.id; }
}
const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? T.SOLID : G[y * GW + x]);
const open = (x, y) => { const t = at(x, y); return t !== T.SOLID; };              // BREAK and SEAL: broken / beaten
const support = (x, y) => { const t = at(x, y); return t === T.SOLID || t === T.PLAT || t === T.BREAK; };
const passUp = (x, y) => open(x, y);                                                  // one-way platforms are open from below

function reach(start, ab, gen) {
  const J = ab.leap ? (gen ? 8 : 6) : (gen ? 4 : 3), HZ = gen ? 5 : 3;
  const seen = new Uint8Array(GW * GH), q = [];
  const fits = (x, y, crawl) => open(x, y) && (crawl || open(x, y - 1));
  const land = (x, y, crawl) => { // fall from (x,y) until standing
    if (!fits(x, y, crawl)) return;
    while (y < GH - 1 && !support(x, y + 1)) { y++; if (!open(x, y)) return; }
    const k = y * GW + x;
    if (!seen[k]) { seen[k] = 1; q.push(k); }
  };
  land(start.x, start.y, false);
  if (ab.wing) { // a bat is one tile: flood the open space, then everything below is also standable
    const s2 = new Uint8Array(GW * GH), fq = [start.y * GW + start.x]; s2[fq[0]] = 1;
    while (fq.length) {
      const k = fq.pop(), x = k % GW, y = (k / GW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = ny * GW + nx;
        if (open(nx, ny) && !s2[nk]) { s2[nk] = 1; fq.push(nk); }
      }
    }
    for (let k = 0; k < s2.length; k++) if (s2[k] && support(k % GW, ((k / GW) | 0) + 1) && !seen[k]) { seen[k] = 1; q.push(k); }
  }
  while (q.length) {
    const k = q.pop(), x = k % GW, y = (k / GW) | 0;
    const crawlHere = !open(x, y - 1);
    if (crawlHere && !ab.cloak) { /* only reachable by sliding */ }
    // walk / slide sideways
    for (const dx of [-1, 1]) {
      if (fits(x + dx, y, false)) land(x + dx, y, false);
      else if (ab.cloak && fits(x + dx, y, true)) land(x + dx, y, true);
    }
    // drop through a one-way platform
    if (at(x, y + 1) === T.PLAT) { let yy = y + 1; while (yy < GH - 1 && at(x, yy) === T.PLAT) yy++; land(x, yy, false); }
    // jump: rise straight up, then drift sideways and fall
    for (let h = 1; h <= J; h++) {
      const yy = y - h;
      if (!passUp(x, yy - 1) || !passUp(x, yy)) break;
      for (const dir of [-1, 1]) for (let d = 1; d <= HZ; d++) {
        if (!fits(x + dir * d, yy, false)) break;
        land(x + dir * d, yy, false);
      }
      land(x, yy, false);
    }
  }
  const rooms = new Set();
  for (let k = 0; k < seen.length; k++) if (seen[k] && owner[k]) rooms.add(owner[k]);
  return rooms;
}

const R = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
const spot = (id) => { const r = R[id]; return { x: (r.x - minX) * CW + 6, y: (r.y - minY) * CH + CH - 3 }; };
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const area = (set, a) => [...set].filter((id) => R[id].area === a);
const sets = [
  ['nothing', {}, 'c8', ['library', 'clock', 'keep']],
  ['leap', { leap: 1 }, 'l7', ['clock', 'keep']],
  ['leap+cloak', { leap: 1, cloak: 1 }, 'k7', ['keep']],
  ['all relics', { leap: 1, cloak: 1, wing: 1 }, 't5', []],
];
for (const [name, ab, goal, locked] of sets) {
  const cau = reach(spot('r1'), ab, false), gen = reach(spot('r1'), ab, true);
  ok(cau.has(goal), `${name}: next goal ${goal} reachable (${cau.size} rooms)`);
  for (const a of locked) ok(area(gen, a).length === 0, `${name}: ${a} still locked (${area(gen, a).join(',') || 'none'})`);
  // no soft-locks: from every reachable room you can get back to the start
  const stuck = [...cau].filter((id) => !reach(spot(id), ab, false).has('r1'));
  ok(stuck.length === 0, `${name}: no dead ends (${stuck.join(',') || 'none'})`);
}
const all = reach(spot('r1'), { leap: 1, cloak: 1, wing: 1 }, false);
const missing = ROOMS.filter((r) => !all.has(r.id)).map((r) => r.id);
ok(missing.length === 0, `every room reachable (${missing.join(',') || 'all ' + ROOMS.length})`);
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
