/* KOPFNUSS – Das Quiz-Duell zu zweit
 * Host-autoritative Spiellogik, Verbindung per PeerJS (WebRTC) über einen 4-stelligen Code.
 * Testmodus: ?local im URL → Verbindung über BroadcastChannel (zwei Tabs im selben Browser).
 */
(() => {
'use strict';
const Q = window.QUESTIONS;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = n => Math.floor(Math.random() * n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtNum = n => (Math.round(n * 100) / 100).toLocaleString('de-DE');
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const PARAMS = new URLSearchParams(location.search);
const LOCAL = PARAMS.has('local');
const TILT = 34;

/* ---------------- Daten ---------------- */
const CATS = {
  welt:     { n: 'Welt & Reisen',          s: 'Welt',     i: '🌍', c: '#22c3ff' },
  erdkunde: { n: 'Erdkunde',               s: 'Erdkunde', i: '🗺️', c: '#1de9b6' },
  natur:    { n: 'Tiere & Garten',         s: 'Natur',    i: '🌿', c: '#4ade80' },
  koerper:  { n: 'Körper & Gesundheit',    s: 'Körper',   i: '🫀', c: '#ff4d6d' },
  sport:    { n: 'Sport & Motor',          s: 'Sport',    i: '🏎️', c: '#ff9f1c' },
  social:   { n: 'Social & Stars',         s: 'Social',   i: '📱', c: '#b06cff' },
  technik:  { n: 'Technik & Alltag',       s: 'Technik',  i: '💡', c: '#ffd60a' },
  trash:    { n: 'Trash-TV',               s: 'Trash-TV', i: '📺', c: '#ff3df2' },
  wtf:      { n: 'Woher weißt du das?!',   s: 'WTF?!',    i: '🤯', c: '#c6ff3d' },
  frau:     { n: 'Alles rund um die Frau', s: 'Frau',     i: '💃', c: '#ffa3c4' },
  mann:     { n: 'Alles rund um den Mann', s: 'Mann',     i: '🧔', c: '#5b8cff' },
};
const CAT_KEYS = Object.keys(CATS);
const MODES = {
  all:    { n: 'Alles muss rein', i: '🌈', d: 'Alle 11 Kategorien' },
  caro:   { n: 'Caro-Modus',      i: '💖', d: 'Ohne Sport & Technik' },
  custom: { n: 'Individuell',     i: '🎛️', d: 'Du wählst aus' },
};
function resolveCats(st) {
  if (st.mode === 'caro') return CAT_KEYS.filter(c => c !== 'sport' && c !== 'technik');
  if (st.mode === 'custom') return CAT_KEYS.filter(c => st.custom.includes(c));
  return CAT_KEYS.slice();
}
const FT = {
  start: { i: '🚀', n: 'Start', c: '#ffffff' },
  blitz: { i: '⚡', n: 'Blitzrunde', c: '#fff36b', sub: '5 Wahr-oder-Falsch-Fragen. 5 Sekunden. Kein Nachdenken!' },
  pair:  { i: '💘', n: 'Wer würde eher?', c: '#ff2e88', sub: "Tippt beide gleichzeitig. Seid ihr euch einig, gibt's Punkte!" },
  mind:  { i: '🧠', n: 'Gedankenleser', c: '#ff6bd6', sub: 'Zwei Runden: Erst liest der eine die Gedanken des anderen – dann umgekehrt!' },
  bluff: { i: '🃏', n: 'Bluffmeister', c: '#ff9f1c', sub: 'Erfinde eine falsche Antwort, die echt klingt – und finde selbst die Wahrheit!' },
  emoji: { i: '😜', n: 'Emoji-Übersetzer', c: '#ffd60a', sub: 'Stelle deinen Begriff NUR mit Emojis dar – der andere muss raten!' },
  draw:  { i: '✏️', n: 'Kritzel-Kopf', c: '#22d3ff', sub: '15 Sekunden zeichnen – der andere muss raten. Schlecht malen erlaubt!' },
  surprise: { i: '❓', n: 'Überraschung', c: '#ffffff', sub: 'Niemand weiß, was kommt …' },
  comeback: { i: '🔥', n: 'Comeback-Risiko', c: '#ff4d6d' },
  free:  { i: '🤪', n: 'Quatsch-Runde', c: '#a3ff3c', sub: 'Schreibt die lustigste Antwort – der andere bewertet!' },
  est:   { i: '🎯', n: 'Schätz-Duell', c: '#22d3ff', sub: 'Wer näher dran ist, gewinnt. Volltreffer = Extrabonus!' },
  luck:  { i: '🎰', n: 'Glücksrad', c: '#ffd60a', sub: 'Alles kann passieren …' },
};
// Brett: äußerer Ring (Schlüssel sammeln) + 4 Wege nach innen + Tresorraum (Ring) in der Mitte
const COLS = 9, ROWS = 11, KEYS_NEEDED = 3;
const NODES = [], ADJ = [];
(() => {
  const add = (c, r, zone) => { NODES.push({ c, r, zone }); ADJ.push([]); return NODES.length - 1; };
  const link = (a, b) => { ADJ[a].push(b); ADJ[b].push(a); };
  const ring = [];
  for (let r = 10; r >= 0; r--) ring.push(add(0, r, 'ring'));
  for (let c = 1; c <= 8; c++) ring.push(add(c, 0, 'ring'));
  for (let r = 1; r <= 10; r++) ring.push(add(8, r, 'ring'));
  for (let c = 7; c >= 1; c--) ring.push(add(c, 10, 'ring'));
  ring.forEach((n, i) => link(n, ring[(i + 1) % ring.length]));
  const at = (c, r) => NODES.findIndex(n => n.c === c && n.r === r);
  const hub = [[3, 7], [3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [4, 7]].map(([c, r]) => add(c, r, 'hub'));
  hub.forEach((n, i) => link(n, hub[(i + 1) % hub.length]));
  const spoke = (ringPt, a, b, hubPt) => { const x = add(a[0], a[1], 'spoke'), y = add(b[0], b[1], 'spoke'); link(at(...ringPt), x); link(x, y); link(y, at(...hubPt)); };
  spoke([0, 5], [1, 5], [2, 5], [3, 5]);
  spoke([4, 0], [4, 1], [4, 2], [4, 3]);
  spoke([8, 5], [7, 5], [6, 5], [5, 5]);
  spoke([4, 10], [4, 9], [4, 8], [4, 7]);
})();
const N = NODES.length;
const RING = NODES.map((n, i) => n.zone === 'ring' ? i : -1).filter(i => i >= 0);
const HUB = NODES.map((n, i) => n.zone === 'hub' ? i : -1).filter(i => i >= 0);
const SPOKES = NODES.map((n, i) => n.zone === 'spoke' ? i : -1).filter(i => i >= 0);
const gridPos = i => [NODES[i].c + 1, NODES[i].r + 1];
const keyCount = (pl, c) => +pl.keys[c] || 0;
const canEnterVaults = pl => Object.keys(pl.keys).some(c => keyCount(pl, c) >= KEYS_NEEDED && !pl.crowns[c]);
// alle Ziele mit genau n Schritten (ohne direkt umzudrehen); Tresorraum nur mit vollem Schlüsselbund
function walks(from, n, canHub) {
  const res = new Map();
  const dfs = (node, prev, path, allowBack) => {
    if (path.length - 1 === n) { if (!res.has(node)) res.set(node, path.slice()); return; }
    for (const nb of ADJ[node]) {
      if (nb === prev && !allowBack) continue;
      if (!canHub && NODES[nb].zone === 'hub' && NODES[node].zone !== 'hub') continue;
      path.push(nb); dfs(nb, node, path, allowBack); path.pop();
    }
  };
  dfs(from, -1, [from], false);
  if (!res.size) dfs(from, -1, [from], true);
  return res;
}
function shortestPath(a, b) {
  const prev = new Array(N).fill(-1), q = [a], seen = new Set([a]);
  while (q.length) { const x = q.shift(); if (x === b) break; for (const nb of ADJ[x]) if (!seen.has(nb)) { seen.add(nb); prev[nb] = x; q.push(nb); } }
  const path = [b]; while (path[0] !== a) path.unshift(prev[path[0]]); return path;
}
function buildBoard(cats) {
  const k = cats.length, out = new Array(N).fill(null);
  const ringFree = RING.filter(i => i !== 0); out[0] = { t: 'start' };
  const catTotal = Math.min(ringFree.length - 9, 8 * k), per = cats.map((c, i) => Math.floor(catTotal / k) + (i < catTotal % k ? 1 : 0));
  const POOL = ['pair', 'mind', 'est', 'free', 'bluff', 'emoji', 'draw', 'surprise', 'blitz', 'luck'];
  const specs = n => { let a = []; while (a.length < n) a = a.concat(shuffle(POOL)); return a.slice(0, n).map(t => ({ t })); };
  // Ring: Schlüsselfelder + Sonderfelder, gut gemischt
  const ringItems = cats.flatMap((c, i) => Array.from({ length: per[i] }, () => ({ t: 'cat', c }))).concat(specs(ringFree.length - catTotal));
  const same = (a, b) => a && b && a.t === b.t && a.c === b.c;
  let best = null, bestBad = 1e9;
  for (let tr = 0; tr < 80; tr++) {
    const sh = shuffle(ringItems); let bad = 0;
    for (let i = 0; i < sh.length - 1; i++) if (same(sh[i], sh[i + 1])) bad++;
    if (bad < bestBad) { bestBad = bad; best = sh; } if (!bad) break;
  }
  ringFree.forEach((n, i) => out[n] = best[i]);
  // Wege: Sonderfelder
  specs(SPOKES.length).forEach((f, i) => out[SPOKES[i]] = f);
  // Tresorraum: Tresore gleichmäßig verteilt, Rest Sonderfelder
  const hubOrder = shuffle(cats), step = HUB.length / k, used = new Set();
  hubOrder.forEach((c, i) => { let h = Math.floor(i * step) % HUB.length; while (used.has(h)) h = (h + 1) % HUB.length; used.add(h); out[HUB[h]] = { t: 'vault', c }; });
  const hs = specs(HUB.length - k); HUB.forEach(n => { if (!out[n]) out[n] = hs.pop(); });
  return out;
}
const HEADS = ['🦊', '🐼', '🐸', '🦄', '🐯', '🐙', '👽', '🤖', '🐻', '🐵', '🐶', '🐱', '🐷', '🐰', '🐨', '🦁', '🐔', '🐧', '🦉', '🐢',
  '😎', '🤓', '😜', '🥸', '🤠', '😈', '👻', '💀', '🤡', '👑', '🎃', '🌝', '🍑', '🍆', '🌶️', '🍕', '🍩', '🥑', '🦖', '🧠', '👸', '🤴', '🧜‍♀️', '🧛', '🥷', '🧙'];
const COLORS = ['#ff2e88', '#22d3ff', '#a3ff3c', '#ffd60a', '#ff9f1c', '#b06cff', '#ff4d6d', '#1de9b6'];
const ACC = {
  hat: [{ v: '' }, { v: '🧢' }, { v: '🎀' }, { v: '🌸', need: { g: 1 } }, { v: '👒', need: { g: 2 } }, { v: '🎩', need: { w: 1 } }, { v: '⛑️', need: { g: 5 } }, { v: '🎓', need: { w: 3 } }, { v: '🎄', need: { g: 10 } }, { v: '👑', need: { w: 5 } }],
  glasses: [{ v: '' }, { v: '👓' }, { v: '🕶️', need: { w: 1 } }, { v: '🥽', need: { g: 3 } }],
  aura: [{ v: '' }, { v: '💖', need: { g: 3 } }, { v: '✨', need: { w: 2 } }, { v: '🔥', need: { w: 4 } }, { v: '⚡', need: { g: 10 } }, { v: '🌈', need: { w: 7 } }],
};
const unlockState = () => Object.assign({ g: 0, w: 0, done: [] }, store.get('kn_unlock', {}));
const isUnlocked = it => { const u = unlockState(), n = it.need || {}; return u.g >= (n.g || 0) && u.w >= (n.w || 0); };
const needText = n => n.w ? `${n.w} ${n.w === 1 ? 'Sieg' : 'Siege'}` : `${n.g} ${n.g === 1 ? 'Spiel' : 'Spiele'}`;
const ROMANCE = /schatz|kuss|küss|knutsch|kuschel|sexy|nackt|strip|schlafzimmer|\bbett|hochzeit|heirat|löffelchen|verführ|flirt|zweisamkeit|\bdate|romant|massage|dessous|unterwäsche|jahrestag|partner|heizdecke|decke klaut|parfum, das|😏|heißest|ausziehen/i;
function buildPools(rel) {
  const love = rel !== 'friends', ok = x => love || !ROMANCE.test(JSON.stringify(x));
  return {
    who: Q.who.filter(ok).concat(love ? Q.spicy.who : []),
    mind: Q.mind.filter(ok).concat(love ? Q.spicy.mind : []),
    free: Q.free.filter(ok).concat(love ? Q.spicy.free : []),
    talk: Q.talk.concat(love ? Q.talkLove : []),
  };
}
const BOT_BLUFFS = ['Wegen einer alten Tradition aus Bayern', 'Das hat die NASA so entschieden', 'Weil es im Mittelalter Pflicht war', 'Durch einen Unfall in einer Käsefabrik', 'Wegen der Mondphasen', 'Das war ein Marketing-Trick'];
const BOT_TEXTS = ['Beep boop, ich hab keine Ahnung 🤖', 'Ein Toaster mit Gefühlen', 'Error 404: Witz nicht gefunden', 'Socken. Immer Socken.', 'Das sag ich nur meinem Akku', 'Ein Pinguin namens Klaus', 'Mama Robo wäre stolz', 'Strg + Lachen'];
const LUCK = [
  { id: 'plus', l: '+150 Punkte 🎁' }, { id: 'steal', l: 'Klau 100 Punkte 🦹' }, { id: 'swap', l: 'Platztausch 🔄' },
  { id: 'vault', l: 'Teleport in den Tresorraum 🌀' }, { id: 'key', l: 'Gratis-Schlüssel 🔑' }, { id: 'again', l: 'Nochmal würfeln 🎲' },
  { id: 'minus', l: 'Pech! −100 💩' }, { id: 'key2', l: 'Doppel-Schlüssel 🔑🔑' },
];

/* ---------------- Profil & Statistik ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
function loadProfile() {
  let p = store.get('kn_profile', null);
  if (!p || !p.name) p = { name: '', head: HEADS[rand(20)], body: Math.random() < .5 ? 'm' : 'f', color: COLORS[rand(COLORS.length)] };
  if (!p.head) p.head = p.av || '🦊';
  if (!p.body) p.body = 'm';
  delete p.av;
  try { p.pid = localStorage.getItem('kn_pid') || Math.random().toString(36).slice(2); localStorage.setItem('kn_pid', p.pid); } catch (e) { p.pid = Math.random().toString(36).slice(2); }
  return p;
}
const P = loadProfile();
function saveProfile() { store.set('kn_profile', { name: P.name, head: P.head, body: P.body, color: P.color, hat: P.hat || '', glasses: P.glasses || '', aura: P.aura || '' }); }
const STATS0 = { games: 0, wins: 0, losses: 0, draws: 0, points: 0, best: 0, right: 0, ans: 0, crowns: 0, laughs: 0, bruller: 0, cat: {}, vs: {}, recent: [], done: [] };
function loadStats() { return Object.assign({}, STATS0, store.get('kn_stats', {})); }
function recordGame(s, me) {
  if (s.code === 'BOT') return; // Übungsspiele zählen nicht
  const st = loadStats();
  if (st.done.includes(s.gameId)) return;
  const pl = s.players[me], op = s.players[1 - me];
  const res = pl.score > op.score ? 'w' : pl.score < op.score ? 'l' : 'd';
  st.done = st.done.concat(s.gameId).slice(-30);
  st.games++; st[res === 'w' ? 'wins' : res === 'l' ? 'losses' : 'draws']++;
  st.points += pl.score; st.best = Math.max(st.best, pl.score);
  st.right += pl.stats.right; st.ans += pl.stats.ans;
  st.crowns += Object.keys(pl.crowns).length; st.laughs += pl.stats.laughs; st.bruller += pl.stats.bruller || 0;
  for (const [c, v] of Object.entries(pl.stats.cat || {})) { const o = st.cat[c] || [0, 0]; st.cat[c] = [o[0] + v[0], o[1] + v[1]]; }
  const vs = st.vs[op.name] || { w: 0, l: 0, d: 0 }; vs[res]++; st.vs[op.name] = vs;
  st.recent = [{ t: Date.now(), me: pl.score, op: op.score, opn: op.name, oph: op.head, res }].concat(st.recent).slice(0, 5);
  store.set('kn_stats', st);
}

/* ---------------- Figur ---------------- */
function figureHTML(p, cls = '') {
  const fem = p.body === 'f';
  const O = 'stroke="#0b0220" stroke-width="2.6" stroke-linejoin="round"';
  const body = fem
    ? `<rect x="22.5" y="50" width="6" height="18" rx="3" fill="#ffd3b0" ${O}/><rect x="31.5" y="50" width="6" height="18" rx="3" fill="#ffd3b0" ${O}/>
       <ellipse cx="25" cy="69" rx="5.5" ry="3" fill="var(--pc)" ${O}/><ellipse cx="35" cy="69" rx="5.5" ry="3" fill="var(--pc)" ${O}/>
       <rect x="9" y="22" width="6.5" height="22" rx="3.2" fill="#ffd3b0" transform="rotate(14 12 22)" ${O}/><rect x="44.5" y="22" width="6.5" height="22" rx="3.2" fill="#ffd3b0" transform="rotate(-14 48 22)" ${O}/>
       <path d="M20 18 Q30 13 40 18 L42 33 L53 55 Q30 62 7 55 L18 33 Z" fill="var(--pc)" ${O}/>
       <path d="M30 15 Q40 16 40 18 L42 33 L53 55 Q42 59 30 60 Z" fill="rgba(0,0,0,.2)"/>
       <path d="M19 33 Q30 37 41 33" fill="none" stroke="#0b0220" stroke-width="2.4"/>
       <ellipse cx="23" cy="27" rx="3" ry="6" fill="rgba(255,255,255,.35)"/>`
    : `<rect x="19" y="47" width="9.5" height="21" rx="4" fill="#2a2350" ${O}/><rect x="31.5" y="47" width="9.5" height="21" rx="4" fill="#2a2350" ${O}/>
       <ellipse cx="23" cy="69" rx="6.5" ry="3.2" fill="#14102a" ${O}/><ellipse cx="37" cy="69" rx="6.5" ry="3.2" fill="#14102a" ${O}/>
       <rect x="5" y="20" width="9" height="25" rx="4.5" fill="var(--pc)" transform="rotate(10 9 20)" ${O}/><rect x="46" y="20" width="9" height="25" rx="4.5" fill="var(--pc)" transform="rotate(-10 51 20)" ${O}/>
       <circle cx="6.5" cy="45" r="4" fill="#ffd3b0" ${O}/><circle cx="53.5" cy="45" r="4" fill="#ffd3b0" ${O}/>
       <path d="M12 21 Q30 12 48 21 L45 51 Q30 55 15 51 Z" fill="var(--pc)" ${O}/>
       <path d="M30 15 Q40 16 48 21 L45 51 Q38 54 30 54 Z" fill="rgba(0,0,0,.2)"/>
       <ellipse cx="20" cy="29" rx="3.5" ry="8" fill="rgba(255,255,255,.35)"/>`;
  const aura = p.aura ? `<div class="aura">${[0, 1, 2, 3].map(i => `<i style="--a:${i * 90}deg">${esc(p.aura)}</i>`).join('')}</div>` : '';
  return `<div class="fig ${cls}" style="--pc:${p.color}">${aura}<svg class="fbody" viewBox="0 0 60 74">${body}</svg><div class="fhead">${esc(p.head)}${p.glasses ? `<span class="fglasses">${esc(p.glasses)}</span>` : ''}${p.hat ? `<span class="fhat">${esc(p.hat)}</span>` : ''}</div></div>`;
}

/* ---------------- Sound ---------------- */
const Sound = {
  ctx: null, on: store.get('kn_sound', true) !== false,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.nbuf = b; } catch (e) {} },
  tone(f, d = .12, type = 'square', v = .08, when = 0, slide) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + .03);
  },
  noise(d = .1, v = .1, when = 0, hp = 800) {
    if (!this.on || !this.ctx || !this.nbuf) return;
    const t = this.ctx.currentTime + when, src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.nbuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    src.connect(f).connect(g).connect(this.ctx.destination); src.start(t, Math.random() * .5); src.stop(t + d + .02);
  },
  click() { this.tone(660, .05, 'triangle', .06); },
  tick() { this.tone(1200, .03, 'square', .035); },
  countdown(n) { const f = { 3: 660, 2: 784, 1: 988 }[n] || 600; this.tone(f, .12, 'square', .07); this.tone(f * 2, .08, 'sine', .03); },
  sent() { this.tone(280, .09, 'sine', .14, 0, 950); this.noise(.04, .05, 0, 3000); },
  ok() { this.hit(); },
  hit() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .16, 'square', .055, i * .06)); [2093, 2637, 3136].forEach((f, i) => this.tone(f, .25, 'sine', .03, .25 + i * .05)); },
  jackpot() { this.hit(); [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .3, 'triangle', .07, .35 + i * .09)); this.noise(.6, .05, .35, 5000); },
  bad() { this.tone(150, .38, 'sawtooth', .08); this.tone(156, .38, 'square', .045); },
  dice() { for (let i = 0; i < 9; i++) { this.noise(.03, .12, i * .07, 1500); this.tone(180 + rand(400), .025, 'square', .03, i * .07); } },
  hop() { this.tone(420, .08, 'triangle', .05, 0, 900); },
  whoosh() { this.noise(.35, .08, 0, 600); this.tone(200, .3, 'sawtooth', .03, 0, 1400); },
  key() { [1318, 1568, 2093, 2637].forEach((f, i) => this.tone(f, .3, 'sine', .06, i * .08)); this.noise(.5, .03, .1, 6000); },
  drumroll(sec = 2.6) { const n = Math.floor(sec / .045); for (let i = 0; i < n; i++) this.noise(.05, .04 + .1 * i / n, i * .045, 400); this.noise(1.2, .22, sec, 2500); this.tone(110, .5, 'sine', .2, sec); },
  fanfare() { [[392, 494], [523, 659], [659, 784], [784, 988], [659, 784], [784, 988], [1046, 1318]].forEach((ch, i) => ch.forEach(f => this.tone(f, .2 + (i === 6 ? .5 : 0), 'square', .045, i * .12))); },
  win() { this.fanfare(); this.noise(.8, .06, .8, 5000); },
  sad() { [392, 370, 349, 330].forEach((f, i) => this.tone(f, .28, 'triangle', .07, i * .22)); this.tone(110, .8, 'sawtooth', .04, .9, 70); },
};

/* ---------------- Netzwerk ---------------- */
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from({ length: 4 }, () => A[rand(A.length)]).join(''); }

// Verbindung über zwei öffentliche MQTT-Server (WebSocket) parallel – funktioniert in jedem WLAN & Mobilfunknetz.
const BROKERS = PARAMS.get('brokers') ? PARAMS.get('brokers').split(',').filter(Boolean) : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const PEER_PREFIX = 'kopfnuss-duell-v2-';
const NO_PEER = PARAMS.has('nopeer');
const TOPIC = code => 'kopfnuss/v2/' + code;
class Relay {
  constructor(code, role, onMsg, onLink) {
    this.base = TOPIC(code); this.role = role; this.onMsg = onMsg; this.onLink = onLink || (() => {});
    this.inT = this.base + (role === 'host' ? '/h' : '/g'); this.outT = this.base + (role === 'host' ? '/g' : '/h');
    this.sid = Math.random().toString(36).slice(2, 10); this.n = 0; this.seen = new Map(); this.clients = []; this.code = code; this.peerConns = [];
    if (!window.mqtt && !window.Peer) { setTimeout(() => this.onLink('nolib'), 0); return; }
    this.initPeer();
    if (window.mqtt) for (const url of BROKERS) {
      let c;
      try { c = mqtt.connect(url, { clientId: 'kn_' + this.sid + '_' + this.clients.length, clean: true, keepalive: 20, reconnectPeriod: 1500, connectTimeout: 8000, protocolVersion: 4 }); } catch (e) { continue; }
      c.on('connect', () => { c.subscribe([this.inT, this.base + '/a'], { qos: 0 }); this.onLink('up'); });
      c.on('message', (t, buf) => { let m; try { m = JSON.parse(new TextDecoder().decode(buf)); } catch (e) { return; } this.handle(m, t.endsWith('/a')); });
      c.on('error', () => {}); c.on('offline', () => this.onLink('down'));
      this.clients.push(c);
    }
  }
  handle(m, alive) {
    if (!m || m.s === this.sid) return;
    if (m.i) { if (this.seen.has(m.i)) return; this.seen.set(m.i, 1); if (this.seen.size > 600) this.seen.delete(this.seen.keys().next().value); }
    this.onMsg(alive ? { t: 'alive', at: m.at, s: m.s } : m.d, m);
  }
  // Kanal 3: direkte WebRTC-Verbindung über PeerJS (klappt oft im selben WLAN)
  initPeer() {
    if (!window.Peer || NO_PEER) return;
    const id = PEER_PREFIX + this.code;
    const wire = c => {
      c.on('open', () => { this.peerConns = this.peerConns.filter(x => x.open || x === c); if (!this.peerConns.includes(c)) this.peerConns.push(c); this.onLink('up'); });
      c.on('data', d => { let m = d; if (typeof d === 'string') { try { m = JSON.parse(d); } catch (e) { return; } } this.handle(m, false); });
      c.on('close', () => { this.peerConns = this.peerConns.filter(x => x !== c); });
      c.on('error', () => {});
    };
    try {
      if (this.role === 'host') {
        this.peer = new Peer(id, { debug: 0 });
        this.peer.on('connection', wire);
        this.peer.on('open', () => this.onLink('peer-up'));
        this.peer.on('error', e => { if (e && e.type === 'unavailable-id') this.onLink('peer-taken'); });
      } else {
        this.peer = new Peer({ debug: 0 });
        const tryConnect = () => { if (this.dead || this.peerConns.some(c => c.open)) return; try { wire(this.peer.connect(id, { reliable: true, serialization: 'json' })); } catch (e) {} };
        this.peer.on('open', () => { this.onLink('peer-ready'); tryConnect(); this.peerIv = setInterval(tryConnect, 6000); });
        this.peer.on('error', () => {});
      }
      this.peer.on('disconnected', () => setTimeout(() => { try { if (!this.dead && this.peer.disconnected) this.peer.reconnect(); } catch (e) {} }, 2000));
    } catch (e) {}
  }
  connected() { return this.clients.some(c => c.connected) || this.peerConns.some(c => c.open); }
  send(obj) {
    const m = { s: this.sid, i: this.sid + ':' + (++this.n), d: obj }, msg = JSON.stringify(m);
    for (const c of this.clients) if (c.connected) { try { c.publish(this.outT, msg, { qos: 0 }); } catch (e) {} }
    for (const c of this.peerConns) if (c.open) { try { c.send(m); } catch (e) {} }
  }
  setAlive(on) { const msg = on ? JSON.stringify({ s: this.sid, at: Date.now() }) : ''; for (const c of this.clients) if (c.connected) { try { c.publish(this.base + '/a', msg, { qos: 1, retain: true }); } catch (e) {} } }
  destroy() { this.dead = true; clearInterval(this.peerIv); for (const c of this.clients) { try { c.end(true); } catch (e) {} } this.clients = []; try { this.peer && this.peer.destroy(); } catch (e) {} }
}

class HostTransport {
  constructor(code, h) { this.code = code; this.h = h; LOCAL ? this.initLocal() : this.initRelay(); }
  initLocal() {
    this.bc = new BroadcastChannel('kn-' + this.code);
    this.bc.onmessage = e => { const d = e.data; if (d.to === 'host' && d.kind === 'msg') this.h.onMsg(d.msg); };
    setTimeout(() => this.h.onOpen(), 30);
  }
  initRelay() {
    this.opened = false; this.guestSeen = 0; this.guestGone = true;
    this.r = new Relay(this.code, 'host', (d, raw) => {
      if (d && d.t === 'alive') { // ist der Code schon von einem anderen aktiven Spiel belegt?
        if (!this.opened && d.s && d.s !== this.r.sid && d.at && Date.now() - d.at < 6 * 3600e3) { clearTimeout(this.claimT); this.claimT = null; this.destroy(); this.h.onError('unavailable-id'); }
        return;
      }
      this.guestSeen = Date.now();
      if (this.guestGone && d && d.t !== 'hello') this.h.onMsg({ t: 'alive-guest' });
      this.guestGone = false;
      if (d && d.t === 'ping') { this.r.send({ t: 'pong' }); return; }
      this.h.onMsg(d);
    }, st => {
      if (st === 'nolib') { this.h.onError('nolib'); return; }
      if (st === 'peer-taken' && !this.opened) { clearTimeout(this.claimT); this.claimT = null; this.destroy(); this.h.onError('unavailable-id'); return; }
      if (st === 'peer-up') st = 'up';
      if (st === 'up' && !this.opened && !this.claimT) this.claimT = setTimeout(() => { this.claimT = null; if (this.destroyed) return; this.opened = true; this.r.setAlive(true); this.h.onOpen(); }, 900);
      else if (st === 'up' && this.opened) this.r.setAlive(true);
    });
    this.hb = setInterval(() => { if (this.opened) this.r.setAlive(true); }, 60000);
    this.watch = setInterval(() => { if (!this.guestGone && this.guestSeen && Date.now() - this.guestSeen > 12000) { this.guestGone = true; this.h.onLeave(); } }, 3000);
    this.failT = setTimeout(() => { if (!this.opened && !this.destroyed) this.h.onError('network'); }, 15000);
  }
  send(msg) {
    if (LOCAL) { this.bc.postMessage({ to: 'guest', kind: 'msg', msg }); return; }
    this.r && this.r.send(msg);
  }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    clearInterval(this.hb); clearInterval(this.watch); clearTimeout(this.failT); clearTimeout(this.claimT);
    try { this.bc && this.bc.close(); } catch (e) {}
    if (this.r) { try { if (this.opened) this.r.setAlive(false); } catch (e) {} const r = this.r; setTimeout(() => r.destroy(), 300); }
  }
}

class GuestTransport {
  constructor(code, h) { this.code = code; this.h = h; LOCAL ? this.initLocal() : this.initRelay(); }
  initLocal() {
    this.bc = new BroadcastChannel('kn-' + this.code);
    this.bc.onmessage = e => { const d = e.data; if (d.to === 'guest' && d.kind === 'msg') this.h.onMsg(d.msg); };
    setTimeout(() => { this.ever = true; this.h.onOpen(); }, 30);
  }
  initRelay() {
    this.hostAlive = false; this.lastPong = 0; this.linked = false;
    this.r = new Relay(this.code, 'guest', d => {
      if (!d) return;
      if (d.t === 'alive') { if (d.at) this.hostAlive = true; return; }
      this.lastPong = Date.now();
      if (!this.ever) { this.ever = true; }
      if (this.isLost) { this.isLost = false; this.h.onOpen(); }
      if (d.t === 'pong') return;
      this.h.onMsg(d);
    }, st => {
      if (st === 'nolib') { this.h.onError('nolib'); return; }
      if (st === 'peer-ready') { this.linked = true; return; }
      if (st === 'up' && !this.linked) { this.linked = true; this.h.onOpen(); }
      else if (st === 'up' && this.linked && !this.ever) this.h.onOpen();
      if (st === 'up' && this.ever && this.isLost) this.h.onOpen();
    });
    this.hb = setInterval(() => {
      if (!this.r.connected()) return;
      this.r.send({ t: 'ping' });
      if (this.ever && this.lastPong && Date.now() - this.lastPong > 10000 && !this.isLost) { this.isLost = true; this.h.onClose(); }
    }, 3000);
    this.nfT = setTimeout(() => { if (!this.ever && !this.hostAlive && !this.destroyed) this.h.onError(this.linked ? 'notfound' : 'network'); }, 10000);
  }
  lost() { if (!this.isLost && this.ever) { this.isLost = true; this.h.onClose(); } }
  isOpen() { return LOCAL ? true : !!(this.r && this.r.connected() && !this.isLost); }
  send(msg) {
    if (LOCAL) { this.bc.postMessage({ to: 'host', kind: 'msg', msg }); return; }
    this.r && this.r.send(msg);
  }
  destroy() { this.destroyed = true; clearInterval(this.hb); clearTimeout(this.nfT); try { this.bc && this.bc.close(); } catch (e) {} const r = this.r; if (r) setTimeout(() => r.destroy(), 300); }
}

/* ---------------- Host-Spiellogik ---------------- */
const freshStats = () => ({ ans: 0, right: 0, ms: 0, laughs: 0, bruller: 0, cat: {} });
function newPlayer(prof, idx) {
  return { name: (prof.name || (idx ? 'Spieler 2' : 'Spieler 1')).slice(0, 14), head: prof.head || '🙂', body: prof.body === 'f' ? 'f' : 'm', color: prof.color, hat: prof.hat || '', glasses: prof.glasses || '', aura: prof.aura || '', pid: prof.pid, connected: true,
    pos: 0, score: 0, keys: {}, crowns: {}, stats: freshStats() };
}

class HostGame {
  constructor(code) {
    this.code = code; this.sid = 0; this.toastId = 0; this.waiters = []; this.decks = store.get('kn_decks', {});
    this.answers = [null, null]; this.nexts = [false, false]; this.rolled = false; this.choice = null; this.runId = 0;
    const saved = store.get('kn_settings', null);
    const settings = Object.assign({ turns: 10, mode: 'all', custom: CAT_KEYS.slice(), relation: 'love' }, saved || {});
    this.cbCool = [0, 0];
    const cats = resolveCats(settings);
    this.s = { phase: 'lobby', code, players: [newPlayer(P, 0)], settings, cats, fields: buildBoard(cats), turn: 0, turnNo: 0, totalTurns: 20, final: false, lastDice: [3, 5], stage: { id: 0, type: 'lobby' }, toast: null, online: false, gameId: '' };
  }
  attach(transport) { this.t = transport; }
  push() { this.s.rev = (this.s.rev || 0) + 1; const s = JSON.parse(JSON.stringify(this.s)); s.stage.elapsed = Date.now() - (this.stageT0 || Date.now()); this.t && this.t.send({ t: 'state', s }); onState(s); }
  setStage(st) { this.s.stage = Object.assign({}, st, { id: ++this.sid }); this.stageT0 = Date.now(); this.answers = [null, null]; this.nexts = [false, false]; this.rolled = false; this.choice = null; this.cbReq = false; this.push(); if (this.bot) this.botAct(this.s.stage); }
  toast(text) { this.s.toast = { id: ++this.toastId, text }; }
  waitFor(cond, ms) {
    return new Promise(res => {
      const w = { cond, res };
      if (ms) w.timer = setTimeout(() => { this.waiters = this.waiters.filter(x => x !== w); res('timeout'); }, ms);
      this.waiters.push(w); this.check();
    });
  }
  check() { for (const w of this.waiters.slice()) if (w.cond()) { clearTimeout(w.timer); this.waiters = this.waiters.filter(x => x !== w); w.res('ok'); } }
  both(arr) { return () => arr()[0] && (arr()[1] || !this.s.players[1].connected); }
  draw(key, arr) {
    const id = key + ':' + arr.length; // eigener Stapel je Fragenpool – erst wenn alle dran waren, wird neu gemischt
    if (!this.decks[id] || !this.decks[id].length) this.decks[id] = shuffle(arr.map((_, i) => i));
    const v = arr[this.decks[id].pop()];
    store.set('kn_decks', this.decks);
    return v;
  }
  mult() { return this.s.final ? 2 : 1; }
  // ---- Netz
  onMsg(m) {
    if (!m) return;
    if (m.t === 'hello') {
      const pl = this.s.players, prof = m.profile || {};
      if (pl.length < 2) {
        const p = newPlayer(prof, 1);
        if (p.color === pl[0].color) p.color = COLORS.find(c => c !== pl[0].color);
        pl.push(p); this.toast(`${p.name} ist da! 🎉`);
      } else if (pl[1].pid === prof.pid || !pl[1].connected) {
        pl[1].connected = true; pl[1].pid = prof.pid;
        if (this.s.phase === 'lobby') Object.assign(pl[1], { name: (prof.name || pl[1].name).slice(0, 14), head: prof.head || pl[1].head, body: prof.body === 'f' ? 'f' : 'm', hat: prof.hat || '', glasses: prof.glasses || '', aura: prof.aura || '' });
        this.toast(`${pl[1].name} ist wieder da!`);
      } else { this.t.send({ t: 'full' }); return; }
      this.t.send({ t: 'welcome', you: 1 });
      this.push(); this.check();
    } else if (m.t === 'alive-guest') {
      const g = this.s.players[1]; if (g && !g.connected) { g.connected = true; this.toast(`${g.name} ist wieder da!`); this.push(); this.check(); }
    } else if (m.t === 'act') this.onAction(1, m.a || {});
    else if (m.t === 'leave') this.onLeave();
  }
  onLeave() {
    const p = this.s.players[1]; if (!p) return;
    if (this.s.phase === 'lobby') { this.s.players.splice(1, 1); this.toast(`${p.name} hat die Lobby verlassen`); }
    else { p.connected = false; this.toast(`${p.name} hat die Verbindung verloren …`); }
    this.push(); this.check();
  }
  onAction(i, a) {
    const st = this.s.stage;
    switch (a.type) {
      case 'roll': if (st.type === 'roll' && st.p === i) this.rolled = true; break;
      case 'comeback': if (st.type === 'roll' && st.p === i && st.comeback) this.cbReq = true; break;
      case 'choose': if (st.type === 'choose' && st.p === i && this.choice == null && st.opts[a.i]) this.choice = a.i; break;
      case 'answer':
        if (a.sid === st.id && ['q', 'free', 'rate', 'dWrite', 'dGuess'].includes(st.type) && !this.answers[i] && (st.only == null || st.only === i)) {
          this.answers[i] = { v: a.v, ms: Math.max(0, +a.ms || 0) };
          st.answered[i] = true; this.push();
        } break;
      case 'next': if (a.sid === st.id) this.nexts[i] = true; break;
      case 'settings':
        if (i === 0 && this.s.phase === 'lobby') {
          Object.assign(this.s.settings, a.patch || {});
          store.set('kn_settings', this.s.settings);
          this.s.cats = resolveCats(this.s.settings);
          if (this.s.cats.length >= 3) this.s.fields = buildBoard(this.s.cats);
          this.push();
        } break;
      case 'start': if (i === 0 && this.s.phase === 'lobby' && this.s.players.length === 2 && this.s.cats.length >= 3) this.start(); break;
      case 'rematch': if (i === 0 && st.type === 'end') this.start(); break;
    }
    this.check();
  }
  // ---- Ablauf
  start() {
    this.runId++; this.waiters.forEach(w => clearTimeout(w.timer)); this.waiters = [];
    for (const p of this.s.players) Object.assign(p, { pos: 0, score: 0, keys: {}, crowns: {}, stats: freshStats() });
    this.s.cats = resolveCats(this.s.settings);
    this.pools = buildPools(this.s.settings.relation); this.cbCool = [0, 0];
    Object.assign(this.s, { phase: 'game', streak: 0, fields: buildBoard(this.s.cats), turn: rand(2), turnNo: 0, totalTurns: this.s.settings.turns * 2, final: false, gameId: Date.now().toString(36) + rand(1e6) });
    this.run(this.runId).catch(e => console.error(e));
  }
  async run(runId) {
    while (runId === this.runId) {
      const pl = this.s.players;
      if (this.s.turnNo >= this.s.totalTurns || pl.some(p => Object.keys(p.crowns).length === this.s.cats.length)) break;
      const wasFinal = this.s.final;
      this.s.final = this.s.turnNo >= this.s.totalTurns - 2;
      if (this.s.final && !wasFinal) this.toast('🔥 FINALE! Ab jetzt doppelte Punkte!');
      const p = this.s.turn; this.extraTurn = false;
      const opp = pl[1 - p], canCB = opp.score - pl[p].score >= 400 && this.cbCool[p] <= 0;
      if (this.cbCool[p] > 0) this.cbCool[p]--;
      this.setStage({ type: 'roll', p, comeback: canCB, gap: opp.score - pl[p].score });
      await this.waitFor(() => this.rolled || this.cbReq);
      if (runId !== this.runId) return;
      if (this.cbReq) {
        this.cbCool[p] = 3;
        await this.comeback(p);
        if (runId !== this.runId) return;
        this.setStage({ type: 'roll', p });
        await this.waitFor(() => this.rolled);
        if (runId !== this.runId) return;
      }
      const d = [1 + rand(6), 1 + rand(6)]; this.s.lastDice = d;
      const pos = pl[p].pos, opts = [], hubOK = canEnterVaults(pl[p]);
      const addOpt = (steps, tag) => { for (const [to, path] of walks(pos, steps, hubOK)) if (!opts.some(o => o.to === to)) opts.push({ steps, to, path, tag }); };
      addOpt(d[0]); if (d[1] !== d[0]) addOpt(d[1]); else addOpt(d[0] * 2, 'pasch');
      this.setStage({ type: 'choose', p, dice: d, opts });
      await this.waitFor(() => this.choice != null, 45000);
      if (runId !== this.runId) return;
      const o = opts[this.choice ?? 0];
      if (o.tag === 'pasch') this.toast('🎲🎲 Pasch! Doppelt so weit!');
      await this.moveBy(p, o.path);
      await this.resolve(p, pl[p].pos);
      if (runId !== this.runId) return;
      if (!this.extraTurn) { this.s.turnNo++; this.s.turn = 1 - p; }
    }
    if (runId === this.runId) this.setStage({ type: 'end' });
  }
  async moveBy(p, path) {
    const pl = this.s.players[p], from = path[0], to = path[path.length - 1], n = path.length - 1;
    pl.pos = to; // Ziel sofort setzen – der Client animiert entlang "path"
    if (to === 0) { pl.score += 150; this.toast(`🚀 ${pl.name} landet genau auf Start: +150`); }
    else if (path.slice(1, -1).includes(0)) { pl.score += 100; this.toast(`🚀 ${pl.name} passiert den Start: +100`); }
    this.setStage({ type: 'move', p, from, to, steps: n, path });
    await sleep(200 + n * 300 + 450);
  }
  async intro(o, ms) { this.setStage(Object.assign({ type: 'intro' }, o)); await sleep(ms); }
  async resolve(p, idx, forceT) {
    const f = this.s.fields[idx], pl = this.s.players[p], t = forceT || f.t;
    switch (t) {
      case 'surprise': {
        const pool = ['blitz', 'est', 'pair', 'mind', 'free', 'bluff', 'emoji', 'draw', 'luck'], pick = pool[rand(pool.length)];
        this.setStage({ type: 'surprise', p, field: idx, items: pool.map(x => FT[x].i + ' ' + FT[x].n), pick: pool.indexOf(pick) });
        await sleep(3600);
        await this.resolve(p, idx, pick); break;
      }
      case 'mind': {
        const A = pl.name, B = this.s.players[1 - p].name;
        await this.intro({ p, field: idx, ft: 'mind', icon: '🧠', title: 'GEDANKENLESER', sub: `Runde 1: ${A} liest ${B}s Gedanken. Runde 2: umgekehrt!` }, 2600);
        for (let r = 0; r < 2; r++) {
          const subject = r === 0 ? 1 - p : p, m = this.draw('mind', this.pools.mind);
          await this.ask({ kind: 'mind', text: m[0], self: m[1], options: m[2], subject }, { dur: 15, revealMs: 8000, ft: 'mind', title: `Runde ${r + 1}/2` });
        }
        break;
      }
      case 'bluff': case 'emoji': case 'draw': await this.dual(t, p, idx); break;
      case 'start': this.push(); await sleep(900); break;
      case 'cat': {
        await this.keyQuestion(p, f.c, idx);
        break;
      }
      case 'vault': await this.vault(p, f.c, idx); break;
      case 'blitz':
        await this.intro({ p, field: idx, ft: 'blitz', icon: FT.blitz.i, title: 'BLITZRUNDE!', sub: FT.blitz.sub }, 2200);
        for (let n = 1; n <= 5; n++) await this.ask(this.tfQ(), { dur: 5, title: `Blitz ${n}/5`, n, of: 5, revealMs: 2000, ft: 'blitz' });
        break;
      case 'est': {
        const e = this.draw('est', Q.est);
        await this.intro({ p, field: idx, ft: 'est', icon: FT.est.i, title: 'SCHÄTZ-DUELL', sub: FT.est.sub }, 1900);
        await this.ask({ kind: 'est', text: e[0], answer: e[1], unit: e[2] }, { dur: 20, revealMs: 7000, ft: 'est' });
        break;
      }
      case 'pair': {
        const w = this.draw('who', this.pools.who).replace(/^…\s*/, '');
        await this.intro({ p, field: idx, ft: 'pair', icon: '💘', title: 'WER WÜRDE EHER?', sub: FT.pair.sub + (this.s.streak >= 2 ? ` 🔥 Serie läuft: ${this.s.streak}!` : '') }, 2200);
        await this.ask({ kind: 'who', text: 'Wer von euch beiden ' + w, options: [0, 1] }, { dur: 12, revealMs: 8000, ft: 'pair' });
        break;
      }
      case 'free': await this.quatsch(p, idx); break;
      case 'luck': await this.luck(p, idx); break;
    }
  }
  dualItem(mode) {
    if (mode === 'bluff') {
      const r = this.draw('bluff', Q.bluff);
      return { pub: { q: r[0], real: r[1] }, prompt: r[0], opts: fake => { const list = shuffle([{ t: r[1], k: 'real' }, { t: fake || 'Keine Ahnung 🤷', k: 'fake' }, { t: r[2], k: 'd' }, { t: r[3], k: 'd' }]); return { list: list.map(x => x.t), real: list.findIndex(x => x.k === 'real'), fake: list.findIndex(x => x.k === 'fake') }; } };
    }
    if (mode === 'emoji') {
      const r = this.draw('emoji', Q.emoji), dec = shuffle(Q.emoji.filter(x => x[1] === r[1] && x[0] !== r[0])).slice(0, 3).map(x => x[0]);
      return { pub: { term: r[0], type: r[1] }, prompt: r[1], opts: () => { const list = shuffle([r[0]].concat(dec)); return { list, real: list.indexOf(r[0]), fake: -1 }; } };
    }
    const term = this.draw('drawT', Q.draw), dec = shuffle(Q.draw.filter(x => x !== term)).slice(0, 3);
    return { pub: { term }, prompt: '', opts: () => { const list = shuffle([term].concat(dec)); return { list, real: list.indexOf(term), fake: -1 }; } };
  }
  async dual(mode, p, idx) {
    const mult = this.mult();
    await this.intro({ p, field: idx, ft: mode, icon: FT[mode].i, title: FT[mode].n.toUpperCase(), sub: FT[mode].sub }, 2600);
    const items = [this.dualItem(mode), this.dualItem(mode)];
    const wdur = mode === 'draw' ? 15 : mode === 'emoji' ? 35 : 35;
    this.setStage({ type: 'dWrite', mode, items: items.map(it => it.pub), dur: wdur, answered: [false, false], mult });
    await this.waitFor(this.both(() => this.answers), wdur * 1000 + 4000);
    const made = this.answers.map(a => {
      let v = a && a.v ? String(a.v) : '';
      if (mode === 'draw') v = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 400000 ? v : '';
      else v = v.trim().slice(0, mode === 'emoji' ? 40 : 90);
      return v;
    });
    const opts = [0, 1].map(g => items[1 - g].opts(made[1 - g]));
    this.lastRealForBot = opts[1].real;
    this.setStage({ type: 'dGuess', mode, made, opts: opts.map(o => o.list), prompt: [0, 1].map(g => items[1 - g].prompt), dur: 20, answered: [false, false], mult });
    await this.waitFor(this.both(() => this.answers), 21500);
    const picks = this.answers.map(a => a ? a.v : null), pts = [0, 0], pl = this.s.players;
    for (let g = 0; g < 2; g++) {
      const c = 1 - g, o = opts[g];
      if (picks[g] === o.real) { pts[g] += 150 * mult; if (mode !== 'bluff' && made[c]) pts[c] += 100 * mult; }
      else if (mode === 'bluff' && picks[g] === o.fake) pts[c] += 150 * mult;
    }
    pts.forEach((v, i) => pl[i].score += v);
    this.setStage({ type: 'dReveal', mode, items: items.map(it => it.pub), made, opts: opts.map(o => o.list), real: opts.map(o => o.real), fake: opts.map(o => o.fake), picks, pts, mult });
    await this.waitFor(this.both(() => this.nexts), 10000);
  }
  async comeback(p) {
    const pl = this.s.players[p], mult = this.mult();
    await this.intro({ p, ft: 'comeback', icon: '🔥', title: 'COMEBACK-RISIKO!', sub: `${pl.name} setzt alles auf eine Schätzfrage: höchstens 5 % daneben = +${500 * mult}, höchstens 15 % = +${200 * mult}, sonst −150!` }, 3200);
    const e = this.draw('est', Q.est), q = { kind: 'est', text: e[0], answer: e[1], unit: e[2] };
    this.curQ = q;
    const pub = { kind: 'est', text: e[0], unit: e[2] };
    this.setStage({ type: 'q', q: pub, dur: 25, answered: [false, false], only: p, ft: 'comeback', mult });
    await this.waitFor(() => this.answers[p], 26500);
    const a = this.answers[p], v = a && isFinite(+a.v) ? +a.v : null, diff = v == null ? null : Math.abs(v - e[1]), rel = diff == null ? 1 : diff / Math.max(1e-9, Math.abs(e[1]));
    const pts = [0, 0]; let note;
    if (rel <= .05) { pts[p] = 500 * mult; note = '🎯 VOLLTREFFER! Das Comeback lebt!'; }
    else if (rel <= .15) { pts[p] = 200 * mult; note = '🔥 Nah dran – ordentlich Punkte zurückgeholt!'; }
    else { pts[p] = -Math.min(150, pl.score); note = '💥 Daneben – das Risiko hat sich nicht gelohnt …'; }
    pl.score += pts[p];
    const picks = [null, null], diffs = [null, null]; picks[p] = v; diffs[p] = diff;
    this.setStage({ type: 'reveal', q: pub, answer: e[1], picks, ms: [null, null], pts, correct: [pts[0] > 0, pts[1] > 0], note, diffs, only: p, ft: 'comeback', mult });
    await this.waitFor(this.both(() => this.nexts), 7000);
  }
  // ---- Computer-Gegner
  botAct(st) {
    const id = st.id, run = this.runId;
    const later = (ms, fn) => setTimeout(() => { if (this.s.stage.id === id && this.runId === run) fn(); }, ms);
    const act = a => this.onAction(1, a);
    switch (st.type) {
      case 'roll': if (st.p === 1) later(1100 + rand(700), () => act({ type: st.comeback && Math.random() < .5 ? 'comeback' : 'roll' })); break;
      case 'dWrite': later(st.mode === 'draw' ? 9000 : 6000 + rand(8000), () => act({ type: 'answer', sid: id, v: this.botMake(st), ms: 0 })); break;
      case 'dGuess': later(4000 + rand(6000), () => act({ type: 'answer', sid: id, v: Math.random() < .55 ? this.botReal(st) : rand(4), ms: 0 })); break;
      case 'choose': if (st.p === 1) later(2300 + rand(900), () => act({ type: 'choose', i: this.botPick(st) })); break;
      case 'q': if (st.only != null && st.only !== 1) break; { const dur = (st.durs ? st.durs[1] : st.dur) * 1000, ms = Math.min(dur - 400, 1300 + Math.random() * dur * .65); later(ms, () => act({ type: 'answer', sid: id, v: this.botAnswer(st), ms: Math.round(ms) })); break; }
      case 'free': later(5000 + rand(7000), () => act({ type: 'answer', sid: id, v: BOT_TEXTS[rand(BOT_TEXTS.length)], ms: 0 })); break;
      case 'rate': later(2000 + rand(3000), () => act({ type: 'answer', sid: id, v: Math.random() < .5 ? 2 : 1, ms: 0 })); break;
      case 'reveal': case 'rated': case 'vaultResult': case 'dReveal': later(1200, () => act({ type: 'next', sid: id })); break;
    }
  }
  botMake(st) {
    if (st.mode === 'bluff') return BOT_BLUFFS[rand(BOT_BLUFFS.length)];
    if (st.mode === 'emoji') return shuffle(['🤖', '🎬', '❓', '🔥', '💥', '🧠', '👀', '🎉', '🍕', '🐶']).slice(0, 3).join('');
    try {
      const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 240, 240); x.strokeStyle = '#222'; x.lineWidth = 5; x.lineCap = 'round';
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(40 + rand(160), 40 + rand(160)); for (let j = 0; j < 6; j++) x.lineTo(30 + rand(180), 30 + rand(180)); x.stroke(); }
      x.font = '40px serif'; x.fillText('🤖', 10, 50);
      return c.toDataURL('image/jpeg', .6);
    } catch (e) { return ''; }
  }
  botReal() { return this.lastRealForBot ?? rand(4); }
  botAnswer(st) {
    const q = this.curQ;
    if (q.kind === 'mc' || q.kind === 'tf') {
      if (Math.random() < (q.kind === 'tf' ? .7 : .6)) return q.answer;
      const wrong = q.options.map((_, i) => i).filter(i => i !== q.answer); return wrong[rand(wrong.length)];
    }
    if (q.kind === 'est') { const v = q.answer * (.65 + Math.random() * .7); return Math.abs(q.answer) < 20 ? Math.round(v * 10) / 10 : Math.round(v); }
    if (q.kind === 'who') return rand(2);
    if (q.kind === 'mind' && q.subject === 0 && Math.random() < .35) return this.answers[0] ? this.answers[0].v : rand(q.options.length);
    return rand(q.options.length);
  }
  botPick(st) {
    const me = this.s.players[1];
    const val = o => {
      const f = this.s.fields[o.to];
      if (f.t === 'vault') return me.crowns[f.c] ? 2 : keyCount(me, f.c) >= KEYS_NEEDED ? 14 : 2;
      if (f.t === 'cat') return keyCount(me, f.c) >= KEYS_NEEDED || me.crowns[f.c] ? 3 : 6 + keyCount(me, f.c);
      return f.t === 'start' ? 2 : 4;
    };
    let best = 0, bv = -1;
    st.opts.forEach((o, i) => { const v = val(o) + Math.random() * 2.5; if (v > bv) { bv = v; best = i; } });
    return best;
  }
  mcQ(cat) { const r = this.draw('mc_' + cat, Q.mc[cat]); const opts = shuffle(r.slice(1)); return { kind: 'mc', text: r[0], options: opts, answer: opts.indexOf(r[1]), cat }; }
  tfQ() { const r = this.draw('tf', Q.tf); return { kind: 'tf', text: r[0], options: ['Wahr', 'Falsch'], answer: r[1] ? 0 : 1 }; }
  async ask(q, o = {}) {
    const dur = o.dur || 15, mult = this.mult();
    const pub = { kind: q.kind, text: q.text, self: q.self, options: q.options, unit: q.unit, subject: q.subject };
    const durs = [dur, dur], pl = this.s.players, gap = pl[0].score - pl[1].score;
    if (['mc', 'tf', 'est'].includes(q.kind) && Math.abs(gap) >= 300) durs[gap > 0 ? 0 : 1] = Math.max(3, Math.round(dur * .7));
    const base = { cat: q.cat || null, ft: o.ft || null, title: o.title || null, n: o.n || null, of: o.of || null, mover: o.mover ?? null, mult, vault: o.vault || null, keyFor: o.keyFor ?? null, keyNo: o.keyNo ?? null, durs };
    this.curQ = q;
    this.setStage(Object.assign({ type: 'q', q: pub, dur, answered: [false, false] }, base));
    await this.waitFor(this.both(() => this.answers), dur * 1000 + 1500);
    const A = this.answers.slice();
    const res = this.score(q, A, durs, mult);
    const talk = (q.kind === 'who' || q.kind === 'mind') ? this.pools.talk[rand(this.pools.talk.length)] : null;
    this.setStage(Object.assign({ type: 'reveal', q: pub, answer: q.answer, picks: A.map(a => a ? a.v : null), ms: A.map(a => a ? a.ms : null), pts: res.pts, correct: res.correct, note: res.note, diffs: res.diffs || null, streak: res.streak || 0, talk }, base));
    await this.waitFor(this.both(() => this.nexts), o.revealMs || 6000);
    return res;
  }
  score(q, A, durs, mult) {
    const pl = this.s.players, pts = [0, 0], correct = [false, false];
    let note = '', diffs = null, streak = 0;
    if (q.kind === 'mc' || q.kind === 'tf') {
      A.forEach((a, i) => {
        const st = pl[i].stats; st.ans++;
        if (q.cat) { const c = st.cat[q.cat] || [0, 0]; c[1]++; st.cat[q.cat] = c; }
        if (a && a.v === q.answer) {
          correct[i] = true; st.right++; st.ms += a.ms;
          if (q.cat) st.cat[q.cat][0]++;
          pts[i] = Math.round((100 + 100 * Math.max(0, 1 - a.ms / (durs[i] * 1000))) * mult);
        }
      });
      if (correct[0] && correct[1]) note = A[0].ms < A[1].ms ? `⚡ ${pl[0].name} war schneller!` : `⚡ ${pl[1].name} war schneller!`;
      else if (!correct[0] && !correct[1]) note = 'Beide daneben 🙈';
    } else if (q.kind === 'est') {
      diffs = A.map(a => (a && a.v !== '' && a.v != null && isFinite(+a.v)) ? Math.abs(+a.v - q.answer) : null);
      const valid = diffs.filter(d => d !== null);
      if (valid.length) {
        const best = Math.min(...valid);
        diffs.forEach((d, i) => {
          if (d === best) { correct[i] = true; pts[i] = 200 * mult; if (d <= Math.abs(q.answer) * .01) { pts[i] += 100 * mult; note = '🎯 VOLLTREFFER! +100 Bonus'; } }
        });
        if (!note) note = correct[0] && correct[1] ? 'Gleich nah dran – Punkte für beide!' : `🎯 ${pl[correct[0] ? 0 : 1].name} war näher dran!`;
      } else note = 'Keiner hat geschätzt 😴';
    } else if (q.kind === 'who' || q.kind === 'mind') {
      const match = A[0] && A[1] && A[0].v === A[1].v;
      if (match) {
        correct[0] = correct[1] = true;
        if (q.kind === 'who') { pts[0] = pts[1] = 100 * mult; note = 'Einig! 💞 Punkte für beide'; }
        else { pts[1 - q.subject] = 150 * mult; pts[q.subject] = 50 * mult; note = `🧠 Gedanken gelesen! ${pl[1 - q.subject].name} kennt ${pl[q.subject].name} genau.`; }
        streak = this.s.streak = (this.s.streak || 0) + 1;
        if (streak >= 3) { pts[0] += 100 * mult; pts[1] += 100 * mult; note += ` 🔥 ${streak}er-Serie: +${100 * mult} Bonus für beide!`; }
      } else {
        this.s.streak = 0;
        note = q.kind === 'who' ? 'Uneinig! 🙈 Das müsst ihr ausdiskutieren …' : `Daneben! 🙈 ${pl[1 - q.subject].name} lag falsch …`;
      }
    }
    pts.forEach((p, i) => { pl[i].score += p; });
    return { pts, correct, note, diffs, streak };
  }
  async keyQuestion(p, cat, idx, intro) {
    const pl = this.s.players[p], k = keyCount(pl, cat), full = k >= KEYS_NEEDED || pl.crowns[cat];
    await this.intro({ p, field: idx, cat, icon: full ? CATS[cat].i : '🔑', title: full ? CATS[cat].n : 'SCHLÜSSEL-FRAGE', sub: intro || (full ? (pl.crowns[cat] ? 'Tresor schon geknackt – Punkte-Duell!' : 'Schlüsselbund ist voll – ab in den Tresorraum! Jetzt: Punkte-Duell.') : `${CATS[cat].i} ${CATS[cat].n}: Richtig = Schlüssel ${k + 1}/${KEYS_NEEDED} für ${pl.name}!`) }, 2100);
    const r = await this.ask(this.mcQ(cat), { dur: 15, mover: p, keyFor: full ? null : p, keyNo: full ? null : k + 1 });
    if (r.correct[p] && !full) this.giveKey(p, cat), await sleep(2400);
  }
  giveKey(p, cat) {
    const pl = this.s.players[p], n = Math.min(KEYS_NEEDED, keyCount(pl, cat) + 1);
    pl.keys[cat] = n;
    this.setStage({ type: 'keyGot', p, cat, n });
  }
  async vault(p, cat, idx) {
    const pl = this.s.players[p];
    if (pl.crowns[cat]) {
      await this.intro({ p, field: idx, cat, icon: '👑', title: 'SCHON GEKNACKT', sub: `Dieser Tresor gehört ${pl.name} schon. Bonusfrage!` }, 2000);
      await this.ask(this.mcQ(cat), { dur: 15, mover: p, title: 'Bonusfrage' });
      return;
    }
    const k = keyCount(pl, cat);
    if (k < KEYS_NEEDED) { await this.keyQuestion(p, cat, idx, `🔒 Verschlossen! ${pl.name} fehlen noch ${KEYS_NEEDED - k} Schlüssel für diesen Tresor. Trostpreis: eine Schlüssel-Frage!`); return; }
    const hasKey = true, need = 2;
    await this.intro({ p, field: idx, cat, vaultIntro: true, hasKey, icon: CATS[cat].i, title: 'TRESOR!', sub: `${pl.name} steckt alle ${KEYS_NEEDED} 🔑 ins Schloss von „${CATS[cat].n}“. 2 von 3 Fragen richtig = Krone!` }, 3400);
    let got = 0; const marks = [];
    for (let n = 1; n <= 3; n++) {
      const r = await this.ask(this.mcQ(cat), { dur: 14, mover: p, title: `Tresor ${n}/3`, n, of: 3, vault: { need, marks: marks.slice(), p }, revealMs: 4500 });
      marks.push(r.correct[p] ? 1 : 0); if (r.correct[p]) got++;
      if (got >= need || (3 - n) < (need - got)) break;
    }
    const success = got >= need, bonus = 300 * this.mult();
    if (success) { pl.crowns[cat] = true; delete pl.keys[cat]; pl.score += bonus; }
    this.setStage({ type: 'vaultResult', p, cat, success, got, need, marks, bonus });
    await this.waitFor(this.both(() => this.nexts), 5000);
  }
  async quatsch(p, idx) {
    const prompt = this.draw('free', this.pools.free), mult = this.mult();
    await this.intro({ p, field: idx, ft: 'free', icon: '🤪', title: 'QUATSCH-RUNDE', sub: FT.free.sub }, 2200);
    this.setStage({ type: 'free', text: prompt, dur: 30, answered: [false, false], mult });
    await this.waitFor(this.both(() => this.answers), 31500);
    const texts = this.answers.map(a => a && a.v ? String(a.v).trim().slice(0, 90) : '');
    this.setStage({ type: 'rate', text: prompt, texts, dur: 20, answered: [false, false], mult });
    await this.waitFor(this.both(() => this.answers), 21500);
    const rates = this.answers.map(a => a ? a.v : null);
    const pl = this.s.players, pts = [0, 0], VAL = [0, 75, 150];
    for (let i = 0; i < 2; i++) {
      const j = 1 - i;
      if (texts[j] && rates[i] != null) { pts[j] = (VAL[rates[i]] || 0) * mult; pl[j].stats.laughs += pts[j]; if (rates[i] === 2) pl[j].stats.bruller++; }
    }
    pts.forEach((v, i) => pl[i].score += v);
    this.setStage({ type: 'rated', text: prompt, texts, rates, pts, mult });
    await this.waitFor(this.both(() => this.nexts), 8000);
  }
  async luck(p, idx) {
    const pl = this.s.players, me = pl[p], other = pl[1 - p], mult = this.mult();
    const pick = rand(LUCK.length), ev = LUCK[pick].id;
    this.setStage({ type: 'luck', p, field: idx, items: LUCK.map(l => l.l), pick });
    await sleep(3800);
    switch (ev) {
      case 'plus': me.score += 150 * mult; this.toast(`🎁 ${me.name} +${150 * mult}`); break;
      case 'steal': { const a = Math.min(100, other.score); other.score -= a; me.score += a; this.toast(`🦹 ${me.name} klaut ${a} Punkte!`); break; }
      case 'swap': [me.pos, other.pos] = [other.pos, me.pos]; this.toast('🔄 Platztausch!'); break;
      case 'minus': me.score = Math.max(0, me.score - 100); this.toast(`💩 ${me.name} −100`); break;
      case 'again': this.extraTurn = true; this.toast(`🎲 ${me.name} darf nochmal!`); break;
      case 'key': case 'key2': {
        const open = () => this.s.cats.filter(c => keyCount(me, c) < KEYS_NEEDED && !me.crowns[c]);
        for (let n = 0; n < (ev === 'key2' ? 2 : 1); n++) {
          const free = open();
          if (free.length) { this.giveKey(p, free[rand(free.length)]); await sleep(2400); }
          else { me.score += 150 * mult; this.toast(`🎁 Alle Schlüssel schon da – +${150 * mult}`); }
        }
        break;
      }
      case 'vault': {
        const ready = this.s.cats.filter(c => keyCount(me, c) >= KEYS_NEEDED && !me.crowns[c]);
        if (!ready.length) { this.toast('🌀 Noch kein voller Schlüsselbund – dafür gibt\'s einen Schlüssel!'); this.push(); await sleep(900); const free = this.s.cats.filter(c => keyCount(me, c) < KEYS_NEEDED && !me.crowns[c]); if (free.length) { this.giveKey(p, free[rand(free.length)]); await sleep(2400); } break; }
        const target = this.s.fields.findIndex(f => f && f.t === 'vault' && f.c === ready[rand(ready.length)]);
        this.push(); await sleep(400);
        await this.moveBy(p, shortestPath(me.pos, target));
        await this.resolve(p, me.pos); return;
      }
    }
    this.push(); await sleep(1300);
  }
}

/* ---------------- Client-Zustand ---------------- */
const C = { me: 0, s: null, stageId: null, t0: 0, isHost: false, host: null, net: null, toastId: 0, raf: 0, anim: {}, diceSpin: 0, myAns: null, screen: '', boardSig: '' };
const app = $('#app');

function act(a) {
  if (C.isHost) C.host && C.host.onAction(0, a);
  else if (C.net) C.net.send({ t: 'act', a });
}
function toast(text) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200);
}
function banner(text) {
  let b = $('#banner');
  if (!text) { b && b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'banner'; b.className = 'banner'; document.body.appendChild(b); }
  b.textContent = text;
}
let wakeLock = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch (e) {} }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (C.screen === 'game' || C.screen === 'lobby') keepAwake();
    if (!C.isHost && C.net && !LOCAL && !C.net.isOpen() && C.net.ever) C.net.lost();
  }
});

function leaveGame() {
  try { if (!C.isHost && C.net) C.net.send({ t: 'leave' }); } catch (e) {}
  try { C.net && C.net.destroy(); } catch (e) {}
  if (C.host) C.host.runId++;
  Object.assign(C, { net: null, host: null, isHost: false, s: null, stageId: null, boardSig: '' });
  closeSheet(); banner(''); cancelAnimationFrame(C.raf);
  const fin = $('#finale'); if (fin) fin.remove();
  showHome();
}

/* ---------------- Screens ---------------- */
function setScreen(name, html) { C.screen = name; app.innerHTML = `<section class="screen ${name}">${html}</section>`; return app.firstElementChild; }
const logoHTML = (cls = '') => `<div class="logo ${cls}">${'KOPFNUSS'.split('').map((l, i) => `<span style="animation-delay:${i * 60}ms">${l}</span>`).join('')}</div>`;

function showSplash() {
  const el = setScreen('splash', `<div class="rays"></div><div class="nut">🧠</div>${logoHTML()}<div><span class="tagline">Das Quiz-Duell zu zweit</span></div><div class="spacer" style="flex:0 0 30px"></div><div class="tap">👆 Tippen zum Starten</div>`);
  el.addEventListener('click', () => { Sound.init(); Sound.whoosh(); const code = (PARAMS.get('join') || '').toUpperCase(); code && P.name ? showJoin(code) : showHome(); }, { once: true });
}

function statsHTML() {
  const st = loadStats();
  if (!st.games) return `<div class="card col center"><div class="label">📊 Deine Bilanz</div><div style="font-size:40px">🏁</div><div style="font-weight:800">Noch keine Spiele – leg los!</div><div class="muted" style="font-size:13px;font-weight:700">Hier erscheinen danach Siege, Trefferquote, Lieblingskategorie & mehr.</div></div>`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const cats = Object.entries(st.cat).filter(([c, v]) => CATS[c] && v[1] >= 3).map(([c, v]) => [c, pct(v[0], v[1]), v[1]]).sort((a, b) => b[1] - a[1]);
  const tile = (i, v, l) => `<div class="stile"><b>${i}</b><span>${v}</span><small>${l}</small></div>`;
  const vs = Object.entries(st.vs).sort((a, b) => (b[1].w + b[1].l + b[1].d) - (a[1].w + a[1].l + a[1].d)).slice(0, 3);
  const RES = { w: ['🏆', 'Sieg'], l: ['😤', 'Niederlage'], d: ['🤝', 'Remis'] };
  return `<div class="card col">
    <div class="label">📊 Deine Bilanz</div>
    <div class="stiles">${tile('🎮', st.games, 'Spiele')}${tile('🏆', st.wins, `Siege · ${pct(st.wins, st.games)} %`)}${tile('🎯', pct(st.right, st.ans) + ' %', 'Trefferquote')}
      ${tile('⭐', st.best, 'Rekord')}${tile('👑', st.crowns, 'Kronen')}${tile('😂', st.bruller, 'Brüller')}</div>
    ${cats.length ? `<div class="srow"><span>💪 Stärkste Kategorie</span><b>${CATS[cats[0][0]].i} ${CATS[cats[0][0]].s} · ${cats[0][1]} %</b></div>` : ''}
    ${cats.length > 1 ? `<div class="srow"><span>🙈 Ausbaufähig</span><b>${CATS[cats[cats.length - 1][0]].i} ${CATS[cats[cats.length - 1][0]].s} · ${cats[cats.length - 1][1]} %</b></div>` : ''}
    ${cats.length ? `<div class="catbars">${cats.map(([c, p]) => `<div class="cbar" title="${esc(CATS[c].n)}"><i style="height:${Math.max(6, p)}%;background:${CATS[c].c}"></i><span>${CATS[c].i}</span></div>`).join('')}</div>` : ''}
    ${vs.map(([n, v]) => `<div class="srow"><span>⚔️ gegen ${esc(n)}</span><b>${v.w} : ${v.l}${v.d ? ` · ${v.d} Remis` : ''}</b></div>`).join('')}
    ${st.recent.length ? `<div class="label" style="margin-top:4px">Letzte Spiele</div>${st.recent.map(r => `<div class="srow"><span>${RES[r.res][0]} vs ${esc(r.oph || '')} ${esc(r.opn)}</span><b>${r.me} : ${r.op}</b></div>`).join('')}` : ''}
  </div>`;
}

function showHome() {
  const el = setScreen('home', `
    <div class="topbar"><button class="iconbtn" id="snd">${Sound.on ? '🔊' : '🔇'}</button><div class="spacer"></div><button class="iconbtn" id="rules">❓</button></div>
    ${logoHTML('small')}
    <div class="center" style="margin:6px 0 14px"><span class="tagline">Wer ist schneller im Kopf?</span></div>
    <div class="card me-card">
      <div class="stage-mini">${figureHTML(P, 'idle')}</div>
      <div class="col" style="flex:1;gap:8px;min-width:0">
        <div class="label">Das bist du</div>
        <div class="display" style="font-size:22px;word-break:break-word">${P.name ? esc(P.name) : '???'}</div>
        <button class="btn small lime" id="edit">✏️ Figur basteln</button>
      </div>
    </div>
    <div class="col" style="margin:14px 0">
      <button class="btn" id="host">🎮 Spiel erstellen</button>
      <button class="btn cyan" id="join">🔑 Mit Code beitreten</button>
      <button class="btn ghost" id="bot">🤖 Übungsspiel gegen den Computer</button>
    </div>
    ${statsHTML()}
    <div style="height:10px;flex:none"></div>`);
  $('#snd', el).onclick = e => { Sound.on = !Sound.on; store.set('kn_sound', Sound.on); e.currentTarget.textContent = Sound.on ? '🔊' : '🔇'; Sound.click(); };
  $('#rules', el).onclick = showRules;
  $('#edit', el).onclick = () => { Sound.click(); showCreator(); };
  const need = () => { if (!P.name) { showCreator(true); return false; } return true; };
  $('#host', el).onclick = () => { Sound.click(); if (need()) startHost(); };
  $('#join', el).onclick = () => { Sound.click(); if (need()) showJoin(''); };
  $('#bot', el).onclick = () => { Sound.click(); if (need()) startBot(); };
}

function showCreator(nameMissing) {
  const el = setScreen('creator', `
    <div class="topbar"><button class="iconbtn" id="back">←</button><div class="spacer"></div><span class="label">Figur basteln</span><div class="spacer"></div><span style="width:44px"></span></div>
    <div class="podium-prev"><div class="spot"></div><div id="prev">${figureHTML(P, 'idle big')}</div></div>
    <div class="card col">
      <div class="label">Name</div>
      <input class="input" id="name" maxlength="14" placeholder="z. B. Schatzi" value="${esc(P.name)}" autocomplete="off">
      <div class="label">Körper</div>
      <div class="seg two"><button data-b="m" class="${P.body === 'm' ? 'sel' : ''}">🕺 Mann</button><button data-b="f" class="${P.body === 'f' ? 'sel' : ''}">💃 Frau</button></div>
      <div class="label">Kopf – such dir ein Emoji aus</div>
      <div class="heads">${HEADS.map(h => `<button class="av ${h === P.head ? 'sel' : ''}" data-h="${h}">${h}</button>`).join('')}</div>
      <div class="row"><input class="input" id="own" maxlength="8" placeholder="… oder eigenes Emoji tippen 😏" style="font-size:16px"><button class="btn small" id="ownok">OK</button></div>
      <div class="label">Farbe</div>
      <div class="colors">${COLORS.map(c => `<button class="color ${c === P.color ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
      ${[['hat', '🎩 Hüte'], ['glasses', '👓 Brillen'], ['aura', '✨ Effekte']].map(([k, l]) => `<div class="label">${l} <span class="muted" style="letter-spacing:0">– durch Spiele & Siege freischalten</span></div>
      <div class="accs">${ACC[k].map(it => { const ok = isUnlocked(it); return `<button class="acc ${(P[k] || '') === it.v ? 'sel' : ''} ${ok ? '' : 'locked'}" data-k="${k}" data-v="${it.v}" ${ok ? '' : 'disabled'}>${it.v || '🚫'}${ok ? '' : `<small>🔒 ${needText(it.need)}</small>`}</button>`; }).join('')}</div>`).join('')}
    </div>
    <button class="btn pink" id="done" style="margin:14px 0 6px">Fertig ✓</button>`);
  const prev = $('#prev', el), name = $('#name', el);
  const redraw = () => { prev.innerHTML = figureHTML(P, 'idle big'); };
  if (nameMissing) setTimeout(() => { name.focus(); name.style.boxShadow = '0 0 0 4px var(--pink)'; }, 300);
  name.addEventListener('input', () => { P.name = name.value.trim(); saveProfile(); });
  $$('[data-b]', el).forEach(b => b.onclick = () => { Sound.click(); P.body = b.dataset.b; saveProfile(); $$('[data-b]', el).forEach(x => x.classList.toggle('sel', x === b)); redraw(); });
  const setHead = h => { P.head = h; saveProfile(); $$('.heads .av', el).forEach(x => x.classList.toggle('sel', x.dataset.h === h)); redraw(); };
  $$('.heads .av', el).forEach(b => b.onclick = () => { Sound.click(); setHead(b.dataset.h); });
  const own = $('#own', el);
  const takeOwn = () => {
    const v = own.value.trim(); if (!v) return;
    let g = v;
    try { if (window.Intl && Intl.Segmenter) g = [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(v)][0].segment; else g = [...v][0]; } catch (e) { g = [...v][0]; }
    Sound.click(); setHead(g); own.value = '';
  };
  $('#ownok', el).onclick = takeOwn; own.addEventListener('keydown', e => { if (e.key === 'Enter') takeOwn(); });
  $$('.color', el).forEach(b => b.onclick = () => { Sound.click(); P.color = b.dataset.c; saveProfile(); $$('.color', el).forEach(x => x.classList.toggle('sel', x === b)); redraw(); });
  $$('.acc', el).forEach(b => b.onclick = () => { Sound.click(); const k = b.dataset.k; P[k] = b.dataset.v; saveProfile(); $$(`.acc[data-k="${k}"]`, el).forEach(x => x.classList.toggle('sel', x === b)); redraw(); });
  const done = () => { if (!P.name) { name.focus(); name.style.boxShadow = '0 0 0 4px var(--pink)'; vibrate(80); return; } Sound.ok(); showHome(); };
  $('#done', el).onclick = done; $('#back', el).onclick = () => { Sound.click(); showHome(); };
}

function showRules() {
  openSheet(`<div class="rules">
    <div class="qhead"><span class="pill" style="--cc:var(--yellow)">❓ So geht's</span><div class="spacer"></div><button class="iconbtn" id="closeR">✕</button></div>
    <h3>🗺️ Das Brett</h3><p>Außen läuft ein großer Ring, über vier Wege geht's nach innen in den <b>Tresorraum</b>. Du würfelst mit <b>zwei Würfeln</b>, wählst einen davon und läufst genau so viele Felder – an Kreuzungen entscheidest du die Richtung. Alle möglichen Ziele leuchten auf.</p>
    <h3>🔑 Schlüssel sammeln</h3><p>Auf den Kategorie-Feldern im Ring gibt's <b>Schlüssel-Fragen</b>: richtig = 1 Schlüssel dieser Kategorie. Pro Kategorie brauchst du <b>${KEYS_NEEDED} Schlüssel</b>.</p>
    <h3>🏛️ Tresorraum</h3><p>Erst mit einem vollen Schlüsselbund (${KEYS_NEEDED}🔑) einer Kategorie darfst du in den Tresorraum. Dort knackst du den passenden Tresor: <b>2 von 3</b> Fragen richtig = 👑 Krone + 300 Punkte.</p>
    <h3>⚔️ Immer im Duell</h3><p>Bei jeder Frage antwortet ihr <b>beide gleichzeitig</b>. Richtig & schnell = bis zu 200 Punkte.</p>
    <h3>🎉 Sonderfelder</h3><p><b>⚡ Blitzrunde</b> (Wahr/Falsch) · <b>🎯 Schätz-Duell</b> · <b>💘 Wer würde eher?</b> · <b>🧠 Gedankenleser</b> (erst liest der eine die Gedanken des anderen, dann umgekehrt) · <b>🃏 Bluffmeister</b> (erfinde eine falsche Antwort und finde die echte) · <b>😜 Emoji-Übersetzer</b> · <b>✏️ Kritzel-Kopf</b> · <b>🤪 Quatsch-Runde</b> · <b>🎰 Glücksrad</b> · <b>❓ Überraschung</b>.</p>
    <h3>🔥 Serie, Handicap & Comeback</h3><p>3 Übereinstimmungen in Folge bei Pärchen-/Freundes-Fragen bringen Bonuspunkte. Wer deutlich führt, hat bei Wissensfragen weniger Zeit. Wer 400+ Punkte hinten liegt, kann eine <b>Comeback-Risikorunde</b> wagen.</p>
    <h3>🏆 Sieg</h3><p>Nach der gewählten Anzahl Züge gewinnt, wer die meisten Punkte hat. Die letzte Runde zählt doppelt! Wer alle Kronen holt, gewinnt sofort.</p>
    <button class="btn" id="okR" style="margin-top:16px">Alles klar!</button></div>`, '#ffd60a');
  $('#closeR').onclick = $('#okR').onclick = () => { Sound.click(); closeSheet(); };
}

/* ---------- Host / Beitreten ---------- */
function startBot() {
  C.isHost = true; C.me = 0;
  const g = new HostGame('BOT'); C.host = g;
  g.bot = true;
  g.attach({ send() {}, destroy() {} });
  const bot = newPlayer({ name: 'Robo', head: '🤖', body: Math.random() < .5 ? 'm' : 'f', color: P.color === '#22d3ff' ? '#ff9f1c' : '#22d3ff', pid: 'bot' }, 1);
  g.s.players.push(bot); g.s.online = true;
  C.net = null;
  g.push();
}
function startHost(code) {
  code = code || genCode();
  C.isHost = true; C.me = 0;
  const g = new HostGame(code); C.host = g;
  const t = new HostTransport(code, {
    onOpen: () => { g.s.online = true; g.push(); },
    onError: type => {
      if (type === 'unavailable-id') { t.destroy(); C.host = null; startHost(); return; }
      if (type === 'nolib') { errorScreen('Die Verbindungs-Bibliothek konnte nicht geladen werden. Bist du online?'); return; }
      if (type === 'network') { if (!g.s.online) { t.destroy(); errorScreen('Keine Verbindung zum Spiele-Server. Bist du online (WLAN oder mobile Daten)? Probier es gleich nochmal.'); } return; }
      console.warn('Peer-Fehler', type);
    },
    onMsg: m => g.onMsg(m),
    onLeave: () => g.onLeave(),
  });
  g.attach(t); C.net = t;
  g.push();
}

function showJoin(prefill) {
  if (!P.name) { showCreator(true); return; }
  const el = setScreen('join', `
    <div class="topbar"><button class="iconbtn" id="back">←</button><div class="spacer"></div></div>
    <div class="spacer"></div>
    <div class="center" style="font-size:64px">🔑</div>
    <h2 class="display center" style="font-size:28px;margin:8px 0 4px">Code eingeben</h2>
    <p class="center muted" style="margin:0 0 18px;font-weight:700">Den 4-stelligen Code zeigt dir das Handy des Hosts.</p>
    <input class="input code-input" id="code" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(prefill)}" placeholder="····">
    <p class="center" id="jmsg" style="min-height:24px;font-weight:800;color:var(--yellow)"></p>
    <button class="btn cyan" id="go">Verbinden ⚡</button>
    <div class="spacer"></div>`);
  const inp = $('#code', el), go = $('#go', el), msg = $('#jmsg', el);
  inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
  setTimeout(() => inp.focus(), 300);
  $('#back', el).onclick = () => { Sound.click(); showHome(); };
  const doJoin = () => {
    const code = inp.value.trim().toUpperCase();
    if (code.length !== 4) { msg.textContent = 'Der Code hat 4 Zeichen.'; vibrate(80); return; }
    Sound.click(); go.disabled = true; msg.innerHTML = '<span class="waiting-dots">Verbinde</span>';
    joinGame(code, err => { go.disabled = false; msg.textContent = err; vibrate([60, 40, 60]); Sound.bad(); });
  };
  go.onclick = doJoin;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  if (prefill && prefill.length === 4) setTimeout(doJoin, 400);
}

function joinGame(code, onFail) {
  C.isHost = false; C.me = 1;
  let welcomed = false; C.rev = 0;
  const welcomedNow = () => welcomed;
  const failT = setTimeout(() => { if (!welcomed) { t.destroy(); C.net = null; onFail('Keine Antwort vom Spiel. Code richtig? Ist das andere Handy noch in der Lobby?'); } }, 15000);
  const t = new GuestTransport(code, {
    onOpen: () => {
      banner('');
      const hello = () => t.send({ t: 'hello', profile: { name: P.name, head: P.head, body: P.body, color: P.color, hat: P.hat, glasses: P.glasses, aura: P.aura, pid: P.pid } });
      hello(); clearInterval(t.helloIv); let n = 0;
      t.helloIv = setInterval(() => { if (welcomedNow() || ++n > 8 || t.destroyed) { clearInterval(t.helloIv); return; } hello(); }, 1500);
    },
    onMsg: m => {
      if (m.t === 'welcome') { welcomed = true; clearTimeout(failT); C.me = m.you; }
      else if (m.t === 'state') { if (welcomed && !(C.rev && m.s.rev && m.s.rev < C.rev && m.s.rev > C.rev - 1e6 && m.s.code === (C.s && C.s.code))) { C.rev = m.s.rev; onState(m.s); } }
      else if (m.t === 'full') { clearTimeout(failT); t.destroy(); C.net = null; onFail('Dieses Spiel ist schon voll.'); }
    },
    onClose: () => { if (welcomed) banner('📡 Verbindung weg – verbinde neu …'); },
    onError: type => {
      if (welcomed) return;
      clearTimeout(failT); t.destroy(); C.net = null;
      onFail(type === 'notfound' ? 'Code nicht gefunden 🤔 – ist das Spiel auf dem anderen Handy noch offen?' : type === 'nolib' ? 'Verbindungs-Bibliothek fehlt – bist du online?' : 'Keine Verbindung zum Spiele-Server. Bist du online (WLAN oder mobile Daten)?');
    },
  });
  C.net = t;
}

function errorScreen(text) {
  const el = setScreen('err', `<div class="spacer"></div><div class="big-emoji">😵</div><h2 class="display center">Ups!</h2><p class="center" style="font-weight:700">${esc(text)}</p><button class="btn" id="home">Zum Menü</button><div class="spacer"></div>`);
  $('#home', el).onclick = leaveGame;
}

/* ---------------- Zustand rendern ---------------- */
function onState(s) {
  C.s = s;
  if (s.toast && s.toast.id !== C.toastId) { C.toastId = s.toast.id; if (C.screen === 'game' || C.screen === 'lobby') toast(s.toast.text); }
  if (s.phase === 'lobby') renderLobby(s);
  else renderGame(s);
}

function renderLobby(s) {
  const isHost = C.isHost, pl = s.players, ready = pl.length === 2, st = s.settings, catsOk = s.cats.length >= 3;
  const slot = p => p ? `<div class="pslot filled"><div class="slotfig">${figureHTML(p, 'idle')}</div><div class="name">${esc(p.name)}</div></div>`
    : `<div class="pslot"><div style="font-size:34px;opacity:.5">❔</div><div class="muted waiting-dots" style="font-weight:800">warte</div></div>`;
  const codeHTML = s.online || !isHost ? `<div class="codebox">${s.code.split('').map((c, i) => `<span style="animation-delay:${i * 80}ms">${c}</span>`).join('')}</div>`
    : `<div class="center muted waiting-dots" style="font-weight:800;padding:26px">Code wird erstellt</div>`;
  const chips = CAT_KEYS.map(c => `<button class="chip ${s.cats.includes(c) ? 'on' : ''}" data-cat="${c}" style="--cc:${CATS[c].c}" ${isHost && st.mode === 'custom' ? '' : 'disabled'}>${CATS[c].i} ${CATS[c].s}</button>`).join('');
  const html = `
    <div class="topbar"><button class="iconbtn" id="leave">←</button><div class="spacer"></div><span class="label">Lobby</span><div class="spacer"></div><button class="iconbtn" id="rules">❓</button></div>
    ${s.code === 'BOT' ? `<div class="card col center"><div class="label">Übungsspiel</div><div style="font-size:44px">🤖</div><div style="font-weight:800">Du spielst gegen Robo, den Computer. Perfekt zum Reinschnuppern!</div></div>` : `<div class="card col center">
      <div class="label">Spiel-Code</div>
      ${codeHTML}
      ${isHost ? `<p class="muted" style="margin:4px 0 0;font-weight:700;font-size:14px">Dein Gegenüber gibt diesen Code ein</p>${navigator.share ? '<button class="btn ghost small" id="share" style="align-self:center">📤 Einladung teilen</button>' : ''}` : ''}
    </div>`}
    <div class="vs" style="margin:14px 0">${slot(pl[0])}<div class="vsx">VS</div>${slot(pl[1])}</div>
    <div class="card col">
      <div class="label">Wer spielt?</div>
      <div class="seg two">${[['love', '💘 Verliebt', 'Mit Pärchen- & heißen Fragen'], ['friends', '🤝 Freunde', 'Ohne Romantik-Fragen']].map(([k, n, d]) => `<button data-rel="${k}" class="${(st.relation || 'love') === k ? 'sel' : ''}" ${isHost ? '' : 'disabled'}>${n}<small>${d}</small></button>`).join('')}</div>
      <div class="label">Kategorien</div>
      <div class="seg">${Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}" class="${st.mode === k ? 'sel' : ''}" ${isHost ? '' : 'disabled'}>${m.i} ${m.n}<small>${m.d}</small></button>`).join('')}</div>
      <div class="chips">${chips}</div>
      ${catsOk ? '' : '<div class="center" style="color:var(--pink);font-weight:900">Mindestens 3 Kategorien wählen!</div>'}
      <div class="label">Spiellänge</div>
      <div class="seg">${[[6, 'Quickie', '~10 Min'], [10, 'Normal', '~20 Min'], [15, 'Marathon', '~30 Min']].map(([v, n, d]) => `<button data-t="${v}" class="${st.turns === v ? 'sel' : ''}" ${isHost ? '' : 'disabled'}>${n}<small>${v} Züge · ${d}</small></button>`).join('')}</div>
    </div>
    <div class="spacer" style="min-height:14px"></div>
    ${isHost ? `<button class="btn ${ready && catsOk ? 'pink' : ''}" id="start" ${ready && catsOk ? '' : 'disabled'}>${ready ? '🚀 Los geht\'s!' : 'Warte auf Mitspieler …'}</button>`
      : `<div class="card center" style="font-weight:800">⏳ <span class="waiting-dots">${esc(pl[0].name)} startet gleich das Spiel</span></div>`}`;
  const keep = C.screen === 'lobby' ? app.firstElementChild.scrollTop : 0;
  const el = setScreen('lobby', html);
  if (C.lobbyAnimDone) el.style.animation = 'none';
  el.scrollTop = keep;
  C.lobbyAnimDone = true;
  keepAwake();
  $('#leave', el).onclick = () => { Sound.click(); C.lobbyAnimDone = false; leaveGame(); };
  $('#rules', el).onclick = showRules;
  if (isHost) {
    $$('[data-t]', el).forEach(b => b.onclick = () => { Sound.click(); act({ type: 'settings', patch: { turns: +b.dataset.t } }); });
    $$('[data-mode]', el).forEach(b => b.onclick = () => { Sound.click(); act({ type: 'settings', patch: { mode: b.dataset.mode } }); });
    $$('[data-rel]', el).forEach(b => b.onclick = () => { Sound.click(); act({ type: 'settings', patch: { relation: b.dataset.rel } }); });
    $$('.chip', el).forEach(b => b.onclick = () => {
      Sound.click(); const c = b.dataset.cat, cur = st.custom.slice();
      act({ type: 'settings', patch: { custom: cur.includes(c) ? cur.filter(x => x !== c) : cur.concat(c) } });
    });
    const sb = $('#start', el); if (sb) sb.onclick = () => { Sound.fanfare(); C.lobbyAnimDone = false; act({ type: 'start' }); };
    const sh = $('#share', el);
    if (sh) sh.onclick = () => {
      const url = location.origin + location.pathname + '?join=' + s.code + (LOCAL ? '&local' : '');
      navigator.share({ title: 'KOPFNUSS', text: `Komm ins Quiz-Duell! Code: ${s.code}`, url }).catch(() => {});
    };
  }
}

/* ---------- Spielbildschirm ---------- */
function fieldMeta(f) {
  if (f.t === 'cat' || f.t === 'vault') return { color: CATS[f.c].c, icon: CATS[f.c].i };
  if (f.t === 'start') return { color: '#fff', icon: '🚀' };
  return { color: FT[f.t].c, icon: FT[f.t].i };
}
function buildGame(s) {
  const el = setScreen('game', `
    <header class="hud"><div class="pcard" id="pcL"></div><div class="round" id="round"></div><div class="pcard right" id="pcR"></div></header>
    <div class="keybar" id="keybar"></div>
    <div class="boardwrap" id="bw"><div class="sparkles">${Array.from({ length: 14 }, (_, i) => `<i style="left:${rand(100)}%;animation-delay:${-rand(8000)}ms;animation-duration:${6 + rand(6)}s"></i>`).join('')}</div><div class="board" id="board"></div></div>
    <div class="statusline" id="status"></div>
    <footer class="actionbar" id="ab"></footer>`);
  buildBoardDOM(s);
  $('#round', el).onclick = () => { if (confirm('Spiel wirklich verlassen?')) leaveGame(); };
  C.stageId = null; C.anim = {};
  keepAwake();
}
function buildBoardDOM(s) {
  const board = $('#board'); if (!board) return;
  C.boardSig = JSON.stringify(s.fields);
  board.innerHTML = s.fields.map((f, i) => {
    const [c, r] = gridPos(i), m = fieldMeta(f);
    const cls = 'field ' + (f.t === 'vault' ? 'vault' : f.t === 'cat' ? 'catf' : f.t === 'start' ? 'start' : 'special') + ' z-' + NODES[i].zone;
    return `<div class="${cls}" id="f${i}" data-i="${i}" style="grid-column:${c};grid-row:${r};--fc:${m.color};--d:${(i * 0.17).toFixed(2)}s"><span class="fi">${m.icon}</span>${f.t === 'vault' ? '<span class="lock">🔒</span><span class="owners"></span>' : ''}${f.t === 'cat' ? '<span class="kmark"></span>' : ''}</div>`;
  }).join('') + `<div class="vaultroom"><div class="vr-glow"></div></div><div class="vrcore"><span>🏛️</span><b>TRESOR<br>RAUM</b><small>ab ${KEYS_NEEDED}🔑</small></div>
    <div class="dicearea"><div class="arena"></div><div class="dicepair"><div class="dicebox"><div class="dice" id="dice0">${diceFaces()}</div></div><div class="dicebox"><div class="dice" id="dice1">${diceFaces()}</div></div></div></div>
    <div class="logoarea"><div class="centerlogo">KOPF<br>NUSS</div></div>`
    + `<div class="token" id="tk0"><div class="tshadow"></div><div class="stand"><div class="hopper"></div></div></div><div class="token" id="tk1"><div class="tshadow"></div><div class="stand"><div class="hopper"></div></div></div>`;
  board.onclick = e => {
    const f = e.target.closest('.field.target'); if (!f || !C.s) return;
    const st = C.s.stage; if (st.type !== 'choose' || st.p !== C.me || C.chose) return;
    const i = st.opts.findIndex(o => o.to === +f.dataset.i); if (i >= 0) choose(i);
  };
  C.tokenSig = ['', ''];
  sizeBoard();
  setDice(s.lastDice, false);
}
function diceFaces() { return [1, 2, 3, 4, 5, 6].map(n => `<div class="dface f${n}">${pips(n)}</div>`).join(''); }
function pips(n) {
  const on = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n];
  return Array.from({ length: 9 }, (_, i) => on.includes(i) ? '<i></i>' : '<b></b>').join('');
}
function setDice(vals, spin) {
  if (spin) C.diceSpin += 2;
  const R = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  [0, 1].forEach(i => {
    const d = $('#dice' + i); if (!d) return;
    const r = R[vals[i]] || [0, 0], k = C.diceSpin * 360 + (i ? 360 : 0);
    d.style.transition = spin ? '' : 'none';
    d.style.transform = `rotateX(${r[0] + k}deg) rotateY(${r[1] + k}deg)`;
  });
}
function sizeBoard() {
  const bw = $('#bw'), board = $('#board'); if (!bw || !board) return;
  const W = bw.clientWidth, H = bw.clientHeight;
  const cos = Math.cos(TILT * Math.PI / 180);
  const cell = Math.max(22, Math.floor(Math.min((W - 24) / (COLS + .45), (H - 30) / (ROWS * cos + .8))));
  board.style.setProperty('--cell', cell + 'px');
  document.documentElement.style.setProperty('--cell', cell + 'px');
  placeTokens(true);
}
window.addEventListener('resize', () => { if (C.screen === 'game') sizeBoard(); });

function tokenXY(p, pos, otherPos) {
  const f = $('#f' + pos), tk = $('#tk' + p); if (!f || !tk) return [0, 0];
  let x = f.offsetLeft + f.offsetWidth / 2, y = f.offsetTop + f.offsetHeight * .62;
  if (pos === otherPos) { const off = f.offsetWidth * .22; x += p === 0 ? -off : off; }
  return [x - tk.offsetWidth / 2, y - tk.offsetHeight];
}
function placeTokens(force) {
  const s = C.s; if (!s || C.screen !== 'game') return;
  s.players.forEach((pl, p) => {
    const tk = $('#tk' + p); if (!tk) return;
    const sig = pl.head + pl.body + pl.color + (pl.hat || '') + (pl.glasses || '') + (pl.aura || '');
    if (C.tokenSig[p] !== sig) { C.tokenSig[p] = sig; $('.hopper', tk).innerHTML = figureHTML(pl); }
    tk.classList.toggle('me', p === C.me);
    tk.style.setProperty('--pc', pl.color);
    if (C.anim[p] && !force) return;
    const other = s.players[1 - p], op = !other ? -1 : C.anim[1 - p] ? C.anim[1 - p].cur : other.pos;
    const [x, y] = tokenXY(p, C.anim[p] ? C.anim[p].cur : pl.pos, op);
    tk.style.transform = `translate3d(${x}px,${y}px,2px)`;
  });
}
async function animateMove(st) {
  const p = st.p, tk = $('#tk' + p), hop = tk && $('.hopper', tk);
  C.anim[p] = { cur: st.from };
  for (let k = 1; k <= st.steps; k++) {
    if (!C.anim[p] || !tk) return;
    const pos = st.path[k]; C.anim[p].cur = pos;
    const other = C.s.players[1 - p];
    const [x, y] = tokenXY(p, pos, k === st.steps ? other.pos : -1);
    tk.style.transform = `translate3d(${x}px,${y}px,2px)`;
    tk.classList.remove('hop'); void tk.offsetWidth; tk.classList.add('hop');
    Sound.hop(); vibrate(8);
    const f = $('#f' + pos); if (f) { f.classList.remove('stomp'); void f.offsetWidth; f.classList.add('stomp'); }
    await sleep(300);
  }
  delete C.anim[p];
  if (tk) tk.classList.remove('hop');
  placeTokens();
}

function pcardHTML(pl, i) {
  const crowns = Object.keys(pl.crowns).length;
  return `<div class="pa">${esc(pl.head)}</div><div style="min-width:0"><div class="pn">${esc(pl.name)}${i === C.me ? ' (du)' : ''}</div><div class="ps" data-score="${pl.score}">${pl.score}</div><div class="crowns">${crowns ? '👑'.repeat(crowns) : ''}</div></div>${pl.connected ? '' : '<span class="off">offline</span>'}`;
}
function updateHud(s) {
  const me = C.me, op = 1 - me;
  [['#pcL', me], ['#pcR', op]].forEach(([sel, i]) => {
    const el = $(sel), pl = s.players[i]; if (!el || !pl) return;
    const old = el.querySelector('.ps'), oldScore = old ? +old.dataset.score : pl.score;
    el.innerHTML = pcardHTML(pl, i);
    el.style.setProperty('--pc', pl.color);
    el.classList.toggle('active', s.turn === i && s.stage.type !== 'end');
    if (pl.score !== oldScore) countUp(el.querySelector('.ps'), oldScore, pl.score);
  });
  $('#round').innerHTML = `<small>Zug</small><b>${Math.min(s.turnNo + 1, s.totalTurns)}/${s.totalTurns}</b>${s.final ? '<span class="fin">x2</span>' : ''}`;
  // Schlüssel-Leiste
  const L = s.players[me], R = s.players[op];
  const cell = (p, c) => { const k = keyCount(p, c); return p.crowns[c] ? '<span class="ks crown">👑</span>' : k >= KEYS_NEEDED ? '<span class="ks key">🔑3</span>' : k ? `<span class="ks part">🔑${k}</span>` : '<span class="ks none"></span>'; };
  $('#keybar').style.setProperty('--k', s.cats.length);
  $('#keybar').innerHTML = `<span class="kh">${esc(L.head)}</span>${s.cats.map(c => cell(L, c)).join('')}`
    + `<span class="kh"></span>${s.cats.map(c => `<span class="kc" style="--cc:${CATS[c].c}" title="${esc(CATS[c].n)}">${CATS[c].i}</span>`).join('')}`
    + `<span class="kh">${esc(R.head)}</span>${s.cats.map(c => cell(R, c)).join('')}`;
  // Felder: Tresor-Besitzer & Schlüssel-Hinweise für mich
  s.fields.forEach((f, i) => {
    const el = $('#f' + i); if (!el) return;
    if (f.t === 'vault') {
      el.querySelector('.owners').innerHTML = s.players.filter(p => p.crowns[f.c]).map(p => `<span style="--pc:${p.color}">${esc(p.head)}</span>`).join('');
      el.classList.toggle('cracked', !!L.crowns[f.c]);
      el.classList.toggle('haskey', keyCount(L, f.c) >= KEYS_NEEDED && !L.crowns[f.c]);
    } else if (f.t === 'cat') {
      const k = keyCount(L, f.c), need = k < KEYS_NEEDED && !L.crowns[f.c];
      el.classList.toggle('needkey', need);
      const km = el.querySelector('.kmark'); if (km) km.textContent = need ? k + '/' + KEYS_NEEDED : '';
    }
    if (NODES[i].zone === 'hub') el.classList.toggle('gated', !canEnterVaults(L) && L.pos !== i && NODES[L.pos] && NODES[L.pos].zone !== 'hub');
  });
}
function countUp(el, from, to) {
  if (!el) return;
  const t0 = performance.now(), d = 700;
  const step = t => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  el.animate([{ transform: 'scale(1.5)', color: '#a3ff3c' }, { transform: 'scale(1)' }], { duration: 600 });
}

function renderGame(s) {
  if (C.screen !== 'game') buildGame(s);
  else if (C.boardSig !== JSON.stringify(s.fields)) buildBoardDOM(s);
  updateHud(s);
  const st = s.stage;
  if (st.id !== C.stageId) {
    C.stageId = st.id; C.t0 = performance.now() - Math.min(st.elapsed || 0, 4000); C.myAns = null;
    cancelAnimationFrame(C.raf);
    clearTargets();
    enterStage(st, s);
  } else updateStage(st, s);
  placeTokens();
}

const nameOf = i => esc(C.s.players[i] ? C.s.players[i].name : '?');
function setStatus(html) { const el = $('#status'); if (el) el.innerHTML = html; }
function setAction(html) { const el = $('#ab'); if (el) el.innerHTML = html; return el; }
function clearTargets() { $$('.field.target').forEach(f => { f.classList.remove('target'); const m = f.querySelector('.marker'); if (m) m.remove(); }); }

function optLabel(o, s, me) {
  const f = s.fields[o.to], pl = s.players[me];
  let what;
  const k = f.c ? keyCount(pl, f.c) : 0;
  if (f.t === 'vault') what = `🔐 ${CATS[f.c].s}-Tresor ${pl.crowns[f.c] ? '👑' : k >= KEYS_NEEDED ? '<em>🔑🔑🔑 bereit!</em>' : `<em class="warn">${k}/${KEYS_NEEDED} 🔑</em>`}`;
  else if (f.t === 'cat') what = `${CATS[f.c].i} ${CATS[f.c].s} ${k >= KEYS_NEEDED || pl.crowns[f.c] ? '' : `<em>🔑 ${k}/${KEYS_NEEDED} → ${k + 1}</em>`}`;
  else if (f.t === 'start') what = '🚀 Start';
  else what = `${FT[f.t].i} ${FT[f.t].n}`;
  return `<span class="dir">🎲${o.steps}</span><span class="what">${what}</span>`;
}
function choose(i) {
  if (C.chose) return;
  C.chose = true; Sound.click(); vibrate(20);
  $$('.tbtn').forEach((b, j) => { b.disabled = true; b.classList.toggle('sel', j === i); });
  act({ type: 'choose', i });
}

function enterStage(st, s) {
  const mine = st.p === C.me;
  const fin = $('#finale'); if (fin && st.type !== 'end') fin.remove();
  C.chose = false;
  switch (st.type) {
    case 'roll': {
      closeSheet();
      setStatus(mine ? '🎲🎲 Du bist dran – würfle!' : `${nameOf(st.p)} ist dran …`);
      if (mine) {
        const ab = setAction(st.comeback ? `<div class="tgrid"><button class="btn pink rollbtn" id="roll" style="font-size:18px">🎲🎲 Würfeln</button><button class="btn" id="cb" style="font-size:15px;background:var(--red);color:#fff">🔥 Comeback-Risiko</button></div>` : `<button class="btn pink rollbtn" id="roll">🎲🎲 Würfeln!</button>`);
        $('#roll', ab).onclick = e => { $$('#ab button').forEach(b => b.disabled = true); Sound.click(); vibrate(30); act({ type: 'roll' }); };
        const cb = $('#cb', ab); if (cb) cb.onclick = () => { $$('#ab button').forEach(b => b.disabled = true); Sound.whoosh(); act({ type: 'comeback' }); };
        if (st.comeback) setStatus(`🔥 Du liegst ${st.gap} Punkte hinten – wagst du das Comeback?`);
        vibrate([40, 60, 40]);
      } else setAction(`<div class="waitbar">⏳ ${nameOf(st.p)} würfelt gleich …</div>`);
      break;
    }
    case 'choose': {
      closeSheet();
      Sound.dice(); setDice(st.dice, true);
      setStatus(`${mine ? 'Du würfelst' : nameOf(st.p) + ' würfelt'} …`);
      setAction(`<div class="waitbar">🎲 Die Würfel rollen …</div>`);
      setTimeout(() => {
        if (C.stageId !== st.id) return;
        const pasch = st.dice[0] === st.dice[1];
        setStatus(`<b class="dnum">${st.dice[0]}</b> & <b class="dnum">${st.dice[1]}</b>${pasch ? ' – PASCH! 🎉' : ''} · ${mine ? 'Wähle dein Ziel!' : nameOf(st.p) + ' wählt das Ziel …'}`);
        st.opts.forEach(o => {
          const f = $('#f' + o.to); if (!f) return;
          f.classList.add('target');
          f.insertAdjacentHTML('beforeend', `<span class="marker"><b>${o.steps}</b></span>`);
        });
        if (mine) {
          const ab = setAction(`<div class="tgrid">${st.opts.map((o, i) => `<button class="tbtn" data-i="${i}">${optLabel(o, C.s, C.me)}</button>`).join('')}</div>`);
          $$('.tbtn', ab).forEach(b => b.onclick = () => choose(+b.dataset.i));
          vibrate(30);
        } else setAction(`<div class="waitbar">🤔 ${nameOf(st.p)} überlegt, wohin …</div>`);
      }, 1250);
      break;
    }
    case 'move':
      closeSheet();
      setAction(`<div class="waitbar">🏃 Los geht's …</div>`);
      setStatus(`${mine ? 'Du läufst' : nameOf(st.p) + ' läuft'} ${st.steps} ${st.steps === 1 ? 'Feld' : 'Felder'}`);
      animateMove(st);
      break;
    case 'intro': renderIntro(st); break;
    case 'keyGot': renderKeyGot(st, s); break;
    case 'q': renderQuestion(st, s); break;
    case 'reveal': renderReveal(st, s); break;
    case 'free': renderFree(st, s); break;
    case 'rate': renderRate(st, s); break;
    case 'rated': renderRated(st, s); break;
    case 'vaultResult': renderVaultResult(st, s); break;
    case 'luck': renderLuck(st, s); break;
    case 'surprise': renderLuck(st, s, true); break;
    case 'dWrite': renderDWrite(st, s); break;
    case 'dGuess': renderDGuess(st, s); break;
    case 'dReveal': renderDReveal(st, s); break;
    case 'end': renderEnd(s); break;
  }
}
function updateStage(st, s) {
  if (['q', 'free', 'rate', 'dWrite', 'dGuess'].includes(st.type)) {
    const opp = 1 - C.me, el = $('#opp');
    if (el && st.answered[opp] && !el.classList.contains('done')) { el.classList.add('done'); el.innerHTML = `⚡ ${nameOf(opp)} hat schon geantwortet!`; Sound.tick(); vibrate(15); }
  }
}

/* ---------- Sheet ---------- */
function ensureSheet() {
  let sh = $('#sheet');
  if (!sh) { sh = document.createElement('div'); sh.id = 'sheet'; sh.className = 'sheet'; sh.innerHTML = '<div class="shade"></div><div class="panel"></div>'; document.body.appendChild(sh); }
  return sh;
}
function openSheet(html, color) {
  const sh = ensureSheet(), panel = $('.panel', sh);
  panel.style.setProperty('--cc', color || '#b06cff');
  panel.innerHTML = html; panel.scrollTop = 0;
  requestAnimationFrame(() => sh.classList.add('open'));
  return panel;
}
function closeSheet() { const sh = $('#sheet'); if (sh) sh.classList.remove('open'); }

function stageColor(st) { return st.cat ? CATS[st.cat].c : st.ft ? FT[st.ft].c : '#b06cff'; }
function stagePill(st) {
  if (st.cat) return `<span class="pill" style="--cc:${CATS[st.cat].c}">${CATS[st.cat].i} ${CATS[st.cat].s}</span>`;
  if (st.ft) return `<span class="pill" style="--cc:${FT[st.ft].c}">${FT[st.ft].i} ${FT[st.ft].n}</span>`;
  return '';
}
function headHTML(st) {
  const key = st.keyFor != null ? `<span class="pill keypill">🔑 ${st.keyNo || ''}/${KEYS_NEEDED} ${st.keyFor === C.me ? 'für dich' : 'für ' + nameOf(st.keyFor)}</span>` : '';
  const hc = st.durs && st.durs[0] !== st.durs[1] ? `<span class="pill dark" title="Der Führende hat weniger Zeit">⏱️ ${st.durs[C.me] < st.durs[1 - C.me] ? 'Handicap: du!' : 'Handicap: ' + nameOf(1 - C.me)}</span>` : '';
  return `<div class="qhead">${stagePill(st)}${key}${hc}<div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}${st.title ? `<span class="pill dark">${esc(st.title)}</span>` : ''}</div>`;
}
function vaultPips(v, marks) {
  if (!v) return '';
  const m = marks || v.marks;
  return `<div class="pips">${[0, 1, 2].map(i => `<i class="${m[i] === 1 ? 'ok' : m[i] === 0 ? 'no' : ''}"></i>`).join('')}</div><div class="center muted" style="font-weight:800;font-size:13px">${nameOf(v.p)} braucht ${v.need} von 3</div>`;
}

function highlightField(i) { if (i == null) return; const f = $('#f' + i); if (f) { f.classList.remove('hl'); void f.offsetWidth; f.classList.add('hl'); } }
function renderIntro(st) {
  const color = stageColor(st);
  highlightField(st.field);
  setAction(`<div class="waitbar">👀 Macht euch bereit …</div>`);
  openSheet(`<div class="intro">
    ${st.vaultIntro ? `<div class="vault-door" style="--cc:${color}"><b>${st.icon}</b></div>${st.hasKey ? '<div class="keyinsert">🔑</div>' : ''}` : `<div class="big-emoji">${st.icon}</div>`}
    <h2 style="--cc:${color}">${esc(st.title)}</h2>
    <p>${esc(st.sub || '')}</p></div>`, color);
  st.vaultIntro ? Sound.whoosh() : Sound.tone(880, .15, 'triangle', .06);
  vibrate(30);
}
function renderKeyGot(st, s) {
  const c = CATS[st.cat], mine = st.p === C.me;
  setAction(`<div class="waitbar">🔑 Schlüssel!</div>`);
  openSheet(`<div class="intro"><div class="bigkey">🔑</div><h2 style="--cc:var(--yellow)">SCHLÜSSEL!</h2>
    <div class="keyrow">${Array.from({ length: KEYS_NEEDED }, (_, i) => `<span class="${i < st.n ? 'on' : ''}">🔑</span>`).join('')}</div>
    <p>${mine ? 'Du hast' : nameOf(st.p) + ' hat'} jetzt <b>${st.n}/${KEYS_NEEDED}</b> Schlüssel für <b>${c.i} ${esc(c.n)}</b>.<br>${st.n >= KEYS_NEEDED ? '🏛️ Der Weg in den Tresorraum ist offen!' : `Noch ${KEYS_NEEDED - st.n} bis zum Tresorraum.`}</p></div>`, '#ffd60a');
  st.n >= KEYS_NEEDED ? Sound.jackpot() : Sound.key(); if (mine) burst(st.n >= KEYS_NEEDED ? 120 : 50); vibrate([30, 30, 80]);
}

function myDur(st) { return st.durs ? st.durs[C.me] : st.dur; }
function startTimer(st, onEnd) {
  const bar = $('#tbar'), wrap = $('#timer'), D = myDur(st);
  let lastSec = 99, ended = false;
  const loop = () => {
    if (C.stageId !== st.id) return;
    const el = (performance.now() - C.t0) / 1000, rem = Math.max(0, D - el);
    if (bar) bar.style.transform = `scaleX(${rem / D})`;
    if (wrap) wrap.classList.toggle('warn', rem < 4);
    const sec = Math.ceil(rem);
    if (sec !== lastSec && sec <= 3 && sec > 0 && C.myAns == null) Sound.countdown(sec);
    lastSec = sec;
    if (rem <= 0 && !ended) { ended = true; onEnd && onEnd(); return; }
    C.raf = requestAnimationFrame(loop);
  };
  C.raf = requestAnimationFrame(loop);
}
function answer(st, v) {
  if (C.myAns != null || C.stageId !== st.id) return false;
  C.myAns = v;
  act({ type: 'answer', sid: st.id, v, ms: Math.round(performance.now() - C.t0) });
  vibrate(20); Sound.sent();
  return true;
}
function oppLine(st) {
  const opp = 1 - C.me;
  return st.answered[opp] ? `<div class="opp done" id="opp">⚡ ${nameOf(opp)} hat schon geantwortet!</div>` : `<div class="opp" id="opp">⏳ ${nameOf(opp)} überlegt …</div>`;
}
function questionText(st) {
  const q = st.q;
  if (q.kind === 'mind') {
    const subj = q.subject === C.me, other = C.s.players[q.subject];
    return subj ? `<div class="mindtag self">🔒 Du antwortest ehrlich – ${nameOf(1 - C.me)} versucht deine Gedanken zu lesen!</div><div class="qtext">${esc(q.self)}</div>`
      : `<div class="mindtag">🧠 Du bist Gedankenleser*in! ${esc(other.name)} antwortet gerade ehrlich.</div><div class="qtext">${esc(q.text.replace(/\{X\}/g, other.name))}</div>`;
  }
  return `<div class="qtext">${esc(q.text)}</div>`;
}
function optsHTML(st) {
  const q = st.q;
  if (q.kind === 'who') return `<div class="opts who2" id="opts">${[0, 1].map(i => { const p = C.s.players[i]; return `<button class="opt" data-v="${i}" style="--pc:${p.color}"><span class="whofig">${figureHTML(p)}</span>${esc(p.name)}<span class="who"></span></button>`; }).join('')}</div>`;
  const keys = ['A', 'B', 'C', 'D'];
  return `<div class="opts ${q.kind === 'tf' ? 'tf' : ''}" id="opts">${q.options.map((o, i) => `<button class="opt" data-v="${i}"><span class="k">${keys[i]}</span><span>${q.kind === 'tf' ? (i === 0 ? '✅<br>' : '❌<br>') : ''}${esc(o)}</span><span class="who"></span></button>`).join('')}</div>`;
}

function renderQuestion(st, s) {
  const q = st.q, color = stageColor(st);
  if (st.only != null && st.only !== C.me) {
    setAction(`<div class="waitbar">👀 ${nameOf(st.only)} riskiert alles …</div>`);
    openSheet(`${headHTML(st)}<div class="intro"><div class="big-emoji">🍿</div><h2 style="--cc:var(--red)">ZUSCHAUEN!</h2><p>${nameOf(st.only)} spielt die Comeback-Runde:</p></div><div class="qtext center">${esc(q.text)}</div>`, color);
    return;
  }
  setAction(`<div class="waitbar">🧠 Antwortet!</div>`);
  let body;
  if (q.kind === 'est') {
    body = `<div class="numdisp" id="num">&nbsp;<small>${esc(q.unit)}</small></div>
      <div class="keypad" id="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
      <button class="btn lime" id="send" style="margin-top:10px">Abschicken 🎯</button>`;
  } else body = optsHTML(st);
  const panel = openSheet(`${headHTML(st)}${vaultPips(st.vault)}<div class="timer" id="timer"><i id="tbar"></i></div>${questionText(st)}${body}${oppLine(st)}`, color);
  vibrate(25);
  const lock = () => { const o = $('#opts', panel); if (o) o.classList.add('locked'); };
  if (q.kind === 'est') {
    let val = '';
    const disp = $('#num', panel), send = $('#send', panel);
    const show = () => { disp.innerHTML = `${val ? esc(val.replace(/\B(?=(\d{3})+(?!\d))/g, '.')) : '&nbsp;'}<small>${esc(q.unit)}</small>`; };
    $$('#kp button', panel).forEach(b => b.onclick = () => {
      if (C.myAns != null) return;
      const k = b.dataset.k; Sound.tone(700, .03, 'triangle', .04);
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === ',') { if (!val.includes(',') && val) val += ','; }
      else if (val.replace(',', '').length < 9) val = val === '0' ? k : val + k;
      show();
    });
    send.onclick = () => {
      if (!val) { vibrate(60); return; }
      if (answer(st, parseFloat(val.replace(',', '.')))) { send.disabled = true; send.textContent = 'Eingeloggt ✓'; $('#kp', panel).style.opacity = .4; }
    };
    startTimer(st, () => { if (C.myAns == null) { send.disabled = true; send.textContent = '⏰ Zeit um!'; Sound.bad(); } });
  } else {
    $$('#opts .opt', panel).forEach(b => b.onclick = () => { if (answer(st, +b.dataset.v)) { b.classList.add('picked'); lock(); } });
    startTimer(st, () => { if (C.myAns == null) { lock(); const o = $('#opp', panel); Sound.bad(); vibrate(100); if (o) o.insertAdjacentHTML('beforebegin', '<div class="center" style="font-weight:900;color:var(--red);margin-top:10px">⏰ Zeit um!</div>'); } });
  }
}

function msTxt(ms) { return ms == null ? '—' : (ms / 1000).toFixed(1).replace('.', ',') + ' s'; }
function resultBoxes(st, extra) {
  const order = [C.me, 1 - C.me];
  return `<div class="result">${order.map(i => {
    const p = C.s.players[i], pts = st.pts[i], win = pts > 0;
    return `<div class="rbox ${win ? 'win' : ''}" style="--pc:${p.color}">${st.correct && st.correct[i] ? '<span class="badge">✅</span>' : ''}<div class="ra">${esc(p.head)}</div><div style="font-weight:800;font-size:13px">${esc(p.name)}</div><div class="rp" style="color:${win ? 'var(--lime)' : pts < 0 ? 'var(--red)' : 'var(--muted)'}">${pts < 0 ? '−' + Math.abs(pts) : '+' + pts}</div>${extra ? extra(i) : ''}</div>`;
  }).join('')}</div>`;
}
const nextBtn = () => `<button class="btn ghost next" id="next">Weiter ▶</button>`;
function wireNext(panel, st) {
  const b = $('#next', panel); if (!b) return;
  b.onclick = () => { b.disabled = true; b.textContent = 'Warte auf den anderen …'; Sound.click(); act({ type: 'next', sid: st.id }); };
}

function renderReveal(st, s) {
  const q = st.q, color = stageColor(st), me = C.me;
  setAction(`<div class="waitbar">📊 Auflösung</div>`);
  let body = '', extra = null;
  if (q.kind === 'mc' || q.kind === 'tf' || q.kind === 'who' || q.kind === 'mind') {
    body = questionText(st) + optsHTML(st);
    extra = i => `<div class="rt">${st.picks[i] == null ? 'keine Antwort' : (q.kind === 'mc' || q.kind === 'tf') ? msTxt(st.ms[i]) : ''}</div>`;
  } else if (q.kind === 'est') {
    body = `<div class="qtext">${esc(q.text)}</div><div class="numdisp" style="background:var(--lime);color:var(--ink)">${fmtNum(st.answer)}<small style="color:var(--ink)">${esc(q.unit)}</small></div>`;
    extra = i => `<div class="rv">${st.picks[i] == null ? '—' : fmtNum(st.picks[i])} ${esc(q.unit)}</div><div class="rt">${st.diffs && st.diffs[i] != null ? 'Abstand ' + fmtNum(st.diffs[i]) : 'keine Antwort'}</div>`;
  }
  const keyNote = st.keyFor != null ? `<div class="center keynote">${st.correct[st.keyFor] ? `🔑 ${st.keyFor === me ? 'Du bekommst' : nameOf(st.keyFor) + ' bekommt'} den Schlüssel!` : `🔒 Kein Schlüssel für ${st.keyFor === me ? 'dich' : nameOf(st.keyFor)}.`}</div>` : '';
  const panel = openSheet(`${headHTML(st)}${st.vault ? vaultPips(st.vault, st.vault.marks.concat([st.correct[st.vault.p] ? 1 : 0])) : ''}${body}
    ${st.note ? `<div class="center" style="font-weight:900;font-size:17px;margin-top:14px">${esc(st.note)}</div>` : ''}${keyNote}
    ${st.streak >= 2 ? `<div class="streak">${'🔥'.repeat(Math.min(st.streak, 6))} ${st.streak}er-Übereinstimmungsserie!</div>` : ''}
    ${st.talk ? `<div class="talk">💬 <b>Redet kurz drüber:</b> ${esc(st.talk)}</div>` : ''}
    ${resultBoxes(st, extra)}${nextBtn()}`, color);
  const opts = $('#opts', panel);
  if (opts) {
    opts.classList.add('locked');
    $$('.opt', opts).forEach(b => {
      const v = +b.dataset.v;
      if ((q.kind === 'mc' || q.kind === 'tf') && v === st.answer) b.classList.add('right');
      [0, 1].forEach(i => {
        if (st.picks[i] === v) {
          const p = s.players[i];
          b.querySelector('.who').insertAdjacentHTML('beforeend', `<span style="--pc:${p.color}">${esc(p.head)}</span>`);
          if ((q.kind === 'mc' || q.kind === 'tf') && v !== st.answer) b.classList.add('wrong');
          if (q.kind === 'who' || q.kind === 'mind') b.classList.add(st.correct[0] ? 'right' : 'picked');
        }
      });
    });
  }
  if (q.kind === 'who' || q.kind === 'mind') { if (st.correct[0]) { st.streak >= 3 ? Sound.jackpot() : Sound.hit(); burst(st.streak >= 3 ? 90 : 40); } else Sound.sad(); }
  else if (st.only != null) { if (st.pts[st.only] >= 500) { Sound.jackpot(); burst(120); } else if (st.pts[st.only] > 0) Sound.hit(); else Sound.bad(); }
  else if (st.correct[me]) { st.note && st.note.includes('VOLLTREFFER') ? Sound.jackpot() : Sound.hit(); vibrate(30); if (st.pts[me] >= 180) burst(25); }
  else { Sound.bad(); vibrate([80, 40, 80]); }
  wireNext(panel, st);
}

function renderFree(st, s) {
  setAction(`<div class="waitbar">✍️ Schreibt!</div>`);
  const prompt = st.text.replace(/\{P\}/g, C.s.players[1 - C.me].name);
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${FT.free.c}">🤪 Quatsch-Runde</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="timer" id="timer"><i id="tbar"></i></div>
    <div class="qtext">${esc(prompt)}</div>
    <textarea class="input" id="ftxt" maxlength="90" placeholder="Schnell & lustig – nicht nachdenken!"></textarea>
    <button class="btn lime" id="send" style="margin-top:10px">Abschicken 😂</button>${oppLine(st)}`, FT.free.c);
  const ta = $('#ftxt', panel), send = $('#send', panel);
  setTimeout(() => ta.focus(), 400);
  const submit = () => { const v = ta.value.trim(); if (answer(st, v)) { ta.disabled = true; send.disabled = true; send.textContent = v ? 'Abgeschickt ✓' : 'Leer abgeschickt 🙈'; ta.blur(); } };
  send.onclick = () => { if (!ta.value.trim()) { vibrate(60); ta.focus(); return; } submit(); };
  startTimer(st, () => { if (C.myAns == null) submit(); });
}
function renderRate(st, s) {
  const other = 1 - C.me, txt = st.texts[other], mine = st.texts[C.me];
  const prompt = st.text.replace(/\{P\}/g, C.s.players[other].name);
  setAction(`<div class="waitbar">⭐ Bewerten!</div>`);
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${FT.free.c}">🤪 Bewerte ${nameOf(other)}</span></div>
    <div class="timer" id="timer"><i id="tbar"></i></div>
    <div class="qsub" style="margin:0 0 10px">${esc(prompt)}</div>
    <div class="row" style="gap:8px;margin-bottom:8px"><span style="font-size:28px">${esc(C.s.players[other].head)}</span><b>${nameOf(other)} schreibt:</b></div>
    <div class="quote">${txt ? esc(txt) : '<span style="opacity:.5">… nix. Gar nix. 😴</span>'}</div>
    <div class="ratebtns" id="rb">${[[0, '😐', 'Meh'], [1, '😄', 'Gut'], [2, '😂', 'Brüller']].map(([v, e, l]) => `<button data-v="${v}">${e}<small>${l}</small></button>`).join('')}</div>
    <div class="center muted" style="margin-top:12px;font-weight:700;font-size:13px">Deine Antwort: „${mine ? esc(mine) : '—'}“</div>${oppLine(st)}`, FT.free.c);
  $$('#rb button', panel).forEach(b => b.onclick = () => { if (answer(st, +b.dataset.v)) { b.classList.add('sel'); $$('#rb button', panel).forEach(x => x !== b && (x.style.opacity = .4)); if (+b.dataset.v === 2) burst(20); } });
  startTimer(st, () => { if (C.myAns == null) answer(st, 1); });
}
function renderRated(st, s) {
  const E = ['😐', '😄', '😂'];
  setAction(`<div class="waitbar">😂 Auswertung</div>`);
  const order = [C.me, 1 - C.me];
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${FT.free.c}">🤪 Quatsch-Auswertung</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="qsub" style="margin:0 0 10px">${esc(st.text.replace(/\{P\}/g, '…'))}</div>
    ${order.map(i => { const p = s.players[i], r = st.rates[1 - i]; return `<div class="row" style="gap:8px;margin:12px 0 8px"><span style="font-size:26px">${esc(p.head)}</span><b>${esc(p.name)}</b><div class="spacer"></div><span style="font-size:30px">${r == null ? '🤷' : E[r]}</span><b style="font-family:Bungee;color:var(--lime)">+${st.pts[i]}</b></div><div class="quote" style="font-size:18px;transform:rotate(${i ? 1.5 : -1.5}deg)">${st.texts[i] ? esc(st.texts[i]) : '<span style="opacity:.5">😴 keine Antwort</span>'}</div>`; }).join('')}
    <div style="height:10px"></div>${nextBtn()}`, FT.free.c);
  if (st.rates.includes(2)) { Sound.fanfare(); burst(30); } else Sound.ok();
  wireNext(panel, st);
}
function renderVaultResult(st, s) {
  const c = CATS[st.cat], p = s.players[st.p], mine = st.p === C.me;
  setAction(`<div class="waitbar">🔐 Tresor</div>`);
  const panel = openSheet(`<div class="intro">
    <div class="vault-door ${st.success ? 'open' : ''}" style="--cc:${c.c}"><b>${st.success ? '👑' : '🔒'}</b></div>
    <h2 style="--cc:${st.success ? 'var(--lime)' : 'var(--red)'}">${st.success ? 'GEKNACKT!' : 'BLEIBT ZU!'}</h2>
    <div class="pips">${[0, 1, 2].map(i => `<i class="${st.marks[i] === 1 ? 'ok' : st.marks[i] === 0 ? 'no' : ''}"></i>`).join('')}</div>
    <p>${st.success ? `${esc(p.name)} holt sich die Krone „${esc(c.n)}“ und <b>+${st.bonus}</b> Punkte!` : `${esc(p.name)} hatte ${st.got} von ${st.need} nötigen richtigen Antworten.${p.keys[st.cat] ? ' Die Schlüssel bleiben erhalten – nächster Versuch! 🔑' : ''}`}</p>
    </div>${nextBtn()}`, c.c);
  if (st.success) { Sound.fanfare(); burst(mine ? 120 : 60); vibrate([50, 50, 50, 50, 200]); } else { Sound.sad(); vibrate(200); }
  wireNext(panel, st);
}
function renderLuck(st, s, surprise) {
  const items = st.items, list = [];
  for (let r = 0; r < 4; r++) list.push(...items);
  list.push(...items.slice(0, st.pick + 1));
  const finalIdx = list.length - 1;
  highlightField(st.field);
  setAction(`<div class="waitbar">🎰 Glücksrad dreht …</div>`);
  const panel = openSheet(`<div class="intro"><div class="big-emoji">${surprise ? '❓' : '🎰'}</div><h2 style="--cc:var(--yellow)">${surprise ? 'ÜBERRASCHUNG!' : 'GLÜCKSRAD'}</h2><p>${surprise ? 'Welcher Modus wird es?' : (st.p === C.me ? 'Du drehst' : nameOf(st.p) + ' dreht') + ' am Rad …'}</p></div>
    <div class="reel"><div class="strip" id="strip">${list.map(l => `<div class="it">${esc(l)}</div>`).join('')}</div></div>`, FT.luck.c);
  const strip = $('#strip', panel);
  requestAnimationFrame(() => requestAnimationFrame(() => { strip.style.transform = `translateY(${-(finalIdx * 58) + 3}px)`; }));
  let n = 0; const iv = setInterval(() => { Sound.tick(); if (++n > 22) clearInterval(iv); }, 105);
  setTimeout(() => { if (C.stageId === st.id) { strip.children[finalIdx].style.background = 'var(--yellow)'; Sound.ok(); vibrate(60); } }, 2500);
}

/* ---------- Bluffmeister / Emoji-Übersetzer / Kritzel-Kopf ---------- */
const stripLetters = v => v.replace(/[\p{L}\p{N}\s.,!?;:'"()\-_/\\]/gu, '');
function renderDWrite(st, s) {
  const it = st.items[C.me], mode = st.mode, color = FT[mode].c;
  setAction(`<div class="waitbar">${FT[mode].i} Ihr seid beide gleichzeitig dran!</div>`);
  let body;
  if (mode === 'bluff') body = `<div class="qtext">${esc(it.q)}</div><div class="truth">✅ Echte Antwort: <b>${esc(it.real)}</b></div>
      <div class="label" style="margin:12px 0 6px">Erfinde eine falsche Antwort, die echt klingt:</div>
      <textarea class="input" id="dtxt" maxlength="90" placeholder="Dein Bluff …"></textarea><button class="btn lime" id="dsend" style="margin-top:10px">Bluff abschicken 🃏</button>`;
  else if (mode === 'emoji') body = `<div class="qsub" style="margin:0 0 4px">Stelle diesen ${esc(it.type === 'Film' ? 'Film' : it.type === 'Redewendung' ? 'Spruch' : 'Moment')} nur mit Emojis dar:</div><div class="qtext">„${esc(it.term)}“</div>
      <input class="input emoji-in" id="dtxt" maxlength="40" placeholder="😜🎬🦁 …" autocomplete="off" inputmode="text"><div class="muted center" style="font-size:12px;font-weight:700;margin-top:6px">Buchstaben & Zahlen werden automatisch gelöscht 😉</div>
      <button class="btn lime" id="dsend" style="margin-top:10px">Abschicken 😜</button>`;
  else body = `<div class="qsub" style="margin:0 0 4px">Zeichne in 15 Sekunden:</div><div class="qtext">„${esc(it.term)}“</div>
      <div class="canvaswrap"><canvas id="cv" width="260" height="260"></canvas></div>
      <div class="tgrid" style="margin-top:10px"><button class="btn ghost small" id="clr" style="width:100%">🧽 Löschen</button><button class="btn lime small" id="dsend" style="width:100%">Fertig ✓</button></div>`;
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${color}">${FT[mode].i} ${FT[mode].n}</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="timer" id="timer"><i id="tbar"></i></div>${body}${oppLine(st)}`, color);
  const send = $('#dsend', panel);
  let getVal;
  if (mode === 'draw') {
    const cv = $('#cv', panel), x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 260, 260); x.lineCap = x.lineJoin = 'round'; x.lineWidth = 6; x.strokeStyle = '#1a1033';
    let drawing = false, last = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 260 / r.width, (e.clientY - r.top) * 260 / r.height]; };
    cv.addEventListener('pointerdown', e => { if (C.myAns != null) return; drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); x.beginPath(); x.arc(last[0], last[1], 3, 0, 7); x.fillStyle = '#1a1033'; x.fill(); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p2 = pos(e); x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p2[0], p2[1]); x.stroke(); last = p2; e.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => drawing = false));
    $('#clr', panel).onclick = () => { if (C.myAns != null) return; x.fillStyle = '#fff'; x.fillRect(0, 0, 260, 260); Sound.click(); };
    getVal = () => cv.toDataURL('image/jpeg', .55);
  } else {
    const inp = $('#dtxt', panel);
    if (mode === 'emoji') inp.addEventListener('input', () => { const v = stripLetters(inp.value); if (v !== inp.value) inp.value = v; });
    setTimeout(() => inp.focus(), 400);
    getVal = () => mode === 'emoji' ? stripLetters(inp.value).trim() : inp.value.trim();
  }
  const submit = force => {
    const v = getVal();
    if (!v && !force && mode !== 'draw') { vibrate(60); return; }
    if (answer(st, v)) { send.disabled = true; send.textContent = 'Abgeschickt ✓'; const i = $('#dtxt', panel); if (i) { i.disabled = true; i.blur(); } }
  };
  send.onclick = () => submit(false);
  startTimer(st, () => { if (C.myAns == null) submit(true); });
}
function dShow(mode, made, prompt, big) {
  if (mode === 'draw') return made ? `<div class="canvaswrap"><img class="drawing" src="${esc(made)}" alt="Zeichnung"></div>` : `<div class="quote" style="opacity:.6">🙈 Keine Zeichnung abgegeben</div>`;
  if (mode === 'emoji') return `<div class="emoji-show ${big ? '' : 'small'}">${made ? esc(made) : '🤷'}</div>`;
  return `<div class="qtext">${esc(prompt)}</div>`;
}
function renderDGuess(st, s) {
  const mode = st.mode, other = 1 - C.me, color = FT[mode].c, opts = st.opts[C.me];
  setAction(`<div class="waitbar">🤔 Rätselt!</div>`);
  const title = mode === 'bluff' ? `Welche Antwort ist echt? Eine davon hat ${nameOf(other)} erfunden!` : mode === 'emoji' ? `${nameOf(other)} hat gemeint (${esc(st.prompt[C.me])}) …` : `Was hat ${nameOf(other)} gezeichnet?`;
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${color}">${FT[mode].i} ${FT[mode].n}</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="timer" id="timer"><i id="tbar"></i></div><div class="qsub" style="margin:0 0 8px">${title}</div>
    ${dShow(mode, st.made[other], st.prompt[C.me], true)}
    <div class="opts" id="opts" style="margin-top:12px">${opts.map((o, i) => `<button class="opt" data-v="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span><span class="who"></span></button>`).join('')}</div>${oppLine(st)}`, color);
  const lock = () => $('#opts', panel).classList.add('locked');
  $$('#opts .opt', panel).forEach(b => b.onclick = () => { if (answer(st, +b.dataset.v)) { b.classList.add('picked'); lock(); } });
  startTimer(st, () => { if (C.myAns == null) { lock(); Sound.bad(); } });
}
function renderDReveal(st, s) {
  const mode = st.mode, color = FT[mode].c;
  setAction(`<div class="waitbar">📊 Auflösung</div>`);
  const card = c => {
    const g = 1 - c, p = s.players[c], q = s.players[g], it = st.items[c], pick = st.picks[g], o = st.opts[g];
    const real = o[st.real[g]], picked = pick == null ? null : o[pick];
    let verdict;
    if (pick === st.real[g]) verdict = `✅ ${esc(q.name)} hat's erkannt!`;
    else if (mode === 'bluff' && pick === st.fake[g]) verdict = `🃏 ${esc(q.name)} ist auf den Bluff reingefallen!`;
    else verdict = pick == null ? `😴 ${esc(q.name)} hat nicht getippt` : `❌ ${esc(q.name)} tippte „${esc(picked)}“`;
    const what = mode === 'bluff' ? `<div class="qsub" style="margin:6px 0">${esc(it.q)}</div><div class="truth">✅ ${esc(real)}</div><div class="bluffline">🃏 Bluff: „${esc(st.made[c] || '—')}“</div>`
      : mode === 'emoji' ? `${dShow(mode, st.made[c], '', false)}<div class="truth">= ${esc(it.term)}</div>` : `${dShow(mode, st.made[c])}<div class="truth">= ${esc(it.term)}</div>`;
    return `<div class="dcard" style="--pc:${p.color}"><div class="row" style="gap:8px"><span style="font-size:24px">${esc(p.head)}</span><b>${esc(p.name)}</b><div class="spacer"></div><b class="dpts">+${st.pts[c]}</b></div>${what}<div class="verdict">${verdict}</div></div>`;
  };
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${color}">${FT[mode].i} Auflösung</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    ${card(C.me)}${card(1 - C.me)}${nextBtn()}`, color);
  const g = C.me;
  if (st.picks[g] === st.real[g]) { Sound.hit(); burst(40); } else if (mode === 'bluff' && st.picks[1 - g] === st.fake[1 - g]) { Sound.jackpot(); burst(50); } else Sound.bad();
  wireNext(panel, st);
}

/* ---------- Ende ---------- */
function verdictLine(w, l, diff) {
  const W = w.toUpperCase(), L = l.toUpperCase();
  if (diff >= 1500) return [`${W} HAT ${L} KOMPLETT ZERLEGT!`, 'Das war keine Kopfnuss – das war ein Vorschlaghammer. 🔨'];
  if (diff >= 800) return [`${W} MACHT KURZEN PROZESS MIT ${L}!`, `${l}, das schreit nach Revanche. 😤`];
  if (diff >= 300) return [`${W} SCHLÄGT ${L} VERDIENT!`, 'Klare Sache – aber noch kein Grund zum Angeben. 😏'];
  return [`${W} GEWINNT HAUCHDÜNN GEGEN ${L}!`, 'Ein Krimi bis zur letzten Sekunde! 😱'];
}
function showFinale(s, after) {
  const pl = s.players, tie = pl[0].score === pl[1].score, win = pl[0].score >= pl[1].score ? 0 : 1, lose = 1 - win;
  const max = Math.max(1, pl[0].score, pl[1].score);
  const [head, sub] = tie ? ['UNENTSCHIEDEN!', 'Ihr seid einfach ein perfektes Team 💞'] : verdictLine(pl[win].name, pl[lose].name, pl[win].score - pl[lose].score);
  const el = document.createElement('div'); el.id = 'finale';
  el.innerHTML = `<div class="fin-rays"></div><div class="fin-title">Und der Sieg geht an …</div>
    <div class="fin-race">${[C.me, 1 - C.me].map(i => `<div class="lane" style="--pc:${pl[i].color}"><div class="lfig">${figureHTML(pl[i], 'idle')}</div><div class="lbar"><i data-w="${Math.round(pl[i].score / max * 100)}"></i><b class="lsc" data-to="${pl[i].score}">0</b></div></div>`).join('')}</div>
    <div class="fin-win ${tie ? 'tie' : ''}"><div class="fin-crown">${tie ? '🤝' : '👑'}</div><div class="fin-fig">${tie ? figureHTML(pl[0], 'idle') + figureHTML(pl[1], 'idle') : figureHTML(pl[win], 'idle')}</div><div class="fin-head">${esc(head)}</div><div class="fin-sub">${esc(sub)}</div><div class="fin-tap">👆 Tippen für Details</div></div>`;
  document.body.appendChild(el);
  Sound.drumroll(2.6);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.lbar i', el).forEach(i => i.style.width = i.dataset.w + '%');
    $$('.lsc', el).forEach(b => countUp(b, 0, +b.dataset.to));
  }));
  setTimeout(() => { el.classList.add('reveal'); (tie || win === C.me) ? Sound.win() : Sound.sad(); confettiRain(); burst(120); vibrate([60, 40, 60, 40, 250]); }, 2900);
  let closed = false;
  const close = () => { if (closed) return; closed = true; el.classList.add('out'); setTimeout(() => { el.remove(); after(); }, 450); };
  setTimeout(() => el.addEventListener('click', close), 3300);
  setTimeout(close, 11000);
}
function trackUnlocks(s) {
  const u = unlockState(); if (u.done.includes(s.gameId)) return;
  const before = Object.values(ACC).flat().filter(isUnlocked).map(i => i.v);
  u.g++; if (s.players[C.me].score > s.players[1 - C.me].score) u.w++;
  u.done = u.done.concat(s.gameId).slice(-30); store.set('kn_unlock', u);
  const neu = Object.values(ACC).flat().filter(isUnlocked).map(i => i.v).filter(v => !before.includes(v));
  if (neu.length) setTimeout(() => { toast(`🎁 Neu freigeschaltet: ${neu.join(' ')} – ab in den Figuren-Baukasten!`); Sound.key(); }, 4200);
}
function renderEnd(s) {
  cancelAnimationFrame(C.raf);
  recordGame(s, C.me); trackUnlocks(s);
  closeSheet(); setAction(''); setStatus('');
  showFinale(s, () => { if (C.s && C.s.stage.type === 'end') renderEndDetails(s); });
}
function renderEndDetails(s) {
  const pl = s.players, order = [0, 1].sort((a, b) => pl[b].score - pl[a].score);
  const tie = pl[0].score === pl[1].score, win = order[0];
  const avg = p => p.stats.right ? p.stats.ms / p.stats.right : Infinity;
  const awards = [];
  const best = (fn, hi = true) => { const a = fn(pl[0]), b = fn(pl[1]); if (a === b) return null; return (hi ? a > b : a < b) ? 0 : 1; };
  let w;
  if ((w = best(p => p.stats.right)) != null) awards.push(['🧠', 'Besserwisser*in', `${esc(pl[w].name)} – ${pl[w].stats.right} richtige Antworten`]);
  if ((w = best(avg, false)) != null && isFinite(avg(pl[w]))) awards.push(['⚡', 'Blitzmerker*in', `${esc(pl[w].name)} – Ø ${msTxt(avg(pl[w]))} pro richtiger Antwort`]);
  if ((w = best(p => p.stats.laughs)) != null) awards.push(['😂', 'Quatschkopf', `${esc(pl[w].name)} – ${pl[w].stats.laughs} Lach-Punkte`]);
  if ((w = best(p => Object.keys(p.crowns).length)) != null) awards.push(['👑', 'Tresorknacker*in', `${esc(pl[w].name)} – ${Object.keys(pl[w].crowns).length} Kronen`]);
  const pod = (i, cls) => { const p = pl[i]; return `<div class="pod ${cls}" style="--pc:${p.color}">${cls === 'first' && !tie ? '<div class="crown">👑</div>' : ''}<div class="podfig">${figureHTML(p, 'idle')}</div><b>${esc(p.name)}</b><div class="block">${p.score}<small style="font-family:Rubik;font-size:11px;font-weight:800">Punkte</small></div></div>`; };
  setAction(''); setStatus('');
  const meWon = !tie && win === C.me;
  const panel = openSheet(`<div class="intro" style="padding-top:6px"><h2 style="--cc:var(--yellow)">${tie ? 'UNENTSCHIEDEN!' : meWon ? 'DU GEWINNST!' : esc(pl[win].name).toUpperCase() + ' GEWINNT!'}</h2>
    <p>${tie ? 'Ihr seid einfach ein perfektes Team 💞' : meWon ? 'Kopfnuss verteilt! 🥜💥' : 'Revanche? Das lässt du nicht auf dir sitzen! 😤'}</p></div>
    <div class="podium">${pod(order[1], 'second')}${pod(order[0], 'first')}</div>
    <div class="awards">${awards.map(a => `<div class="award"><b>${a[0]}</b><div><div style="font-weight:900">${a[1]}</div><div class="muted">${a[2]}</div></div></div>`).join('')}</div>
    <div class="col" style="margin-top:14px">${C.isHost ? '<button class="btn pink" id="again">🔁 Revanche!</button>' : '<div class="waitbar">⏳ Warte, ob ' + nameOf(0) + ' Revanche will …</div>'}<button class="btn ghost" id="menu">Zum Menü</button></div>`, '#ffd60a');
  const ag = $('#again', panel); if (ag) ag.onclick = () => { Sound.click(); act({ type: 'rematch' }); };
  $('#menu', panel).onclick = () => { Sound.click(); leaveGame(); };
}

/* ---------------- Konfetti ---------------- */
const cv = $('#confetti'), cx = cv.getContext('2d');
let parts = [], cRaf = 0;
function fitCanvas() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
fitCanvas(); window.addEventListener('resize', fitCanvas);
function burst(n, x = innerWidth / 2, y = innerHeight * .4) {
  const cols = ['#ff2e88', '#22d3ff', '#a3ff3c', '#ffd60a', '#ff9f1c', '#b06cff'];
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 4 + Math.random() * 6, c: cols[rand(cols.length)], rot: Math.random() * 6, vr: Math.random() * .4 - .2, life: 120 + rand(60) }); }
  if (!cRaf) cRaf = requestAnimationFrame(tickConfetti);
}
function confettiRain() { let k = 0; const iv = setInterval(() => { burst(30, Math.random() * innerWidth, -20); if (++k > 12) clearInterval(iv); }, 180); }
function tickConfetti() {
  const d = devicePixelRatio; cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
  for (const p of parts) { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; cx.save(); cx.translate(p.x * d, p.y * d); cx.rotate(p.rot); cx.fillStyle = p.c; cx.fillRect(-p.r * d / 2, -p.r * d / 4, p.r * d, p.r * d / 2); cx.restore(); }
  cRaf = parts.length ? requestAnimationFrame(tickConfetti) : 0;
  if (!cRaf) cx.clearRect(0, 0, cv.width, cv.height);
}

/* ---------------- Start ---------------- */
document.documentElement.style.setProperty('--tilt', TILT + 'deg');
document.body.insertAdjacentHTML('beforeend', '<div class="desk-hint">📱 KOPFNUSS ist fürs Handy gemacht – am besten dort öffnen.</div>');
window.addEventListener('beforeunload', e => { if (C.screen === 'game' && C.s && C.s.stage.type !== 'end') { e.preventDefault(); e.returnValue = ''; } });
showSplash();
window.__KN = { C, startHost, joinGame, showHome, P, saveProfile, buildBoard };
})();
