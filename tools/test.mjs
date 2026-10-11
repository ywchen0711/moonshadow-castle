// Headless tests of the real game logic: physics against the reachability assumptions, gates, combat, items, saves.
import { TILE, CW, CH, ROOMS, ITEMS, BOSSES } from '../js/data.js?v=1';
import * as G from '../js/game.js?v=1';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const blank = () => ({ left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, sub: 0, dash: 0, bat: 0, pressed: {} });
const DT = 1 / 60;
function run(S, secs, ctl) {
  let prev = blank();
  for (let i = 0; i < secs / DT; i++) {
    const inp = Object.assign(blank(), ctl ? ctl(S, i) : {});
    inp.pressed = {}; for (const k of ['jump', 'attack', 'sub', 'dash', 'bat', 'up']) inp.pressed[k] = inp[k] && !prev[k];
    prev = inp; G.update(S, DT, inp); S.ev.length = 0;
    if (S.stop) break;
  }
}
function place(S, room, tx, row) { G.loadRoom(S, room, null); S.p.x = tx * TILE + 3; S.p.y = S.R.floorY(row) * TILE - S.p.h; S.p.vx = S.p.vy = 0; S.ents = []; }

// 1) standing and jump heights
{
  const S = G.newState(1); S.ents = [];
  run(S, 0.5);
  ok(S.p.ground, 'player lands on the floor of the first room');
  const y0 = S.p.y; let top = y0;
  run(S, 1, (S2) => { top = Math.min(top, S2.p.y); return { jump: 1 }; });
  const h1 = (y0 - top) / TILE;
  S.p.relics.leap = 1; run(S, 1);
  const y1 = S.p.y; top = y1;
  run(S, 1.2, (S2, i) => { top = Math.min(top, S2.p.y); return { jump: i < 20 || i > 24 ? 1 : 0 }; });
  const h2 = (y1 - top) / TILE;
  ok(h1 > 3.2 && h1 < 4, `single jump height ${h1.toFixed(2)} tiles (check.mjs assumes 3..4)`);
  ok(h2 > 6.2 && h2 < 8, `double jump height ${h2.toFixed(2)} tiles (check.mjs assumes 6..8)`);
  // a short tap gives a lower jump
  run(S, 1); const y2 = S.p.y; top = y2;
  run(S, 1, (S2, i) => { top = Math.min(top, S2.p.y); return { jump: i < 4 ? 1 : 0 }; });
  ok((y2 - top) / TILE < h1 * 0.75, `a short tap jumps lower (${((y2 - top) / TILE).toFixed(2)} tiles)`);
}
// 2) walking right out of the first room
{
  const S = G.newState(2); S.ents = [];
  let seen = new Set();
  run(S, 14, (S2) => { seen.add(S2.roomId); S2.ents = []; return { right: 1 }; });
  ok(seen.has('r2'), 'walking right leads from the courtyard into the entrance hall');
}
// a climber: stand in the stair column and keep jumping (double jumping at the top of each jump)
const climber = (S2, i) => { const p = S2.p; S2.ents = []; const t = i % 40; return { jump: t < 22 || (p.relics.leap && t > 26 && t < 36) ? 1 : 0 }; };
// 3) the double-jump gate up to the library, and coming back
{
  const S = G.newState(3);
  place(S, 'r7', CW + 12, 0); const rooms = new Set(); run(S, 6, (S2, i) => { rooms.add(S2.roomId); return climber(S2, i); });
  ok(!rooms.has('l1'), 'without the Leap Stone the shaft to the library cannot be climbed');
  S.p.relics.leap = 1; place(S, 'r7', CW + 12, 0); rooms.clear(); run(S, 6, (S2, i) => { rooms.add(S2.roomId); return climber(S2, i); });
  ok(rooms.has('l1'), 'with the Leap Stone the player double-jumps up into the library');
}
// 4) climbing back out of the catacombs shaft without any relic
{
  const S = G.newState(4); place(S, 'c1', 12, 2); const rooms = new Set();
  run(S, 14, (S2, i) => { rooms.add(S2.roomId); if (S2.roomId === 'r4') S2.stop = 1; return climber(S2, i); });
  ok(rooms.has('r4'), 'a plain jumper climbs the catacomb shaft back up to the entrance');
}
// 5) the slide gate between the library and the clock tower
{
  const S = G.newState(5); place(S, 'l6', 10, 0); const rooms = new Set();
  run(S, 3, (S2) => { rooms.add(S2.roomId); S2.ents = []; return { left: 1 }; });
  ok(!rooms.has('k1'), 'without the cloak the crawlspace stops you');
  S.p.relics.cloak = 1; place(S, 'l6', 8, 0); rooms.clear();
  run(S, 4, (S2, i) => { rooms.add(S2.roomId); S2.ents = []; return { left: 1, down: S2.roomId === 'l6' && S2.p.x < 7 * TILE ? 1 : 0, jump: S2.p.x < 7 * TILE && i % 30 === 0 ? 1 : 0 }; });
  ok(rooms.has('k1'), 'with the cloak, down + jump slides through to the clock tower');
}
// 6) the bat shaft
{
  const S = G.newState(6); S.p.relics = { leap: 1, cloak: 1 }; place(S, 'k7', 12, 0); const rooms = new Set();
  run(S, 6, (S2, i) => { rooms.add(S2.roomId); return climber(S2, i); });
  ok(!rooms.has('t1'), 'the keep shaft cannot be climbed by jumping');
  S.p.relics.wing = 1; S.p.mmp = S.p.mp = 60; place(S, 'k7', 12, 0); rooms.clear();
  run(S, 12, (S2, i) => { rooms.add(S2.roomId); S2.ents = []; if (S2.roomId === 't2') S2.stop = 1;
    const p = S2.p; if (p.mp < 10) p.mp = 60; const top = S2.roomId === 't1' && p.y < S2.R.floorY(0) * TILE; return { bat: i === 2 ? 1 : 0, up: !top || p.y > 9 * TILE ? 1 : 0, down: top && p.y < 8 * TILE ? 1 : 0, right: top ? 1 : 0 }; });
  ok(rooms.has('t2'), 'as a bat the player flies up the shaft into the keep');
}
// 7) combat, levels, drops
{
  const S = G.newState(7); place(S, 'r4', 6, 0);
  const e = G.spawnEnemy(S, 'zombie', 9 * TILE, S.R.floorY(0) * TILE, 1); e.st = 'walk';
  const exp0 = S.p.exp + S.p.lv * 1000;
  run(S, 3, (S2, i) => ({ attack: i % 20 < 2 ? 1 : 0, right: S2.p.x < e.x - 20 ? 1 : 0 }));
  ok(e.dead, 'sword swings kill a zombie');
  ok(S.p.exp + S.p.lv * 1000 > exp0, 'killing gives experience');
  const S2 = G.newState(8); const lv = S2.p.lv; G.update(S2, DT, blank());
  for (let i = 0; i < 40; i++) { const z = G.spawnEnemy(S2, 'knight', 0, 0, 5); z.hp = 1; z.def = 0; }
  for (const z of S2.ents) { z.x = S2.p.x + 12; z.y = S2.p.y; }
  run(S2, 0.6, (S3, i) => ({ attack: i === 0 ? 1 : 0 }));
  ok(S2.p.lv > lv, `levelling up (lv ${lv} -> ${S2.p.lv})`);
  ok(S2.p.hp > 0, 'still alive');
}
// 8) items, equipment, shop, saves
{
  const S = G.newState(9); const p = S.p;
  p.hp = 10; ok(G.useItem(S, 'potion') && p.hp === 70, 'a potion heals 60');
  p.gold = 1000; ok(G.buy(S, 'chainmail') && p.gold === 200, 'buying chain mail');
  const d0 = G.stats(p).def; G.equip(S, 'chainmail'); ok(G.stats(p).def === d0 + ITEMS.chainmail.def - ITEMS.tunic.def, 'equipping armour raises defence');
  ok(!G.sell(S, 'chainmail'), 'cannot sell the armour you are wearing');
  p.relics.leap = 1; S.flags.boss.greatbat = 1; S.saveRoom = 'r3';
  const d = JSON.parse(JSON.stringify(G.toSave(S)));
  const S2 = G.fromSave(d, 10);
  ok(S2.roomId === 'r3' && S2.p.relics.leap && S2.flags.boss.greatbat && S2.p.equip.armor === 'chainmail', 'save and load keep room, relics, bosses and gear');
}
// 9) every boss can be fought and beaten by a strong player without crashing
for (const kind of Object.keys(BOSSES)) {
  const room = ROOMS.find((r) => r.boss === kind);
  const S = G.newState(11); Object.assign(S.p, { str: 200, mhp: 99999, hp: 99999, relics: { leap: 1, cloak: 1, wing: 1 } });
  place(S, room.id, 6, 0); S.ents = S.ents.filter((e) => e.boss);
  // re-spawn the boss since place() cleared ents
  G.loadRoom(S, room.id, null); S.p.x = 8 * TILE; S.p.y = S.R.floorY(0) * TILE - S.p.h;
  let t = 0, sealed = false;
  run(S, 90, (S2, i) => { t = i * DT; if (S2.sealed) sealed = true; S2.p.hp = 99999; const b = S2.boss; if (!b || b.dead || S2.won) { S2.stop = 1; return {}; }
    const bx = b.x + b.w / 2, px = S2.p.x + S2.p.w / 2; return { right: bx > px + 20 ? 1 : 0, left: bx < px - 20 ? 1 : 0, attack: i % 16 < 2 ? 1 : 0, jump: b.y + b.h < S2.p.y && i % 40 < 20 ? 1 : 0 }; });
  ok(sealed && S.flags.boss[kind], `${kind}: the doors seal, and it is beaten (${t.toFixed(1)} s)`);
  if (kind === 'count') ok(S.won, 'beating the Count wins the game');
}
console.log('explored after a short walk:', G.explored(G.newState(1)) + '%');
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
