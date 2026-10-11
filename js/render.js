// All drawing: procedural gothic pixel art for rooms, the hero, enemies, bosses, effects and the HUD.
// The canvas is scaled so that one unit = one game pixel; positions are rounded to whole pixels.
import { TILE, CW, CH, AREAS, ITEMS, SUBS, BOSSES, RELICS, ROOMS } from './data.js?v=1';
import { T } from './world.js?v=1';
import { stats, expToNext, getRoom } from './game.js?v=1';
import { L, t } from './i18n.js?v=1';

export const VW = CW * TILE, VH = CH * TILE;
let ctx = null;
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function shade(hex, k) { // k < 0 darker, > 0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ------------------------------------------------------------------ the room layer (prerendered once per room)
const layerCache = {};
function roomLayer(R0) {
  if (layerCache[R0.id] && !R0.dirty) return layerCache[R0.id];
  R0.dirty = false;
  const cv = layerCache[R0.id]?.cv || document.createElement('canvas');
  cv.width = R0.W * TILE; cv.height = R0.H * TILE;
  const prev = ctx; ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
  const r = R0.room, A = AREAS[r.area], rnd = rng(hash(R0.id + 'art')), tiles = R0.tiles;
  const air = (x, y) => x >= 0 && y >= 0 && x < R0.W && y < R0.H && tiles[y][x] !== T.SOLID && tiles[y][x] !== T.BREAK;
  // ---- back wall
  if (!r.outside) {
    for (let y = 0; y < R0.H; y++) for (let x = 0; x < R0.W; x++) {
      const bx = x * TILE, by = y * TILE;
      R(bx, by, 16, 16, A.wall);
      // dim bricks
      const off = (y % 2) * 8;
      ctx.fillStyle = shade(A.wall, -0.25);
      ctx.fillRect(bx, by + 7, 16, 1); ctx.fillRect(bx + ((off + 4) % 16), by, 1, 7); ctx.fillRect(bx + ((off + 12) % 16), by + 8, 1, 8);
      if (rnd() < 0.05) R(bx + 3 + rnd() * 9, by + 2 + rnd() * 10, 2, 1, shade(A.wall, 0.12));
    }
    for (let row = 0; row < r.h; row++) for (let cx = 0; cx < r.w; cx++) decorateCell(R0, cx, row, A, rnd);
  } else {
    // the courtyard: dark hills and the castle in the distance are drawn in screen space; here: an iron fence and dead trees
    for (let cx = 0; cx < r.w; cx++) {
      const fy = R0.floorY(0) * TILE;
      for (let x = cx * VW; x < cx * VW + VW; x += 6) { R(x, fy - 26, 1, 26, '#1a1626'); R(x - 1, fy - 28, 3, 2, '#1a1626'); }
      R(cx * VW, fy - 22, VW, 2, '#1a1626'); R(cx * VW, fy - 8, VW, 2, '#1a1626');
      if (cx === 1) tree(cx * VW + 120, fy, rnd);
    }
    gate(R0.W * TILE - 2 * TILE, R0.floorY(0) * TILE);
  }
  // ---- solid tiles
  for (let y = 0; y < R0.H; y++) for (let x = 0; x < R0.W; x++) {
    const tt = tiles[y][x], bx = x * TILE, by = y * TILE;
    if (tt === T.SOLID || tt === T.BREAK) {
      R(bx, by, 16, 16, A.brick);
      ctx.fillStyle = shade(A.brick, -0.3);
      const off = (y % 2) * 8; ctx.fillRect(bx, by + 7, 16, 1); ctx.fillRect(bx, by + 15, 16, 1); ctx.fillRect(bx + off, by, 1, 7); ctx.fillRect(bx + (off + 8) % 16, by + 8, 1, 7);
      ctx.fillStyle = shade(A.brick, 0.12); ctx.fillRect(bx + off + 1, by, 6, 1); ctx.fillRect(bx + (off + 9) % 16, by + 8, 6, 1);
      if (rnd() < 0.12) R(bx + 2 + rnd() * 10, by + 2 + rnd() * 10, 2, 2, shade(A.brick, -0.15));
      if (air(x, y - 1)) { R(bx, by, 16, 3, A.trim); R(bx, by + 3, 16, 1, shade(A.trim, -0.4)); if (r.area === 'catacombs' && rnd() < 0.4) R(bx + rnd() * 12, by + 3, 3, 2 + rnd() * 3, '#3e5a3a'); if (r.outside) { R(bx, by - 2, 16, 3, '#2e4a2a'); for (let k = 0; k < 4; k++) R(bx + rnd() * 15, by - 3 - rnd() * 2, 1, 2, '#3e6a32'); } }
      if (air(x, y + 1)) R(bx, by + 14, 16, 2, shade(A.brick, -0.45));
      if (air(x - 1, y)) R(bx, by, 1, 16, shade(A.brick, 0.2));
      if (air(x + 1, y)) R(bx + 15, by, 1, 16, shade(A.brick, -0.4));
      if (tt === T.BREAK) { ctx.fillStyle = '#100a08'; ctx.fillRect(bx + 4, by + 2, 1, 5); ctx.fillRect(bx + 5, by + 6, 3, 1); ctx.fillRect(bx + 8, by + 7, 1, 6); ctx.fillRect(bx + 11, by + 3, 1, 4); }
    } else if (tt === T.PLAT) {
      R(bx, by, 16, 4, A.trim); R(bx, by + 4, 16, 1, shade(A.trim, -0.5)); R(bx, by, 16, 1, shade(A.trim, 0.35));
      if (!air(x - 1, y) || tiles[y][x - 1] !== T.PLAT) R(bx + 1, by + 5, 3, 3, shade(A.trim, -0.55));
      if (x + 1 < R0.W && tiles[y][x + 1] !== T.PLAT) R(bx + 12, by + 5, 3, 3, shade(A.trim, -0.55));
    }
  }
  ctx = prev;
  return (layerCache[R0.id] = { cv });
}
function tree(x, fy, rnd) {
  ctx.fillStyle = '#120e18'; ctx.fillRect(x, fy - 80, 6, 80);
  const branch = (bx, by, len, dir, d) => { for (let i = 0; i < len; i++) ctx.fillRect(bx + i * dir, by - i * 0.6, 2, 2); if (d > 0) { branch(bx + len * dir * 0.6, by - len * 0.36, len * 0.6, dir, d - 1); branch(bx + len * dir * 0.8, by - len * 0.5, len * 0.5, -dir, d - 1); } };
  branch(x + 3, fy - 60, 30, 1, 2); branch(x + 3, fy - 50, 26, -1, 2); branch(x + 3, fy - 76, 20, 1, 1);
}
function gate(x, fy) {
  R(x - 30, fy - 120, 60, 120, '#1c1828');
  ctx.fillStyle = '#100c18'; ctx.beginPath(); ctx.moveTo(x - 22, fy); ctx.lineTo(x - 22, fy - 70); ctx.quadraticCurveTo(x, fy - 100, x + 22, fy - 70); ctx.lineTo(x + 22, fy); ctx.fill();
  for (let i = -18; i <= 18; i += 6) R(x + i, fy - 84 + Math.abs(i) * 0.6, 2, 84 - Math.abs(i) * 0.6, '#3a3448');
  for (let k = 0; k < 7; k++) R(x - 40 + k * 12, fy - 128, 8, 8, '#1c1828');
}
function window_(x, y, w, h, frame) {
  // a pointed gothic window: transparent so that the screen-space sky shows through
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w * 0.6); ctx.quadraticCurveTo(x + w / 2, y - w * 0.4, x + w, y + w * 0.6); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.restore();
  ctx.fillStyle = frame; ctx.fillRect(x - 2, y + h, w + 4, 3); ctx.fillRect(x + w / 2 - 1, y + w * 0.3, 2, h - w * 0.3); ctx.fillRect(x, y + h * 0.55, w, 1);
  ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 1, y + h); ctx.lineTo(x - 1, y + w * 0.6); ctx.quadraticCurveTo(x + w / 2, y - w * 0.45, x + w + 1, y + w * 0.6); ctx.lineTo(x + w + 1, y + h); ctx.stroke();
}
function decorateCell(R0, cx, row, A, rnd) {
  const x0 = cx * VW, top = row * CH * TILE + 16, fy = R0.floorY(row) * TILE, area = R0.room.area;
  // pillars at the cell edges
  for (const px of [x0 + 24, x0 + VW - 40]) { R(px, top, 16, fy - top, shade(A.wall, 0.08)); R(px + 2, top, 2, fy - top, shade(A.wall, 0.2)); R(px + 13, top, 3, fy - top, shade(A.wall, -0.3)); R(px - 3, fy - 10, 22, 10, shade(A.wall, 0.15)); R(px - 3, top, 22, 6, shade(A.wall, 0.15)); }
  if (area === 'entrance' || area === 'keep' || area === 'clock') {
    if (A.moon) { window_(x0 + 76, top + 22, 30, 74, shade(A.wall, -0.4)); window_(x0 + VW - 106, top + 22, 30, 74, shade(A.wall, -0.4)); }
    if (area === 'entrance') { for (const bx of [x0 + 170]) { R(bx, top + 8, 22, 52, '#7a1424'); R(bx, top + 8, 22, 3, '#d8b060'); R(bx + 8, top + 26, 6, 10, '#d8b060'); ctx.fillStyle = '#7a1424'; ctx.beginPath(); ctx.moveTo(bx, top + 60); ctx.lineTo(bx + 11, top + 70); ctx.lineTo(bx + 22, top + 60); ctx.fill(); } }
    if (area === 'keep') { // stained glass tint over the windows + a chandelier
      R(x0 + 176, top, 1, 30, '#2a1a10'); ctx.fillStyle = '#d8a040'; ctx.fillRect(x0 + 160, top + 30, 34, 3); for (let k = 0; k < 5; k++) { R(x0 + 160 + k * 8, top + 26, 2, 4, '#f4e8c8'); }
      R(x0 + 120, fy - 3, 150, 3, '#8a1830');
    }
    if (area === 'clock') { gearArt(x0 + 190, top + 60, 36, rnd() * 6, shade(A.wall, 0.18)); gearArt(x0 + 222, top + 98, 20, rnd() * 6, shade(A.wall, 0.12)); R(x0 + 140, top, 2, 90, '#5a4a30'); ctx.fillStyle = '#b8a070'; ctx.beginPath(); ctx.arc(x0 + 141, top + 96, 9, 0, 7); ctx.fill(); }
  }
  if (area === 'catacombs') {
    for (let k = 0; k < 3; k++) { const nx = x0 + 70 + k * 90, ny = top + 30 + rnd() * 30; R(nx, ny, 26, 18, '#0c1210'); for (let s = 0; s < 3; s++) { skull(nx + 4 + s * 7, ny + 9); } }
    ctx.strokeStyle = 'rgba(200,210,200,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(x0 + 16, top + k * 6); ctx.lineTo(x0 + 16 + 24 - k * 6, top); } ctx.stroke();
  }
  if (area === 'library') {
    for (let s = 0; s < 2; s++) {
      const sx = x0 + 52 + s * 160, sw = 112, sy = top + 6, sh = fy - top - 6;
      R(sx - 3, sy, sw + 6, sh, '#2a160a'); R(sx - 3, sy, sw + 6, 3, '#8a6030');
      for (let shelf = sy + 6; shelf < sy + sh - 20; shelf += 22) {
        let bx = sx;
        while (bx < sx + sw - 4) { const w = 3 + Math.floor(rnd() * 3), h = 12 + Math.floor(rnd() * 6), col = ['#7a1a1a', '#1a3a6a', '#2a5a2a', '#6a4a1a', '#4a1a5a', '#8a7a3a'][Math.floor(rnd() * 6)]; R(bx, shelf + 18 - h, w, h, col); R(bx, shelf + 20 - h, w, 1, '#d8b060'); bx += w + (rnd() < 0.1 ? 4 : 0); }
        R(sx, shelf + 18, sw, 3, '#5a3a18');
      }
    }
  }
}
function skull(x, y) { R(x - 2, y - 3, 5, 4, '#c8c0a8'); R(x - 1, y + 1, 3, 1, '#c8c0a8'); R(x - 1, y - 2, 1, 1, '#000'); R(x + 1, y - 2, 1, 1, '#000'); }
function gearArt(x, y, r, a, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 24; i++) { const ang = a + i / 24 * Math.PI * 2, rr = i % 2 ? r : r * 0.82; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
  ctx.fill(); ctx.fillStyle = shade(col.startsWith('#') ? col : '#444444', -0.4); ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill();
}

// ------------------------------------------------------------------ sky (screen space, parallax)
function sky(S, A, camx, camy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, A.sky[0]); g.addColorStop(1, A.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const rnd = rng(77);
  for (let i = 0; i < 60; i++) { const x = (rnd() * 800 - camx * 0.05) % 800, y = rnd() * 150; if (x >= 0 && x < VW) R(x, y, 1, 1, rnd() < 0.3 ? '#ffffff' : '#9aa0c8'); }
  if (A.moon || S.R.room.outside) {
    const mx = 280 - camx * 0.04, my = 52 - camy * 0.02;
    const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 70); glow.addColorStop(0, 'rgba(255,240,220,0.35)'); glow.addColorStop(1, 'rgba(255,240,220,0)'); ctx.fillStyle = glow; ctx.fillRect(mx - 70, my - 70, 140, 140);
    ctx.fillStyle = S.R.room.area === 'keep' ? '#ffb090' : '#fff4dc'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,160,0.35)'; ctx.beginPath(); ctx.arc(mx - 6, my - 5, 5, 0, 7); ctx.arc(mx + 8, my + 6, 4, 0, 7); ctx.arc(mx + 3, my - 10, 3, 0, 7); ctx.fill();
  }
  // far castle silhouette and hills
  const hx = -camx * 0.15;
  ctx.fillStyle = '#16122a';
  ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, 150 + Math.sin((x - hx) * 0.02) * 12 + Math.sin((x - hx) * 0.05) * 5); ctx.lineTo(VW, VH); ctx.fill();
  if (S.R.room.outside) {
    const cx = 250 - camx * 0.1;
    ctx.fillStyle = '#0e0a1c';
    ctx.fillRect(cx, 70, 60, 90); ctx.fillRect(cx - 30, 100, 30, 60); ctx.fillRect(cx + 60, 90, 26, 70); ctx.fillRect(cx + 20, 40, 18, 40);
    for (const [tx, ty, tw] of [[cx + 20, 40, 18], [cx - 30, 100, 30], [cx + 60, 90, 26], [cx, 70, 60]]) { ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx + tw / 2, ty - 26); ctx.lineTo(tx + tw + 3, ty); ctx.fill(); }
    ctx.fillStyle = '#ffd890'; for (const [wx, wy] of [[cx + 10, 90], [cx + 40, 110], [cx + 26, 60], [cx - 18, 120], [cx + 70, 112]]) ctx.fillRect(wx, wy, 2, 3);
  }
}

// ------------------------------------------------------------------ hero
const HERO = { hair: '#e4e8f2', hairS: '#a0a8c4', skin: '#f2d6c4', coat: '#2a3266', coatS: '#1a2048', trim: '#d8b060', cape: '#1a1230', capeIn: '#8a1830', boot: '#3a2624', pants: '#4a4058' };
function drawHero(S, p) {
  const st = stats(p), x = Math.round(p.x + p.w / 2), y = Math.round(p.y + p.h);
  if (p.inv > 0 && p.hurtT <= 0 && Math.floor(S.time * 20) % 2) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(p.face, 1);
  if (p.bat) { drawBat(S, 0, -6, 1.3, '#4a2a6a', '#b080ff', S.time * 14); ctx.restore(); return; }
  const H = HERO, walk = p.ground && Math.abs(p.vx) > 10 && !p.crouch, ph = walk ? Math.floor(p.anim * 10) % 4 : 0;
  const air = !p.ground, sliding = p.slideT > 0, crouch = p.crouch && !sliding, atk = p.atkT > 0, k = atk ? 1 - p.atkT / p.atkDur : 0;
  const hurt = p.hurtT > 0, dash = p.dashT > 0;
  let by = crouch ? 7 : sliding ? 12 : 0;                  // body drop
  if (!air && !walk && !crouch && !atk && !sliding) by += Math.round(Math.sin(S.time * 3) * 0.6);
  const lean = p.hp <= 0 ? -1.45 : sliding ? 0.9 : dash ? -0.15 : hurt ? -0.25 : 0;
  ctx.rotate(lean * 0.6);
  // cape
  const flutter = Math.sin(S.time * 8) * 2 + Math.min(8, Math.abs(p.vx) / 18), lift = air ? (p.vy < 0 ? 6 : -6) : 0;
  ctx.fillStyle = H.cape; ctx.beginPath(); ctx.moveTo(-3, -22 + by); ctx.lineTo(3, -22 + by); ctx.lineTo(-2, -2 + by * 0.3 - lift * 0.3); ctx.lineTo(-9 - flutter, -1 - lift + by * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = H.capeIn; ctx.beginPath(); ctx.moveTo(-3, -21 + by); ctx.lineTo(-9 - flutter, -1 - lift + by * 0.2); ctx.lineTo(-6 - flutter, -1 - lift + by * 0.2); ctx.closePath(); ctx.fill();
  // legs
  const legs = crouch ? [[-3, -6, 4, 6], [1, -5, 4, 5]] : sliding ? [[-6, -4, 12, 4]] : air ? [[-3, -10, 3, 7], [1, -9, 3, 6]] : walk ? [[[-3, -1, 1, 3][ph] - 1, -10, 3, 10], [[2, 0, -2, 0][ph], -10, 3, 10]] : [[-3, -10, 3, 10], [1, -10, 3, 10]];
  legs.forEach(([lx, ly, lw, lh], i) => { R(lx, ly, lw, lh, i ? H.pants : shade(H.pants, -0.25)); R(lx, ly + lh - 3, lw + 1, 3, H.boot); });
  // torso and coat tails
  const ty = -21 + by;
  if (!sliding) { R(-4, ty, 8, 12, H.coat); R(-5, ty + 9, 10, 4, H.coatS); R(-4, ty + 9, 8, 1, H.trim); R(0, ty + 1, 1, 8, H.trim); R(-4, ty, 8, 1, shade(H.coat, 0.2)); }
  else { R(-8, -10, 14, 6, H.coat); R(-8, -6, 14, 1, H.trim); }
  // head
  const hx = sliding ? 5 : 0, hy = sliding ? -14 : ty - 8;
  R(hx - 3, hy + 1, 7, 7, H.skin); R(hx + 2, hy + 3, 1, 2, '#3a1a3a'); R(hx + 3, hy + 6, 1, 1, '#d8a090');
  R(hx - 4, hy - 1, 8, 3, H.hair); R(hx - 5, hy, 3, 10, H.hair); R(hx - 6, hy + 4, 2, 10, H.hairS); R(hx + 3, hy, 2, 3, H.hair); R(hx - 4, hy - 2, 5, 1, '#ffffff');
  R(hx - 2, hy + 8, 5, 2, H.trim);                          // collar
  // arm + sword
  if (atk) {
    const ext = k < 0.15 ? -0.6 : k < 0.6 ? 1 : 0.6;
    const ay = (p.atkLow ? -6 : -17) + by * (p.atkLow ? 0 : 1);
    R(0, ay, 5 + ext * 2, 3, H.coat); R(5 + ext * 2, ay, 2, 3, H.skin);
    const w = ITEMS[p.equip.weapon] || ITEMS.shortsword, reach = st.reach - 2;
    const blade = p.equip.weapon === 'moonblade' ? '#b8d8ff' : p.equip.weapon === 'claymore' ? '#c8c8d0' : '#e8ecf4';
    if (ext > 0) {
      R(7, ay - 2, 2, 7, H.trim); R(9, ay, reach - 4, 2, blade); R(9, ay, reach - 4, 1, '#ffffff'); if (w.atk > 20) R(9, ay + 2, reach - 6, 1, shade(blade.startsWith('#') ? blade : '#cccccc', -0.3));
      if (k > 0.15 && k < 0.5) { ctx.fillStyle = p.equip.weapon === 'moonblade' ? 'rgba(160,200,255,0.5)' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(6, ay + 1, reach, -0.7, 0.7); ctx.arc(6, ay + 1, reach - 6, 0.7, -0.7, true); ctx.fill(); }
    } else { R(-2, ay - 8, 2, 9, blade); R(-3, ay, 4, 1, H.trim); }
  } else if (!sliding) {
    R(1, ty + 2, 3, 8, H.coatS); R(1, ty + 9, 3, 2, H.skin);
    R(-2, ty + 8, 1, 7, '#8a8a9a');                       // sheathed sword
  }
  ctx.restore();
}
function drawBat(S, x, y, s, body, wing, phase) {
  const f = Math.sin(phase) * 5 * s;
  ctx.fillStyle = wing; ctx.beginPath(); ctx.moveTo(x - 2 * s, y); ctx.lineTo(x - 9 * s, y - 2 * s - f); ctx.lineTo(x - 7 * s, y + 2 * s); ctx.lineTo(x - 4 * s, y + 1 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 2 * s, y); ctx.lineTo(x + 9 * s, y - 2 * s - f); ctx.lineTo(x + 7 * s, y + 2 * s); ctx.lineTo(x + 4 * s, y + 1 * s); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y, 3 * s, 3.4 * s, 0, 0, 7); ctx.fill();
  R(x - 2 * s, y - 4 * s, s, 2 * s, body); R(x + 1 * s, y - 4 * s, s, 2 * s, body);
  R(x - 1.4 * s, y - 1 * s, Math.max(1, s * 0.8), Math.max(1, s * 0.8), '#ff3a3a'); R(x + 0.8 * s, y - 1 * s, Math.max(1, s * 0.8), Math.max(1, s * 0.8), '#ff3a3a');
}

// ------------------------------------------------------------------ enemies
function drawEnemy(S, e) {
  const x = Math.round(e.x + e.w / 2), y = Math.round(e.y + e.h), fl = e.flash > 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(e.face < 0 ? -1 : 1, 1);
  if (fl) ctx.filter = 'brightness(3)';
  const tm = S.time + (e.hx || 0) * 0.01;
  switch (e.kind) {
    case 'bat':
      if (e.st === 'hang') { ctx.scale(1, -1); ctx.translate(0, 10); R(-3, -8, 6, 8, '#3a2050'); R(-4, -6, 1, 5, '#2a1440'); R(3, -6, 1, 5, '#2a1440'); R(-2, -3, 1, 1, '#ff3a3a'); R(1, -3, 1, 1, '#ff3a3a'); }
      else drawBat(S, 0, -5, 1, '#3a2050', '#5a3478', tm * 16);
      break;
    case 'zombie': {
      const k = e.st === 'under' ? 0 : e.st === 'rise' ? 1 - Math.max(0, e.t) / 0.6 : 1;
      if (k <= 0) { R(-4, -2, 8, 2, '#3a3020'); break; }
      ctx.save(); ctx.beginPath(); ctx.rect(-12, -40, 24, 40); ctx.clip(); ctx.translate(0, (1 - k) * 28);
      const sh = Math.sin(tm * 5) * 1.5;
      R(-3 + sh * 0.3, -10, 3, 10, '#3a3428'); R(1 - sh * 0.3, -10, 3, 10, '#2e2a20');
      R(-4, -21, 8, 12, '#5a4a38'); R(-4, -12, 8, 2, '#3a3020'); R(-3, -18, 2, 5, '#4a3a2a');
      R(-3, -28, 7, 7, '#7a9a6a'); R(1, -26, 2, 1, '#ff4a2a'); R(-1, -23, 4, 1, '#3a4a2a'); R(-4, -29, 6, 2, '#2a2a1a');
      R(2, -19, 9, 3, '#7a9a6a'); R(2, -15 + sh, 8, 2, '#6a8a5a');
      ctx.restore(); break;
    }
    case 'skeleton': case 'bonethrower': {
      const ph = Math.abs(e.vx) > 5 ? Math.floor(tm * 8) % 2 : 0, B = '#e8e0cc', D = '#a89c84';
      R(-3 + ph, -10, 2, 10, B); R(1 - ph, -10, 2, 10, D); R(-3, -12, 6, 2, D);
      R(0, -21, 1, 9, B); for (let i = 0; i < 4; i++) R(-3, -20 + i * 2, 7, 1, i % 2 ? D : B);
      R(-3, -28, 7, 7, B); R(-2, -26, 2, 2, '#1a0a0a'); R(1, -26, 2, 2, '#1a0a0a'); R(-1, -23, 4, 1, D); if (e.flash <= 0) R(-1, -25, 1, 1, '#ff3a3a');
      if (e.kind === 'bonethrower') { R(-4, -21, 8, 2, '#a82020'); const up = e.t < 0.5; R(2, up ? -30 : -20, 2, up ? 10 : 8, B); if (up) R(1, -33, 5, 3, B); }
      else { R(2, -18, 6, 2, B); R(7, -24, 2, 12, '#c0c4d0'); R(6, -14, 4, 1, '#8a6a3a'); }
      break;
    }
    case 'ghost': {
      ctx.globalAlpha = 0.72 + Math.sin(tm * 4) * 0.1;
      ctx.fillStyle = '#d8e8ff'; ctx.beginPath(); ctx.arc(0, -11, 7, Math.PI, 0); ctx.lineTo(7, -2);
      for (let i = 0; i <= 4; i++) ctx.lineTo(7 - i * 3.5, -2 + (i % 2 ? -3 : 1) + Math.sin(tm * 8 + i) * 1.2);
      ctx.closePath(); ctx.fill();
      R(-3, -13, 2, 3, '#1a2040'); R(2, -13, 2, 3, '#1a2040'); R(-1, -8, 3, 2, '#1a2040');
      ctx.globalAlpha = 1; break;
    }
    case 'book': {
      const f = Math.sin(tm * 14) * 4;
      ctx.fillStyle = '#7a1a1a'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-7, -9 - f); ctx.lineTo(-7, -1 - f * 0.5); ctx.lineTo(0, -1); ctx.lineTo(7, -1 - f * 0.5); ctx.lineTo(7, -9 - f); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4ead0'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-6, -8 - f); ctx.lineTo(-6, -2 - f * 0.5); ctx.lineTo(0, -2); ctx.lineTo(6, -2 - f * 0.5); ctx.lineTo(6, -8 - f); ctx.closePath(); ctx.fill();
      R(-4, -6 - f * 0.6, 3, 1, '#6a5a4a'); R(1, -6 - f * 0.6, 3, 1, '#6a5a4a'); R(-1, -7, 2, 2, '#ffdf5a');
      break;
    }
    case 'knight': {
      const swing = e.st === 'swing', ph = Math.abs(e.vx) > 5 ? Math.floor(tm * 6) % 2 : 0, A = '#8a90a8', D = '#5a6078', Lt = '#c8cee0';
      R(-5 + ph, -11, 4, 11, D); R(1 - ph, -11, 4, 11, A);
      R(-6, -24, 12, 14, A); R(-6, -24, 12, 2, Lt); R(-1, -22, 2, 10, D);
      R(-5, -32, 10, 9, A); R(-5, -32, 10, 2, Lt); R(0, -29, 5, 2, '#1a1a2a'); R(-3, -36, 3, 5, '#3a5ac8');
      R(-9, -24, 4, 12, '#6a5030'); R(-9, -24, 4, 1, '#d8b060');                // shield
      if (swing) { const k = 1 - e.t / 0.7; const ang = k < 0.5 ? -1.6 : -1.6 + (k - 0.5) * 6; ctx.save(); ctx.translate(5, -20); ctx.rotate(ang); R(0, -2, 26, 3, '#d8dce8'); R(-2, -3, 3, 5, '#d8b060'); ctx.restore(); }
      else { R(5, -20, 3, 3, A); R(7, -30, 2, 14, '#d8dce8'); R(5, -17, 6, 1, '#d8b060'); }
      break;
    }
    case 'medusa': {
      const w = Math.sin(tm * 10) * 2;
      for (let i = -2; i <= 2; i++) { ctx.strokeStyle = i % 2 ? '#3a8a3a' : '#5aaa4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(i * 2, -12); ctx.quadraticCurveTo(i * 4 + w, -18, i * 5 - w, -16 + Math.abs(i)); ctx.stroke(); }
      R(-5, -12, 10, 10, '#c8b060'); R(-5, -12, 10, 2, '#e8d080'); R(-3, -9, 2, 2, '#ff2a2a'); R(2, -9, 2, 2, '#ff2a2a'); R(-2, -5, 4, 1, '#6a4a20');
      break;
    }
    case 'gargoyle': {
      const f = e.st === 'dive' ? -3 : Math.sin(tm * 9) * 5;
      ctx.fillStyle = '#5a5a64'; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(-16, -18 - f); ctx.lineTo(-12, -8); ctx.lineTo(-6, -7); ctx.fill(); ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(16, -18 - f); ctx.lineTo(12, -8); ctx.lineTo(6, -7); ctx.fill();
      R(-5, -14, 10, 10, '#7a7a86'); R(-5, -14, 10, 2, '#9a9aa6'); R(-4, -4, 3, 4, '#5a5a64'); R(2, -4, 3, 4, '#5a5a64');
      R(1, -18, 7, 6, '#7a7a86'); R(5, -16, 2, 2, '#ff6a2a'); R(1, -21, 2, 3, '#4a4a54'); R(6, -21, 2, 3, '#4a4a54'); R(6, -13, 3, 1, '#e8e8e8');
      break;
    }
    // ---------------- bosses
    case 'greatbat': drawBat(S, 0, -14, 4.2, '#2a1638', '#4a2a64', tm * 8); R(-6, -10, 2, 4, '#ffffff'); R(4, -10, 2, 4, '#ffffff'); break;
    case 'golem': {
      const st = e.st, arm = st === 'slam' ? (e.t > 0.35 ? -20 : 8) : st === 'throw' ? -16 : Math.sin(tm * 3) * 3, ph = st === 'walk' ? Math.floor(tm * 4) % 2 : 0, B = '#d8ccb0', D = '#9a8c70';
      R(-14 + ph * 2, -22, 9, 22, D); R(5 - ph * 2, -22, 9, 22, B); for (let i = 0; i < 4; i++) R(-14, -20 + i * 6, 28, 1, '#6a5c48');
      R(-16, -48, 32, 28, B); for (let i = 0; i < 5; i++) { R(-14, -44 + i * 5, 28, 2, D); } R(-2, -48, 4, 28, '#bfb294');
      R(-11, -64, 22, 17, B); R(-11, -64, 22, 3, '#f0e8d4'); R(-7, -58, 6, 6, '#1a0a0a'); R(2, -58, 6, 6, '#1a0a0a'); R(-5, -56, 2, 2, '#ff4a2a'); R(4, -56, 2, 2, '#ff4a2a'); for (let i = 0; i < 5; i++) R(-6 + i * 3, -50, 2, 3, '#f0e8d4');
      ctx.save(); ctx.translate(16, -44); ctx.rotate(arm * 0.06); R(0, 0, 8, 22, D); R(-2, 20, 12, 9, B); ctx.restore();
      ctx.save(); ctx.translate(-22, -44); ctx.rotate(-arm * 0.03); R(0, 0, 7, 22, D); R(-2, 20, 11, 8, B); ctx.restore();
      break;
    }
    case 'witch': {
      ctx.globalAlpha = e.vis ?? 1; const bob = Math.sin(tm * 2) * 2;
      ctx.fillStyle = '#3a1450'; ctx.beginPath(); ctx.moveTo(-5, -26 + bob); ctx.lineTo(5, -26 + bob); ctx.lineTo(9, 0 + bob); ctx.lineTo(-9, 0 + bob); ctx.fill();
      R(-9, -2 + bob, 18, 2, '#8a2ab0'); R(-4, -18 + bob, 8, 1, '#d8b060');
      R(-3, -32 + bob, 7, 7, '#f0d8d0'); R(1, -30 + bob, 2, 1, '#8a1aa0'); R(-5, -33 + bob, 3, 14, '#c83020'); R(-6, -28 + bob, 2, 12, '#a02018');
      ctx.fillStyle = '#2a0e3a'; ctx.beginPath(); ctx.moveTo(-9, -32 + bob); ctx.lineTo(10, -32 + bob); ctx.lineTo(2, -38 + bob); ctx.lineTo(-6, -48 + bob); ctx.lineTo(-2, -36 + bob); ctx.fill();
      R(-9, -33 + bob, 19, 2, '#4a1a5a');
      R(8, -30 + bob, 2, 30, '#5a3a20'); ctx.fillStyle = `rgba(200,120,255,${0.6 + Math.sin(tm * 6) * 0.3})`; ctx.beginPath(); ctx.arc(9, -32 + bob, 4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; break;
    }
    case 'sentinel': {
      const ph = e.st === 'walk' ? Math.floor(tm * 4) % 2 : 0, A = '#6a6e7c', D = '#43465a', Lt = '#9a9eb0', charge = e.st === 'charge' && e.t <= 1.8;
      if (charge) ctx.rotate(0.15);
      R(-13 + ph * 2, -20, 10, 20, D); R(3 - ph * 2, -20, 10, 20, A); R(-14, -4, 12, 4, '#2a2c38'); R(2, -4, 12, 4, '#2a2c38');
      R(-16, -46, 32, 28, A); R(-16, -46, 32, 3, Lt); R(-16, -21, 32, 3, D);
      gearArt(0, -33, 8, tm * 3, '#b8a070');
      R(-9, -56, 18, 11, A); R(-9, -56, 18, 2, Lt); R(-6, -52, 12, 3, '#1a1a22'); R(-5 + (Math.floor(tm * 3) % 3) * 4, -52, 3, 3, e.st === 'charge' ? '#ff3a2a' : '#ffaa2a');
      R(16, -44, 9, 24, D); R(14, -22, 14, 12, '#5a5e6c'); R(-25, -44, 9, 24, D); R(-28, -22, 14, 12, '#5a5e6c');
      for (const sx of [-18, 12]) R(sx, -48, 6, 4, Lt);
      break;
    }
    case 'count': {
      ctx.globalAlpha = e.vis ?? 1;
      const p2 = e.phase2, fl2 = Math.sin(tm * 6) * 2;
      if (p2) { ctx.fillStyle = `rgba(200,20,40,${0.25 + Math.sin(tm * 5) * 0.1})`; ctx.beginPath(); ctx.ellipse(0, -22, 22, 30, 0, 0, 7); ctx.fill(); }
      // cape wings
      ctx.fillStyle = '#12060c'; ctx.beginPath(); ctx.moveTo(-6, -34); ctx.lineTo(6, -34); ctx.lineTo(p2 ? 22 : 12, -2 + fl2); ctx.lineTo(0, -6); ctx.lineTo(p2 ? -22 : -12, -2 - fl2); ctx.fill();
      ctx.fillStyle = '#7a0e1c'; ctx.beginPath(); ctx.moveTo(-5, -32); ctx.lineTo(p2 ? -20 : -10, -3 - fl2); ctx.lineTo(-4, -6); ctx.fill();
      R(-4, -12, 3, 12, '#1a1a22'); R(1, -12, 3, 12, '#1a1a22');
      R(-5, -30, 10, 19, '#2a2a36'); R(-1, -30, 2, 14, '#e8e8f0'); R(-1, -26, 2, 2, '#c81a2a'); R(-5, -13, 10, 2, '#d8a040');
      ctx.fillStyle = '#7a0e1c'; ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-4, -30); ctx.lineTo(4, -30); ctx.lineTo(8, -40); ctx.lineTo(4, -32); ctx.lineTo(-4, -32); ctx.fill();
      R(-3, -39, 7, 9, '#e8dcd8'); R(1, -36, 2, 1, '#ff1a1a'); R(-1, -36, 1, 1, '#ff1a1a'); R(0, -32, 3, 1, '#8a2a3a');
      R(-4, -41, 8, 3, '#d8dce8'); R(-4, -39, 2, 4, '#d8dce8'); R(0, -43, 2, 2, '#d8dce8');
      ctx.globalAlpha = 1; break;
    }
  }
  ctx.restore();
  ctx.filter = 'none';
}

// ------------------------------------------------------------------ props, drops, shots, fx
function heart(x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + 3 * s); ctx.bezierCurveTo(x - 5 * s, y - 1 * s, x - 2 * s, y - 4 * s, x, y - 1.5 * s); ctx.bezierCurveTo(x + 2 * s, y - 4 * s, x + 5 * s, y - 1 * s, x, y + 3 * s); ctx.fill(); }
export function drawIcon(c, id, x, y, s = 1) {
  const prev = ctx; ctx = c; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const it = ITEMS[id], sub = SUBS[id], rel = RELICS[id];
  if (it?.kind === 'weapon') { const col = id === 'moonblade' ? '#9ac8ff' : '#e0e4ee'; ctx.save(); ctx.rotate(-0.78); R(-1, -7, 2, 11, col); R(-1, -7, 1, 11, '#ffffff'); R(-3, 4, 6, 1, '#d8b060'); R(-1, 5, 2, 3, '#6a4020'); ctx.restore(); }
  else if (it?.kind === 'armor') { const col = { tunic: '#6a5a8a', leather: '#8a5a30', chainmail: '#a0a4b4', silverplate: '#e0e4f0' }[id]; R(-5, -5, 10, 9, col); R(-7, -5, 3, 4, col); R(4, -5, 3, 4, col); R(-2, -5, 4, 2, '#1a1a1a'); R(-5, 3, 10, 1, '#d8b060'); }
  else if (it?.kind === 'acc') { ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 1, 4, 0, 7); ctx.stroke(); R(-2, -5, 4, 3, { luckring: '#5ad85a', powerring: '#e83a3a', ironring: '#5a8ae8' }[id]); }
  else if (it?.kind === 'use') { const col = { potion: '#e83a5a', hipotion: '#ff8a2a', elixir: '#ffd84a', manaprism: '#4a8aff' }[id]; R(-1, -7, 3, 3, '#c8b090'); R(-4, -4, 8, 10, col); R(-4, -4, 8, 2, '#ffffff8a'); R(-3, -2, 1, 5, '#ffffff8a'); }
  else if (it?.kind === 'up') { const col = id === 'hpup' ? '#ff4a6a' : id === 'mpup' ? '#4a9aff' : '#ff6aa0'; heart(0, -1, 1.8, col); R(-1, -3, 2, 6, '#ffffff'); R(-3, -1, 6, 2, '#ffffff'); }
  else if (sub) {
    if (id === 'dagger') { R(-6, 0, 10, 2, '#e0e4ee'); R(4, -1, 2, 4, '#d8b060'); R(6, 0, 2, 2, '#6a4020'); }
    if (id === 'axe') { R(-1, -6, 2, 13, '#7a5030'); ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(8, -4, 6, 3); ctx.lineTo(0, 0); ctx.fill(); }
    if (id === 'holy') { R(-3, -1, 7, 7, '#5ab0ff'); R(-1, -5, 3, 4, '#d8e8ff'); R(-3, -1, 7, 1, '#ffffff'); }
    if (id === 'cross') { R(-1, -6, 3, 12, '#e8c860'); R(-5, -2, 11, 3, '#e8c860'); }
  } else if (rel) {
    const col = { leap: '#6ad8ff', cloak: '#8a5aff', wing: '#ff5a8a' }[id];
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, 0); ctx.lineTo(0, 7); ctx.lineTo(-6, 0); ctx.fill(); R(-1, -4, 2, 3, '#ffffff');
  }
  ctx.restore(); ctx = prev;
}
function drawProps(S) {
  for (const q of S.props) {
    if (q.kind === 'candle') {
      if (q.gone) continue;
      const fl = Math.sin(S.time * 18 + q.x) > 0 ? 1 : 0;
      R(q.x, q.y + 10, 8, 2, '#8a7040'); R(q.x + 3, q.y + 12, 2, 4, '#8a7040');
      R(q.x + 2, q.y + 4, 4, 6, q.big ? '#f0e0ff' : '#f4ead0');
      ctx.fillStyle = 'rgba(255,200,90,0.18)'; ctx.beginPath(); ctx.arc(q.x + 4, q.y + 2, 9 + fl, 0, 7); ctx.fill();
      R(q.x + 3, q.y - 1 - fl, 2, 4 + fl, '#ffb030'); R(q.x + 3, q.y + 1, 2, 2, '#fff0a0');
    } else if (q.kind === 'save') {
      const x = q.x, y = q.y;
      ctx.fillStyle = `rgba(255,60,90,${0.18 + Math.sin(S.time * 3) * 0.08})`; ctx.beginPath(); ctx.ellipse(x + 10, y + 22, 22, 26, 0, 0, 7); ctx.fill();
      R(x + 2, y + 34, 16, 6, '#4a3a4a'); R(x + 4, y + 4, 12, 30, '#6a0e1a'); R(x + 4, y + 4, 12, 2, '#a82a3a'); R(x + 9, y + 8, 2, 14, '#d8b060'); R(x + 6, y + 12, 8, 2, '#d8b060');
      if (q.near) { ctx.fillStyle = '#ffd8e0'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SAVE', x + 10, y - 3); }
    } else if (q.kind === 'shop') {
      const x = q.x, y = q.y;
      R(x - 14, y + 16, 44, 14, '#4a2a14'); R(x - 14, y + 16, 44, 2, '#8a6030'); R(x + 18, y + 8, 6, 8, '#f4ead0'); R(x + 20, y + 4, 2, 4, '#ffb030');
      R(x + 2, y + 2, 12, 16, '#3a3a6a'); R(x + 4, y - 6, 8, 8, '#f0d8c0'); R(x + 3, y - 8, 10, 3, '#e8e8e8'); R(x + 4, y + 1, 8, 6, '#e8e8e8'); R(x + 9, y - 4, 2, 1, '#2a2a2a'); R(x + 5, y - 4, 2, 1, '#2a2a2a');
      if (q.near) { ctx.fillStyle = '#ffe8a0'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↑ SHOP', x + 8, y - 12); }
    } else if ((q.kind === 'item' || q.kind === 'relic') && !q.gone) {
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      if (q.kind === 'relic') { R(cx - 10, q.by + 26, 20, 14, '#4a4a5a'); R(cx - 12, q.by + 24, 24, 3, '#8a8a9a'); }
      ctx.fillStyle = q.kind === 'relic' ? 'rgba(180,140,255,0.35)' : 'rgba(255,240,180,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, 10 + Math.sin(S.time * 4) * 2, 0, 7); ctx.fill();
      drawIcon(ctx, q.item || q.relic, cx, cy, 1);
      if (Math.floor(S.time * 6) % 4 === 0) R(cx + Math.sin(S.time * 9) * 8, cy - 8, 1, 1, '#ffffff');
    }
  }
}
function drawDrops(S) {
  for (const d of S.drops) {
    if (d.t < 2 && Math.floor(S.time * 10) % 2) continue;
    const x = d.x + 5, y = d.y + 5;
    if (d.k === 'heart') heart(x, y - 1, d.n > 1 ? 1.6 : 1, '#ff3a5a');
    if (d.k === 'gold') { R(x - 3, y - 2, 7, 6, d.n >= 50 ? '#e8b030' : '#d8a040'); R(x - 1, y - 4, 3, 2, '#a87020'); R(x - 2, y - 1, 2, 2, '#fff0a0'); }
    if (d.k === 'item' || d.k === 'sub') { ctx.fillStyle = 'rgba(255,255,220,0.35)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); drawIcon(ctx, d.item || d.sub, x, y, 1); }
  }
}
function drawShots(S) {
  for (const s of S.shots) {
    const x = s.x + s.w / 2, y = s.y + s.h / 2;
    if (s.k === 'dagger') { R(s.x, y - 1, 10, 2, '#e8ecf4'); R(s.vx > 0 ? s.x : s.x + 9, y - 2, 2, 4, '#d8b060'); }
    if (s.k === 'axe') { ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 14 * Math.sign(s.vx || 1)); drawIcon(ctx, 'axe', 0, 0, 1.2); ctx.restore(); }
    if (s.k === 'holy') {
      if (!s.burn) drawIcon(ctx, 'holy', x, y, 0.9);
      else for (let i = 0; i < 6; i++) { const fx = s.x + 3 + i * 5, h = 8 + Math.sin(S.time * 20 + i * 2) * 4; ctx.fillStyle = i % 2 ? '#5ab0ff' : '#c8e8ff'; ctx.beginPath(); ctx.moveTo(fx - 3, s.y + s.h); ctx.lineTo(fx, s.y + s.h - h - 6); ctx.lineTo(fx + 3, s.y + s.h); ctx.fill(); }
    }
    if (s.k === 'cross') { ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 16); drawIcon(ctx, 'cross', 0, 0, 1.1); ctx.restore(); }
    if (s.k === 'fire') { ctx.fillStyle = '#b060ff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); R(x - 1, y - 1, 2, 2, '#ffffff'); }
  }
  for (const s of S.eshots) {
    const x = s.x + s.w / 2, y = s.y + s.h / 2, r = s.w / 2;
    switch (s.k) {
      case 'fire': case 'orb': { const g = ctx.createRadialGradient(x, y, 1, x, y, r + 3); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ff8a20'); g.addColorStop(1, 'rgba(255,40,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill(); break; }
      case 'magic': { ctx.fillStyle = 'rgba(200,100,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill(); ctx.fillStyle = '#f0d0ff'; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 7); ctx.fill(); break; }
      case 'bone': ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 12); R(-5, -1, 10, 2, '#e8e0cc'); R(-6, -2, 2, 4, '#e8e0cc'); R(4, -2, 2, 4, '#e8e0cc'); ctx.restore(); break;
      case 'rock': ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 6); R(-5, -5, 10, 10, '#b8ac90'); R(-5, -5, 10, 2, '#d8ccb0'); ctx.restore(); break;
      case 'wave': { ctx.fillStyle = 'rgba(220,200,160,0.85)'; ctx.beginPath(); ctx.moveTo(s.x - 4, s.y + s.h); ctx.lineTo(x, s.y - 6 + Math.sin(s.t * 30) * 2); ctx.lineTo(s.x + s.w + 4, s.y + s.h); ctx.fill(); break; }
      case 'gear': ctx.save(); gearArt(x, y, r + 1, s.t * 10, '#b8a070'); ctx.restore(); break;
      case 'pillar': { const a = Math.min(1, s.life * 4); ctx.fillStyle = `rgba(200,180,255,${a})`; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(s.x + 5, s.y, 6, s.h); break; }
      case 'beam': { const a = Math.min(1, s.life * 3); ctx.fillStyle = `rgba(255,30,60,${a * 0.7})`; ctx.fillRect(s.x, s.y - 3, s.w, s.h + 6); ctx.fillStyle = `rgba(255,220,230,${a})`; ctx.fillRect(s.x, s.y + 4, s.w, 6); break; }
      case 'batshot': drawBat(S, x, y, 1.1, '#1a0a14', '#6a0e1c', S.time * 20 + s.wave); break;
      case 'meteor': { ctx.fillStyle = 'rgba(160,40,200,0.4)'; ctx.fillRect(x - 3, y - 18, 6, 14); ctx.fillStyle = '#5a1080'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = '#e0a0ff'; ctx.beginPath(); ctx.arc(x - 1, y - 1, r * 0.45, 0, 7); ctx.fill(); break; }
    }
  }
}
function drawFx(S) {
  for (const f of S.fx) {
    if (f.k === 'spark') { R(f.x, f.y, 2, 2, f.col); }
    if (f.k === 'boom') { const k = 1 - f.t / 0.4; ctx.strokeStyle = `rgba(255,220,160,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.3 + k * f.r, 0, 7); ctx.stroke(); }
    if (f.k === 'ring') { const k = 1 - f.t / 0.3; ctx.strokeStyle = `rgba(160,220,255,${1 - k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(f.x, f.y, 4 + k * 12, 2 + k * 3, 0, 0, 7); ctx.stroke(); }
    if (f.k === 'dust') { const k = 1 - f.t / 0.3; ctx.fillStyle = `rgba(200,190,170,${0.6 - k * 0.6})`; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(f.x + d * (3 + k * 10), f.y - 3, 2 + k * 3, 0, 7); ctx.fill(); } }
    if (f.k === 'warn') { if (Math.floor(f.t * 12) % 2) { ctx.fillStyle = 'rgba(255,80,80,0.6)'; ctx.fillRect(f.x - 8, f.y - 4, 16, 4); ctx.fillStyle = 'rgba(255,80,80,0.15)'; ctx.fillRect(f.x - 8, 0, 16, f.y); } }
    if (f.k === 'warnline') { if (Math.floor(f.t * 12) % 2) { ctx.fillStyle = 'rgba(255,40,80,0.35)'; ctx.fillRect(0, f.y - 1, S.R.W * TILE, 2); } }
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  for (const tx of S.texts) { ctx.globalAlpha = Math.min(1, tx.t * 3); ctx.fillStyle = '#000'; ctx.fillText(tx.txt, tx.x + 1, tx.y + 1); ctx.fillStyle = tx.col; ctx.fillText(tx.txt, tx.x, tx.y); }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ the frame
export function render(c, S, scale) {
  ctx = c;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const Rm = S.R, A = AREAS[Rm.room.area], p = S.p;
  // camera
  const tx = Math.max(0, Math.min(Rm.W * TILE - VW, p.x + p.w / 2 - VW / 2 + p.face * 24));
  const ty = Math.max(0, Math.min(Rm.H * TILE - VH, p.y + p.h / 2 - VH / 2 - 10));
  if (S.cam.x == null) { S.cam.x = tx; S.cam.y = ty; }
  S.cam.x += (tx - S.cam.x) * 0.12; S.cam.y += (ty - S.cam.y) * 0.14;
  if (Math.abs(tx - S.cam.x) > VW) S.cam.x = tx;
  let cx = Math.round(S.cam.x), cy = Math.round(S.cam.y);
  if (S.shake > 0) { cx += Math.round((Math.random() - 0.5) * 6); cy += Math.round((Math.random() - 0.5) * 6); }
  sky(S, A, cx + Rm.room.x * VW, cy);
  ctx.save(); ctx.translate(-cx, -cy);
  ctx.drawImage(roomLayer(Rm).cv, 0, 0);
  // seals and water
  if (S.sealed) for (let y = 0; y < Rm.H; y++) for (let x = 0; x < Rm.W; x++) if (Rm.tiles[y][x] === T.SEAL) { R(x * TILE, y * TILE, 16, 16, 'rgba(20,10,30,0.6)'); for (let k = 2; k < 16; k += 5) R(x * TILE + k, y * TILE, 2, 16, '#8a8a9a'); R(x * TILE, y * TILE + 2, 16, 2, '#6a6a7a'); }
  for (let y = 0; y < Rm.H; y++) for (let x = 0; x < Rm.W; x++) if (Rm.tiles[y][x] === T.WATER) { ctx.fillStyle = 'rgba(60,120,140,0.45)'; ctx.fillRect(x * TILE, y * TILE + 6 + Math.sin(S.time * 2 + x * 0.7) * 1.5, 16, 12); R(x * TILE + ((S.time * 8 + x * 5) % 16), y * TILE + 6 + Math.sin(S.time * 2 + x * 0.7) * 1.5, 4, 1, '#9ad8e8'); }
  drawProps(S);
  drawDrops(S);
  for (const e of S.ents) drawEnemy(S, e);
  if (!S.over || Math.floor(S.overT * 4) % 2 === 0 || S.overT > 1.5) drawHero(S, p);
  drawShots(S);
  drawFx(S);
  ctx.restore();
  // lighting: a soft vignette; darker in the catacombs
  const dark = A === AREAS.catacombs ? 0.55 : 0.32, px = p.x + p.w / 2 - cx, py = p.y + p.h / 2 - cy;
  const g = ctx.createRadialGradient(px, py, 40, px, py, 260); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,8,${dark})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, S.fade * 4)})`; ctx.fillRect(0, 0, VW, VH); }
  hud(S);
}

function bar(x, y, w, h, k, col, back) { R(x - 1, y - 1, w + 2, h + 2, '#000000'); R(x, y, w, h, back); R(x, y, Math.max(0, Math.round(w * k)), h, col); R(x, y, Math.max(0, Math.round(w * k)), 1, 'rgba(255,255,255,0.4)'); }
function hud(S) {
  const p = S.p;
  // portrait frame
  R(4, 4, 24, 24, '#1a1428'); R(5, 5, 22, 22, '#2a2440'); ctx.strokeStyle = '#d8b060'; ctx.lineWidth = 1; ctx.strokeRect(4.5, 4.5, 23, 23);
  ctx.save(); ctx.beginPath(); ctx.rect(5, 5, 22, 22); ctx.clip(); ctx.translate(16, 6); ctx.scale(1.6, 1.6);
  R(-3, 3, 7, 7, HERO.skin); R(2, 5, 1, 2, '#3a1a3a'); R(-4, 1, 8, 3, HERO.hair); R(-5, 2, 3, 10, HERO.hair); R(-2, 10, 5, 2, HERO.trim); ctx.restore();
  ctx.font = 'bold 7px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left';
  bar(32, 6, 90, 5, p.hp / p.mhp, p.hp / p.mhp < 0.3 ? '#ff5050' : '#e8304a', '#3a0a14');
  bar(32, 14, 60, 3, p.mp / p.mmp, '#4a8aff', '#0a1a3a');
  ctx.fillStyle = '#000'; ctx.fillText(`${Math.ceil(p.hp)}/${p.mhp}`, 127, 12); ctx.fillStyle = '#ffffff'; ctx.fillText(`${Math.ceil(p.hp)}/${p.mhp}`, 126, 11);
  heart(36, 23, 0.9, '#ff3a5a'); ctx.fillStyle = '#fff'; ctx.fillText(String(p.hearts), 42, 26);
  if (p.sub) { R(60, 19, 12, 10, 'rgba(0,0,0,0.5)'); drawIcon(ctx, p.sub, 66, 24, 0.8); }
  ctx.fillStyle = '#d8b060'; ctx.fillText('Lv ' + p.lv, 76, 26);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffd76a'; ctx.fillText(p.gold + ' G', VW - 6, 11);
  // boss bar
  const b = S.boss;
  if (b && S.sealed && !b.dead) {
    const name = L(BOSSES[b.kind]);
    bar(VW / 2 - 100, VH - 12, 200, 5, b.hp / b.mhp, '#b040e0', '#1a0a20');
    ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(name, VW / 2 + 1, VH - 15); ctx.fillStyle = '#f0d8ff'; ctx.fillText(name, VW / 2, VH - 16);
  }
}

// ------------------------------------------------------------------ the castle map (for the map screen)
export function drawMap(c, S, w, h, opts = {}) {
  const prev = ctx; ctx = c;
  const minX = Math.min(...ROOMS.map((r) => r.x)), maxX = Math.max(...ROOMS.map((r) => r.x + r.w)), minY = Math.min(...ROOMS.map((r) => r.y)), maxY = Math.max(...ROOMS.map((r) => r.y + r.h));
  const cs = Math.floor(Math.min((w - 20) / (maxX - minX), (h - 20) / (maxY - minY))), ox = Math.floor((w - cs * (maxX - minX)) / 2), oy = Math.floor((h - cs * (maxY - minY)) / 2);
  ctx.clearRect(0, 0, w, h);
  const vis = S.flags.visited, cell = (x, y) => [ox + (x - minX) * cs, oy + (y - minY) * cs];
  for (const r of ROOMS) {
    let any = false; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (vis[x + ',' + y]) any = true;
    if (!any && !opts.all) continue;
    const [x, y] = cell(r.x, r.y);
    ctx.fillStyle = r.special === 'save' ? '#c82a3a' : r.special === 'shop' ? '#c8a02a' : r.boss ? (S.flags.boss[r.boss] ? '#5a3a7a' : '#8a3ac8') : '#2a50a8';
    for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) { const [a, b2] = cell(xx, yy); ctx.globalAlpha = vis[xx + ',' + yy] || opts.all ? 1 : 0.45; ctx.fillRect(a + 1, b2 + 1, cs - 1, cs - 1); }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, r.w * cs - 1, r.h * cs - 1);
    const Rm = getRoom(r.id);
    ctx.fillStyle = '#0a0c18';
    for (const e of Rm.exits) {
      if (e.side === 'R') { const [a, b2] = cell(r.x + r.w, r.y + e.i); ctx.fillRect(a - 2, b2 + cs * 0.35, 4, cs * 0.3); }
      if (e.side === 'D') { const [a, b2] = cell(r.x + e.i, r.y + r.h); ctx.fillRect(a + cs * 0.35, b2 - 2, cs * 0.3, 4); }
    }
    if ((r.item || r.relic) && !S.flags.taken[r.id] && any) { const [a, b2] = cell(r.x + r.w - 1, r.y + r.h - 1); ctx.fillStyle = '#ffe070'; ctx.fillRect(a + cs / 2 - 2, b2 + cs / 2 - 2, 4, 4); }
  }
  const pc = S.p, wr = S.R.room, wx = wr.x + (pc.x + pc.w / 2) / VW, wy = wr.y + (pc.y + pc.h / 2) / VH;
  const [mx, my] = [ox + (wx - minX) * cs, oy + (wy - minY) * cs];
  if (Math.floor(Date.now() / 300) % 2) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(mx, my, Math.max(3, cs * 0.22), 0, 7); ctx.fill(); }
  ctx = prev;
}
