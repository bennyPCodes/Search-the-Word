'use strict';
(function () {
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = VERSES.length;
const VMAP = Object.fromEntries(VERSES.map(v => [v[0], v[1]]));
const KEY = 'searchword.v1';
const COLORS = 6;

// ---------- Saved progress ----------
function defaults() { return { unlocked: 1, levels: {}, collection: {}, favorites: [], daily: {}, stats: { guessRight: 0, guessTotal: 0, noHint: 0, swift: 0, seer: 0, bestStreak: 0, words: 0 }, ach: [], settings: { sound: true } }; }
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = defaults(), o = JSON.parse(raw); return Object.assign(d, o, { stats: Object.assign(d.stats, o.stats || {}), settings: Object.assign(d.settings, o.settings || {}) }); } } catch (e) {}
  return defaults();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function streak() { const d = new Date(); if (!S.daily[dayKey(d)]) d.setDate(d.getDate() - 1); let n = 0; while (S.daily[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
const fmt = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const totalScore = () => Object.values(S.levels).reduce((a, l) => a + (l.best || 0), 0) + Object.values(S.daily).reduce((a, b) => a + b, 0);
const completed = () => Object.keys(S.levels).length;
const collected = () => Object.keys(S.collection).length;

// ---------- Awards ----------
const ACH = [
  ['first', 'Seek and ye shall find', 'Complete your first level', () => completed() >= 1],
  ['ten', 'Ten talents', 'Complete 10 levels', () => completed() >= 10],
  ['fifty', 'Fiftyfold', 'Complete 50 levels', () => completed() >= 50],
  ['hundred', 'Hundredfold', 'Complete 100 levels', () => completed() >= 100],
  ['all', 'The whole counsel', 'Collect every verse', () => collected() >= L],
  ['words', 'A lamp unto my feet', 'Find 500 hidden words', () => S.stats.words >= 500],
  ['swift', 'Eagle-eyed', 'Finish a level in under 45 seconds', () => S.stats.swift >= 1],
  ['prophet', 'A discerning heart', 'Guess 10 verses before they’re revealed', () => S.stats.guessRight >= 10],
  ['seer', 'Before they call', 'Guess a verse with three quarters still hidden', () => S.stats.seer >= 1],
  ['nohint', 'Hid in my heart', 'Finish 25 levels without hints', () => S.stats.noHint >= 25],
  ['stars', 'Morning stars', 'Earn three stars on 25 levels', () => Object.values(S.levels).filter(l => l.stars === 3).length >= 25],
  ['streak7', 'Seven days', 'Play the daily verse 7 days in a row', () => S.stats.bestStreak >= 7],
  ['streak30', 'Daily bread', 'Play the daily verse 30 days in a row', () => S.stats.bestStreak >= 30],
  ['psalms', 'Psalmist', 'Collect 25 verses from Psalms', () => Object.keys(S.collection).filter(r => r.startsWith('Psalm ')).length >= 25],
  ['proverbs', 'Virtuous woman', 'Collect every verse from Proverbs 31', () => VERSES.filter(v => v[0].startsWith('Proverbs 31')).every(v => S.collection[v[0]])],
];
function checkAch() { const got = []; ACH.forEach(a => { if (!S.ach.includes(a[0]) && a[3]()) { S.ach.push(a[0]); got.push(a); } }); return got; }

// ---------- Sound ----------
let actx;
function tone(freqs, dur = 0.12, gap = 0.07, type = 'sine') {
  if (!S.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * gap;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.25);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.3);
    });
  } catch (e) {}
}

let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }

// ---------- Copy, share, save ----------
const verseText = ref => `“${VMAP[ref]}”\n— ${ref} (KJV)`;
function shareFooter() { return 'Found in Search the Word' + (/^https?:/.test(location.protocol) ? '\n' + location.origin + location.pathname : ''); }
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (_) { toast('Copy failed. Press and hold the verse to copy it.'); }
    ta.remove();
  }
}
const copyVerse = ref => copyText(verseText(ref), 'Verse copied');
async function shareVerse(ref) {
  const text = verseText(ref) + '\n\n' + shareFooter();
  if (navigator.share) { try { await navigator.share({ title: ref, text }); } catch (e) {} }
  else copyText(text, 'Copied, ready to paste and share');
}
function toggleFav(ref) { const i = S.favorites.indexOf(ref); if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(ref); save(); return i < 0; }

// ---------- Menu screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  if (id === 'home') renderHome();
  if (id === 'levels') renderLevels();
  if (id === 'verses') renderVerses();
  if (id === 'stats') renderStats();
}
function renderHome() {
  $('#playSub').textContent = `Level ${S.unlocked}`;
  const today = S.daily[dayKey()], st = streak();
  $('#dailySub').textContent = (today ? `Done today, ${today.toLocaleString()} pts` : 'A new verse awaits') + (st ? `. ${st}-day streak` : '');
  $('#levelsSub').textContent = `${completed()} completed`;
  $('#versesSub').textContent = `${collected()} of ${L}`;
  $('#statsSub').textContent = `${totalScore().toLocaleString()} pts`;
  const last = Object.entries(S.collection).sort((a, b) => b[1].ts - a[1].ts)[0], box = $('#lastVerse');
  if (last && VMAP[last[0]]) { box.hidden = false; box.querySelector('blockquote').textContent = `“${VMAP[last[0]]}”`; box.querySelector('figcaption').textContent = last[0]; }
  else box.hidden = true;
}
function renderLevels() {
  const max = Math.max(L, Math.ceil((S.unlocked + 6) / 10) * 10);
  let h = '';
  for (let n = 1; n <= max; n++) {
    const r = S.levels[n], locked = n > S.unlocked;
    h += `<button class="lv${r ? ' done' : ''}${n === S.unlocked ? ' cur' : ''}" data-lv="${n}"${locked ? ' disabled' : ''} aria-label="Level ${n}${r ? ', ' + r.stars + ' stars' : locked ? ', locked' : ''}"><span>${n}</span><i>${r ? '★'.repeat(r.stars) : ''}</i></button>`;
    if (n === 30) h += `<p class="endless">From level 31, the word list shows only first letters.</p>`;
    if (n === 120) h += `<p class="endless">From level 121, the word list shows only blanks. Search by the verse.</p>`;
    if (n === L) h += `<p class="endless">Endless rounds begin after level ${L}. Every verse returns on a bigger board.</p>`;
  }
  $('#lvGrid').innerHTML = h;
  const cur = $('#lvGrid .cur'); if (cur) cur.scrollIntoView({ block: 'center' });
}
let vFilter = 'all';
function renderVerses() {
  const q = $('#vSearch').value.trim().toLowerCase();
  const items = Object.entries(S.collection).map(([ref, c]) => ({ ref, ...c, text: VMAP[ref] }))
    .filter(x => x.text && (vFilter === 'all' || S.favorites.includes(x.ref)) && (!q || (x.ref + ' ' + x.text).toLowerCase().includes(q)))
    .sort((a, b) => b.ts - a.ts);
  if (!items.length) {
    $('#vList').innerHTML = `<p class="empty">${!collected() ? 'Finish a level to collect your first verse.' : vFilter === 'fav' && !q ? 'Tap Save on any verse to keep it here.' : 'No verses match that search.'}</p>`;
    return;
  }
  $('#vList').innerHTML = items.map(x => {
    const fav = S.favorites.includes(x.ref);
    return `<article class="vcard"><h3>${esc(x.ref)}</h3><p>${esc(x.text)}</p><div class="vact">
      <button data-copy="${esc(x.ref)}">Copy</button><button data-share="${esc(x.ref)}">Share</button>
      <button class="fav${fav ? ' on' : ''}" data-fav="${esc(x.ref)}" aria-pressed="${fav}">${fav ? '♥ Saved' : '♡ Save'}</button>
      ${x.lvl && x.lvl <= S.unlocked ? `<button data-lv="${x.lvl}">Play level ${x.lvl}</button>` : ''}</div></article>`;
  }).join('');
}
function renderStats() {
  const three = Object.values(S.levels).filter(l => l.stars === 3).length;
  const rows = [['Total points', totalScore().toLocaleString()], ['Levels completed', completed()], ['Verses collected', `${collected()} of ${L}`], ['Words found', S.stats.words.toLocaleString()],
    ['Three-star levels', three], ['Early guesses', `${S.stats.guessRight} of ${S.stats.guessTotal}`], ['Daily streak', `${streak()} days`], ['Best daily streak', `${S.stats.bestStreak} days`]];
  $('#statRows').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  $('#achList').innerHTML = ACH.map(a => { const got = S.ach.includes(a[0]); return `<li class="${got ? 'got' : ''}"><span class="ai">${got ? '✦' : '○'}</span><div><b>${a[1]}</b><span>${a[2]}</span></div></li>`; }).join('');
  $('#sndToggle').checked = S.settings.sound;
}

// ---------- Game ----------
let G = null, timerId = null, lastT = 0, drag = null;
const MODE_TEXT = { full: 'Drag across letters in any straight line.', first: 'Only first letters are shown. Use the verse to work out the rest.', length: 'Only blanks are shown. Let the verse guide your search.' };

function startLevel(level, mode) {
  const params = mode === 'daily' ? dailyParams(dayKey()) : levelParams(level);
  const p = buildPuzzle(params);
  G = { p, mode, level, round: params.round, found: new Set(), lines: [], revealed: new Set(), justRevealed: null, pending: null, rings: new Set(),
    picked: null, elapsed: 0, hints: 0, penalty: 0, ctxShown: new Set(), guess: null, done: false, color: 0, badLine: null };
  $('#gTitle').textContent = mode === 'daily' ? 'Daily verse' : `Level ${level}${params.round ? ' (round ' + (params.round + 1) + ')' : ''}`;
  $('#gTime').textContent = '0:00';
  $('#mode').textContent = MODE_TEXT[p.listMode];
  const n = p.size;
  $('#letters').style.gridTemplateColumns = `repeat(${n},1fr)`;
  $('#board').style.setProperty('--n', n);
  $('#letters').innerHTML = p.grid.flat().map(c => `<span>${c}</span>`).join('');
  $('#lines').setAttribute('viewBox', `0 0 ${n} ${n}`);
  $('#ctxLine').hidden = true;
  show('game');
  renderVerseStrip(); renderChips(); drawLines(); updateTools();
  requestAnimationFrame(sizeBoard);
  startTimer();
}
function sizeBoard() {
  if (!G) return;
  const w = $('#boardWrap'); const s = Math.floor(Math.min(w.clientWidth - 24, w.clientHeight - 8, 520));
  $('#board').style.setProperty('--board', Math.max(s, 220) + 'px');
}
window.addEventListener('resize', sizeBoard);

function verseHTML() {
  return G.p.tokens.map(t => {
    if (G.done || G.revealed.has(t.core)) return `<span class="shown${t.core === G.justRevealed ? ' new' : ''}">${esc(t.raw)}</span>`;
    const lead = t.raw.match(/^[^A-Za-z]*/)[0], trail = t.raw.match(/[^A-Za-z’']*$/)[0];
    return `${esc(lead)}<span class="hid" style="--n:${Math.max(1, t.core.length)}"></span>${esc(trail)}`;
  }).join(' ');
}
function renderVerseStrip() { $('#verseStrip').innerHTML = verseHTML(); const n = $('#verseStrip .new'); if (n) n.scrollIntoView({ block: 'nearest' }); }
function hiddenFrac() { let tot = 0, hid = 0; G.p.tokens.forEach(t => { tot += t.core.length; if (!G.revealed.has(t.core)) hid += t.core.length; }); return tot ? hid / tot : 0; }

function chipLabel(w, i) {
  if (G.found.has(i) || G.p.listMode === 'full') return w.ans;
  if (G.p.listMode === 'first') return w.ans[0] + '_'.repeat(w.ans.length - 1);
  return '_'.repeat(w.ans.length);
}
function renderChips() {
  $('#chips').innerHTML = G.p.words.map((w, i) => `<button class="chip${G.found.has(i) ? ' found' : G.p.listMode !== 'full' ? ' blank' : ''}${G.picked === i ? ' picked' : ''}" data-chip="${i}" aria-label="${G.found.has(i) ? w.ans + ', found' : w.ans.length + ' letters' + (G.p.listMode === 'full' ? ', ' + w.ans : '')}">${chipLabel(w, i)}</button>`).join('');
}
function targetWord() { if (G.picked != null && !G.found.has(G.picked)) return G.picked; const i = G.p.words.findIndex((_, j) => !G.found.has(j)); return i < 0 ? null : i; }
function updateTools() {
  const t = targetWord();
  $('#hLetter').disabled = G.done || t == null;
  $('#hCtx').disabled = G.done || t == null || G.p.listMode === 'full';
  const hg = $('#hGuess'); hg.disabled = G.done || !!G.guess;
  hg.textContent = G.guess ? (G.guess.correct ? `Guessed! +${G.guess.bonus}` : 'Guess missed') : 'Guess the verse';
}

function drawLines(temp) {
  let h = '';
  G.lines.forEach((l, i) => { h += `<line x1="${l.a[0] + .5}" y1="${l.a[1] + .5}" x2="${l.b[0] + .5}" y2="${l.b[1] + .5}" stroke="var(--c${l.c})" stroke-width=".74"${i === G.lines.length - 1 && l.fresh ? ' class="found-new"' : ''}/>`; });
  G.rings.forEach(k => { const [x, y] = k.split(',').map(Number); h += `<circle class="ring" cx="${x + .5}" cy="${y + .5}" r=".42"/>`; });
  if (G.pending) h += `<circle class="pend" cx="${G.pending[0] + .5}" cy="${G.pending[1] + .5}" r=".37" opacity=".7"/>`;
  const tl = temp || G.badLine;
  if (tl) h += `<line class="temp${G.badLine && !temp ? ' bad' : ''}" x1="${tl.a[0] + .5}" y1="${tl.a[1] + .5}" x2="${tl.b[0] + .5}" y2="${tl.b[1] + .5}" stroke-width=".74"/>`;
  $('#lines').innerHTML = h;
}

// Pointer selection: drag a line, or tap the first letter then the last.
function pointToCell(e, clamp) {
  const r = $('#letters').getBoundingClientRect(), n = G.p.size;
  let fx = (e.clientX - r.left) / r.width * n, fy = (e.clientY - r.top) / r.height * n;
  if (clamp) { fx = Math.max(0, Math.min(n - 0.01, fx)); fy = Math.max(0, Math.min(n - 0.01, fy)); }
  const x = Math.floor(fx), y = Math.floor(fy);
  return x >= 0 && y >= 0 && x < n && y < n ? [x, y] : null;
}
function snap(a, raw) {
  const dx = raw[0] - a[0], dy = raw[1] - a[1];
  if (!dx && !dy) return a;
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const vx = Math.round(Math.cos(oct * Math.PI / 4)), vy = Math.round(Math.sin(oct * Math.PI / 4));
  let len = Math.max(Math.abs(dx), Math.abs(dy)); const n = G.p.size;
  while (len > 0) { const ex = a[0] + vx * len, ey = a[1] + vy * len; if (ex >= 0 && ey >= 0 && ex < n && ey < n) break; len--; }
  return [a[0] + vx * len, a[1] + vy * len];
}
const board = $('#board');
board.addEventListener('pointerdown', e => {
  if (!G || G.done) return;
  const c = pointToCell(e); if (!c) return;
  try { board.setPointerCapture(e.pointerId); } catch (_) {}
  drag = { a: c, b: c }; G.badLine = null; drawLines(drag); e.preventDefault();
});
board.addEventListener('pointermove', e => {
  if (!drag) return;
  const b = snap(drag.a, pointToCell(e, true));
  if (b[0] !== drag.b[0] || b[1] !== drag.b[1]) { drag.b = b; drawLines(drag); }
});
board.addEventListener('pointerup', () => {
  if (!drag) return;
  const { a, b } = drag; drag = null;
  if (a[0] === b[0] && a[1] === b[1]) {
    if (G.pending && (G.pending[0] !== a[0] || G.pending[1] !== a[1])) { const p0 = G.pending; G.pending = null; tryLine(p0, a); }
    else { G.pending = G.pending ? null : a; drawLines(); }
  } else { G.pending = null; tryLine(a, b); }
});
board.addEventListener('pointercancel', () => { drag = null; drawLines(); });

function tryLine(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) { toast('Words run in straight lines, across, down or diagonal.'); drawLines(); return; }
  const len = Math.max(Math.abs(dx), Math.abs(dy)), vx = Math.sign(dx), vy = Math.sign(dy);
  let str = ''; for (let k = 0; k <= len; k++) str += G.p.grid[a[1] + vy * k][a[0] + vx * k];
  const rev = [...str].reverse().join('');
  const i = G.p.words.findIndex((w, j) => !G.found.has(j) && (w.ans === str || w.ans === rev));
  if (i >= 0) return foundWord(i, a, b);
  if (G.p.words.some((w, j) => G.found.has(j) && (w.ans === str || w.ans === rev))) { toast('Already found'); drawLines(); return; }
  G.badLine = { a, b }; drawLines(); tone([180], 0.08, 0, 'triangle');
  setTimeout(() => { if (G) { G.badLine = null; drawLines(); } }, 450);
}
function foundWord(i, a, b) {
  const w = G.p.words[i];
  G.found.add(i); G.lines.forEach(l => (l.fresh = false));
  G.lines.push({ a, b, c: G.color++ % COLORS, fresh: true });
  w.cells.forEach(c => G.rings.delete(c.join(',')));
  G.revealed.add(w.ans); G.justRevealed = w.ans;
  if (G.picked === i) { G.picked = null; $('#ctxLine').hidden = true; }
  S.stats.words++;
  tone([660, 880]);
  drawLines(); renderVerseStrip(); renderChips(); updateTools();
  if (G.found.size === G.p.words.length) finish();
}

// Hints
function showFirstLetter() {
  if (!G || G.done) return;
  const order = [targetWord(), ...G.p.words.map((_, j) => j)].filter(j => j != null && !G.found.has(j));
  const i = order.find(j => !G.rings.has(G.p.words[j].cells[0].join(',')));
  if (i == null) { toast('Every remaining word already has its first letter circled.'); return; }
  G.rings.add(G.p.words[i].cells[0].join(',')); G.penalty += 40; G.hints++;
  drawLines(); toast(`First letter of a ${G.p.words[i].ans.length}-letter word circled`);
}
function showContext() {
  if (!G || G.done) return;
  const i = targetWord(); if (i == null) return;
  const w = G.p.words[i];
  if (!G.ctxShown.has(i)) { G.ctxShown.add(i); G.penalty += 25; G.hints++; }
  G.picked = i; renderChips();
  const ctx = (() => { const t = G.p.tokens, k = t.findIndex(x => x.core === w.ans);
    const hide = new Set(G.p.words.filter((q, j) => !G.found.has(j)).map(q => q.ans));
    const m = x => (hide.has(x.core) ? x.raw.replace(/[A-Za-z][A-Za-z’']*/, '____') : x.raw);
    return `“${k > 3 ? '…' : ''}${[...t.slice(Math.max(0, k - 3), k).map(m), t[k].raw.replace(/[A-Za-z][A-Za-z’']*/, '______'), ...t.slice(k + 1, k + 4).map(m)].join(' ')}${k + 4 < t.length ? '…' : ''}”`; })();
  $('#ctxLine').textContent = `${ctx} (${w.ans.length})`; $('#ctxLine').hidden = false;
}

// Guess
function openGuess() {
  if (!G || G.done || G.guess) return;
  const jr = G.justRevealed; G.justRevealed = null; $('#guessVerse').innerHTML = verseHTML(); G.justRevealed = jr;
  $('#guessOpts').innerHTML = G.p.options.map(r => `<button data-gref="${esc(r)}">${esc(r)}</button>`).join('');
  $('#guessSheet').hidden = false;
}
function makeGuess(ref) {
  const frac = hiddenFrac(), correct = ref === G.p.ref;
  S.stats.guessTotal++;
  if (correct) {
    const bonus = Math.round(150 + 450 * frac);
    G.guess = { correct: true, bonus }; S.stats.guessRight++; if (frac >= 0.75) S.stats.seer++;
    tone([523, 659, 784]); toast(`Yes, it’s ${ref}! +${bonus} bonus`);
  } else {
    G.guess = { correct: false, bonus: 0 }; G.penalty += 100;
    tone([220, 180], 0.1, 0.1, 'triangle'); toast(`Not ${ref}. −100. Keep searching to reveal it.`);
  }
  save(); closeSheets(); updateTools();
}

// Timer
function startTimer() {
  stopTimer(); lastT = performance.now();
  timerId = setInterval(() => {
    const now = performance.now();
    if (G && !G.done && !document.hidden && $('#guessSheet').hidden) G.elapsed += now - lastT;
    lastT = now;
    if (G) $('#gTime').textContent = fmt(G.elapsed / 1000);
  }, 250);
}
function stopTimer() { clearInterval(timerId); timerId = null; }
document.addEventListener('visibilitychange', () => { lastT = performance.now(); });

// Finish and score
function finish() {
  if (G.done) return;
  G.done = true; stopTimer(); renderVerseStrip(); updateTools(); G.rings.clear(); drawLines();
  const p = G.p, t = G.elapsed / 1000;
  const base = 200 + 50 * p.words.length + 10 * p.size;
  const speed = Math.max(0, Math.min(1, (2 * p.par - t) / (2 * p.par)));
  const timeB = Math.round(800 * speed);
  const guessB = G.guess && G.guess.correct ? G.guess.bonus : 0;
  const mult = G.mode === 'daily' ? 1.5 : 1 + 0.25 * (G.round || 0);
  const total = Math.max(50, Math.round((base + timeB + guessB - G.penalty) * mult));
  const stars = t <= p.par && G.hints === 0 ? 3 : t <= 2 * p.par ? 2 : 1;
  const newVerse = !S.collection[p.ref];
  if (newVerse) S.collection[p.ref] = { ts: Date.now(), lvl: G.mode === 'daily' ? p.verseIdx + 1 : ((G.level - 1) % L) + 1 };
  let isBest;
  if (G.mode === 'daily') {
    const k = dayKey(); isBest = !!S.daily[k] && total > S.daily[k];
    S.daily[k] = Math.max(total, S.daily[k] || 0); S.stats.bestStreak = Math.max(S.stats.bestStreak, streak());
  } else {
    const r = S.levels[G.level]; isBest = !!r && total > r.best;
    S.levels[G.level] = { best: Math.max(total, r ? r.best : 0), stars: Math.max(stars, r ? r.stars : 0), time: r && r.time ? Math.min(t, r.time) : t };
    if (G.level === S.unlocked) S.unlocked++;
  }
  if (G.hints === 0) S.stats.noHint++;
  if (t < 45) S.stats.swift++;
  const newAch = checkAch(); save();
  setTimeout(() => {
    tone([523, 659, 784, 1047], 0.16, 0.11);
    showResults({ t, stars, base, timeB, guessB, total, isBest, mult, newVerse });
    newAch.forEach((a, i) => setTimeout(() => toast(`Award earned: ${a[1]}`), 2600 + i * 2600));
  }, 600);
}
function showResults(r) {
  const p = G.p;
  $('#resTitle').textContent = G.mode === 'daily' ? 'Daily verse complete' : `Level ${G.level} complete`;
  $('#resStars').textContent = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  $('#resStars').setAttribute('aria-label', `${r.stars} of 3 stars`);
  const rv = $('#resVerse');
  rv.style.setProperty('--d', Math.min(80, 2200 / p.tokens.length) + 'ms');
  rv.innerHTML = '“' + p.tokens.map((t, i) => `<span style="--i:${i}">${esc(t.raw)}</span>`).join(' ') + '”';
  $('#resRef').textContent = p.ref + (r.newVerse ? '  (new verse)' : '');
  const rows = [['Puzzle', r.base], [`Speed (${fmt(r.t)})`, r.timeB]];
  if (G.guess) rows.push([G.guess.correct ? 'Early guess bonus' : 'Early guess', r.guessB]);
  if (G.penalty) rows.push(['Hints and misses', -G.penalty]);
  if (r.mult !== 1) rows.push(['Multiplier', '×' + r.mult]);
  $('#resRows').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${typeof b === 'number' ? (b > 0 ? '+' : '') + b.toLocaleString() : b}</dd></div>`).join('') +
    `<div class="total"><dt>${r.isBest ? 'Total (new best)' : 'Total'}</dt><dd>${r.total.toLocaleString()}</dd></div>`;
  updateFavBtn();
  $('#rNext').textContent = G.mode === 'daily' ? 'Back to menu' : 'Next level';
  $('#resSheet').hidden = false;
}
function updateFavBtn() { const on = S.favorites.includes(G.p.ref), b = $('#rFav'); b.classList.toggle('on', on); b.textContent = on ? '♥ Saved' : '♡ Save'; b.setAttribute('aria-pressed', on); }
function closeSheets() { document.querySelectorAll('.overlay').forEach(o => (o.hidden = true)); }

// ---------- Event wiring ----------
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('[data-chip]'); if (!c || !G) return;
  const i = +c.dataset.chip; if (G.found.has(i)) return;
  G.picked = G.picked === i ? null : i; renderChips(); updateTools();
  if (G.ctxShown.has(i) && G.picked === i) showContext(); else $('#ctxLine').hidden = true;
});
$('#hLetter').onclick = showFirstLetter;
$('#hCtx').onclick = showContext;
$('#hGuess').onclick = openGuess;
$('#gBack').onclick = () => {
  if (G && !G.done && G.found.size > 0 && !confirm('Leave this level? Your progress on it won’t be saved.')) return;
  stopTimer(); G = null; show('home');
};
$('#btnPlay').onclick = () => startLevel(S.unlocked, 'level');
$('#btnDaily').onclick = () => startLevel(0, 'daily');
$('#rNext').onclick = () => { closeSheets(); if (G.mode === 'daily') { G = null; show('home'); } else startLevel(G.level + 1, 'level'); };
$('#rReplay').onclick = () => { closeSheets(); startLevel(G.level, G.mode); };
$('#rCopy').onclick = () => copyVerse(G.p.ref);
$('#rShare').onclick = () => shareVerse(G.p.ref);
$('#rFav').onclick = () => { const on = toggleFav(G.p.ref); updateFavBtn(); toast(on ? 'Saved to My verses' : 'Removed from saved'); };
$('#guessOpts').addEventListener('click', e => { const b = e.target.closest('[data-gref]'); if (b) makeGuess(b.dataset.gref); });
$('#guessSheet').addEventListener('click', e => { if (e.target.id === 'guessSheet' || e.target.closest('[data-close]')) closeSheets(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#guessSheet').hidden) closeSheets(); });
$('#vSearch').addEventListener('input', renderVerses);
document.querySelectorAll('[data-vf]').forEach(b => b.onclick = () => { vFilter = b.dataset.vf; document.querySelectorAll('[data-vf]').forEach(x => x.classList.toggle('on', x === b)); renderVerses(); });
$('#sndToggle').onchange = e => { S.settings.sound = e.target.checked; save(); };
$('#btnReset').onclick = () => { if (confirm('Erase all levels, scores, awards and collected verses? This can’t be undone.')) { S = defaults(); save(); toast('Progress reset'); renderStats(); } };
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]'); if (go) { show(go.dataset.go); return; }
  const lv = e.target.closest('[data-lv]'); if (lv && !lv.disabled) { startLevel(+lv.dataset.lv, 'level'); return; }
  const c = e.target.closest('[data-copy]'); if (c) return copyVerse(c.dataset.copy);
  const s = e.target.closest('[data-share]'); if (s) return shareVerse(s.dataset.share);
  const f = e.target.closest('[data-fav]'); if (f) { toggleFav(f.dataset.fav); renderVerses(); }
});

// ---------- Install (PWA) ----------
let deferred = null;
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBar').hidden = false; });
$('#btnInstall').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBar').hidden = true; };
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone()) {
  $('#installText').textContent = 'To install: tap the Share button, then Add to Home Screen.';
  $('#btnInstall').hidden = true; $('#installBar').hidden = false;
}
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

renderHome();
})();
