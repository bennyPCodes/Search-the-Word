'use strict';
// Search the Word — puzzle engine. Pure functions, no DOM.

const STOP = new Set(`A AN THE AND OR NOR BUT FOR SO YET OF TO IN ON AT BY AS IS AM ARE WAS WERE BE BEEN BEING ART IT ITS I ME MY MINE WE US OUR YE YOU YOUR THOU THEE THY THINE HE HIM HIS SHE HER THEY THEM THEIR THAT THIS THESE THOSE WHICH WHO WHOM WHOSE WHAT WHEN WHERE WHY HOW THERE THEN THAN UNTO UPON INTO FROM WITH WITHIN WITHOUT SHALL SHALT WILL WILT HATH HAST HAVE HAS HAD DOTH DOST DO DID NOT NO ALL ANY EVERY EVEN ALSO NEITHER EITHER YEA LET MAY CAN CANST SAITH SAID SAYING NOW ONE OWN SUCH SOME VERY MUCH MORE MOST THINGS THING UNTIL THEREFORE WHEREFORE WHEREIN THEREOF THEREIN WHOSOEVER WHATSOEVER WHITHERSOEVER SOEVER ABOUT OVER UNDER AGAIN ALWAY SELAH AMEN LO OH O BOTH SAME USWARD WITHAL WHENCE WHITHER WHEREBY THOUGH NAY OUT OFF UP DOWN`.split(/\s+/));

const DIRS = { E: [1, 0], S: [0, 1], SE: [1, 1], NE: [1, -1], W: [-1, 0], N: [0, -1], NW: [-1, -1], SW: [-1, 1] };

function seedFrom(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function makeRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function tokenize(text) {
  return text.split(/\s+/).filter(Boolean).map(raw => ({ raw, core: raw.replace(/[’']s\b/gi, '').replace(/[^A-Za-z]/g, '').toUpperCase() }));
}

// Difficulty curve.
// listMode: 'full' shows the words to find, 'first' shows only the first letter, 'length' shows only blanks.
function levelParams(level) {
  const L = VERSES.length, idx = (level - 1) % L, round = Math.floor((level - 1) / L);
  const size = Math.min(12, (level <= 10 ? 8 : level <= 40 ? 9 : level <= 100 ? 10 : level <= 180 ? 11 : 12) + round);
  const target = Math.min(12, (level <= 10 ? 5 : level <= 40 ? 6 : level <= 100 ? 7 : level <= 180 ? 8 : 9) + round);
  const dirs = level <= 15 && !round ? ['E', 'S'] : level <= 50 && !round ? ['E', 'S', 'SE', 'NE'] : Object.keys(DIRS);
  const listMode = round > 0 ? 'length' : level <= 30 ? 'full' : level <= 120 ? 'first' : 'length';
  return { verseIdx: idx, seedKey: 'ws-' + level, size, target, dirs, listMode, round };
}
function dailyParams(dateKey) {
  return { verseIdx: seedFrom('wsdaily-' + dateKey) % VERSES.length, seedKey: 'wsdaily-' + dateKey, size: 11, target: 9, dirs: Object.keys(DIRS), listMode: 'first', round: 0 };
}

function cloze(tokens, ans, found) {
  const i = tokens.findIndex(t => t.core === ans);
  const mask = t => (found(t.core) ? t.raw : t.raw.replace(/[A-Za-z][A-Za-z’']*/, '____'));
  const before = tokens.slice(Math.max(0, i - 3), i).map(mask).join(' ');
  const after = tokens.slice(i + 1, i + 4).map(mask).join(' ');
  const blank = tokens[i].raw.replace(/[A-Za-z][A-Za-z’']*/, '______');
  return `“${i > 3 ? '…' : ''}${[before, blank, after].filter(Boolean).join(' ')}${i + 4 < tokens.length ? '…' : ''}”`;
}

function buildPuzzle({ verseIdx, seedKey, size, target, dirs, listMode }) {
  const [ref, text] = VERSES[verseIdx];
  const r = makeRng(seedFrom(seedKey));
  const tokens = tokenize(text);
  const seen = new Set(), good = [], filler = [];
  for (const t of tokens) {
    const w = t.core; if (w.length < 3 || w.length > size || seen.has(w)) continue; seen.add(w);
    (STOP.has(w) ? filler : good).push(w);
  }
  let ranked = [...shuffle(good.filter(w => w.length >= 4), r), ...shuffle(good.filter(w => w.length === 3), r)];
  if (ranked.length < 4) ranked = ranked.concat(shuffle(filler.filter(w => w.length >= 4), r));
  const pick = ranked.slice(0, target + 4);

  let best = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill(''));
    const placed = [];
    const order = [...pick.slice(0, target)].sort((a, b) => b.length - a.length).concat(pick.slice(target));
    for (const w of order) {
      if (placed.length >= target) break;
      let opts = [];
      for (let tries = 0; tries < 300; tries++) {
        const d = dirs[Math.floor(r() * dirs.length)], [vx, vy] = DIRS[d];
        const x = Math.floor(r() * size), y = Math.floor(r() * size);
        const ex = x + vx * (w.length - 1), ey = y + vy * (w.length - 1);
        if (ex < 0 || ey < 0 || ex >= size || ey >= size) continue;
        let ok = true, overlap = 0;
        for (let k = 0; k < w.length; k++) { const c = grid[y + vy * k][x + vx * k]; if (c && c !== w[k]) { ok = false; break; } if (c) overlap++; }
        if (!ok || overlap === w.length) continue;
        opts.push({ x, y, vx, vy, score: overlap * 3 + r() });
        if (opts.length > 25) break;
      }
      if (!opts.length) continue;
      opts.sort((a, b) => b.score - a.score);
      const o = opts[0], cells = [];
      for (let k = 0; k < w.length; k++) { const X = o.x + o.vx * k, Y = o.y + o.vy * k; grid[Y][X] = w[k]; cells.push([X, Y]); }
      placed.push({ ans: w, cells });
    }
    if (!best || placed.length > best.placed.length) best = { grid, placed };
    if (placed.length >= Math.min(target, pick.length)) break;
  }

  // Fill the empty squares with letters drawn from the verse itself, so the decoys look plausible.
  const pool = text.toUpperCase().replace(/[^A-Z]/g, '') + 'ETAOINSRHLD';
  const grid = best.grid.map(row => row.map(c => c || pool[Math.floor(r() * pool.length)]));
  const words = best.placed.sort((a, b) => a.ans.localeCompare(b.ans));
  const options = shuffle([ref, ...shuffle(VERSES.map(v => v[0]).filter(x => x !== ref), r).slice(0, 3)], r);
  const per = listMode === 'full' ? 14 : listMode === 'first' ? 22 : 30;
  const par = per * words.length + 30;
  return { verseIdx, ref, text, tokens, size, grid, words, options, par, listMode };
}

if (typeof module !== 'undefined') module.exports = { buildPuzzle, levelParams, dailyParams };
