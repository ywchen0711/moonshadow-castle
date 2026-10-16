// Moonshadow Castle: the loop, input (keyboard + touch), screens, dialogs, menus, shop, saving.
import { AREAS, ITEMS, RELICS, SHOP, ROOM, ROOMS, BOSSES, ENEMIES, ROOM_GEAR } from './data.js?v=2';
import * as G from './game.js?v=4';
import * as I from './items.js?v=2';
import { render, drawIcon, drawMap, drawSprite, VW, VH } from './render.js?v=4';
import { t, L, STORY, getLang, setLang } from './i18n.js?v=4';
import * as A from './audio.js?v=2';
G.setLangFn(getLang);

const $ = (s) => document.querySelector(s);
const cv = $('#cv'), cx = cv.getContext('2d');
let S = null, scale = 2, mode = 'title', last = 0, acc = 0, dlg = null, areaShown = null, overTimer = 0, winTimer = 0;
const SAVE = 'msc_save';
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return null; } };
const writeSave = () => { try { localStorage.setItem(SAVE, JSON.stringify(G.toSave(S))); } catch (e) { /* storage blocked */ } if (cloud) cloud.touch('moonshadow-castle', SAVE); };
// cloud saves (shared by every game on the site); the game keeps working if they are unavailable
let cloud = null;
import('/save.js').then(async (m) => { cloud = m; if (await m.pull('moonshadow-castle', SAVE) && mode === 'title') $('#bCont').disabled = !loadSave(); }).catch(() => {});
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);

// ------------------------------------------------------------------ layout
function resize() {
  const w = innerWidth, h = innerHeight, k = Math.min(w / VW, h / VH);
  const cw = Math.floor(VW * k), ch = Math.floor(VH * k), dpr = Math.min(3, devicePixelRatio || 1);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  scale = cv.width / VW;
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ text
function applyText() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en';
  document.title = getLang() === 'zh' ? '月影城：夜之狂想曲' : 'Moonshadow Castle';
  $('#bZh').classList.toggle('on', getLang() === 'zh'); $('#bEn').classList.toggle('on', getLang() === 'en');
  const tb = { dash: 'dash', bat: 'batBtn', sub: 'subBtn', attack: 'atkBtn', jump: 'jumpBtn', mist: 'mistBtn' };
  document.querySelectorAll('.tb').forEach((b) => { b.textContent = t(tb[b.dataset.k]); });
}
applyText();

// ------------------------------------------------------------------ input
const keys = {}, held = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, sub: 0, dash: 0, bat: 0, mist: 0 }, edge = {};
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyZ: 'jump', Space: 'jump', KeyX: 'attack', KeyC: 'sub', KeyA: 'dash', KeyS: 'bat',
  KeyJ: 'jump', KeyK: 'attack', KeyL: 'sub', KeyU: 'dash', KeyI: 'bat', KeyD: 'mist', KeyO: 'mist' };
function resetInput() { for (const k in held) held[k] = 0; for (const k in keys) delete keys[k]; touchDir.x = touchDir.y = 0; document.querySelectorAll('.tb.on').forEach((b) => b.classList.remove('on')); knob.style.transform = ''; }
addEventListener('keydown', (e) => {
  A.unlock();
  if (e.repeat && keys[e.code]) { if (KEYMAP[e.code] || e.code === 'Space') e.preventDefault(); return; }
  keys[e.code] = 1;
  if (mode === 'dialog' && ['KeyZ', 'KeyX', 'Space', 'Enter', 'KeyJ', 'KeyK'].includes(e.code)) { advanceDialog(); e.preventDefault(); return; }
  if (mode === 'play') {
    if (e.code === 'Enter' || e.code === 'Escape') { openMenu('status'); e.preventDefault(); return; }
    if (e.code === 'KeyM' || e.code === 'Tab') { openMenu('map'); e.preventDefault(); return; }
  } else if (mode === 'menu' || mode === 'shop' || mode === 'warp') {
    if (e.code === 'Escape' && (card || shopCard || dexOpen)) { uiBack(); e.preventDefault(); return; }
    if (e.code === 'Escape' || e.code === 'Enter' || (e.code === 'KeyM' && mode === 'menu')) { closeOverlays(); e.preventDefault(); return; }
  }
  const k = KEYMAP[e.code]; if (k) { held[k] = 1; e.preventDefault(); }
});
addEventListener('keyup', (e) => { delete keys[e.code]; const k = KEYMAP[e.code]; if (k && !Object.keys(keys).some((c) => KEYMAP[c] === k)) held[k] = 0; if (e.key === 'Meta') resetInput(); });
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
addEventListener('pagehide', () => { resetInput(); if (S && mode !== 'title') writeSaveIfSafe(); });

// touch: a floating stick and buttons
const pad = $('#pad'), knob = pad.querySelector('.knob'), touchDir = { x: 0, y: 0 };
let padId = null;
function padMove(e) {
  const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), m = r.width / 2 - 20;
  const k = d > m ? m / d : 1; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  const dead = 16; touchDir.x = Math.abs(dx) > dead ? Math.sign(dx) : 0; touchDir.y = Math.abs(dy) > dead + 6 && Math.abs(dy) > Math.abs(dx) * 0.55 ? Math.sign(dy) : 0;
}
function padEnd() { padId = null; touchDir.x = touchDir.y = 0; knob.style.transform = ''; }
pad.addEventListener('pointerdown', (e) => { A.unlock(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } padMove(e); e.preventDefault(); });
pad.addEventListener('pointermove', (e) => { if (e.pointerId === padId) padMove(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, (e) => { if (e.pointerId === padId) padEnd(); });
addEventListener('touchend', (e) => { if (e.touches.length === 0) { padEnd(); document.querySelectorAll('.tb.on').forEach((b) => { b.classList.remove('on'); held[b.dataset.k] = 0; }); } });
document.querySelectorAll('.tb').forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', (e) => { A.unlock(); e.preventDefault(); if (mode === 'dialog') { advanceDialog(); return; } held[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { held[k] = 0; b.classList.remove('on'); });
});
document.querySelectorAll('.tt').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); A.unlock(); if (mode === 'play') openMenu(b.dataset.k === 'map' ? 'map' : 'status'); else if (mode === 'menu') closeOverlays(); }));
let prevIn = {};
function readInput() {
  const inp = { ...held };
  for (const k in held) if (gp.held[k]) inp[k] = 1;
  if (touchDir.x < 0) inp.left = 1; if (touchDir.x > 0) inp.right = 1; if (touchDir.y < 0) inp.up = 1; if (touchDir.y > 0) inp.down = 1;
  inp.pressed = {}; for (const k of ['jump', 'attack', 'sub', 'dash', 'bat', 'mist', 'up']) inp.pressed[k] = !!inp[k] && !prevIn[k];
  prevIn = inp; return inp;
}

// ------------------------------------------------------------------ gamepad (standard mapping: Xbox / PlayStation / Switch Pro over USB or Bluetooth)
// A / Cross jump · X / Square attack · Y / Triangle sub-weapon · B / Circle backdash · LB RB / L1 R1 bat · Start menu · Back / Select map
const gp = { held: {}, prev: {}, active: false, focus: 0, repT: 0 };
function gpRead() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let g = null; for (const x of list) if (x && x.connected && x.buttons.length) { g = x; break; }
  if (!g) return null;
  const b = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  const s = { left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.55, down: b(13) || ay > 0.55,
    jump: b(0), dash: b(1), attack: b(2), sub: b(3), bat: b(4), mist: b(5), menu: b(9), map: b(8) };
  s.pad = g; return s;
}
function rumble(ms, k) { try { const list = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of list) if (g && g.vibrationActuator) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: k }); } catch (e) { /* not supported */ } }
addEventListener('gamepadconnected', () => { A.unlock(); toast(t('padOn')); });
addEventListener('gamepaddisconnected', () => { gp.held = {}; toast(t('padOff')); });
// menus: the d-pad moves a highlight over the visible buttons / list rows, A clicks, B goes back
function uiRoot() {
  for (const id of ['#confirm', '#how', '#dex', '#warp', '#shop', '#menu', '#over', '#ending', '#title']) { const e = $(id); if (!e.classList.contains('hidden')) return e; }
  return null;
}
function uiItems() { const r = uiRoot(); return r ? [...r.querySelectorAll('button:not([disabled]), .it, .dx')].filter((e) => e.offsetParent !== null && !e.closest('#touch')) : []; }
function uiMark() {
  document.querySelectorAll('.gpf').forEach((e) => e.classList.remove('gpf'));
  if (!gp.active) return;
  const items = uiItems(); if (!items.length) return;
  gp.focus = Math.max(0, Math.min(items.length - 1, gp.focus));
  const e = items[gp.focus]; e.classList.add('gpf');
}
function uiMove(dx, dy) {
  const items = uiItems(); if (!items.length) return;
  const cur = items[Math.max(0, Math.min(items.length - 1, gp.focus))], a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = -1, bestScore = Infinity;
  items.forEach((e, i) => {
    if (e === cur) return;
    const b = e.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    if (dy) {
      // the next row: must start below (above) the current item; prefer the same column
      const gap = dy > 0 ? b.top - (a.bottom - 4) : (a.top + 4) - b.bottom; if (gap < 0) return;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const score = gap + (overlap > 0 ? 0 : Math.abs(bx - ax) * 1.5 + 40);
      if (score < bestScore) { bestScore = score; best = i; }
    } else {
      // the same row first: must be to the right (left) and overlap vertically
      const gap = dx > 0 ? b.left - (a.right - 4) : (a.left + 4) - b.right; if (gap < 0) return;
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlap <= 0) return;
      const score = gap + Math.abs(by - ay) * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    }
  });
  if (best < 0) { if (!cur.classList.contains('gpf')) { uiMark(); } return; }
  gp.focus = best; uiMark(); items[best].scrollIntoView({ block: 'nearest' }); A.sfx('menu');
}
const backTo = [];   // where you were before opening a card, to come back to it
function uiPress() {
  const e = uiItems()[gp.focus]; if (!e) return;
  A.unlock(); const r = e.getBoundingClientRect(), hadCard = !!uiRoot()?.querySelector('.card');
  e.click();
  const root = uiRoot(), cardNow = root && root.querySelector('.card');
  // a card just opened: highlight its first action; otherwise stay where you were
  if (cardNow && !hadCard) { backTo.push(gp.focus); const first = cardNow.querySelector('button:not([disabled])'); gp.focus = Math.max(0, uiItems().indexOf(first)); uiMark(); }
  else if (!cardNow && hadCard && backTo.length) focusIndex(backTo.pop());
  else keepFocusNear(r);
}
function focusIndex(i) { const items = uiItems(); if (!items.length) return; gp.focus = Math.max(0, Math.min(items.length - 1, i)); uiMark(); items[gp.focus].scrollIntoView({ block: 'nearest' }); }
// after a click redraws the panel, stay on whatever is now where you were
function keepFocusNear(r) {
  const items = uiItems(); if (!items.length) return;
  let best = 0, bd = Infinity; items.forEach((e, i) => { const b = e.getBoundingClientRect(), d = Math.abs(b.top - r.top) * 2 + Math.abs(b.left - r.left); if (d < bd) { bd = d; best = i; } });
  gp.focus = best; uiMark();
}
function uiBack() {
  const hadCard = !!uiRoot()?.querySelector('.card');
  uiBack0();
  if (hadCard && !uiRoot()?.querySelector('.card') && backTo.length) focusIndex(backTo.pop());
}
function uiBack0() {
  if (!$('#confirm').classList.contains('hidden')) { $('#confirm').classList.add('hidden'); gp.focus = 0; return; }
  if (!$('#how').classList.contains('hidden')) { $('#how').classList.add('hidden'); gp.focus = 0; return; }
  if (!$('#dex').classList.contains('hidden')) { if (dexOpen) { dexOpen = null; drawDex(); return; } $('#dex').classList.add('hidden'); gp.focus = 0; return; }
  if (mode === 'menu' && tab === 'dexT' && dexOpen) { dexOpen = null; drawDex(); return; }
  if (mode === 'menu' && card) { card = null; drawMenu(); return; }
  if (mode === 'shop' && shopCard) { shopCard = null; drawShop(); return; }
  if (mode === 'menu' || mode === 'shop' || mode === 'warp') closeOverlays();
}
function pollPad(dt) {
  const s = gpRead();
  if (!s) { gp.held = {}; return; }
  const p = gp.prev, edge = (k) => s[k] && !p[k];
  if (Object.keys(s).some((k) => k !== 'pad' && s[k])) gp.active = true;
  if (mode === 'play') {
    gp.held = s;
    if (edge('menu')) { gp.held = {}; openMenu('status'); }
    else if (edge('map')) { gp.held = {}; openMenu('map'); }
  } else {
    gp.held = {};
    if (mode === 'dialog') { if (edge('jump') || edge('attack') || edge('dash')) advanceDialog(); }
    else {
      const dir = s.up ? 'u' : s.down ? 'd' : s.left ? 'l' : s.right ? 'r' : '';
      const was = p.up ? 'u' : p.down ? 'd' : p.left ? 'l' : p.right ? 'r' : '';
      const go = (d) => uiMove(d === 'l' ? -1 : d === 'r' ? 1 : 0, d === 'u' ? -1 : d === 'd' ? 1 : 0);
      if (dir && dir !== was) { go(dir); gp.repT = 0.4; }
      else if (dir) { gp.repT -= dt; if (gp.repT <= 0) { go(dir); gp.repT = 0.11; } }
      if (edge('jump')) uiPress();
      if (edge('dash')) uiBack();
      if (edge('menu') && mode === 'menu') closeOverlays();
      if (edge('map') && mode === 'menu') closeOverlays();
    }
    uiMark();
  }
  gp.prev = s;
}
const NAV = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
addEventListener('keydown', (e) => {
  if (mode === 'play' || mode === 'dialog' || !uiRoot()) { gp.active = false; uiMark(); return; }
  if (NAV[e.code]) { e.preventDefault(); e.stopImmediatePropagation(); if (!gp.active) { gp.active = true; uiMark(); A.sfx('menu'); return; } uiMove(...NAV[e.code]); return; }
  if (['KeyZ', 'Space', 'KeyJ'].includes(e.code) && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); if (!gp.active) { gp.active = true; uiMark(); return; } uiPress(); return; }
  if (['KeyX', 'Backspace', 'KeyK'].includes(e.code) && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); uiBack(); uiMark(); return; }
}, true);
addEventListener('pointerdown', () => { gp.active = false; uiMark(); }, true);

// ------------------------------------------------------------------ title
function showTitle() {
  mode = 'title'; resetInput(); closeOverlays(true);
  $('#title').classList.remove('hidden'); $('#touch').classList.add('hidden');
  $('#bCont').disabled = !loadSave();
  hubBtn(true);
  A.music('title');
}
$('#bNew').onclick = () => { A.unlock(); if (loadSave()) $('#confirm').classList.remove('hidden'); else startNew(); };
$('#bYes').onclick = () => { $('#confirm').classList.add('hidden'); startNew(); };
$('#bNo').onclick = () => $('#confirm').classList.add('hidden');
$('#bCont').onclick = () => { A.unlock(); const d = loadSave(); if (!d) return; S = G.fromSave(d); begin(); };
$('#bHow').onclick = () => $('#how').classList.remove('hidden');
$('#how .closeBtn').onclick = () => $('#how').classList.add('hidden');
$('#bZh').onclick = () => { setLang('zh'); applyText(); };
$('#bEn').onclick = () => { setLang('en'); applyText(); };
function hubBtn(show) { const h = document.getElementById('hub-back'); if (h) h.style.display = show ? '' : 'none'; }
function startNew() { S = G.newState(); begin(); openDialog('intro'); }
function begin() {
  $('#title').classList.add('hidden'); $('#over').classList.add('hidden'); $('#ending').classList.add('hidden');
  if (isTouch) $('#touch').classList.remove('hidden');
  hubBtn(false);
  mode = 'play'; areaShown = null; overTimer = winTimer = 0; S.ev.push({ t: 'room', id: S.roomId, area: ROOM[S.roomId].area });
  handleEvents(); resetInput();
}

// ------------------------------------------------------------------ events from the game
let areaMusic = null;
function handleEvents() {
  const evs = S.ev.splice(0);
  for (const e of evs) {
    switch (e.t) {
      case 'sfx': A.sfx(e.id); if (e.id === 'hurt') rumble(140, 0.6); else if (e.id === 'bossdie' || e.id === 'slam') rumble(260, 0.8); break;
      case 'room':
        if (e.area !== areaShown) { areaShown = e.area; const el = $('#areaName'); el.textContent = L(AREAS[e.area]); el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
        areaMusic = AREAS[e.area].music; if (!S.sealed) A.music(areaMusic);
        break;
      case 'boss': A.music('boss'); A.sfx('door'); break;
      case 'bossdown': A.music(areaMusic); toast(L({ zh: '擊敗了 ', en: 'Defeated ' }) + L(bossName(e.id)), true); break;
      case 'dialog': openDialog(e.id); break;
      case 'toast': toast(t(e.key)); break;
      case 'got': toast(`${t('got')} ${L(ITEMS[e.item])}`, e.big, e.item); break;
      case 'gotsub': toast(`${t('gotSub')}${I.itemName(e.it, getLang())}`, true, e.it); break;
      case 'gotgear': toast(`${t('got')} ${I.itemName(e.it, getLang())}`, e.big || e.it.q === 'u' || e.it.q === 'set', e.it, I.qcol(e.it)); break;
      case 'gotgem': toast(`${t('got')} ${I.gemName(e.g, getLang())}`, false, 'gem:' + e.g); break;
      case 'warpmenu': openWarp(); break;
      case 'relic': openDialogLines([{ who: { zh: t('relicGot'), en: t('relicGot') }, zh: `【${RELICS[e.id].zh}】\n${RELICS[e.id].d.zh}`, en: `[${RELICS[e.id].en}]\n${RELICS[e.id].d.en}` }]); break;
      case 'levelup': toast(`${t('levelUp')} Lv ${e.lv}`, true); break;
      case 'save': writeSave(); toast(t('saved')); break;
      case 'shop': openShop(); break;
      case 'dead': overTimer = 1.8; A.stopMusic(); break;
      case 'win': winTimer = 2.2; trueWin = !!e.true; A.stopMusic(); break;
    }
  }
}
const bossName = (id) => BOSSES[id];
let trueWin = false;
function writeSaveIfSafe() { /* only the save statues write saves: nothing to do */ }
function toast(text, big, icon, col) {
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : '');
  if (icon) el.appendChild(iconCanvas(icon));
  const sp = document.createElement('span'); sp.textContent = text; if (col) sp.style.color = col; el.appendChild(sp);
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), big ? 3000 : 2200);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}
function iconCanvas(id) { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; drawIcon(g, id, 24, 24, 3); return c; }

// ------------------------------------------------------------------ dialog
function openDialog(id) { openDialogLines(STORY[id] || []); }
function openDialogLines(lines) {
  if (!lines.length) return;
  if (dlg) { dlg.lines.push(...lines); return; }
  dlg = { lines: [...lines], i: 0, shown: 0, back: mode === 'dialog' ? 'play' : mode };
  mode = 'dialog'; resetInput(); showLine();
}
function showLine() {
  const ln = dlg.lines[dlg.i]; $('#dialog').classList.remove('hidden');
  $('#dialog .who').textContent = ln.who ? L(ln.who) : ''; $('#dialog .who').style.display = ln.who ? '' : 'none';
  dlg.full = L(ln); dlg.shown = 0; $('#dialog .text').textContent = '';
}
function advanceDialog() {
  if (!dlg) return;
  if (dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; $('#dialog .text').textContent = dlg.full; return; }
  dlg.i++; A.sfx('menu');
  if (dlg.i >= dlg.lines.length) {
    const back = dlg.back; dlg = null; $('#dialog').classList.add('hidden'); mode = back === 'dialog' ? 'play' : back; resetInput(); prevIn = { jump: 1, attack: 1 };
    if (mode === 'ending') showEnding();
    return;
  }
  showLine();
}
$('#dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); advanceDialog(); });
function tickDialog(dt) {
  if (!dlg || dlg.shown >= dlg.full.length) return;
  dlg.shown = Math.min(dlg.full.length, dlg.shown + dt * (getLang() === 'zh' ? 28 : 55));
  $('#dialog .text').textContent = dlg.full.slice(0, Math.floor(dlg.shown));
}

// ------------------------------------------------------------------ menu
const TABS = ['status', 'equipT', 'itemsT', 'map', 'dexT', 'sysT'];
let tab = 'status', slotFilter = null, card = null;
function openMenu(which) { mode = 'menu'; resetInput(); tab = which === 'map' ? 'map' : which; card = null; $('#menu').classList.remove('hidden'); drawMenu(); A.sfx('menu'); }
function closeOverlays(silent) {
  for (const id of ['#menu', '#shop', '#how', '#confirm', '#warp']) $(id).classList.add('hidden');
  if (mode === 'menu' || mode === 'shop' || mode === 'warp') { mode = 'play'; prevIn = { jump: 1, attack: 1, up: 1 }; resetInput(); if (!silent) A.sfx('menu'); }
}
$('#menu .closeBtn').onclick = () => closeOverlays();
const fmtTime = (s) => { s = Math.floor(s); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const iname = (it) => `<span style="color:${I.qcol(it)}">${esc(I.itemName(it, getLang()))}</span>`;
const inSaveRoom = () => S && S.R.room.special === 'save';
// the main number of an item (damage for weapons, defence for armour) to compare with what is worn
function mainNum(it) { if (!it) return 0; const b = I.itemBase(it); return b.min != null ? (b.min + b.max) / 2 : b.def != null ? b.def : b.dmg || 0; }
function wornFor(it) { const slot = I.slotOf(it); return slot === 'ring' ? S.p.eq.ring1 : S.p.eq[slot]; }
// an item card with what it does and what you can do with it
function itemCard(it, where, onDone) {
  const p = S.p, c = el('div', 'card');
  c.appendChild(el('div', 'cname', `${iname(it)}<small>${t('q_' + it.q)} · ${esc(L(I.BASES[it.b]))}</small>`));
  for (const [txt, col] of I.describe(it, getLang())) c.appendChild(el('div', 'cl', `<span style="color:${I.reqLevel(it) > p.lv && /需要等級|Required/.test(txt) ? '#ff5a5a' : col}">${esc(txt)}</span>`));
  if (it.q === 'set') { const sid = I.SET_ITEMS[it.id].set; for (const [txt, col] of I.setLines(sid, G.stats(p).sets[sid] || 0, getLang())) c.appendChild(el('div', 'cl', `<span style="color:${col}">${esc(txt)}</span>`)); }
  if (where === 'bag') { const w = wornFor(it); if (w && w !== it) { const d = mainNum(it) - mainNum(w); c.appendChild(el('div', 'cl', `${t('compare')}: <b style="color:${d >= 0 ? '#6aff6a' : '#ff6a6a'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(d))}</b> (${iname(w)})`)); } }
  const row = el('div', 'row');
  const act = (label, fn, dis) => { const b = el('button', '', label); b.disabled = !!dis; b.onclick = (e) => { e.stopPropagation(); fn(); }; row.appendChild(b); };
  if (where === 'bag') {
    act(t('doEquip'), () => { const r = G.equipItem(S, it); if (r) toast(t(r === 'level' ? 'needLv' : 'noRoom')); else A.sfx('item'); card = null; drawMenu(); });
    if (it.s && (it.g || []).length < it.s && Object.keys(p.gems).length) act(t('doSocket'), () => { card = { it, where, gems: true }; drawMenu(); });
    if (inSaveRoom()) act(t('doStash'), () => { G.toStash(S, it); card = null; drawMenu(); });
    act(t('doDrop'), () => { G.dropItem(S, it); card = null; drawMenu(); });
  }
  if (where === 'worn') { act(t('doUnequip'), () => { const r = G.unequip(S, Object.keys(p.eq).find((k) => p.eq[k] === it)); if (r) toast(t('noRoom')); card = null; drawMenu(); });
    if (it.s && (it.g || []).length < it.s && Object.keys(p.gems).length) act(t('doSocket'), () => { card = { it, where, gems: true }; drawMenu(); }); }
  if (where === 'stash') act(t('doTake'), () => { if (!G.fromStash(S, it)) toast(t('noRoom')); card = null; drawMenu(); });
  if (where === 'sell') act(`${t('sell')} ${G.sellValue(it)} G`, () => { G.sellGear(S, it); handleEvents(); onDone && onDone(); });
  if (where === 'buy') act(`${t('buy')} ${G.buyPrice(it)} G`, () => { if (!G.buyGear(S, it)) { $('#shop .msg').textContent = p.bag.length >= G.BAG_MAX ? t('noRoom') : t('noGold'); A.sfx('no'); } else $('#shop .msg').textContent = t('bought'); handleEvents(); onDone && onDone(); }, p.gold < G.buyPrice(it));
  act(t('back'), () => { card = null; onDone ? onDone(true) : drawMenu(); });
  c.appendChild(row);
  return c;
}
function gemPicker(it) {
  const c = el('div', 'card'); c.appendChild(el('div', 'cname', `${iname(it)}<small>${t('pickGem')}</small>`));
  const list = el('div', 'list');
  for (const [g, n] of Object.entries(S.p.gems)) {
    const r = el('div', 'it'); r.appendChild(iconCanvas('gem:' + g));
    const mods = I.gemMods(g, I.letterOf(it.b)).map(([s2, v]) => I.STAT[s2][getLang() === 'zh' ? 'zh' : 'en'].replace('{v}', v).replace('{a}', Math.round(v / 2))).join(', ');
    r.appendChild(el('div', 'nm', `${esc(I.gemName(g, getLang()))} ×${n}<div class="sm">${esc(mods)}</div>`));
    r.onclick = () => { G.socketGem(S, it, g); card = null; drawMenu(); };
    list.appendChild(r);
  }
  c.appendChild(list);
  const b = el('button', '', t('back')); b.onclick = () => { card = null; drawMenu(); }; c.appendChild(b);
  return c;
}
function itemRow(it, onClick, extra = '') {
  const p = S.p, r = el('div', 'it'); r.appendChild(iconCanvas(it));
  const req = I.reqLevel(it), w = wornFor(it), d = w && w !== it ? mainNum(it) - mainNum(w) : 0;
  r.appendChild(el('div', 'nm', `${iname(it)} ${d ? `<b style="color:${d > 0 ? '#6aff6a' : '#ff6a6a'}">${d > 0 ? '▲' : '▼'}</b>` : ''}<div class="sm">${t('slot_' + (I.slotOf(it) === 'ring' ? 'ring1' : I.slotOf(it))).replace(/ 1$/, '')} · <span style="color:${req > p.lv ? '#ff5a5a' : 'inherit'}">Lv ${req}</span>${it.s ? ` · ◇${(it.g || []).length}/${it.s}` : ''}${extra}</div>`));
  r.onclick = onClick; return r;
}
function useFromMenu(id) {
  const p = S.p, it = ITEMS[id];
  if (!G.useItem(S, id)) {
    A.sfx('no');
    toast(t(id === 'warprune' ? 'noUseBoss' : it.heal && p.hp >= p.mhp ? 'hpFull' : it.mp && p.mp >= p.mmp ? 'mpFull' : it.cure ? 'notPoisoned' : 'cantUse'));
  }
  handleEvents(); if (mode === 'menu') drawMenu();
}
function drawMenu() {
  const tabs = $('#menu .tabs'); tabs.innerHTML = '';
  for (const k of TABS) { const b = el('button', tab === k ? 'on' : '', t(k === 'map' ? 'mapT' : k)); b.onclick = () => { tab = k; card = null; drawMenu(); A.sfx('menu'); }; tabs.appendChild(b); }
  const body = $('#menu .body'); body.innerHTML = '';
  const p = S.p, st = G.stats(p);
  if (card) { body.appendChild(card.gems ? gemPicker(card.it) : itemCard(card.it, card.where)); return; }
  if (tab === 'status') {
    const g = el('div', 'stat');
    const rows = [['lv', p.lv], ['hp', `${Math.ceil(p.hp)} / ${p.mhp}`], ['mp', `${Math.floor(p.mp)} / ${p.mmp}`], ['hearts', `${p.hearts} / ${p.mhearts}`], ['dmg', `${st.dmin}-${st.dmax}`], ['def', st.def],
      ['block', st.block + '%'], ['crit', Math.round(st.crit) + '%'], ['mf', '+' + Math.round(st.mf) + '%'], ['exp', p.exp], ['next', p.lv >= G.LEVEL_CAP ? '—' : G.expToNext(p) - p.exp], ['gold', p.gold], ['kills', p.kills], ['explored', G.explored(S) + '%'], ['time', fmtTime(S.playTime)]];
    for (const [k, v] of rows) g.appendChild(el('div', '', `<span>${t(k)}</span><b>${v}</b>`));
    body.appendChild(g);
    // attributes, with points to spend after levelling up
    body.appendChild(el('div', 'sect', p.points ? `${t('points')}: ${p.points}` : t('str') + ' / ' + t('con') + ' / ' + t('int') + ' / ' + t('lck')));
    const at = el('div', 'stat');
    for (const k of ['str', 'con', 'int', 'lck']) {
      const d = el('div', '', `<span>${t(k)}</span><b>${st[k]}${st[k] !== p[k] ? ` <small>(${p[k]})</small>` : ''}</b>`);
      if (p.points) { const b = el('button', 'plus', '+'); b.onclick = () => { G.spendPoint(S, k); A.sfx('menu'); drawMenu(); }; d.appendChild(b); }
      at.appendChild(d);
    }
    body.appendChild(at);
    body.appendChild(el('div', 'sect', t('res') + (S.world === 'rev' ? ` (${t('reversed')} −40%)` : '')));
    const rs = el('div', 'stat');
    for (const [k, lab] of [['fire', 'rFire'], ['cold', 'rCold'], ['ltng', 'rLtng'], ['pois', 'rPois']]) rs.appendChild(el('div', '', `<span>${t(lab)}</span><b>${st.res[k] - (S.world === 'rev' ? 40 : 0)}%</b>`));
    body.appendChild(rs);
    body.appendChild(el('div', 'sect', t('relics')));
    const rl = el('div', 'list');
    for (const id of Object.keys(RELICS)) { if (!p.relics[id]) continue; const r = el('div', 'it'); r.appendChild(iconCanvas(id)); r.appendChild(el('div', 'nm', `${L(RELICS[id])}<div class="sm">${L(RELICS[id].d)}</div>`)); rl.appendChild(r); }
    if (!rl.children.length) rl.appendChild(el('div', 'sm', t('none')));
    body.appendChild(rl);
  }
  if (tab === 'equipT') {
    // the paper doll: every slot; tap one to see what fits it
    const doll = el('div', 'doll');
    for (const s2 of I.SLOTS) {
      const it = p.eq[s2], d = el('div', 'it slot' + (slotFilter === s2 ? ' eq' : ''));
      d.appendChild(it ? iconCanvas(it) : el('span', 'noicon', '·'));
      d.appendChild(el('div', 'nm', `<div class="sm">${t('slot_' + s2)}</div>${it ? iname(it) : `<span class="sm">${t('empty')}</span>`}`));
      d.onclick = () => { if (slotFilter === s2 && it) card = { it, where: 'worn' }; slotFilter = slotFilter === s2 ? null : s2; drawMenu(); };
      doll.appendChild(d);
    }
    body.appendChild(doll);
    const want = slotFilter && slotFilter.startsWith('ring') ? 'ring' : slotFilter;
    const bag = p.bag.filter((it) => !want || I.slotOf(it) === want);
    body.appendChild(el('div', 'sect', `${t('bag')} ${p.bag.length}/${G.BAG_MAX}${want ? ' · ' + t('slot_' + slotFilter) : ''}`));
    const list = el('div', 'list');
    const order = { u: 0, set: 1, r: 2, m: 3, s: 4, n: 5 };
    for (const it of bag.slice().sort((a, b) => I.SLOTS.indexOf(I.slotOf(a) === 'ring' ? 'ring1' : I.slotOf(a)) - I.SLOTS.indexOf(I.slotOf(b) === 'ring' ? 'ring1' : I.slotOf(b)) || order[a.q] - order[b.q] || b.l - a.l)) list.appendChild(itemRow(it, () => { card = { it, where: 'bag' }; drawMenu(); }));
    if (!list.children.length) list.appendChild(el('div', 'sm', t('none')));
    body.appendChild(list);
    body.appendChild(el('div', 'sect', `${t('stash')} ${p.stash.length}/${G.STASH_MAX}`));
    if (!inSaveRoom()) body.appendChild(el('div', 'sm', t('stashHere')));
    else { const sl = el('div', 'list'); for (const it of p.stash) sl.appendChild(itemRow(it, () => { card = { it, where: 'stash' }; drawMenu(); })); if (!sl.children.length) sl.appendChild(el('div', 'sm', t('none'))); body.appendChild(sl); }
  }
  if (tab === 'itemsT') {
    const list = el('div', 'list');
    for (const [id, n] of Object.entries(p.items)) {
      const it = ITEMS[id], r = el('div', 'it'); r.appendChild(iconCanvas(id));
      r.appendChild(el('div', 'nm', `${L(it)} ×${n}<div class="sm">${it.heal ? 'HP +' + (it.heal > 999 ? 'MAX' : it.heal) : ''} ${it.mp ? 'MP ' + (it.mp > 999 ? 'MAX' : '+' + it.mp) : ''}${it.cure ? '☠ ✕' : ''}${id === 'warprune' ? '↩ SAVE' : ''}</div>`));
      const b = el('button', 'usebtn', t('use'));
      b.onclick = (ev) => { ev.stopPropagation(); useFromMenu(id); };
      r.onclick = () => useFromMenu(id);
      r.appendChild(b); list.appendChild(r);
    }
    if (!list.children.length) list.appendChild(el('div', 'sm', t('noItems')));
    body.appendChild(list);
    body.appendChild(el('div', 'sect', t('gems')));
    const gl = el('div', 'list');
    for (const [g, n] of Object.entries(p.gems).sort()) { const r = el('div', 'it'); r.appendChild(iconCanvas('gem:' + g)); r.appendChild(el('div', 'nm', `${esc(I.gemName(g, getLang()))} ×${n}`)); gl.appendChild(r); }
    if (!gl.children.length) gl.appendChild(el('div', 'sm', t('none')));
    body.appendChild(gl);
  }
  if (tab === 'map') {
    const c = el('canvas'); c.id = 'mapCv'; const w = 680, h = 400; c.width = w * 2; c.height = h * 2; body.appendChild(c);
    const g = c.getContext('2d'); g.scale(2, 2); drawMap(g, S, w, h);
    body.appendChild(el('div', 'maphelp', `${t('mapHelp')} · ${L({ zh: '青色：傳送室', en: 'Cyan: warp room' })} · ${t('explored')} ${G.explored(S)}%${S.world === 'rev' ? ' · ' + t('reversed') : ''}`));
    clearInterval(drawMenu.mapTimer); drawMenu.mapTimer = setInterval(() => { if (tab !== 'map' || mode !== 'menu') { clearInterval(drawMenu.mapTimer); return; } g.setTransform(2, 0, 0, 2, 0, 0); drawMap(g, S, w, h); }, 300);
  }
  if (tab === 'dexT') { const box = el('div', 'dexbox', '<div class="tabs dtabs"></div><div class="dbody"></div>'); body.appendChild(box); drawDex(box); }
  if (tab === 'sysT') {
    const list = el('div', 'list');
    const snd = el('div', 'it', `<div class="nm">${t('sound')}</div><b>${A.soundOn() ? t('on') : t('off')}</b>`); snd.onclick = () => { A.setSound(!A.soundOn()); drawMenu(); }; list.appendChild(snd);
    const lg = el('div', 'it', `<div class="nm">${t('language')}</div><b>${getLang() === 'zh' ? '中文' : 'English'}</b>`); lg.onclick = () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); applyText(); drawMenu(); }; list.appendChild(lg);
    const modes = ['magic', 'rare', 'all'], cur = S.flags.pickup || 'magic';
    const pk = el('div', 'it', `<div class="nm">${t('pickup')}<div class="sm">${t('pickupHelp')}</div></div><b>${t({ all: 'pickupAll', magic: 'pickupMagic', rare: 'pickupRare' }[cur])}</b>`); pk.onclick = () => { S.flags.pickup = modes[(modes.indexOf(cur) + 1) % 3]; drawMenu(); }; list.appendChild(pk);
    const how = el('div', 'it', `<div class="nm">${t('howTo')}<div class="sm">${isTouch ? t('controlsTouch') : t('controlsKb')}<br>${t('controlsPad')}<br>${t('controlsTips')}</div></div>`); list.appendChild(how);
    const q = el('div', 'it', `<div class="nm">${t('toTitle')}<div class="sm">${L({ zh: '從最後一次存檔繼續。', en: 'You will continue from your last save.' })}</div></div>`); q.onclick = () => { closeOverlays(true); showTitle(); }; list.appendChild(q);
    body.appendChild(list);
  }
}

// ------------------------------------------------------------------ gallery (圖鑑): every monster, boss and piece of equipment
const DEX_TABS = ['dexMon', 'dexBoss', 'dexGear', 'dexUnique', 'dexSet', 'dexMisc'];
let dexTab = 'dexMon', dexOpen = null;
const CLASS_ORDER = Object.keys(I.CLASS);
function dexData() { if (S) return { f: S.flags, rel: S.p.relics }; const d = loadSave(); return { f: (d && d.flags) || {}, rel: (d && d.p && d.p.relics) || {} }; }
// where a monster lives / a boss waits (normal castle only)
const homesOf = (kind) => Object.entries(AREAS).filter(([, a]) => (a.enemies || []).includes(kind)).map(([, a]) => L(a));
function bossHome(id) { const r = ROOMS.find((x) => x.boss === id && !x.id.startsWith('R:')); return r ? L(AREAS[r.area]) : t('reversed'); }
function spriteCanvas(kind, dim) { const c = document.createElement('canvas'); c.width = c.height = 96; c.className = 'spr' + (dim ? ' shadow' : ''); try { drawSprite(c, kind); } catch (e) { /* a sprite that needs live state: leave the frame empty */ } const box = document.createElement('span'); box.className = 'sprbox'; box.appendChild(c); return box; }
const ELEM = { phys: { zh: '物理', en: 'Physical' }, fire: { zh: '火', en: 'Fire' }, cold: { zh: '冰', en: 'Cold' }, ltng: { zh: '電', en: 'Lightning' }, pois: { zh: '毒', en: 'Poison' }, holy: { zh: '聖', en: 'Holy' }, dark: { zh: '暗', en: 'Dark' } };
function dexEntry(list, key, head, detail) {
  const r = el('div', 'dx' + (dexOpen === key ? ' open' : '')); r.appendChild(head);
  if (dexOpen === key) { const d = el('div', 'dxd'); detail(d); r.appendChild(d); }
  r.onclick = (e) => { if (e.target.closest('.dxd')) return; dexOpen = dexOpen === key ? null : key; drawDex(); };
  list.appendChild(r);
}
function monsterLines(d, B, extra) {
  const res = Object.entries(B.res || {}).map(([k, v]) => `${L(ELEM[k] || { zh: k, en: k })} ${v > 0 ? '+' : ''}${v}%`).join(' · ');
  d.appendChild(el('div', 'cl', `HP ${B.hp} · ${t('atk')} ${B.atk} · ${t('def')} ${B.def || 0} · EXP ${B.exp}`));
  if (B.elem && B.elem !== 'phys') d.appendChild(el('div', 'cl', `${L({ zh: '攻擊屬性', en: 'Attacks with' })}: <span style="color:#ff9a5a">${L(ELEM[B.elem] || { zh: B.elem, en: B.elem })}</span>`));
  if (res) d.appendChild(el('div', 'cl', `${t('res')}: ${res}`));
  const tags = [B.undead && L({ zh: '不死族（聖屬性、對不死傷害有效）', en: 'Undead (weak to holy and +undead damage)' }), B.fly && L({ zh: '飛行', en: 'Flying' })].filter(Boolean);
  if (tags.length) d.appendChild(el('div', 'cl', tags.join(' · ')));
  if (extra) d.appendChild(el('div', 'cl', extra));
}
const shadowIcon = (id, found) => { const c = iconCanvas(id); if (!found) c.classList.add('shadow'); return c; };
const UNKNOWN = () => `<span class="unk">${t('dexUnknown')}</span>`;
function gearHead(it, sub, found) {
  const h = el('div', 'dxh'); h.appendChild(shadowIcon(it, found));
  h.appendChild(el('div', 'nm', `${found ? iname(it) + ' <b class="ok">✓</b>' : UNKNOWN()}<div class="sm">${sub}</div>`)); return h;
}
function gearDetail(d, it, note, found = true) {
  if (!found) { d.appendChild(el('div', 'cl sm', t('dexNotFound'))); return; } for (const [txt, col] of I.describe(it, getLang())) d.appendChild(el('div', 'cl', `<span style="color:${col}">${esc(txt)}</span>`)); if (note) d.appendChild(el('div', 'cl sm', note)); }
const fixedRng = () => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
function drawDex(target) {
  if (target) drawDex.target = target;
  const box = drawDex.target, dd = dexData(), flags = dd.f, dex = flags.dex || {}, found = flags.found || {};
  const tabs = box.querySelector('.dtabs'), body = box.querySelector('.dbody');
  tabs.innerHTML = ''; body.innerHTML = '';
  for (const k of DEX_TABS) { const b = el('button', dexTab === k ? 'on' : '', t(k)); b.onclick = (e) => { e.stopPropagation(); dexTab = k; dexOpen = null; drawDex(); A.sfx('menu'); }; tabs.appendChild(b); }
  const list = el('div', 'dexlist'), count = (n, m) => body.appendChild(el('div', 'sect', t('dexFound').replace('{n}', n).replace('{m}', m)));
  if (dexTab === 'dexMon') {
    const ids = Object.keys(ENEMIES).filter((k) => !BOSSES[k]); count(ids.filter((k) => dex[k]).length, ids.length);
    ids.sort((a, b) => (ENEMIES[a].hp - ENEMIES[b].hp));
    for (const k of ids) {
      const B = ENEMIES[k], h = el('div', 'dxh'); h.appendChild(spriteCanvas(k, !dex[k]));
      h.appendChild(el('div', 'nm', `${dex[k] ? `${L(B)} <b class="ok">×${dex[k]}</b>` : UNKNOWN()}<div class="sm">${homesOf(k).join('、') || '—'}</div>`));
      dexEntry(list, 'm:' + k, h, (d) => { if (!dex[k]) { d.appendChild(el('div', 'cl sm', t('dexNotYet'))); return; } monsterLines(d, B, `${L({ zh: '擊敗', en: 'Defeated' })} ${dex[k]}`); });
    }
  }
  if (dexTab === 'dexBoss') {
    const ids = Object.keys(BOSSES), beaten = flags.boss || {}; count(ids.filter((k) => beaten[k]).length, ids.length);
    for (const k of ids) {
      const B = BOSSES[k], h = el('div', 'dxh'); h.appendChild(spriteCanvas(k, !beaten[k]));
      h.appendChild(el('div', 'nm', `${beaten[k] ? L(B) + ' <b class="ok">✓</b>' : UNKNOWN()}<div class="sm">${bossHome(k)}</div>`));
      dexEntry(list, 'b:' + k, h, (d) => { if (!beaten[k]) { d.appendChild(el('div', 'cl sm', t('dexNotYet'))); return; } const story = STORY['boss_' + k]; monsterLines(d, { ...B, hp: B.hp || '?', atk: B.atk || '?', exp: B.exp || '?' }); if (story) d.appendChild(el('div', 'cl sm', esc(L(story[story.length - 1].t || story[story.length - 1])))); });
    }
  }
  if (dexTab === 'dexGear') {
    const bases = Object.values(I.BASES); count(bases.filter((b) => found[b.id]).length, bases.length);
    bases.sort((a, b) => CLASS_ORDER.indexOf(a.c) - CLASS_ORDER.indexOf(b.c) || a.q - b.q);
    let cls = null;
    for (const b of bases) {
      const slot = I.CLASS[b.c].slot;
      if (b.c !== cls) { cls = b.c; list.appendChild(el('div', 'sect', `${t('slot_' + (slot === 'ring' ? 'ring1' : slot)).replace(/ 1$/, '')} · ${esc(b.c)}`)); }
      const it = I.makeItem(b.id, 'n', b.q, fixedRng()), main = I.itemBase(it);
      const sub = `Lv ${b.q}${main.min != null ? ` · ${t('dmg')} ${main.min}-${main.max}` : main.def != null ? ` · ${t('def')} ${main.def}` : ''}${b.s ? ` · ◇${b.s}` : ''}`;
      dexEntry(list, 'g:' + b.id, gearHead(it, sub, found[b.id]), (d) => gearDetail(d, it, null, found[b.id]));
    }
  }
  if (dexTab === 'dexUnique') {
    const us = Object.values(I.UNIQUES); count(us.filter((u) => found['u:' + u.id]).length, us.length);
    for (const u of us.slice().sort((a, b) => a.lvl - b.lvl)) {
      const it = I.makeItem(u.b, 'u', u.lvl, fixedRng(), { id: u.id });
      dexEntry(list, 'u:' + u.id, gearHead(it, `${esc(L(I.BASES[u.b]))} · Lv ${I.reqLevel(it)}`, found['u:' + u.id]), (d) => gearDetail(d, it, t('dexRolls'), found['u:' + u.id]));
    }
  }
  if (dexTab === 'dexSet') {
    const pieces = Object.values(I.SET_ITEMS); count(pieces.filter((s) => found['set:' + s.id]).length, pieces.length);
    for (const [sid, st] of Object.entries(I.SETS)) {
      list.appendChild(el('div', 'sect', `<span style="color:#4ad84a">${esc(L(st))}</span> · Lv ${st.lvl}`));
      for (const [id] of st.pieces) {
        const it = I.makeItem(I.SET_ITEMS[id].b, 'set', I.SET_ITEMS[id].lvl, fixedRng(), { id });
        dexEntry(list, 's:' + id, gearHead(it, esc(L(I.BASES[it.b])), found['set:' + id]), (d) => { gearDetail(d, it, null, found['set:' + id]); for (const [txt, col] of I.setLines(sid, st.pieces.length, getLang())) d.appendChild(el('div', 'cl', `<span style="color:${col}">${esc(txt)}</span>`)); });
      }
    }
  }
  if (dexTab === 'dexMisc') {
    list.appendChild(el('div', 'sect', t('relics')));
    for (const [id, r] of Object.entries(RELICS)) { const has = dd.rel[id], h = el('div', 'dxh'); h.appendChild(shadowIcon(id, has)); h.appendChild(el('div', 'nm', has ? `${L(r)}<div class="sm">${L(r.d)}</div>` : `${UNKNOWN()}<div class="sm">${t('dexNotFound')}</div>`)); dexEntry(list, 'r:' + id, h, () => {}); }
    list.appendChild(el('div', 'sect', t('itemsT')));
    for (const [id, it] of Object.entries(ITEMS)) { if (it.kind !== 'use') continue; const h = el('div', 'dxh'); h.appendChild(iconCanvas(id)); h.appendChild(el('div', 'nm', `${L(it)}<div class="sm">${it.heal ? 'HP +' + (it.heal > 999 ? 'MAX' : it.heal) : ''} ${it.mp ? 'MP ' + (it.mp > 999 ? 'MAX' : '+' + it.mp) : ''}${it.cure ? ' ☠✕' : ''}${it.price ? ` · ${it.price} G` : ''}</div>`)); dexEntry(list, 'i:' + id, h, () => {}); }
    list.appendChild(el('div', 'sect', t('gems')));
    for (const g of Object.keys(I.GEMS)) for (let k = 1; k <= 4; k++) {
      const gid = g + k, h = el('div', 'dxh'), has = found['gem:' + g]; h.appendChild(shadowIcon('gem:' + gid, has));
      const fx = (L2) => I.gemMods(gid, L2).map(([s2, v]) => I.STAT[s2][getLang() === 'zh' ? 'zh' : 'en'].replace('{v}', v).replace('{a}', Math.round(v / 2))).join(', ');
      if (!has) { h.appendChild(el('div', 'nm', `${UNKNOWN()}<div class="sm">${t('dexNotFound')}</div>`)); dexEntry(list, 'j:' + gid, h, () => {}); continue; }
      h.appendChild(el('div', 'nm', `${esc(I.gemName(gid, getLang()))}<div class="sm">${L({ zh: '武器', en: 'Weapon' })}: ${esc(fx('W'))} · ${L({ zh: '防具', en: 'Armour' })}: ${esc(fx('A'))}</div>`));
      dexEntry(list, 'j:' + gid, h, () => {});
    }
  }
  body.appendChild(list);
}
function openDex() { dexTab = 'dexMon'; dexOpen = null; $('#dex').classList.remove('hidden'); drawDex($('#dex')); A.sfx('menu'); }
$('#dex .closeBtn').onclick = () => { $('#dex').classList.add('hidden'); A.sfx('menu'); };
$('#bDex').onclick = () => { A.unlock(); openDex(); };

// ------------------------------------------------------------------ shop: buy (potions and rolled gear), sell, gamble, gems
let shopMode = 'buy', shopCard = null;
function openShop() { mode = 'shop'; resetInput(); shopMode = 'buy'; shopCard = null; $('#shop').classList.remove('hidden'); $('#shop .msg').textContent = ''; drawShop(); }
$('#shop .closeBtn').onclick = () => closeOverlays();
document.querySelectorAll('#shop .tabs button').forEach((b) => { b.onclick = () => { shopMode = b.dataset.mode; shopCard = null; drawShop(); A.sfx('menu'); }; });
function drawShop() {
  const p = S.p;
  document.querySelectorAll('#shop .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === shopMode));
  $('#shop .goldLbl').textContent = `${t('gold')}: ${p.gold} G · ${t('bag')} ${p.bag.length}/${G.BAG_MAX}`;
  const body = $('#shop .body'); body.innerHTML = '';
  if (shopCard) { body.appendChild(itemCard(shopCard.it, shopCard.where, (back) => { shopCard = null; drawShop(); })); return; }
  const list = el('div', 'list');
  const row = (icon, name, sub, price, dis, fn) => { const r = el('div', 'it' + (dis ? ' dis' : '')); r.appendChild(iconCanvas(icon)); r.appendChild(el('div', 'nm', `${name}<div class="sm">${sub}</div>`)); if (price != null) r.appendChild(el('div', 'pr', price + ' G')); r.onclick = fn; list.appendChild(r); };
  if (shopMode === 'buy') {
    for (const id of SHOP) { const it = ITEMS[id]; row(id, L(it), `${it.heal ? 'HP +' + (it.heal > 999 ? 'MAX' : it.heal) : ''} ${it.mp ? 'MP MAX' : ''} · ${t('have')} ${p.items[id] || 0}`, it.price, p.gold < it.price, () => { const okk = G.buy(S, id); $('#shop .msg').textContent = okk ? t('bought') : t('noGold'); if (!okk) A.sfx('no'); handleEvents(); drawShop(); }); }
    list.appendChild(el('div', 'sect', L({ zh: '今日商品', en: "Today's wares" })));
    for (const it of G.shopStock(S)) row(it, iname(it), `${t('q_' + it.q)} · Lv ${I.reqLevel(it)}`, G.buyPrice(it), p.gold < G.buyPrice(it), () => { shopCard = { it, where: 'buy' }; drawShop(); });
  }
  if (shopMode === 'sell') {
    for (const [id, n] of Object.entries(p.items)) row(id, `${L(ITEMS[id])} ×${n}`, '', G.sellPrice(id), false, () => { G.sell(S, id); $('#shop .msg').textContent = t('sold'); handleEvents(); drawShop(); });
    for (const it of p.bag) row(it, iname(it), `${t('q_' + it.q)} · Lv ${I.reqLevel(it)}`, G.sellValue(it), false, () => { shopCard = { it, where: 'sell' }; drawShop(); });
  }
  if (shopMode === 'gamble') {
    list.appendChild(el('div', 'sm', t('gambleHelp')));
    for (const c of G.GAMBLE) {
      const price = G.gamblePrice(S, c), base = Object.values(I.BASES).find((b) => b.c === c && b.q <= Math.max(1, p.lv)) || Object.values(I.BASES).find((b) => b.c === c);
      row(I.makeItem(base.id, 'n', 1), L({ zh: '神秘的' + base.zh, en: 'Mystery ' + ({ ring: 'Ring', amulet: 'Amulet', sub: 'Sub-weapon' }[c] || L({ zh: base.zh, en: base.en })) }), '?', price, p.gold < price || p.bag.length >= G.BAG_MAX, () => {
        const it = G.gamble(S, c); if (!it) { $('#shop .msg').textContent = p.bag.length >= G.BAG_MAX ? t('noRoom') : t('noGold'); A.sfx('no'); drawShop(); return; }
        $('#shop .msg').innerHTML = `${t('got')} ${iname(it)}`; if (it.q === 'u' || it.q === 'set') A.sfx('relic'); handleEvents(); shopCard = { it, where: 'view' }; drawShop();
      });
    }
  }
  if (shopMode === 'gems') {
    list.appendChild(el('div', 'sm', t('combineHelp')));
    for (const [g, n] of Object.entries(p.gems).sort()) {
      const k = +g.slice(-1), price = G.GEM_COMBINE_COST(k), can = n >= 3 && k < 4;
      row('gem:' + g, `${esc(I.gemName(g, getLang()))} ×${n}`, can ? `→ ${esc(I.gemName(g.slice(0, -1) + (k + 1), getLang()))}` : '', can ? price : null, !can || p.gold < price, () => { if (G.combineGems(S, g)) { $('#shop .msg').textContent = t('combine') + '!'; } else A.sfx('no'); handleEvents(); drawShop(); });
    }
    if (!Object.keys(p.gems).length) list.appendChild(el('div', 'sm', t('none')));
  }
  body.appendChild(list);
}

// ------------------------------------------------------------------ warp rooms
function openWarp() {
  mode = 'warp'; resetInput(); $('#warp').classList.remove('hidden');
  const body = $('#warp .body'); body.innerHTML = ''; const list = el('div', 'list');
  for (const id of G.warpRooms(S)) {
    const r = ROOM[id], here = id === S.roomId;
    const d = el('div', 'it' + (here ? ' eq' : ''), `<div class="nm">${L(AREAS[r.area])}<div class="sm">${here ? '● ' : ''}${id.replace('R:', '')}</div></div>`);
    d.onclick = () => { if (!here) { closeOverlays(true); G.warpTo(S, id); handleEvents(); } };
    list.appendChild(d);
  }
  body.appendChild(list);
}
$('#warp .closeBtn').onclick = () => closeOverlays();

// ------------------------------------------------------------------ game over / ending
$('#bRetry').onclick = () => { const d = loadSave(); S.deaths++; if (d) { d.deaths = (d.deaths || 0) + 1; S = G.fromSave(d); } else S = G.newState(); begin(); };
$('#bTitle').onclick = () => showTitle();
$('#bEndTitle').onclick = () => showTitle();
function showEnding() {
  mode = 'ending'; $('#touch').classList.add('hidden');
  $('#ending').classList.remove('hidden'); $('#ending .big').textContent = trueWin ? t('trueEnd') : t('theEnd');
  $('#ending .stats').innerHTML = `${t('clearTime')}: ${fmtTime(S.playTime)}<br>Lv ${S.p.lv} · ${t('explored')} ${G.explored(S)}%<br>${t('kills')}: ${S.p.kills} · ${t('deaths')}: ${S.deaths}`;
  A.music('ending');
  try { const d = G.toSave(S); d.cleared = 1; localStorage.setItem(SAVE, JSON.stringify(d)); } catch (e) { /* ignore */ } if (cloud) cloud.touch('moonshadow-castle', SAVE);
}

// ------------------------------------------------------------------ loop
let lastFrame = 0;
setInterval(() => { const n = performance.now(); if (!document.hidden && n - lastFrame > 120) frame(n, true); }, 40);   // when animation frames stall
function frame(now, fallback) {
  if (!fallback) requestAnimationFrame(frame);
  lastFrame = performance.now();
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000 || 0)); last = Math.max(last, now);   // timer and animation-frame clocks can disagree
  pollPad(dt);
  if (!S) { cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); return; }
  if (mode === 'play' && !window.__freeze) {
    acc += dt; let n = 0;
    while (acc >= 1 / 60 && n < 5) { G.update(S, 1 / 60, readInput()); acc -= 1 / 60; n++; handleEvents(); if (mode !== 'play') break; }
    if (acc > 0.1) acc = 0;
    if (overTimer > 0) { overTimer -= dt; if (overTimer <= 0) { mode = 'over'; $('#over').classList.remove('hidden'); $('#touch').classList.add('hidden'); } }
    if (winTimer > 0) { winTimer -= dt; if (winTimer <= 0) { dlg = null; openDialogLines(trueWin ? STORY.trueEnding : STORY.ending); dlg.back = 'ending'; } }
  } else if (mode === 'dialog') { tickDialog(dt); if (S.fade > 0) S.fade -= dt; }
  else if (mode === 'over' || mode === 'ending') { G.update(S, dt, { pressed: {} }); }
  const mb = document.querySelector('.tb.s4'); if (mb && S) mb.style.display = S.p.relics.mist ? '' : 'none';
  render(cx, S, scale);
}
requestAnimationFrame(frame);
showTitle();
// a demo room behind the title screen
S = G.newState(1);
window.__I = I; window.__drawIcon = drawIcon; window.__ITEMS = ITEMS; window.__RELICS = RELICS; window.__ROOM_GEAR = ROOM_GEAR; window.__warpIds = () => ROOMS.filter((r) => r.special === 'warp' && !r.id.startsWith('R:')).map((r) => r.id);
window.__msc = { get S() { return S; }, G, tick(n) { for (let i = 0; i < n; i++) { pollPad(1 / 60); if (mode === 'play') { G.update(S, 1 / 60, readInput()); handleEvents(); } } }, step(n, inp = {}) { for (let i = 0; i < n; i++) { const x = { ...inp, pressed: { ...(inp.pressed || {}) } }; if (i) x.pressed = {}; G.update(S, 1 / 60, x); handleEvents(); } }, begin, openMenu, openShop, openWarp, closeOverlays, startNew, drawMenu, get mode() { return mode; }, set tabName(v) { tab = v; } };
