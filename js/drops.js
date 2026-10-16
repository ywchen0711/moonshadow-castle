// What each monster drops, fixed per species so the gallery can list it:
// n  — normal drop (a potion for its level)        r  — rare drop (a rare item of one base)
// en — elite form's normal drop (a gem of its kind) er — elite form's rare drop (one unique, different for every species)
import { AREAS, ENEMIES, BOSSES } from './data.js?v=2';
import * as I from './items.js?v=3';

export const RATES = { n: 0.06, r: 0.02, en: 0.5, er: 0.12 };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const pickBy = (arr, key) => arr[hash(key) % arr.length];

// the level a monster first appears at (its lowest area)
export function monsterLevel(kind) {
  const lv = Object.values(AREAS).filter((a) => (a.enemies || []).includes(kind)).map((a) => a.lv || 1);
  return lv.length ? Math.min(...lv) : 1;
}
function potionFor(lv, kind) { return pickBy(lv < 8 ? ['potion', 'antidote', 'manaprism'] : lv < 16 ? ['hipotion', 'manaprism', 'warprune'] : ['superpotion', 'elixir', 'warprune'], kind + 'n'); }
function gemFor(kind, B, lv) {
  const type = B.elem === 'fire' ? 'ruby' : B.elem === 'cold' ? 'sapphire' : B.elem === 'ltng' ? 'topaz' : B.elem === 'pois' ? 'emerald'
    : B.undead ? pickBy(['skull', 'diamond'], kind) : pickBy(['amethyst', 'ruby', 'sapphire', 'topaz', 'emerald'], kind + 'g');
  return type + Math.min(3, 1 + Math.floor(lv / 8));
}
function baseFor(kind, lv) {
  const pool = Object.values(I.BASES).filter((b) => b.c !== 'sub' && b.q <= lv + 4 && b.q >= Math.max(1, lv - 8));
  return pickBy(pool.length ? pool : Object.values(I.BASES).filter((b) => b.c !== 'sub' && b.q <= 5), kind + 'r').id;
}

export const DROPS = {};
{
  const kinds = Object.keys(ENEMIES).filter((k) => !BOSSES[k]).sort((a, b) => monsterLevel(a) - monsterLevel(b) || a.localeCompare(b));
  const free = Object.values(I.UNIQUES).filter((u) => I.BASES[u.b].c !== 'sub').sort((a, b) => a.lvl - b.lvl);
  for (const k of kinds) {
    const B = ENEMIES[k], lv = monsterLevel(k);
    // the unused unique closest to a little above the monster's level
    let best = 0; free.forEach((u, i) => { if (Math.abs(u.lvl - (lv + 3)) < Math.abs(free[best].lvl - (lv + 3))) best = i; });
    const uniq = free.splice(best, 1)[0];
    DROPS[k] = {
      n: { t: 'item', id: potionFor(lv, k), p: RATES.n },
      r: { t: 'gear', b: baseFor(k, lv), q: 'r', p: RATES.r },
      en: { t: 'gem', g: gemFor(k, B, lv), p: RATES.en },
      er: { t: 'u', id: uniq.id, p: RATES.er },
    };
  }
}
