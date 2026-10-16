// WebAudio synth: a small step sequencer for each area's gothic theme, and synthesized sound effects.
let ac = null, master = null, musicGain = null, sfxGain = null, enabled = true, cur = null, timer = null, step = 0, nextT = 0;
try { enabled = localStorage.getItem('msc_sound') !== '0'; } catch (e) { /* ignore */ }
export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on; try { localStorage.setItem('msc_sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.value = on ? 0.8 : 0;
}
export function unlock() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); master = ac.createGain(); master.gain.value = enabled ? 0.8 : 0; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
  }
  if (ac.state === 'suspended') ac.resume();
}
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
function tone(dest, type, f, t, dur, vol, f2, attack = 0.005) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dest, t, dur, vol, freq = 1200, q = 1, type = 'bandpass') {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
}

// ------------------------------------------------------------------ music: chords (root midi + minor/major), arpeggio, bass, melody
// each song: bpm, chord list (one per bar), melody per bar as 8 eighth notes (scale degrees in semitones from the chord root, null = rest)
const SONGS = {
  title: { bpm: 76, wave: 'triangle', chords: [[57, 'm'], [53, 'M'], [55, 'M'], [52, 'M']], mel: [[12, null, 15, 14, 12, null, 10, null], [12, null, 16, 15, 12, null, null, null], [14, null, 12, 11, 14, null, 19, null], [16, 15, 14, 12, 11, null, null, null]] },
  entrance: { bpm: 132, wave: 'square', chords: [[57, 'm'], [57, 'm'], [53, 'M'], [55, 'M'], [57, 'm'], [62, 'm'], [52, 'M'], [52, 'M']],
    mel: [[12, 12, 15, 12, 19, 17, 15, 14], [12, null, 10, 12, 7, null, null, null], [12, 16, 19, 16, 12, 16, 19, 21], [19, 17, 16, 14, 11, null, 14, null], [12, 12, 15, 12, 19, 17, 15, 14], [15, null, 14, 12, 10, null, 9, null], [8, 11, 14, 16, 20, 19, 16, 14], [16, null, null, null, 11, null, null, null]] },
  catacombs: { bpm: 96, wave: 'triangle', chords: [[50, 'm'], [50, 'm'], [46, 'M'], [45, 'M']], mel: [[12, null, null, 13, 12, null, 8, null], [7, null, null, null, 5, null, 7, null], [12, null, 10, null, 7, null, 5, null], [7, null, 6, null, 4, null, null, null]] },
  library: { bpm: 112, wave: 'sine', chords: [[52, 'm'], [57, 'm'], [50, 'M'], [55, 'M'], [48, 'M'], [53, 'M'], [47, 'M'], [47, 'M']],
    mel: [[12, 15, 19, 15, 24, 19, 15, 19], [12, 15, 19, 15, 22, 19, 15, 12], [14, 17, 19, 17, 24, 19, 17, 19], [12, 16, 19, 16, 21, 19, 16, 14], [12, 16, 19, 16, 24, 19, 16, 19], [12, 16, 19, 16, 21, 19, 16, 12], [16, 19, 22, 19, 24, 22, 19, 16], [12, null, 16, null, 19, null, null, null]] },
  clock: { bpm: 144, wave: 'square', chords: [[55, 'm'], [55, 'm'], [51, 'M'], [53, 'M'], [55, 'm'], [48, 'm'], [50, 'M'], [50, 'M']],
    mel: [[12, 14, 15, 17, 19, 17, 15, 14], [15, null, 12, null, 19, null, 17, null], [12, 14, 16, 19, 16, 14, 12, 11], [14, 16, 17, 19, 21, null, 19, null], [12, 14, 15, 17, 19, 22, 24, 22], [19, 17, 15, 17, 15, 14, 12, null], [16, null, 18, null, 21, null, 24, null], [23, 21, 18, 16, 14, null, null, null]] },
  keep: { bpm: 126, wave: 'sawtooth', chords: [[53, 'm'], [53, 'm'], [49, 'M'], [51, 'M'], [53, 'm'], [58, 'm'], [48, 'M'], [48, 'M']],
    mel: [[12, null, 12, 15, 19, null, 18, 19], [24, null, 22, null, 19, null, null, null], [12, 16, 19, 23, 24, null, 19, null], [17, null, 19, null, 21, 19, 17, 14], [12, null, 12, 15, 19, null, 18, 19], [24, null, 27, null, 24, 22, 19, null], [16, 19, 22, 25, 28, 25, 22, 19], [16, null, null, null, 12, null, null, null]] },
  boss: { bpm: 156, wave: 'sawtooth', chords: [[52, 'm'], [52, 'm'], [53, 'M'], [52, 'm'], [52, 'm'], [52, 'm'], [50, 'M'], [51, 'M']],
    mel: [[12, 12, 13, 12, 15, 12, 13, 12], [19, null, 18, null, 15, null, 13, null], [12, 12, 13, 12, 16, 12, 13, 12], [18, 19, 18, 15, 13, 12, 10, null], [12, 12, 13, 12, 15, 12, 13, 12], [24, null, 22, null, 19, null, 18, null], [14, 17, 21, 24, 21, 17, 14, null], [16, null, 19, null, 23, null, 24, null]] },
  ending: { bpm: 84, wave: 'triangle', chords: [[60, 'M'], [55, 'M'], [57, 'm'], [53, 'M'], [60, 'M'], [55, 'M'], [53, 'M'], [55, 'M']],
    mel: [[16, null, 19, null, 24, null, 23, 21], [19, null, null, null, 16, null, 14, null], [15, null, 19, null, 24, null, 22, 19], [21, null, null, null, 19, null, 17, null], [16, null, 19, null, 24, null, 26, 28], [26, null, 24, null, 23, null, 21, null], [19, null, 21, null, 24, null, 23, null], [24, null, null, null, null, null, null, null]] },
};
export function music(id) {
  if (!ac || cur === id) return;
  cur = id; step = 0; nextT = ac.currentTime + 0.05;
  if (!timer) timer = setInterval(tick, 50);
}
export function stopMusic() { cur = null; }
function tick() {
  if (!ac || !cur) return;
  const s = SONGS[cur], e8 = 60 / s.bpm / 2;
  while (nextT < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % s.chords.length, i = step % 8, [root, q] = s.chords[bar];
    const third = q === 'm' ? 3 : 4, arp = [0, 7, third + 12, 12, 7, third + 12, 12, 19];
    if (enabled) {
      tone(musicGain, 'triangle', hz(root - 12 + (i === 4 ? 7 : 0)), nextT, e8 * (i % 4 === 0 ? 1.8 : 0.9), i % 4 === 0 ? 0.5 : 0.25);
      tone(musicGain, 'square', hz(root + arp[i]), nextT, e8 * 0.7, 0.07);
      const m = s.mel[bar % s.mel.length][i];
      if (m != null) tone(musicGain, s.wave, hz(root + m + (s.wave === 'sine' ? 12 : 0)), nextT, e8 * 1.6, s.wave === 'sawtooth' ? 0.09 : 0.14, null, 0.01);
      if (cur === 'boss' || cur === 'clock' || cur === 'entrance' || cur === 'keep') { if (i % 2 === 0) noise(musicGain, nextT, 0.04, 0.12, 7000, 0.7, 'highpass'); if (i === 2 || i === 6) noise(musicGain, nextT, 0.12, 0.25, 1800, 0.8); }
    }
    nextT += e8; step++;
  }
}

// ------------------------------------------------------------------ effects
export function sfx(id) {
  if (!ac || !enabled) return;
  const t = ac.currentTime, g = sfxGain;
  switch (id) {
    case 'swing': noise(g, t, 0.09, 0.5, 2600, 0.6); break;
    case 'block': tone(g, 'square', 1600, t, 0.07, 0.15, 900); noise(g, t, 0.05, 0.3, 4000, 1); break;
    case 'hit': tone(g, 'square', 300, t, 0.08, 0.25, 90); noise(g, t, 0.06, 0.4, 900); break;
    case 'hitboss': tone(g, 'square', 180, t, 0.12, 0.3, 60); noise(g, t, 0.08, 0.5, 600); break;
    case 'die': noise(g, t, 0.35, 0.6, 500, 0.5); tone(g, 'sawtooth', 200, t, 0.3, 0.15, 40); break;
    case 'bossdie': for (let i = 0; i < 6; i++) { noise(g, t + i * 0.15, 0.5, 0.7, 300 + i * 80, 0.5); } tone(g, 'sawtooth', 120, t, 1.6, 0.25, 30); break;
    case 'jump': tone(g, 'square', 220, t, 0.1, 0.12, 440); break;
    case 'djump': tone(g, 'triangle', 500, t, 0.15, 0.2, 1100); break;
    case 'land': noise(g, t, 0.05, 0.25, 300, 0.7); break;
    case 'hurt': tone(g, 'sawtooth', 300, t, 0.25, 0.25, 80); break;
    case 'dead': tone(g, 'triangle', 440, t, 1.2, 0.3, 55); break;
    case 'heart': tone(g, 'square', 880, t, 0.06, 0.15); tone(g, 'square', 1320, t + 0.05, 0.08, 0.15); break;
    case 'coin': tone(g, 'square', 1200, t, 0.05, 0.12); tone(g, 'square', 1800, t + 0.05, 0.1, 0.12); break;
    case 'item': [0, 4, 7, 12].forEach((n, i) => tone(g, 'triangle', hz(72 + n), t + i * 0.07, 0.2, 0.25)); break;
    case 'relic': [0, 3, 7, 12, 15, 19, 24].forEach((n, i) => tone(g, 'triangle', hz(64 + n), t + i * 0.09, 0.5, 0.25)); break;
    case 'level': [0, 4, 7, 12, 16].forEach((n, i) => tone(g, 'square', hz(76 + n), t + i * 0.06, 0.18, 0.12)); break;
    case 'save': [0, 7, 12, 19].forEach((n, i) => tone(g, 'sine', hz(67 + n), t + i * 0.12, 0.6, 0.25)); break;
    case 'heal': tone(g, 'sine', 600, t, 0.4, 0.25, 1200); break;
    case 'buy': tone(g, 'square', 1000, t, 0.06, 0.12); tone(g, 'square', 1500, t + 0.06, 0.12, 0.12); break;
    case 'candle': noise(g, t, 0.12, 0.35, 3000, 1); tone(g, 'triangle', 1400, t, 0.08, 0.1, 700); break;
    case 'crumble': noise(g, t, 0.6, 0.6, 250, 0.5); break;
    case 'sub': tone(g, 'triangle', 700, t, 0.08, 0.18, 1200); break;
    case 'burn': noise(g, t, 0.6, 0.3, 1500, 0.4); break;
    case 'fire': noise(g, t, 0.25, 0.4, 800, 0.8); tone(g, 'sawtooth', 160, t, 0.2, 0.1, 80); break;
    case 'magic': tone(g, 'sine', 900, t, 0.3, 0.2, 300); tone(g, 'sine', 1350, t, 0.3, 0.12, 450); break;
    case 'thunder': noise(g, t, 0.5, 0.7, 400, 0.4); break;
    case 'slam': noise(g, t, 0.4, 0.8, 120, 0.6, 'lowpass'); tone(g, 'sine', 90, t, 0.4, 0.4, 30); break;
    case 'throw': noise(g, t, 0.1, 0.3, 1800, 1); break;
    case 'squeak': tone(g, 'square', 2200, t, 0.06, 0.06, 1500); break;
    case 'flap': noise(g, t, 0.12, 0.25, 900, 1.5); break;
    case 'gear': tone(g, 'square', 300, t, 0.2, 0.12, 900); break;
    case 'roar': tone(g, 'sawtooth', 120, t, 1, 0.3, 50); noise(g, t, 1, 0.4, 300, 0.4); break;
    case 'dash': noise(g, t, 0.12, 0.3, 1600, 0.8); break;
    case 'slide': noise(g, t, 0.25, 0.3, 700, 0.6); break;
    case 'bat': tone(g, 'sine', 400, t, 0.3, 0.2, 1200); break;
    case 'no': tone(g, 'square', 160, t, 0.12, 0.12); break;
    case 'menu': tone(g, 'square', 900, t, 0.04, 0.08); break;
    case 'door': noise(g, t, 0.5, 0.6, 200, 0.5, 'lowpass'); tone(g, 'square', 80, t, 0.4, 0.15); break;
  }
}
