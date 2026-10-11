// Moonshadow Castle: the loop, input (keyboard + touch), screens, dialogs, menus, shop, saving.
import { AREAS, ITEMS, SUBS, RELICS, SHOP, ROOM } from './data.js?v=1';
import * as G from './game.js?v=1';
import { render, drawIcon, drawMap, VW, VH } from './render.js?v=1';
import { t, L, STORY, getLang, setLang } from './i18n.js?v=1';
import * as A from './audio.js?v=1';

const $ = (s) => document.querySelector(s);
const cv = $('#cv'), cx = cv.getContext('2d');
let S = null, scale = 2, mode = 'title', last = 0, acc = 0, dlg = null, areaShown = null, overTimer = 0, winTimer = 0;
const SAVE = 'msc_save';
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return null; } };
const writeSave = () => { try { localStorage.setItem(SAVE, JSON.stringify(G.toSave(S))); } catch (e) { /* storage blocked */ } };
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
  const tb = { dash: 'dash', bat: 'batBtn', sub: 'subBtn', attack: 'atkBtn', jump: 'jumpBtn' };
  document.querySelectorAll('.tb').forEach((b) => { b.textContent = t(tb[b.dataset.k]); });
}
applyText();

// ------------------------------------------------------------------ input
const keys = {}, held = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, sub: 0, dash: 0, bat: 0 }, edge = {};
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyZ: 'jump', Space: 'jump', KeyX: 'attack', KeyC: 'sub', KeyA: 'dash', KeyS: 'bat',
  KeyJ: 'jump', KeyK: 'attack', KeyL: 'sub', KeyU: 'dash', KeyI: 'bat' };
function resetInput() { for (const k in held) held[k] = 0; for (const k in keys) delete keys[k]; touchDir.x = touchDir.y = 0; document.querySelectorAll('.tb.on').forEach((b) => b.classList.remove('on')); knob.style.transform = ''; }
addEventListener('keydown', (e) => {
  A.unlock();
  if (e.repeat && keys[e.code]) { if (KEYMAP[e.code] || e.code === 'Space') e.preventDefault(); return; }
  keys[e.code] = 1;
  if (mode === 'dialog' && ['KeyZ', 'KeyX', 'Space', 'Enter', 'KeyJ', 'KeyK'].includes(e.code)) { advanceDialog(); e.preventDefault(); return; }
  if (mode === 'play') {
    if (e.code === 'Enter' || e.code === 'Escape') { openMenu('status'); e.preventDefault(); return; }
    if (e.code === 'KeyM' || e.code === 'Tab') { openMenu('map'); e.preventDefault(); return; }
  } else if (mode === 'menu' || mode === 'shop') {
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
  if (touchDir.x < 0) inp.left = 1; if (touchDir.x > 0) inp.right = 1; if (touchDir.y < 0) inp.up = 1; if (touchDir.y > 0) inp.down = 1;
  inp.pressed = {}; for (const k of ['jump', 'attack', 'sub', 'dash', 'bat', 'up']) inp.pressed[k] = !!inp[k] && !prevIn[k];
  prevIn = inp; return inp;
}

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
      case 'sfx': A.sfx(e.id); break;
      case 'room':
        if (e.area !== areaShown) { areaShown = e.area; const el = $('#areaName'); el.textContent = L(AREAS[e.area]); el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
        areaMusic = AREAS[e.area].music; if (!S.sealed) A.music(areaMusic);
        break;
      case 'boss': A.music('boss'); A.sfx('door'); break;
      case 'bossdown': A.music(areaMusic); toast(L({ zh: '擊敗了 ', en: 'Defeated ' }) + L(bossName(e.id)), true); break;
      case 'dialog': openDialog(e.id); break;
      case 'toast': toast(t(e.key)); break;
      case 'got': toast(`${t('got')} ${L(ITEMS[e.item])}`, e.big, e.item); break;
      case 'gotsub': toast(`${t('gotSub')}${L(SUBS[e.sub])}`, true, e.sub); break;
      case 'relic': openDialogLines([{ who: { zh: t('relicGot'), en: t('relicGot') }, zh: `【${RELICS[e.id].zh}】\n${RELICS[e.id].d.zh}`, en: `[${RELICS[e.id].en}]\n${RELICS[e.id].d.en}` }]); break;
      case 'levelup': toast(`${t('levelUp')} Lv ${e.lv}`, true); break;
      case 'save': writeSave(); toast(t('saved')); break;
      case 'shop': openShop(); break;
      case 'dead': overTimer = 1.8; A.stopMusic(); break;
      case 'win': winTimer = 2.2; A.stopMusic(); break;
    }
  }
}
const bossName = (id) => ({ greatbat: { zh: '巨蝙蝠', en: 'the Giant Bat' }, golem: { zh: '骸骨巨像', en: 'the Bone Golem' }, witch: { zh: '魔女莫莉甘', en: 'Morrigan' }, sentinel: { zh: '鋼鐵哨兵', en: 'the Iron Sentinel' }, count: { zh: '伯爵', en: 'the Count' } }[id]);
function writeSaveIfSafe() { /* only the save statues write saves: nothing to do */ }
function toast(text, big, icon) {
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : '');
  if (icon) el.appendChild(iconCanvas(icon));
  el.appendChild(document.createTextNode(text));
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
const TABS = ['status', 'equipT', 'itemsT', 'map', 'sysT'];
let tab = 'status';
function openMenu(which) { mode = 'menu'; resetInput(); tab = which === 'map' ? 'map' : which; $('#menu').classList.remove('hidden'); drawMenu(); A.sfx('menu'); }
function closeOverlays(silent) {
  for (const id of ['#menu', '#shop', '#how', '#confirm']) $(id).classList.add('hidden');
  if (mode === 'menu' || mode === 'shop') { mode = 'play'; prevIn = { jump: 1, attack: 1, up: 1 }; resetInput(); if (!silent) A.sfx('menu'); }
}
$('#menu .closeBtn').onclick = () => closeOverlays();
const fmtTime = (s) => { s = Math.floor(s); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function drawMenu() {
  const tabs = $('#menu .tabs'); tabs.innerHTML = '';
  for (const k of TABS) { const b = el('button', tab === k ? 'on' : '', t(k === 'map' ? 'mapT' : k)); b.onclick = () => { tab = k; drawMenu(); A.sfx('menu'); }; tabs.appendChild(b); }
  const body = $('#menu .body'); body.innerHTML = '';
  const p = S.p, st = G.stats(p);
  if (tab === 'status') {
    const g = el('div', 'stat');
    const rows = [['lv', p.lv], ['hp', `${Math.ceil(p.hp)} / ${p.mhp}`], ['mp', `${Math.floor(p.mp)} / ${p.mmp}`], ['hearts', `${p.hearts} / ${p.mhearts}`], ['atk', st.atk], ['def', st.def], ['str', p.str], ['con', p.con], ['lck', st.lck],
      ['exp', p.exp], ['next', G.expToNext(p) - p.exp], ['gold', p.gold], ['kills', p.kills], ['explored', G.explored(S) + '%'], ['time', fmtTime(S.playTime)]];
    for (const [k, v] of rows) g.appendChild(el('div', '', `<span>${t(k)}</span><b>${v}</b>`));
    body.appendChild(g);
    body.appendChild(el('div', 'sect', t('relics')));
    const rl = el('div', 'list');
    for (const id of Object.keys(RELICS)) { if (!p.relics[id]) continue; const r = el('div', 'it'); r.appendChild(iconCanvas(id)); r.appendChild(el('div', 'nm', `${L(RELICS[id])}<div class="sm">${L(RELICS[id].d)}</div>`)); rl.appendChild(r); }
    if (!rl.children.length) rl.appendChild(el('div', 'sm', t('none')));
    body.appendChild(rl);
    if (p.sub) { body.appendChild(el('div', 'sect', t('sub'))); const r = el('div', 'it'); r.appendChild(iconCanvas(p.sub)); r.appendChild(el('div', 'nm', `${L(SUBS[p.sub])}<div class="sm">♥ ${SUBS[p.sub].cost}</div>`)); body.appendChild(r); }
  }
  if (tab === 'equipT') {
    for (const [slot, kind] of [['weapon', 'weapon'], ['armor', 'armor'], ['acc', 'acc']]) {
      body.appendChild(el('div', 'sect', t(slot)));
      const list = el('div', 'list');
      for (const id of Object.keys(p.gear).filter((i) => ITEMS[i].kind === kind)) {
        const it = ITEMS[id], on = p.equip[slot] === id;
        const desc = it.atk ? `${t('atk')} +${it.atk}` : it.def != null ? `${t('def')} +${it.def}` : it.lck ? `${t('lck')} +${it.lck}` : it.str ? `${t('str')} +${it.str}` : `${t('con')} +${it.con}`;
        const r = el('div', 'it' + (on ? ' eq' : '')); r.appendChild(iconCanvas(id)); r.appendChild(el('div', 'nm', `${L(it)} ${p.gear[id] > 1 ? '×' + p.gear[id] : ''}<div class="sm">${desc}${on ? ' · ' + t('equipped') : ''}</div>`));
        r.onclick = () => { G.equip(S, id); A.sfx('menu'); drawMenu(); };
        list.appendChild(r);
      }
      body.appendChild(list);
    }
  }
  if (tab === 'itemsT') {
    const list = el('div', 'list');
    for (const [id, n] of Object.entries(p.items)) {
      const it = ITEMS[id], r = el('div', 'it'); r.appendChild(iconCanvas(id));
      r.appendChild(el('div', 'nm', `${L(it)} ×${n}<div class="sm">${it.heal ? 'HP +' + (it.heal > 999 ? 'MAX' : it.heal) : ''} ${it.mp ? 'MP MAX' : ''}</div>`));
      const b = el('button', '', t('use')); b.className = 'tabs'; b.style.cssText = 'background:#3a2858;color:#fff;border:1px solid #d8b060;border-radius:4px;padding:5px 12px';
      b.onclick = (ev) => { ev.stopPropagation(); if (!G.useItem(S, id)) A.sfx('no'); handleEvents(); drawMenu(); };
      r.appendChild(b); list.appendChild(r);
    }
    if (!list.children.length) list.appendChild(el('div', 'sm', t('noItems')));
    body.appendChild(list);
  }
  if (tab === 'map') {
    const c = el('canvas'); c.id = 'mapCv'; const w = 680, h = 400; c.width = w * 2; c.height = h * 2; body.appendChild(c);
    const g = c.getContext('2d'); g.scale(2, 2); drawMap(g, S, w, h);
    body.appendChild(el('div', 'maphelp', `${t('mapHelp')} · ${t('explored')} ${G.explored(S)}%`));
    clearInterval(drawMenu.mapTimer); drawMenu.mapTimer = setInterval(() => { if (tab !== 'map' || mode !== 'menu') { clearInterval(drawMenu.mapTimer); return; } g.setTransform(2, 0, 0, 2, 0, 0); drawMap(g, S, w, h); }, 300);
  }
  if (tab === 'sysT') {
    const list = el('div', 'list');
    const snd = el('div', 'it', `<div class="nm">${t('sound')}</div><b>${A.soundOn() ? t('on') : t('off')}</b>`); snd.onclick = () => { A.setSound(!A.soundOn()); drawMenu(); }; list.appendChild(snd);
    const lg = el('div', 'it', `<div class="nm">${t('language')}</div><b>${getLang() === 'zh' ? '中文' : 'English'}</b>`); lg.onclick = () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); applyText(); drawMenu(); }; list.appendChild(lg);
    const how = el('div', 'it', `<div class="nm">${t('howTo')}<div class="sm">${isTouch ? t('controlsTouch') : t('controlsKb')}<br>${t('controlsTips')}</div></div>`); list.appendChild(how);
    const q = el('div', 'it', `<div class="nm">${t('toTitle')}<div class="sm">${L({ zh: '從最後一次存檔繼續。', en: 'You will continue from your last save.' })}</div></div>`); q.onclick = () => { closeOverlays(true); showTitle(); }; list.appendChild(q);
    body.appendChild(list);
  }
}

// ------------------------------------------------------------------ shop
let shopMode = 'buy';
function openShop() { mode = 'shop'; resetInput(); shopMode = 'buy'; $('#shop').classList.remove('hidden'); $('#shop .msg').textContent = ''; drawShop(); }
$('#shop .closeBtn').onclick = () => closeOverlays();
document.querySelectorAll('#shop .tabs button').forEach((b) => { b.onclick = () => { shopMode = b.dataset.mode; drawShop(); A.sfx('menu'); }; });
function drawShop() {
  const p = S.p;
  document.querySelectorAll('#shop .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === shopMode));
  $('#shop .goldLbl').textContent = `${t('gold')}: ${p.gold} G`;
  const body = $('#shop .body'); body.innerHTML = ''; const list = el('div', 'list');
  const ids = shopMode === 'buy' ? SHOP : [...Object.keys(p.items), ...Object.keys(p.gear).filter((i) => ITEMS[i].price > 0)];
  for (const id of ids) {
    const it = ITEMS[id], have = (p.items[id] || 0) + (p.gear[id] || 0);
    const price = shopMode === 'buy' ? it.price : G.sellPrice(id);
    const desc = it.atk ? `${t('atk')} +${it.atk}` : it.def != null ? `${t('def')} +${it.def}` : it.heal ? 'HP +' + (it.heal > 999 ? 'MAX' : it.heal) : it.mp ? 'MP MAX' : it.lck ? `${t('lck')} +${it.lck}` : it.str ? `${t('str')} +${it.str}` : it.con ? `${t('con')} +${it.con}` : '';
    const r = el('div', 'it' + (shopMode === 'buy' && p.gold < price ? ' dis' : ''));
    r.appendChild(iconCanvas(id)); r.appendChild(el('div', 'nm', `${L(it)}<div class="sm">${desc} · ${t('have')} ${have}</div>`)); r.appendChild(el('div', 'pr', price + ' G'));
    r.onclick = () => {
      const okk = shopMode === 'buy' ? G.buy(S, id) : G.sell(S, id);
      $('#shop .msg').textContent = okk ? t(shopMode === 'buy' ? 'bought' : 'sold') : shopMode === 'buy' ? t('noGold') : '—';
      if (!okk) A.sfx('no'); handleEvents(); drawShop();
    };
    list.appendChild(r);
  }
  body.appendChild(list);
}

// ------------------------------------------------------------------ game over / ending
$('#bRetry').onclick = () => { const d = loadSave(); S.deaths++; if (d) { d.deaths = (d.deaths || 0) + 1; S = G.fromSave(d); } else S = G.newState(); begin(); };
$('#bTitle').onclick = () => showTitle();
$('#bEndTitle').onclick = () => showTitle();
function showEnding() {
  mode = 'ending'; $('#touch').classList.add('hidden');
  $('#ending').classList.remove('hidden');
  $('#ending .stats').innerHTML = `${t('clearTime')}: ${fmtTime(S.playTime)}<br>Lv ${S.p.lv} · ${t('explored')} ${G.explored(S)}%<br>${t('kills')}: ${S.p.kills} · ${t('deaths')}: ${S.deaths}`;
  A.music('ending');
  try { const d = G.toSave(S); d.cleared = 1; localStorage.setItem(SAVE, JSON.stringify(d)); } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ loop
let lastFrame = 0;
setInterval(() => { const n = performance.now(); if (!document.hidden && n - lastFrame > 120) frame(n, true); }, 40);   // when animation frames stall
function frame(now, fallback) {
  if (!fallback) requestAnimationFrame(frame);
  lastFrame = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
  if (!S) { cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); return; }
  if (mode === 'play' && !window.__freeze) {
    acc += dt; let n = 0;
    while (acc >= 1 / 60 && n < 5) { G.update(S, 1 / 60, readInput()); acc -= 1 / 60; n++; handleEvents(); if (mode !== 'play') break; }
    if (acc > 0.1) acc = 0;
    if (overTimer > 0) { overTimer -= dt; if (overTimer <= 0) { mode = 'over'; $('#over').classList.remove('hidden'); $('#touch').classList.add('hidden'); } }
    if (winTimer > 0) { winTimer -= dt; if (winTimer <= 0) { dlg = null; openDialogLines(STORY.ending); dlg.back = 'ending'; } }
  } else if (mode === 'dialog') { tickDialog(dt); if (S.fade > 0) S.fade -= dt; }
  else if (mode === 'over' || mode === 'ending') { G.update(S, dt, { pressed: {} }); }
  render(cx, S, scale);
}
requestAnimationFrame(frame);
showTitle();
// a demo room behind the title screen
S = G.newState(1);
window.__msc = { get S() { return S; }, G, step(n, inp = {}) { for (let i = 0; i < n; i++) { const x = { ...inp, pressed: { ...(inp.pressed || {}) } }; if (i) x.pressed = {}; G.update(S, 1 / 60, x); handleEvents(); } }, begin, openMenu, openShop, closeOverlays, startNew, get mode() { return mode; } };
