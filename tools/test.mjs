// Headless tests of the real game logic: physics against the reachability assumptions, gates, combat, items, saves.
import { TILE, CW, CH, ROOMS, ITEMS, BOSSES, ENEMIES, AREAS } from '../js/data.js?v=2';
import { T } from '../js/world.js?v=3';
import * as G from '../js/game.js?v=6';
import * as I from '../js/items.js?v=3';
import { DROPS } from '../js/drops.js?v=1';

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
// 8) items, equipment, the shop, gems, saves
{
  const S = G.newState(9); const p = S.p;
  p.hp = 10; ok(G.useItem(S, 'potion') && p.hp === 70, 'a potion heals 60');
  p.gold = 1000; ok(G.buy(S, 'hipotion') && p.gold === 700, 'buying a high potion');
  const chain = I.makeItem('chainmail', 'n', 15, () => 0.99); delete chain.s; p.bag.push(chain);
  const d0 = G.stats(p).def; p.lv = 1;
  ok(G.equipItem(S, chain) === 'level', 'items have a required level');
  p.lv = 20; ok(G.equipItem(S, chain) === null && G.stats(p).def === d0 + 15 - 3, 'wearing chain mail raises defence by its own value');
  ok(p.bag.some((it) => it.b === 'quilted'), 'the old armour goes back into the bag');
  const claymore = I.makeItem('claymore', 'n', 10, () => 0.99), shield = I.makeItem('buckler', 'n', 3, () => 0.99); delete claymore.s; delete shield.s;
  p.bag.push(shield); G.equipItem(S, shield); p.bag.push(claymore); G.equipItem(S, claymore);
  ok(p.eq.weapon === claymore && !p.eq.shield, 'a two-handed weapon takes the shield off');
  const r1 = I.makeItem('ring', 'm', 10, Math.random), r2 = I.makeItem('ring', 'm', 10, Math.random); p.bag.push(r1, r2); G.equipItem(S, r1); G.equipItem(S, r2);
  ok(p.eq.ring1 === r1 && p.eq.ring2 === r2, 'two rings, two ring slots');
  const sock = I.makeItem('longsword', 'n', 20, () => 0.1); sock.s = 2; sock.g = []; p.bag.push(sock); G.equipItem(S, sock);
  p.gems.ruby3 = 1; const f0 = G.stats(p).elem.fire; ok(G.socketGem(S, sock, 'ruby3') && G.stats(p).elem.fire === f0 + 20, 'a ruby in a weapon socket adds fire damage');
  p.gems.topaz1 = 3; p.gold = 10000; ok(G.combineGems(S, 'topaz1') && p.gems.topaz2 === 1 && !p.gems.topaz1, 'three chipped topazes make a flawed one');
  const n0 = p.bag.length, g = G.gamble(S, 'ring'); ok(g && g.q !== 'n' && p.bag.length === n0 + 1, `gambling a ring gives a magic-or-better ring (${g && g.q})`);
  const stock = G.shopStock(S); ok(stock.length >= 5, `the shop sells rolled items (${stock.length})`);
  const sold = p.bag.find((it) => it.b === 'quilted'), gold0 = p.gold; ok(G.sellGear(S, sold) && p.gold > gold0, 'selling an item');
  p.relics.leap = 1; S.flags.boss.greatbat = 1; S.saveRoom = 'r3';
  const d = JSON.parse(JSON.stringify(G.toSave(S)));
  const S2 = G.fromSave(d, 10);
  ok(S2.roomId === 'r3' && S2.p.relics.leap && S2.flags.boss.greatbat && S2.p.eq.weapon.b === 'longsword' && S2.p.eq.weapon.g[0] === 'ruby3' && S2.p.bag.length === p.bag.length, 'save and load keep room, relics, bosses, gear, gems and the bag');
  // a save from before items were rolled (version 1) still loads
  const v1 = { v: 1, p: { lv: 6, exp: 10, hp: 90, mhp: 120, mp: 30, mmp: 30, hearts: 10, mhearts: 40, gold: 500, str: 11, con: 9, lck: 7, equip: { weapon: 'rapier', armor: 'leather', acc: 'luckring' }, items: { potion: 3 }, gear: { shortsword: 1, rapier: 1, leather: 1, tunic: 1, luckring: 1, claymore: 2 }, sub: 'axe', relics: { leap: 1 }, kills: 40 }, flags: { taken: {}, boss: { greatbat: 1 }, seen: {}, visited: {} }, room: 'r3' };
  const S3 = G.fromSave(v1, 3);
  ok(S3.p.eq.weapon.b === 'rapier' && S3.p.eq.armor.b === 'leatherarmor' && S3.p.eq.ring1 && S3.p.eq.sub.b === 'axes' && S3.p.bag.filter((it) => it.b === 'claymore').length === 2 && S3.p.mhp === 120, 'an old save is converted to items (and keeps its max HP)');
}
// 9) mist through iron grates, deep water, warping, the Reversed Castle portal
{
  const grateDoor = ROOMS.find((r) => r.area === 'caverns' && G.getRoom(r.id).exits.some((e) => e.gate === 'grate'));
  const R0 = G.getRoom(grateDoor.id), gx = R0.tiles.flat().filter((t) => t === T.GRATE).length;
  ok(gx > 0, `iron grates are built at mist gates (${gx} tiles in ${grateDoor.id})`);
  const deepRoom = ROOMS.find((r) => r.world !== 'rev' && G.getRoom(r.id).tiles.flat().includes(T.DEEP));
  const S = G.newState(12); G.loadRoom(S, deepRoom.id, null); const DR = S.R;
  let wx = -1, wy = -1; for (let y = 0; y < DR.H && wx < 0; y++) for (let x = 0; x < DR.W; x++) if (DR.tiles[y][x] === T.DEEP && DR.tiles[y - 1]?.[x] === T.DEEP) { wx = x; wy = y; break; }
  S.ents = []; S.p.x = wx * TILE + 3; S.p.y = wy * TILE - 10; S.p.vx = S.p.vy = 0; S.p.face = 1; const hp0 = S.p.hp;
  run(S, 0.2, () => ({})); const inWater = () => S.R.tiles[Math.floor((S.p.y + S.p.h / 2) / TILE)]?.[Math.floor((S.p.x + S.p.w / 2) / TILE)] === T.DEEP;
  ok(S.p.hp < hp0 && !inWater(), 'deep water puts you back on dry ground without the snorkel');
  S.p.relics.snorkel = 1; S.p.hp = S.p.mhp; S.p.x = wx * TILE + 3; S.p.y = wy * TILE - 10; S.p.vy = 0; const y0 = S.p.y;
  const room0 = S.roomId; run(S, 0.6, (S2, i) => ({ jump: i % 10 < 3 ? 1 : 0 })); ok(S.p.hp === S.p.mhp && (S.roomId !== room0 || S.p.y < y0), 'with the snorkel you swim up through it');
  const W2 = G.newState(13); W2.flags.warps = { lab3: 1 };
  const warp = ROOMS.find((r) => r.special === 'warp' && r.world !== 'rev'); W2.flags.warps[warp.id] = 1;
  ok(G.warpTo(W2, warp.id) && W2.roomId === warp.id, `warping to ${warp.id}`);
  const P = G.newState(14); P.p.relics.moonEye = 1; P.flags.boss.count = 1; G.loadRoom(P, 't5', null);
  ok(P.props.some((q) => q.kind === 'portal' && q.to === 'R:r1'), 'with the Moon Eye, the throne room opens the way to the Reversed Castle');
  G.loadRoom(P, 'R:l2', null); ok(P.world === 'rev' && P.mlvl === AREAS.library.lv + 25, `the Reversed Castle is much stronger (monster level ${P.mlvl})`);
}
// 10) every monster: spawn it next to the player and fight it for a while
{
  let crashed = 0; const killed = [];
  for (const kind of Object.keys(ENEMIES)) {
    const S = G.newState(20); place(S, 'r4', 4, 0); S.p.bhp = 99999; G.stats(S.p); S.p.hp = S.p.mhp; S.p.str = 300;
    const e = G.spawnEnemy(S, kind, 12 * TILE, S.R.floorY(0) * TILE, 10); if (e.st === 'under') e.st = 'walk';
    try { run(S, 12, (S2, i) => { S2.p.hp = S2.p.mhp; const t = S2.ents[0]; if (!t) { S2.stop = 1; return {}; } const tx = t.x + t.w / 2, px = S2.p.x + S2.p.w / 2; return { right: tx > px + 16 ? 1 : 0, left: tx < px - 16 ? 1 : 0, attack: i % 14 < 2 ? 1 : 0, jump: t.y + t.h < S2.p.y - 8 && i % 30 < 15 ? 1 : 0 }; }); }
    catch (err) { crashed++; console.log('     crash', kind, err.message); }
    if (e.dead) killed.push(kind);
  }
  ok(crashed === 0, `all ${Object.keys(ENEMIES).length} monster types run without errors`);
  ok(killed.length >= Object.keys(ENEMIES).length - 6, `most can be hunted down in a small room (${killed.length}/${Object.keys(ENEMIES).length}; not: ${Object.keys(ENEMIES).filter((k) => !killed.includes(k)).join(', ')})`);
}
// 11) every boss can be fought and beaten by a strong player without crashing
for (const kind of Object.keys(BOSSES)) {
  const room = ROOMS.find((r) => r.boss === kind);
  const S = G.newState(11); Object.assign(S.p, { str: 400, bhp: 99999, relics: { leap: 1, cloak: 1, wing: 1 } }); G.stats(S.p);
  G.loadRoom(S, room.id, null); S.p.x = 8 * TILE; S.p.y = S.R.floorY(0) * TILE - S.p.h;
  let t = 0, sealed = false;
  try {
    run(S, BOSSES[kind].fly ? 240 : 120, (S2, i) => { t = i * DT; if (S2.sealed) sealed = true; S2.p.hp = S2.p.mhp; const b = S2.boss; if (!b || b.dead || S2.won) { S2.stop = 1; return {}; }
      const bx = b.x + b.w / 2, px = S2.p.x + S2.p.w / 2; return { right: bx > px + 20 ? 1 : 0, left: bx < px - 20 ? 1 : 0, attack: i % 16 < 2 ? 1 : 0, jump: b.y + b.h < S2.p.y && (i % 40 < 12 || (i % 40 > 16 && i % 40 < 26)) ? 1 : 0 }; });
  } catch (err) { console.log('     crash', kind, err.stack.split('\n').slice(0, 3).join(' | ')); }
  ok(sealed && S.flags.boss[kind], `${kind} (${room.id}): the doors seal, and it is beaten (${t.toFixed(1)} s)`);
  if (kind === 'count') ok(S.won, 'beating the Count wins the game');
  if (kind === 'moonlord') ok(S.won && S.trueEnd, 'beating the Moon Sovereign gives the true ending');
}
// gallery: kills and found gear are remembered and survive a save
{
  const S = G.newState(5); place(S, 'r4', 8, 0); S.p.face = 1;
  const e = G.spawnEnemy(S, 'skeleton', S.p.x + 24, S.R.floorY(0) * TILE, 3); e.hp = 1; e.st = 'idle';
  run(S, 1, (S2, i) => ({ attack: i % 20 < 3 ? 1 : 0 }));
  const u = I.makeItem('longsword', 'u', 20, Math.random, { id: 'moonblade' }); G.giveGear(S, u);
  ok(S.flags.dex && S.flags.dex.skeleton === 1, 'gallery: a kill is counted');
  ok(S.flags.found.longsword && S.flags.found['u:moonblade'], 'gallery: the base and the unique are marked found');
  const S2 = G.fromSave(JSON.parse(JSON.stringify(G.toSave(S))), 1);
  ok(S2.flags.dex.skeleton === 1 && S2.flags.found['u:moonblade'], 'gallery: progress survives save and load');
}
// special weapon effects, each forced to 100% on a sword with one swing at a sturdy skeleton
{
  const swing = (mods, setup) => {
    const S = G.newState(31); place(S, 'r4', 8, 0); S.p.face = 1; S.p.lv = 30;
    const w = I.makeItem('broadsword', 'm', 10, Math.random); delete w.s; w.a = mods; S.p.eq.weapon = w; G.stats(S.p);
    const e = G.spawnEnemy(S, 'skeleton', S.p.x + 26, S.R.floorY(0) * TILE, 5); e.hp = e.mhp = 5000; e.st = 'idle'; if (setup) setup(e);
    let hp1 = null; run(S, 0.3, (S2, i) => { if (i === 12) hp1 = e.hp; return { attack: i === 0 ? 1 : 0 }; });
    return { S, e, hp1 };
  };
  const plain = swing([]), lost = 5000 - plain.hp1;
  const ds = swing([['ds', 100]]); ok(5000 - ds.hp1 > lost * 1.6, `deadly strike doubles the damage (${lost} -> ${5000 - ds.hp1})`);
  const cr = swing([['crush', 100]]); ok(5000 - cr.hp1 > 1000, `crushing blow takes a quarter of the life (${5000 - cr.hp1})`);
  const bl = swing([['bleed', 100]]); ok(bl.e.hp < bl.hp1 && !bl.e.dead, 'open wounds keep bleeding after the hit');
  const stn = swing([['stun', 100]]); ok(stn.e.stun > 0, 'paralysis stops the enemy');
  const x0 = stn.e.x; run(stn.S, 0.5, () => ({})); ok(Math.abs(stn.e.x - x0) < 1, 'a paralyzed enemy does not move');
  const fz = swing([['freeze', 100]]); ok(fz.e.frozen > 0, 'freezing hits freeze the enemy');
  const ig = swing([['ignore', 1]], (e) => { e.def = 999; }), ig0 = swing([], (e) => { e.def = 999; });
  ok(5000 - ig.hp1 > (5000 - ig0.hp1) * 5, `ignore defense goes through armour (${5000 - ig0.hp1} -> ${5000 - ig.hp1})`);
  const ls = swing([['ls', 50]], null); ls.S.p.hp = 1; run(ls.S, 0.4, (S2, i) => ({ attack: i === 0 ? 1 : 0 })); ok(ls.S.p.hp > 1, 'life steal heals on hit');
  const S = G.newState(32); S.p.items.antidote = 1; ok(!G.useItem(S, 'antidote') && S.p.items.antidote === 1, 'an antidote is not wasted when you are not poisoned');
  ok(Object.values(I.UNIQUES).filter((u) => u.mods.some(([k]) => ['ds', 'crush', 'bleed', 'stun', 'freeze'].includes(k))).length >= 8, 'uniques carry the special effects');
}
// drop tables and the elite form
{
  const kinds = Object.keys(ENEMIES).filter((k) => !BOSSES[k]);
  ok(kinds.every((k) => DROPS[k]), `every monster has a drop table (${Object.keys(DROPS).length}/${kinds.length})`);
  const valid = (D) => (D.t === 'item' ? !!ITEMS[D.id] : D.t === 'gem' ? !!I.GEMS[D.g.replace(/\d/, '')] : D.t === 'gear' ? !!I.BASES[D.b] : !!I.UNIQUES[D.id]);
  ok(kinds.every((k) => ['n', 'r', 'en', 'er'].every((s) => valid(DROPS[k][s]))), 'every drop is a real item, gem, base or unique');
  ok(new Set(kinds.map((k) => DROPS[k].er.id)).size === kinds.length, 'every species has a different unique as its elite rare drop');
  const S = G.newState(40); place(S, 'r4', 8, 0); S.p.face = 1; S.p.str = 400; G.stats(S.p);
  const e = G.spawnEnemy(S, 'skeleton', S.p.x + 30, S.R.floorY(0) * TILE, 5), h0 = e.h, hp0 = e.mhp; G.promote(S, e, 'elite');
  ok(e.tier === 'elite' && e.h > h0 && e.mhp >= hp0 * 6 && e.name.zh === '強敵・骷髏兵', `the elite form is bigger and tougher (${e.name.zh}, hp ${hp0} -> ${e.mhp})`);
  const keep = {}; for (const s of ['n', 'r', 'en', 'er']) { keep[s] = DROPS.skeleton[s].p; DROPS.skeleton[s].p = 1; }
  run(S, 3, (S2, i) => ({ attack: i % 16 < 2 ? 1 : 0, right: !e.dead && S2.p.x < e.x - 24 ? 1 : 0 }));
  for (const s of ['n', 'r', 'en', 'er']) DROPS.skeleton[s].p = keep[s];
  ok(e.dead && S.flags.dex['elite:skeleton'] === 1, 'beating an elite is counted in the gallery');
  ok(['n', 'r', 'en', 'er'].every((s) => S.flags.drops['skeleton:' + s]), 'its normal, rare, elite normal and elite rare drops are recorded');
  ok(S.p.bag.some((it) => it.q === 'u' && it.id === DROPS.skeleton.er.id) || S.drops.some((d) => d.k === 'gear' && d.it.id === DROPS.skeleton.er.id), `the elite rare drop is ${DROPS.skeleton.er.id}`);
  let elites = 0; for (let i = 0; i < 300; i++) { const T = G.newState(100 + i); G.loadRoom(T, 'c2', null); elites += T.ents.some((x) => x.tier === 'elite') ? 1 : 0; }
  ok(elites > 10 && elites < 70, `elites appear now and then (${elites} of 300 visits)`);
}
console.log('explored after a short walk:', G.explored(G.newState(1)) + '%');
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
