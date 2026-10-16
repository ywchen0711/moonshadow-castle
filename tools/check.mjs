// Progression check: stitches every room of a castle into one tile grid and runs a reachability search for each
// set of relics. Positive checks use cautious jump numbers, negative checks (a gate must hold) generous ones.
// Bat flight floods the open space; mist also passes iron grates; the snorkel lets you swim through deep water.
import { CW, CH, ROOMS } from '../js/data.js?v=2';
import { T, buildRoom } from '../js/world.js?v=3';

function grid(rooms) {
  const minX = Math.min(...rooms.map((r) => r.x)), minY = Math.min(...rooms.map((r) => r.y));
  const maxX = Math.max(...rooms.map((r) => r.x + r.w)), maxY = Math.max(...rooms.map((r) => r.y + r.h));
  const GW = (maxX - minX) * CW, GH = (maxY - minY) * CH;
  const G = new Uint8Array(GW * GH).fill(T.SOLID), owner = new Array(GW * GH).fill(null);
  for (const r of rooms) {
    const b = buildRoom(r.id), ox = (r.x - minX) * CW, oy = (r.y - minY) * CH;
    for (let y = 0; y < b.H; y++) for (let x = 0; x < b.W; x++) { G[(oy + y) * GW + ox + x] = b.tiles[y][x]; owner[(oy + y) * GW + ox + x] = r.id; }
  }
  const spot = (r) => ({ x: (r.x - minX) * CW + 6, y: (r.y - minY) * CH + CH - 3 });
  return { GW, GH, G, owner, spot };
}

function reach(W, start, ab, gen) {
  const { GW, GH, G, owner } = W;
  const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? T.SOLID : G[y * GW + x]);
  // BREAK and SEAL count as open (broken / beaten); grates need mist, deep water the snorkel
  const open = (x, y) => { const t = at(x, y); return t !== T.SOLID && (t !== T.GRATE || !!ab.mist) && (t !== T.DEEP || !!ab.snorkel); };
  const support = (x, y) => { const t = at(x, y); return t === T.SOLID || t === T.PLAT || t === T.BREAK || (t === T.GRATE && !ab.mist); };
  const J = ab.leap ? (gen ? 8 : 6) : (gen ? 4 : 3), HZ = gen ? 5 : 3;
  const seen = new Uint8Array(GW * GH), q = [];
  const fits = (x, y, crawl) => open(x, y) && (crawl || open(x, y - 1));
  const land = (x, y, crawl) => { // fall from (x,y) until standing (or floating in deep water)
    if (!fits(x, y, crawl)) return;
    while (y < GH - 1 && !support(x, y + 1) && at(x, y) !== T.DEEP) { y++; if (!open(x, y)) return; }
    const k = y * GW + x;
    if (!seen[k]) { seen[k] = 1; q.push(k); }
  };
  const fly = (k0) => { // bat flight / mist / swimming: flood the open space
    const s2 = new Uint8Array(GW * GH), fq = [k0]; s2[k0] = 1;
    while (fq.length) {
      const k = fq.pop(), x = k % GW, y = (k / GW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * GW + nx; if (open(nx, ny) && !s2[nk]) { s2[nk] = 1; fq.push(nk); } }
    }
    for (let k = 0; k < s2.length; k++) if (s2[k] && (support(k % GW, ((k / GW) | 0) + 1) || at(k % GW, (k / GW) | 0) === T.DEEP) && !seen[k]) { seen[k] = 1; q.push(k); }
  };
  land(start.x, start.y, false);
  if (ab.wing) fly(start.y * GW + start.x);
  while (q.length) {
    const k = q.pop(), x = k % GW, y = (k / GW) | 0;
    if (at(x, y) === T.DEEP) {   // swimming: any direction inside the water, out at the surface
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny)) land(nx, ny, true); }
    }
    for (const dx of [-1, 1]) {
      if (fits(x + dx, y, false)) land(x + dx, y, false);
      else if (ab.cloak && fits(x + dx, y, true)) land(x + dx, y, true);
    }
    if (at(x, y + 1) === T.PLAT) { let yy = y + 1; while (yy < GH - 1 && at(x, yy) === T.PLAT) yy++; land(x, yy, false); }
    for (let h = 1; h <= J; h++) {
      const yy = y - h;
      if (!open(x, yy - 1) || !open(x, yy)) break;
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
const NORMAL = ROOMS.filter((r) => r.world !== 'rev'), REVR = ROOMS.filter((r) => r.world === 'rev');
const relicRoom = (relic) => NORMAL.find((r) => r.relic === relic).id;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const area = (set, a) => [...set].filter((id) => R[id].area === a);
const t0 = Date.now();
const W = grid(NORMAL), start = W.spot(R.r1);
const LATE = ['colosseum', 'caverns', 'frozen', 'treasury'], DEEPER = ['waterway', 'abyss'];
const sets = [
  ['nothing', {}, ['c8'], ['library', 'clock', 'keep', 'gallery', 'garden', 'outer', 'quarters', 'forge', 'belfry', 'chapel', ...LATE, ...DEEPER]],
  ['leap', { leap: 1 }, [relicRoom('cloak'), relicRoom('echo')], ['clock', 'keep', 'garden', 'outer', 'quarters', 'forge', 'belfry', 'chapel', ...LATE, ...DEEPER]],
  ['leap+cloak', { leap: 1, cloak: 1 }, [relicRoom('wing'), relicRoom('fairy')], ['keep', 'belfry', 'chapel', ...LATE, ...DEEPER]],
  ['+bat', { leap: 1, cloak: 1, wing: 1 }, [relicRoom('mist'), 't5'], [...LATE, ...DEEPER]],
  ['+mist', { leap: 1, cloak: 1, wing: 1, mist: 1 }, [relicRoom('snorkel')], DEEPER],
  ['+snorkel', { leap: 1, cloak: 1, wing: 1, mist: 1, snorkel: 1 }, [relicRoom('moonEye')], []],
];
for (const [name, ab, goals, locked] of sets) {
  const cau = reach(W, start, ab, false), gen = reach(W, start, ab, true);
  for (const g of goals) ok(cau.has(g), `${name}: ${g} (${R[g].relic || R[g].boss || 'goal'}) reachable (${cau.size} rooms)`);
  for (const a of locked) ok(area(gen, a).length === 0, `${name}: ${a} still locked (${area(gen, a).slice(0, 4).join(',') || 'none'})`);
  // no soft-locks: from every reachable room you can get back to the start
  const stuck = [...cau].filter((id) => !reach(W, W.spot(R[id]), ab, false).has('r1'));
  ok(stuck.length === 0, `${name}: no dead ends (${stuck.slice(0, 8).join(',') || 'none'})`);
}
const all = reach(W, start, { leap: 1, cloak: 1, wing: 1, mist: 1, snorkel: 1 }, false);
const missing = NORMAL.filter((r) => !all.has(r.id)).map((r) => r.id);
ok(missing.length === 0, `every room of the castle reachable (${missing.slice(0, 10).join(',') || 'all ' + NORMAL.length})`);
// the Reversed Castle: everything in hand; enter where the portal puts you
const WR = grid(REVR), revAll = reach(WR, WR.spot(R['R:r1']), { leap: 1, cloak: 1, wing: 1, mist: 1, snorkel: 1 }, false);
const revMissing = REVR.filter((r) => !revAll.has(r.id)).map((r) => r.id);
ok(revMissing.length === 0, `every room of the Reversed Castle reachable (${revMissing.slice(0, 10).join(',') || 'all ' + REVR.length})`);
console.log(`     (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
