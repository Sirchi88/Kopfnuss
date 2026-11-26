/* KOPFNUSS – Das Quiz-Duell (2–4 Spieler)
 * Host-autoritative Spiellogik. Verbindung: 2 MQTT-Server + PeerJS parallel, Code-basiert.
 * Testmodus: ?local im URL → BroadcastChannel (mehrere Tabs im selben Browser).
 * Diese Datei wird aus src/part*.js zusammengesetzt (siehe build.sh).
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
const TILT = 30, MAX_PLAYERS = 4;

/* ---------------- Daten ---------------- */
const CATS = {
  welt:     { n: 'Welt & Reisen',          s: 'Welt',     i: '🌍', c: '#22c3ff', d: 'Städte, Länder, Sehenswürdigkeiten & Kultur' },
  erdkunde: { n: 'Erdkunde',               s: 'Erdkunde', i: '🗺️', c: '#1de9b6', d: 'Hauptstädte, Flüsse, Berge & Kontinente' },
  natur:    { n: 'Tiere & Garten',         s: 'Natur',    i: '🌿', c: '#4ade80', d: 'Tiere, Pflanzen & alles im Garten' },
  koerper:  { n: 'Körper & Gesundheit',    s: 'Körper',   i: '🫀', c: '#ff4d6d', d: 'Organe, Knochen, Medizin & Gesundheit' },
  sport:    { n: 'Sport & Motor',          s: 'Sport',    i: '🏎️', c: '#ff9f1c', d: 'Fragen rund um Sport, Autos & Motorsport' },
  social:   { n: 'Social & Stars',         s: 'Social',   i: '📱', c: '#b06cff', d: 'Social Media, YouTube, Musik & Promis' },
  technik:  { n: 'Technik & Alltag',       s: 'Technik',  i: '💡', c: '#ffd60a', d: 'Technik, Erfindungen, Haushalt & Alltag' },
  trash:    { n: 'Trash-TV',               s: 'Trash-TV', i: '📺', c: '#ff3df2', d: 'Dschungelcamp, Bachelor, Castingshows & Co.' },
  wtf:      { n: 'Woher weißt du das?!',   s: 'WTF?!',    i: '🤯', c: '#c6ff3d', d: 'Komplett verrückte Fakten & kuriose Fragen' },
  frau:     { n: 'Alles rund um die Frau', s: 'Frau',     i: '💃', c: '#ffa3c4', d: 'Mode, Beauty, starke Frauen & Geschichte' },
  mann:     { n: 'Alles rund um den Mann', s: 'Mann',     i: '🧔', c: '#5b8cff', d: 'Werkzeug, Grill, Bier, Bart & Actionfilme' },
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
  start: { i: '🚀', n: 'Start', c: '#ffffff', d: 'Hier geht\'s los. Wer drüberläuft, kassiert +100.' },
  blitz: { i: '⚡', n: 'Blitzrunde', c: '#fff36b', sub: '5 Wahr-oder-Falsch-Fragen. 5 Sekunden. Kein Nachdenken!', d: '5× Wahr oder Falsch in Sekunden' },
  pair:  { i: '💘', n: 'Wer würde eher?', c: '#ff2e88', sub: "Alle tippen gleichzeitig. Seid ihr euch einig, gibt's Punkte!", d: 'Tippt, wen es trifft – Einigkeit bringt Punkte' },
  mind:  { i: '🧠', n: 'Gedankenleser', c: '#ff6bd6', sub: 'Einer antwortet ehrlich, die anderen lesen seine Gedanken – dann wird getauscht!', d: 'Errate, was dein Gegenüber antwortet' },
  bluff: { i: '🃏', n: 'Bluffmeister', c: '#ff9f1c', sub: 'Erfinde eine falsche Antwort, die echt klingt – und finde selbst die Wahrheit!', d: 'Falsche Antworten erfinden & die echte finden' },
  emoji: { i: '😜', n: 'Emoji-Übersetzer', c: '#ffd60a', sub: 'Stelle deinen Begriff NUR mit Emojis dar – die anderen müssen raten!', d: 'Begriffe nur mit Emojis darstellen' },
  draw:  { i: '✏️', n: 'Kritzel-Kopf', c: '#22d3ff', sub: '20 Sekunden zeichnen – die anderen müssen raten. Schlecht malen erlaubt!', d: 'Zeichnen & raten' },
  surprise: { i: '❓', n: 'Überraschung', c: '#ffffff', sub: 'Niemand weiß, was kommt …', d: 'Zufälliger Spielmodus – lass dich überraschen' },
  comeback: { i: '🔥', n: 'Comeback-Risiko', c: '#ff4d6d' },
  free:  { i: '🤪', n: 'Quatsch-Runde', c: '#a3ff3c', sub: 'Schreibt die lustigste Antwort – dann wird bewertet!', d: 'Freie, möglichst lustige Antworten' },
  est:   { i: '🎯', n: 'Schätz-Duell', c: '#22d3ff', sub: 'Wer am nächsten dran ist, gewinnt. Volltreffer = Extrabonus!', d: 'Zahlen schätzen – der Nächste gewinnt' },
  luck:  { i: '🎰', n: 'Glücksrad', c: '#ffd60a', sub: 'Alles kann passieren …', d: 'Punkte, Schlüssel, Teleport – alles möglich' },
};
// Brett: äußerer Ring + 4 Wege nach innen + Tresorraum (Ring) in der Mitte
const COLS = 9, ROWS = 11, KEYS_NEEDED = 3, VAULT_GOAL = 3;
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
const crownCount = pl => Object.keys(pl.crowns).length;
// Sieger: im Tresor-Rennen gesetzt, sonst höchster Punktestand (-1 = Gleichstand an der Spitze)
const ranking = s => s.players.map((p, i) => i).sort((a, b) => (s.winner === a ? -1 : s.winner === b ? 1 : 0) || s.players[b].score - s.players[a].score);
const winnerOf = s => { if (s.winner != null) return s.winner; const r = ranking(s); return r.length > 1 && s.players[r[0]].score === s.players[r[1]].score ? -1 : r[0]; };
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
  out[0] = { t: 'start' };
  // Schlüsselfelder: mindestens 3 pro Kategorie (genug Chancen für 3 Schlüssel), auf Ring & Wegen verteilt
  const slots = shuffle(RING.filter(i => i !== 0)).concat(shuffle(SPOKES)); // Ring zuerst
  const catTotal = Math.min(slots.length - 8, Math.max(3 * k, 24));
  const per = cats.map((c, i) => Math.floor(catTotal / k) + (i < catTotal % k ? 1 : 0));
  const POOL = ['pair', 'mind', 'est', 'free', 'bluff', 'emoji', 'draw', 'surprise', 'blitz', 'luck'];
  const specs = n => { let a = []; while (a.length < n) a = a.concat(shuffle(POOL)); return a.slice(0, n).map(t => ({ t })); };
  const items = cats.flatMap((c, i) => Array.from({ length: per[i] }, () => ({ t: 'cat', c }))).concat(specs(slots.length - catTotal));
  const order = RING.filter(i => i !== 0).concat(SPOKES);
  const same = (a, b) => a && b && a.t === b.t && a.c === b.c;
  let best = null, bestBad = 1e9;
  for (let tr = 0; tr < 120; tr++) {
    const sh = shuffle(items), tmp = out.slice(); order.forEach((n, i) => tmp[n] = sh[i]);
    let bad = 0; for (let n = 0; n < N; n++) for (const nb of ADJ[n]) if (nb > n && same(tmp[n], tmp[nb])) bad++;
    if (bad < bestBad) { bestBad = bad; best = tmp; } if (!bad) break;
  }
  const res = best;
  const hubOrder = shuffle(cats), step = HUB.length / k, used = new Set();
  hubOrder.forEach((c, i) => { let h = Math.floor(i * step) % HUB.length; while (used.has(h)) h = (h + 1) % HUB.length; used.add(h); res[HUB[h]] = { t: 'vault', c }; });
  const hs = specs(HUB.length - k); HUB.forEach(n => { if (!res[n]) res[n] = hs.pop(); });
  return res;
}
const HEADS = ['🦊', '🐼', '🐸', '🦄', '🐯', '🐙', '👽', '🤖', '🐻', '🐵', '🐶', '🐱', '🐷', '🐰', '🐨', '🦁', '🐔', '🐧', '🦉', '🐢',
  '😎', '🤓', '😜', '🥸', '🤠', '😈', '👻', '💀', '🤡', '👑', '🎃', '🌝', '🍑', '🍆', '🌶️', '🍕', '🍩', '🥑', '🦖', '🧠', '👸', '🤴', '🧜‍♀️', '🧛', '🥷', '🧙'];
const COLORS = ['#ff2e88', '#22d3ff', '#a3ff3c', '#ffd60a', '#ff9f1c', '#b06cff', '#ff4d6d', '#1de9b6'];
const ACC = {
  hat: [{ v: '' }, { v: '🧢' }, { v: '🎀' }, { v: '🌸' }, { v: '🍄', need: { g: 1 } }, { v: '👒', need: { g: 2 } }, { v: '🎉', need: { g: 2 } }, { v: '🎩', need: { w: 1 } },
    { v: '🦜', need: { g: 4 } }, { v: '⛑️', need: { g: 5 } }, { v: '🪖', need: { g: 6 } }, { v: '🎓', need: { w: 3 } }, { v: '🧁', need: { g: 8 } }, { v: '🎄', need: { g: 10 } }, { v: '🌈', need: { w: 4 } }, { v: '👑', need: { w: 5 } }],
  glasses: [{ v: '' }, { v: '👓' }, { v: '🕶️', need: { w: 1 } }, { v: '🥽', need: { g: 3 } }, { v: '🤿', need: { g: 6 } }, { v: '👁️', need: { w: 3 } }],
  aura: [{ v: '' }, { v: '🎵' }, { v: '🍀', need: { g: 1 } }, { v: '🫧', need: { g: 2 } }, { v: '💖', need: { g: 3 } }, { v: '✨', need: { w: 2 } }, { v: '⭐', need: { g: 5 } }, { v: '❄️', need: { g: 7 } },
    { v: '🦋', need: { w: 3 } }, { v: '🔥', need: { w: 4 } }, { v: '💸', need: { w: 5 } }, { v: '⚡', need: { g: 10 } }, { v: '🌈', need: { w: 7 } }, { v: '👑', need: { w: 10 } }],
};
const DICE = { classic: '⚪ Klassisch', neon: '💜 Neon', gold: '🟡 Gold', galaxy: '🌌 Galaxie', candy: '🍬 Candy', wood: '🪵 Holz' };
const THEMES = { neon: '🌃 Neon-Nacht', sunset: '🌅 Sunset', ocean: '🌊 Ozean', forest: '🌲 Wald', candy: '🍭 Candy' };
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

/* ---------------- Profil, Einstellungen & Statistik ---------------- */
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
const PREFS = Object.assign({ names: true }, store.get('kn_prefs', {}));
function saveProfile() { store.set('kn_profile', { name: P.name, head: P.head, body: P.body, color: P.color, hat: P.hat || '', glasses: P.glasses || '', aura: P.aura || '' }); }
const profileOf = () => ({ name: P.name, head: P.head, body: P.body, color: P.color, hat: P.hat || '', glasses: P.glasses || '', aura: P.aura || '', pid: P.pid });
const STATS0 = { games: 0, wins: 0, losses: 0, draws: 0, points: 0, best: 0, right: 0, ans: 0, crowns: 0, laughs: 0, bruller: 0, cat: {}, vs: {}, recent: [], done: [] };
function loadStats() { return Object.assign({}, STATS0, store.get('kn_stats', {})); }
function recordGame(s, me) {
  if (s.code === 'BOT') return; // Übungsspiele zählen nicht
  const st = loadStats();
  if (st.done.includes(s.gameId)) return;
  const pl = s.players[me], W = winnerOf(s), res = W === me ? 'w' : W === -1 && ranking(s).slice(0, 2).includes(me) ? 'd' : 'l';
  st.done = st.done.concat(s.gameId).slice(-30);
  st.games++; st[res === 'w' ? 'wins' : res === 'l' ? 'losses' : 'draws']++;
  st.points += pl.score; st.best = Math.max(st.best, pl.score);
  st.right += pl.stats.right; st.ans += pl.stats.ans;
  st.crowns += crownCount(pl); st.laughs += pl.stats.laughs; st.bruller += pl.stats.bruller || 0;
  for (const [c, v] of Object.entries(pl.stats.cat || {})) { const o = st.cat[c] || [0, 0]; st.cat[c] = [o[0] + v[0], o[1] + v[1]]; }
  const rk = ranking(s);
  s.players.forEach((op, i) => {
    if (i === me) return;
    const r = W === me ? 'w' : W === i ? 'l' : pl.score > op.score ? 'w' : pl.score < op.score ? 'l' : 'd';
    const vs = st.vs[op.name] || { w: 0, l: 0, d: 0 }; vs[r]++; st.vs[op.name] = vs;
  });
  const ops = s.players.filter((_, i) => i !== me), best = ops.sort((a, b) => b.score - a.score)[0];
  st.recent = [{ t: Date.now(), me: pl.score, op: best.score, opn: ops.map(o => o.name).join(', '), oph: ops.map(o => o.head).join(''), res, place: rk.indexOf(me) + 1, n: s.players.length }].concat(st.recent).slice(0, 5);
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
  dice() { for (let i = 0; i < 12; i++) { this.noise(.035, .1 + (i % 3) * .03, i * .1 + rand(30) / 1000, 1200); this.tone(160 + rand(300), .025, 'square', .025, i * .1); } },
  hop() { this.tone(420, .08, 'triangle', .05, 0, 900); },
  whoosh() { this.noise(.35, .08, 0, 600); this.tone(200, .3, 'sawtooth', .03, 0, 1400); },
  key() { [1318, 1568, 2093, 2637].forEach((f, i) => this.tone(f, .3, 'sine', .06, i * .08)); this.noise(.5, .03, .1, 6000); },
  pop() { this.tone(520, .06, 'sine', .08, 0, 1200); },
  drumroll(sec = 2.6) { const n = Math.floor(sec / .045); for (let i = 0; i < n; i++) this.noise(.05, .04 + .1 * i / n, i * .045, 400); this.noise(1.2, .22, sec, 2500); this.tone(110, .5, 'sine', .2, sec); },
  fanfare() { [[392, 494], [523, 659], [659, 784], [784, 988], [659, 784], [784, 988], [1046, 1318]].forEach((ch, i) => ch.forEach(f => this.tone(f, .2 + (i === 6 ? .5 : 0), 'square', .045, i * .12))); },
  win() { this.fanfare(); this.noise(.8, .06, .8, 5000); },
  sad() { [392, 370, 349, 330].forEach((f, i) => this.tone(f, .28, 'triangle', .07, i * .22)); this.tone(110, .8, 'sawtooth', .04, .9, 70); },
};

/* ---------------- Netzwerk ---------------- */
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from({ length: 4 }, () => A[rand(A.length)]).join(''); }
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
    if (m.i) { if (this.seen.has(m.i)) return; this.seen.set(m.i, 1); if (this.seen.size > 800) this.seen.delete(this.seen.keys().next().value); }
    this.onMsg(alive ? { t: 'alive', at: m.at, s: m.s } : m.d, m);
  }
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

// Host: mehrere Gäste, jeder Gast schickt seine pid mit
class HostTransport {
  constructor(code, h) { this.code = code; this.h = h; this.seen = {}; this.gone = {}; LOCAL ? this.initLocal() : this.initRelay(); }
  fromGuest(d) {
    if (!d) return;
    const pid = d.pid;
    if (pid) {
      this.seen[pid] = Date.now();
      if (this.gone[pid] && d.t !== 'hello') { this.gone[pid] = false; this.h.onMsg({ t: 'alive-guest', pid }); }
      this.gone[pid] = false;
    }
    if (d.t === 'ping') { this.send({ t: 'pong', pid }); return; }
    this.h.onMsg(d);
  }
  initLocal() {
    this.bc = new BroadcastChannel('kn-' + this.code);
    this.bc.onmessage = e => { const d = e.data; if (d.to === 'host' && d.kind === 'msg') this.fromGuest(d.msg); };
    setTimeout(() => this.h.onOpen(), 30);
  }
  initRelay() {
    this.opened = false;
    this.r = new Relay(this.code, 'host', d => {
      if (d && d.t === 'alive') {
        if (!this.opened && d.s && d.s !== this.r.sid && d.at && Date.now() - d.at < 6 * 3600e3) { clearTimeout(this.claimT); this.claimT = null; this.destroy(); this.h.onError('unavailable-id'); }
        return;
      }
      this.fromGuest(d);
    }, st => {
      if (st === 'nolib') { this.h.onError('nolib'); return; }
      if (st === 'peer-taken' && !this.opened) { clearTimeout(this.claimT); this.claimT = null; this.destroy(); this.h.onError('unavailable-id'); return; }
      if (st === 'peer-up') st = 'up';
      if (st === 'up' && !this.opened && !this.claimT) this.claimT = setTimeout(() => { this.claimT = null; if (this.destroyed) return; this.opened = true; this.r.setAlive(true); this.h.onOpen(); }, 900);
      else if (st === 'up' && this.opened) this.r.setAlive(true);
    });
    this.hb = setInterval(() => { if (this.opened) this.r.setAlive(true); }, 60000);
    this.watch = setInterval(() => { for (const [pid, t] of Object.entries(this.seen)) if (!this.gone[pid] && Date.now() - t > 12000) { this.gone[pid] = true; this.h.onLeave(pid); } }, 3000);
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
      if (d.t === 'pong' && d.pid && d.pid !== P.pid) return;
      this.lastPong = Date.now();
      if (!this.ever) this.ever = true;
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
      this.send({ t: 'ping' });
      if (this.ever && this.lastPong && Date.now() - this.lastPong > 10000 && !this.isLost) { this.isLost = true; this.h.onClose(); }
    }, 3000);
    this.nfT = setTimeout(() => { if (!this.ever && !this.hostAlive && !this.destroyed) this.h.onError(this.linked ? 'notfound' : 'network'); }, 10000);
  }
  lost() { if (!this.isLost && this.ever) { this.isLost = true; this.h.onClose(); } }
  isOpen() { return LOCAL ? true : !!(this.r && this.r.connected() && !this.isLost); }
  send(msg) {
    msg = Object.assign({ pid: P.pid }, msg);
    if (LOCAL) { this.bc.postMessage({ to: 'host', kind: 'msg', msg }); return; }
    this.r && this.r.send(msg);
  }
  destroy() { this.destroyed = true; clearInterval(this.hb); clearTimeout(this.nfT); try { this.bc && this.bc.close(); } catch (e) {} const r = this.r; if (r) setTimeout(() => r.destroy(), 300); }
}

/* ---------------- Host-Spiellogik (2–4 Spieler) ---------------- */
const freshStats = () => ({ ans: 0, right: 0, ms: 0, laughs: 0, bruller: 0, cat: {} });
function newPlayer(prof, idx) {
  return { name: (prof.name || ('Spieler ' + (idx + 1))).slice(0, 14), head: prof.head || '🙂', body: prof.body === 'f' ? 'f' : 'm', color: prof.color || COLORS[idx], hat: prof.hat || '', glasses: prof.glasses || '', aura: prof.aura || '', pid: prof.pid, connected: true,
    pos: 0, score: 0, keys: {}, crowns: {}, vr: 0, stats: freshStats() };
}
const nextOf = (i, n) => (i + 1) % n;

class HostGame {
  constructor(code) {
    this.code = code; this.sid = 0; this.toastId = 0; this.waiters = []; this.decks = store.get('kn_decks', {});
    this.answers = []; this.nexts = []; this.rolled = false; this.choice = null; this.runId = 0; this.cbCool = [];
    const saved = store.get('kn_settings', null);
    const settings = Object.assign({ turns: 10, mode: 'all', custom: CAT_KEYS.slice(), relation: 'love', win: 'points', dice: 'classic', theme: 'neon' }, saved || {});
    const cats = resolveCats(settings);
    this.s = { phase: 'lobby', code, players: [newPlayer(P, 0)], settings, cats, fields: buildBoard(cats), turn: 0, turnNo: 0, totalTurns: 20, final: false, lastDice: [3, 5], stage: { id: 0, type: 'lobby' }, toast: null, online: false, gameId: '' };
  }
  get np() { return this.s.players.length; }
  attach(transport) { this.t = transport; }
  push() { this.s.rev = (this.s.rev || 0) + 1; const s = JSON.parse(JSON.stringify(this.s)); s.stage.elapsed = Date.now() - (this.stageT0 || Date.now()); this.t && this.t.send({ t: 'state', s }); onState(s); }
  setStage(st) {
    this.s.stage = Object.assign({}, st, { id: ++this.sid }); this.stageT0 = Date.now();
    this.answers = new Array(this.np).fill(null); this.nexts = new Array(this.np).fill(false);
    this.rolled = false; this.choice = null; this.cbReq = false;
    this.push(); if (this.bot) this.botAct(this.s.stage);
  }
  noAns() { return new Array(this.np).fill(false); }
  toast(text) { this.s.toast = { id: ++this.toastId, text }; }
  waitFor(cond, ms) {
    return new Promise(res => {
      const w = { cond, res };
      if (ms) w.timer = setTimeout(() => { this.waiters = this.waiters.filter(x => x !== w); res('timeout'); }, ms);
      this.waiters.push(w); this.check();
    });
  }
  check() { for (const w of this.waiters.slice()) if (w.cond()) { clearTimeout(w.timer); this.waiters = this.waiters.filter(x => x !== w); w.res('ok'); } }
  all(arr) { return () => this.s.players.every((p, i) => arr()[i] || !p.connected); }
  draw(key, arr) {
    const id = key + ':' + arr.length; // eigener Stapel je Fragenpool – erst wenn alle dran waren, wird neu gemischt
    if (!this.decks[id] || !this.decks[id].length) this.decks[id] = shuffle(arr.map((_, i) => i));
    const v = arr[this.decks[id].pop()];
    store.set('kn_decks', this.decks);
    return v;
  }
  mult() { return this.s.final ? 2 : 1; }
  idxOf(pid) { return this.s.players.findIndex(p => p.pid === pid); }
  // ---- Netz
  onMsg(m) {
    if (!m) return;
    if (m.t === 'hello') {
      const pl = this.s.players, prof = m.profile || {};
      let i = this.idxOf(prof.pid);
      if (i > 0) {
        pl[i].connected = true;
        if (this.s.phase === 'lobby') Object.assign(pl[i], { name: (prof.name || pl[i].name).slice(0, 14), head: prof.head || pl[i].head, body: prof.body === 'f' ? 'f' : 'm', hat: prof.hat || '', glasses: prof.glasses || '', aura: prof.aura || '' });
        this.toast(`${pl[i].name} ist wieder da!`);
      } else if (this.s.phase === 'lobby' && pl.length < MAX_PLAYERS) {
        const p = newPlayer(prof, pl.length);
        if (pl.some(x => x.color === p.color)) p.color = COLORS.find(c => !pl.some(x => x.color === c)) || p.color;
        pl.push(p); i = pl.length - 1; this.toast(`${p.name} ist da! 🎉`);
      } else if ((i = pl.findIndex((p, k) => k > 0 && !p.connected)) > 0) {
        pl[i].connected = true; pl[i].pid = prof.pid; this.toast(`${pl[i].name} ist wieder da!`);
      } else { this.t.send({ t: 'full', pid: prof.pid }); return; }
      this.t.send({ t: 'welcome', you: i, pid: prof.pid });
      this.push(); this.check();
    } else if (m.t === 'alive-guest') {
      const i = this.idxOf(m.pid), g = this.s.players[i]; if (i > 0 && !g.connected) { g.connected = true; this.toast(`${g.name} ist wieder da!`); this.push(); this.check(); }
    } else if (m.t === 'act') { const i = this.idxOf(m.pid); if (i > 0) this.onAction(i, m.a || {}); }
    else if (m.t === 'leave') this.onLeave(m.pid, true);
  }
  onLeave(pid, explicit) {
    const i = pid == null ? this.s.players.findIndex((p, k) => k > 0 && p.connected) : this.idxOf(pid);
    const p = this.s.players[i]; if (!p || i <= 0) return;
    if (this.s.phase === 'lobby') { this.s.players.splice(i, 1); this.toast(`${p.name} hat die Lobby verlassen`); }
    else { p.connected = false; this.toast(`${p.name} ${explicit ? 'hat das Spiel verlassen' : 'hat die Verbindung verloren'} …`); }
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
          if (this.s.cats.length >= 3 && (a.patch.mode || a.patch.custom)) this.s.fields = buildBoard(this.s.cats);
          this.push();
        } break;
      case 'kick': if (i === 0 && this.s.phase === 'lobby' && a.i > 0 && this.s.players[a.i]) { const p = this.s.players.splice(a.i, 1)[0]; this.t && this.t.send({ t: 'full', pid: p.pid }); this.push(); } break;
      case 'start': if (i === 0 && this.s.phase === 'lobby' && this.np >= 2 && this.s.cats.length >= 3) this.start(); break;
      case 'rematch': if (i === 0 && st.type === 'end') this.start(); break;
    }
    this.check();
  }
  // ---- Ablauf
  start() {
    this.runId++; this.waiters.forEach(w => clearTimeout(w.timer)); this.waiters = [];
    for (const p of this.s.players) Object.assign(p, { pos: 0, score: 0, keys: {}, crowns: {}, vr: 0, stats: freshStats() });
    this.s.winner = null; this.s.winBy = null;
    this.s.cats = resolveCats(this.s.settings);
    this.pools = buildPools(this.s.settings.relation); this.cbCool = new Array(this.np).fill(0);
    Object.assign(this.s, { phase: 'game', streak: 0, fields: buildBoard(this.s.cats), turn: rand(this.np), turnNo: 0, totalTurns: this.s.settings.turns * this.np, final: false, gameId: Date.now().toString(36) + rand(1e6) });
    this.run(this.runId).catch(e => console.error(e));
  }
  raceWon() { return this.s.settings.win === 'vault' ? this.s.players.findIndex(p => crownCount(p) >= VAULT_GOAL) : -1; }
  async run(runId) {
    while (runId === this.runId) {
      const pl = this.s.players;
      if (this.s.winner != null || this.s.turnNo >= this.s.totalTurns || pl.some(p => crownCount(p) === this.s.cats.length)) break;
      const wasFinal = this.s.final;
      this.s.final = this.s.turnNo >= this.s.totalTurns - this.np;
      if (this.s.final && !wasFinal) this.toast('🔥 FINALE! Ab jetzt doppelte Punkte!');
      const p = this.s.turn; this.extraTurn = false;
      if (!pl[p].connected) { this.s.turnNo++; this.s.turn = nextOf(p, this.np); continue; } // Offline-Spieler überspringen
      const lead = Math.max(...pl.map(x => x.score)), canCB = lead - pl[p].score >= 400 && this.cbCool[p] <= 0;
      if (this.cbCool[p] > 0) this.cbCool[p]--;
      this.setStage({ type: 'roll', p, comeback: canCB, gap: lead - pl[p].score });
      await this.waitFor(() => this.rolled || this.cbReq || !pl[p].connected);
      if (runId !== this.runId) return;
      if (!pl[p].connected) continue;
      if (this.cbReq) {
        this.cbCool[p] = 3;
        await this.comeback(p);
        if (runId !== this.runId) return;
        this.setStage({ type: 'roll', p });
        await this.waitFor(() => this.rolled || !pl[p].connected);
        if (runId !== this.runId) return;
      }
      const d = [1 + rand(6), 1 + rand(6)]; this.s.lastDice = d;
      const pos = pl[p].pos, opts = [], hubOK = canEnterVaults(pl[p]);
      const addOpt = (steps, tag) => { for (const [to, path] of walks(pos, steps, hubOK)) if (!opts.some(o => o.to === to)) opts.push({ steps, to, path, tag }); };
      addOpt(d[0]); if (d[1] !== d[0]) addOpt(d[1]); else addOpt(d[0] * 2, 'pasch');
      this.setStage({ type: 'choose', p, dice: d, opts });
      await this.waitFor(() => this.choice != null || !pl[p].connected, 45000);
      if (runId !== this.runId) return;
      const o = opts[this.choice ?? 0];
      if (o.tag === 'pasch') this.toast('🎲🎲 Pasch! Doppelt so weit!');
      await this.moveBy(p, o.path);
      await this.resolve(p, pl[p].pos);
      if (runId !== this.runId) return;
      if (this.s.winner != null) break;
      if (!this.extraTurn) { this.s.turnNo++; this.s.turn = nextOf(p, this.np); }
    }
    if (runId === this.runId) this.setStage({ type: 'end' });
  }
  async moveBy(p, path) {
    const pl = this.s.players[p], from = path[0], to = path[path.length - 1], n = path.length - 1;
    pl.pos = to;
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
        await sleep(3400);
        await this.resolve(p, idx, pick); break;
      }
      case 'mind': {
        const a = nextOf(p, this.np);
        await this.intro({ p, field: idx, ft: 'mind', icon: '🧠', title: 'GEDANKENLESER', sub: `Runde 1: Alle lesen ${this.s.players[a].name}s Gedanken. Runde 2: ${pl.name} ist dran!` }, 2400);
        for (let r = 0; r < 2; r++) {
          const subject = r === 0 ? a : p, m = this.draw('mind', this.pools.mind);
          await this.ask({ kind: 'mind', text: m[0], self: m[1], options: m[2], subject }, { dur: 15, revealMs: 8000, ft: 'mind', title: `Runde ${r + 1}/2` });
        }
        break;
      }
      case 'bluff': case 'emoji': case 'draw': await this.dual(t, p, idx); break;
      case 'start': this.push(); await sleep(900); break;
      case 'cat': await this.keyQuestion(p, f.c, idx); break;
      case 'vault': await this.vault(p, f.c, idx); break;
      case 'blitz':
        await this.intro({ p, field: idx, ft: 'blitz', icon: FT.blitz.i, title: 'BLITZRUNDE!', sub: FT.blitz.sub }, 2000);
        for (let n = 1; n <= 5; n++) await this.ask(this.tfQ(), { dur: 5, title: `Blitz ${n}/5`, n, of: 5, revealMs: 2000, ft: 'blitz' });
        break;
      case 'est': {
        const e = this.draw('est', Q.est);
        await this.intro({ p, field: idx, ft: 'est', icon: FT.est.i, title: 'SCHÄTZ-DUELL', sub: FT.est.sub }, 1800);
        await this.ask({ kind: 'est', text: e[0], answer: e[1], unit: e[2] }, { dur: 20, revealMs: 7000, ft: 'est' });
        break;
      }
      case 'pair': {
        const w = this.draw('who', this.pools.who).replace(/^…\s*/, '');
        await this.intro({ p, field: idx, ft: 'pair', icon: '💘', title: 'WER WÜRDE EHER?', sub: FT.pair.sub + (this.s.streak >= 2 ? ` 🔥 Serie läuft: ${this.s.streak}!` : '') }, 2000);
        await this.ask({ kind: 'who', text: (this.np > 2 ? 'Wer von euch ' : 'Wer von euch beiden ') + w, options: this.s.players.map((_, i) => i) }, { dur: 12, revealMs: 8000, ft: 'pair' });
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
  // Jeder erstellt etwas; Spieler g errät die Kreation von Spieler (g+1)
  async dual(mode, p, idx) {
    const mult = this.mult(), n = this.np;
    await this.intro({ p, field: idx, ft: mode, icon: FT[mode].i, title: FT[mode].n.toUpperCase(), sub: FT[mode].sub }, 2400);
    const items = this.s.players.map(() => this.dualItem(mode));
    const wdur = mode === 'draw' ? 20 : 35;
    this.setStage({ type: 'dWrite', mode, items: items.map(it => it.pub), dur: wdur, answered: this.noAns(), mult });
    await this.waitFor(this.all(() => this.answers), wdur * 1000 + 4000);
    const made = this.answers.map(a => {
      let v = a && a.v ? String(a.v) : '';
      if (mode === 'draw') v = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 400000 ? v : '';
      else v = v.trim().slice(0, mode === 'emoji' ? 40 : 90);
      return v;
    });
    const opts = this.s.players.map((_, g) => items[nextOf(g, n)].opts(made[nextOf(g, n)]));
    this.lastRealForBot = opts[1] && opts[1].real;
    this.setStage({ type: 'dGuess', mode, made, opts: opts.map(o => o.list), prompt: this.s.players.map((_, g) => items[nextOf(g, n)].prompt), dur: 20, answered: this.noAns(), mult });
    await this.waitFor(this.all(() => this.answers), 21500);
    const picks = this.answers.map(a => a ? a.v : null), pts = new Array(n).fill(0), pl = this.s.players;
    for (let g = 0; g < n; g++) {
      const c = nextOf(g, n), o = opts[g];
      if (picks[g] === o.real) { pts[g] += 150 * mult; if (mode !== 'bluff' && made[c]) pts[c] += 100 * mult; }
      else if (mode === 'bluff' && picks[g] === o.fake) pts[c] += 150 * mult;
    }
    pts.forEach((v, i) => pl[i].score += v);
    this.setStage({ type: 'dReveal', mode, items: items.map(it => it.pub), made, opts: opts.map(o => o.list), real: opts.map(o => o.real), fake: opts.map(o => o.fake), picks, pts, mult });
    await this.waitFor(this.all(() => this.nexts), 10000 + n * 2000);
  }
  async comeback(p) {
    const pl = this.s.players[p], mult = this.mult(), n = this.np;
    await this.intro({ p, ft: 'comeback', icon: '🔥', title: 'COMEBACK-RISIKO!', sub: `${pl.name} setzt alles auf eine Schätzfrage: höchstens 5 % daneben = +${500 * mult}, höchstens 15 % = +${200 * mult}, sonst −150!` }, 3000);
    const e = this.draw('est', Q.est), q = { kind: 'est', text: e[0], answer: e[1], unit: e[2] };
    this.curQ = q;
    const pub = { kind: 'est', text: e[0], unit: e[2] };
    this.setStage({ type: 'q', q: pub, dur: 25, answered: this.noAns(), only: p, ft: 'comeback', mult });
    await this.waitFor(() => this.answers[p] || !pl.connected, 26500);
    const a = this.answers[p], v = a && isFinite(+a.v) ? +a.v : null, diff = v == null ? null : Math.abs(v - e[1]), rel = diff == null ? 1 : diff / Math.max(1e-9, Math.abs(e[1]));
    const pts = new Array(n).fill(0); let note;
    if (rel <= .05) { pts[p] = 500 * mult; note = '🎯 VOLLTREFFER! Das Comeback lebt!'; }
    else if (rel <= .15) { pts[p] = 200 * mult; note = '🔥 Nah dran – ordentlich Punkte zurückgeholt!'; }
    else { pts[p] = -Math.min(150, pl.score); note = '💥 Daneben – das Risiko hat sich nicht gelohnt …'; }
    pl.score += pts[p];
    const picks = new Array(n).fill(null), diffs = new Array(n).fill(null); picks[p] = v; diffs[p] = diff;
    this.setStage({ type: 'reveal', q: pub, answer: e[1], picks, ms: new Array(n).fill(null), pts, correct: pts.map(x => x > 0), note, diffs, only: p, ft: 'comeback', mult });
    await this.waitFor(this.all(() => this.nexts), 7000);
  }
  // ---- Computer-Gegner (Übungsspiel, immer Spieler 1)
  botAct(st) {
    const id = st.id, run = this.runId;
    const later = (ms, fn) => setTimeout(() => { if (this.s.stage.id === id && this.runId === run) fn(); }, ms);
    const act = a => this.onAction(1, a);
    switch (st.type) {
      case 'roll': if (st.p === 1) later(1100 + rand(700), () => act({ type: st.comeback && Math.random() < .5 ? 'comeback' : 'roll' })); break;
      case 'dWrite': later(st.mode === 'draw' ? 9000 : 6000 + rand(8000), () => act({ type: 'answer', sid: id, v: this.botMake(st), ms: 0 })); break;
      case 'dGuess': later(4000 + rand(6000), () => act({ type: 'answer', sid: id, v: Math.random() < .55 ? this.botReal(st) : rand(4), ms: 0 })); break;
      case 'choose': if (st.p === 1) later(2600 + rand(900), () => act({ type: 'choose', i: this.botPick(st) })); break;
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
    if (q.kind === 'who') return rand(this.np);
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
    const dur = o.dur || 15, mult = this.mult(), n = this.np, pl = this.s.players;
    const pub = { kind: q.kind, text: q.text, self: q.self, options: q.options, unit: q.unit, subject: q.subject };
    // Handicap: Wer mit 300+ Punkten führt, hat bei Wissensfragen weniger Zeit
    const durs = new Array(n).fill(dur), sc = pl.map(p => p.score), top = Math.max(...sc), second = sc.slice().sort((a, b) => b - a)[1] ?? top;
    if (['mc', 'tf', 'est'].includes(q.kind) && top - second >= 300) durs[sc.indexOf(top)] = Math.max(3, Math.round(dur * .7));
    const base = { cat: q.cat || null, ft: o.ft || null, title: o.title || null, n: o.n || null, of: o.of || null, mover: o.mover ?? null, mult, vault: o.vault || null, keyFor: o.keyFor ?? null, keyNo: o.keyNo ?? null, durs };
    this.curQ = q;
    this.setStage(Object.assign({ type: 'q', q: pub, dur, answered: this.noAns() }, base));
    await this.waitFor(this.all(() => this.answers), dur * 1000 + 1500);
    const A = this.answers.slice();
    const res = this.score(q, A, durs, mult);
    const talk = (q.kind === 'who' || q.kind === 'mind') ? this.pools.talk[rand(this.pools.talk.length)] : null;
    this.setStage(Object.assign({ type: 'reveal', q: pub, answer: q.answer, picks: A.map(a => a ? a.v : null), ms: A.map(a => a ? a.ms : null), pts: res.pts, correct: res.correct, note: res.note, diffs: res.diffs || null, streak: res.streak || 0, agree: !!res.agree, talk }, base));
    await this.waitFor(this.all(() => this.nexts), o.revealMs || 6000);
    return res;
  }
  score(q, A, durs, mult) {
    const pl = this.s.players, n = pl.length, pts = new Array(n).fill(0), correct = new Array(n).fill(false);
    let note = '', diffs = null, streak = 0, agree = false;
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
      const right = correct.map((c, i) => c ? i : -1).filter(i => i >= 0);
      if (right.length > 1) { const f = right.sort((a, b) => A[a].ms - A[b].ms)[0]; note = `⚡ ${pl[f].name} war am schnellsten!`; }
      else if (!right.length) note = n > 2 ? 'Alle daneben 🙈' : 'Beide daneben 🙈';
    } else if (q.kind === 'est') {
      diffs = A.map(a => (a && a.v !== '' && a.v != null && isFinite(+a.v)) ? Math.abs(+a.v - q.answer) : null);
      const valid = diffs.filter(d => d !== null);
      if (valid.length) {
        const best = Math.min(...valid);
        diffs.forEach((d, i) => {
          if (d === best) { correct[i] = true; pts[i] = 200 * mult; if (d <= Math.abs(q.answer) * .01) { pts[i] += 100 * mult; note = '🎯 VOLLTREFFER! +100 Bonus'; } }
        });
        const w = correct.map((c, i) => c ? i : -1).filter(i => i >= 0);
        if (!note) note = w.length > 1 ? 'Gleich nah dran – Punkte für mehrere!' : `🎯 ${pl[w[0]].name} war am nächsten dran!`;
      } else note = 'Keiner hat geschätzt 😴';
    } else if (q.kind === 'who') {
      const votes = A.map(a => a ? a.v : null), cnt = {};
      votes.forEach(v => { if (v != null) cnt[v] = (cnt[v] || 0) + 1; });
      const maxC = Math.max(0, ...Object.values(cnt)), tops = Object.keys(cnt).filter(k => cnt[k] === maxC);
      agree = votes.every(v => v != null) && maxC === n;
      if (agree) {
        votes.forEach((_, i) => { pts[i] = 100 * mult; correct[i] = true; });
        note = n > 2 ? `Alle einig! 💞 Es trifft ${pl[+tops[0]].name}!` : 'Einig! 💞 Punkte für beide';
      } else if (n > 2 && maxC >= 2 && tops.length === 1) {
        votes.forEach((v, i) => { if (v === +tops[0]) { pts[i] = 60 * mult; correct[i] = true; } });
        note = `Mehrheit: Es trifft ${pl[+tops[0]].name}! 🙈`;
      } else note = 'Uneinig! 🙈 Das müsst ihr ausdiskutieren …';
    } else if (q.kind === 'mind') {
      const sv = A[q.subject] ? A[q.subject].v : null;
      let hits = 0, guessers = 0;
      A.forEach((a, i) => { if (i === q.subject) return; guessers++; if (sv != null && a && a.v === sv) { hits++; correct[i] = true; pts[i] = 150 * mult; } });
      if (hits) { pts[q.subject] = 50 * hits * mult; correct[q.subject] = true; }
      agree = sv != null && hits === guessers && guessers > 0;
      const S = pl[q.subject].name;
      note = sv == null ? `${S} hat nicht geantwortet 😴` : agree ? (n > 2 ? `🧠 Alle haben ${S}s Gedanken gelesen!` : `🧠 Gedanken gelesen! ${pl[nextOf(q.subject, 2)].name} kennt ${S} genau.`) : hits ? `🧠 ${hits} von ${guessers} lagen richtig!` : `Daneben! 🙈 Keiner kennt ${S} so richtig …`;
    }
    if (q.kind === 'who' || q.kind === 'mind') {
      if (agree) {
        streak = this.s.streak = (this.s.streak || 0) + 1;
        if (streak >= 3) { pts.forEach((_, i) => pts[i] += 100 * mult); note += ` 🔥 ${streak}er-Serie: +${100 * mult} Bonus für alle!`; }
      } else this.s.streak = 0;
    }
    pts.forEach((p, i) => { pl[i].score += p; });
    return { pts, correct, note, diffs, streak, agree };
  }
  async keyQuestion(p, cat, idx, intro) {
    const pl = this.s.players[p], k = keyCount(pl, cat), full = k >= KEYS_NEEDED || pl.crowns[cat];
    await this.intro({ p, field: idx, cat, catIntro: true, anim: rand(4), icon: CATS[cat].i, title: CATS[cat].n, keyNo: full ? null : k + 1, sub: intro || (full ? (pl.crowns[cat] ? 'Tresor schon geknackt – Punkte-Duell!' : 'Schlüsselbund voll – ab in den Tresorraum! Jetzt: Punkte-Duell.') : `Richtig = Schlüssel ${k + 1}/${KEYS_NEEDED} für ${pl.name}`) }, intro ? 2600 : 1500);
    const r = await this.ask(this.mcQ(cat), { dur: 15, mover: p, keyFor: full ? null : p, keyNo: full ? null : k + 1 });
    if (r.correct[p] && !full) { this.giveKey(p, cat); await sleep(1300); }
  }
  giveKey(p, cat) {
    const pl = this.s.players[p], n = Math.min(KEYS_NEEDED, keyCount(pl, cat) + 1);
    pl.keys[cat] = n;
    this.setStage({ type: 'keyGot', p, cat, n });
  }
  async vault(p, cat, idx) {
    const pl = this.s.players[p], race = this.s.settings.win === 'vault';
    if (pl.crowns[cat]) {
      await this.intro({ p, field: idx, cat, icon: '👑', title: 'SCHON GEKNACKT', sub: `Dieser Tresor gehört ${pl.name} schon. Bonusfrage!` }, 2000);
      await this.ask(this.mcQ(cat), { dur: 15, mover: p, title: 'Bonusfrage' });
      return;
    }
    const k = keyCount(pl, cat);
    if (k < KEYS_NEEDED) { await this.keyQuestion(p, cat, idx, `🔒 Verschlossen! ${pl.name} fehlen noch ${KEYS_NEEDED - k} Schlüssel für diesen Tresor. Trostpreis: eine Schlüssel-Frage!`); return; }
    const need = race ? 3 : 2; // Tresor-Rennen: alle 3 Fragen müssen sitzen
    await this.intro({ p, field: idx, cat, vaultIntro: true, hasKey: true, icon: CATS[cat].i, title: 'TRESOR!', sub: `${pl.name} steckt alle ${KEYS_NEEDED} 🔑 ins Schloss von „${CATS[cat].n}“. ${need === 3 ? 'Alle 3' : '2 von 3'} Fragen richtig = Krone!` }, 3000);
    let got = 0; const marks = [];
    for (let n = 1; n <= 3; n++) {
      const r = await this.ask(this.mcQ(cat), { dur: 14, mover: p, title: `Tresor ${n}/3`, n, of: 3, vault: { need, marks: marks.slice(), p }, revealMs: 4500 });
      marks.push(r.correct[p] ? 1 : 0); if (r.correct[p]) { got++; pl.vr = (pl.vr || 0) + 1; }
      if (got >= need || (3 - n) < (need - got)) break;
    }
    const success = got >= need, bonus = 300 * this.mult();
    if (success) { pl.crowns[cat] = true; delete pl.keys[cat]; pl.score += bonus; }
    if (race && crownCount(pl) >= VAULT_GOAL) { this.s.winner = p; this.s.winBy = 'vault'; this.toast(`🔐 ${pl.name} hat ${VAULT_GOAL} Tresore geknackt – SIEG!`); }
    this.setStage({ type: 'vaultResult', p, cat, success, got, need, marks, bonus });
    await this.waitFor(this.all(() => this.nexts), 5000);
  }
  // Quatsch: alle schreiben, Spieler i bewertet die Antwort von Spieler (i+1)
  async quatsch(p, idx) {
    const prompt = this.draw('free', this.pools.free), mult = this.mult(), n = this.np;
    await this.intro({ p, field: idx, ft: 'free', icon: '🤪', title: 'QUATSCH-RUNDE', sub: FT.free.sub }, 2000);
    this.setStage({ type: 'free', text: prompt, dur: 30, answered: this.noAns(), mult });
    await this.waitFor(this.all(() => this.answers), 31500);
    const texts = this.answers.map(a => a && a.v ? String(a.v).trim().slice(0, 90) : '');
    this.setStage({ type: 'rate', text: prompt, texts, dur: 20, answered: this.noAns(), mult });
    await this.waitFor(this.all(() => this.answers), 21500);
    const rates = this.answers.map(a => a ? a.v : null);
    const pl = this.s.players, pts = new Array(n).fill(0), VAL = [0, 75, 150];
    for (let i = 0; i < n; i++) {
      const j = nextOf(i, n);
      if (texts[j] && rates[i] != null) { pts[j] = (VAL[rates[i]] || 0) * mult; pl[j].stats.laughs += pts[j]; if (rates[i] === 2) pl[j].stats.bruller++; }
    }
    pts.forEach((v, i) => pl[i].score += v);
    this.setStage({ type: 'rated', text: prompt, texts, rates, pts, mult });
    await this.waitFor(this.all(() => this.nexts), 8000);
  }
  async luck(p, idx) {
    const pl = this.s.players, me = pl[p], others = pl.filter((_, i) => i !== p), mult = this.mult();
    const pick = rand(LUCK.length), ev = LUCK[pick].id;
    this.setStage({ type: 'luck', p, field: idx, items: LUCK.map(l => l.l), pick });
    await sleep(3600);
    switch (ev) {
      case 'plus': me.score += 150 * mult; this.toast(`🎁 ${me.name} +${150 * mult}`); break;
      case 'steal': { const v = others.slice().sort((a, b) => b.score - a.score)[0], a = Math.min(100, v.score); v.score -= a; me.score += a; this.toast(`🦹 ${me.name} klaut ${a} Punkte von ${v.name}!`); break; }
      case 'swap': { const o = others[rand(others.length)]; [me.pos, o.pos] = [o.pos, me.pos]; this.toast(`🔄 Platztausch mit ${o.name}!`); break; }
      case 'minus': me.score = Math.max(0, me.score - 100); this.toast(`💩 ${me.name} −100`); break;
      case 'again': this.extraTurn = true; this.toast(`🎲 ${me.name} darf nochmal!`); break;
      case 'key': case 'key2': {
        const open = () => this.s.cats.filter(c => keyCount(me, c) < KEYS_NEEDED && !me.crowns[c]);
        for (let k = 0; k < (ev === 'key2' ? 2 : 1); k++) {
          const free = open();
          if (free.length) { this.giveKey(p, free[rand(free.length)]); await sleep(1500); }
          else { me.score += 150 * mult; this.toast(`🎁 Alle Schlüssel schon da – +${150 * mult}`); }
        }
        break;
      }
      case 'vault': {
        const ready = this.s.cats.filter(c => keyCount(me, c) >= KEYS_NEEDED && !me.crowns[c]);
        if (!ready.length) { this.toast('🌀 Noch kein voller Schlüsselbund – dafür gibt\'s einen Schlüssel!'); this.push(); await sleep(900); const free = this.s.cats.filter(c => keyCount(me, c) < KEYS_NEEDED && !me.crowns[c]); if (free.length) { this.giveKey(p, free[rand(free.length)]); await sleep(1500); } break; }
        const target = this.s.fields.findIndex(f => f && f.t === 'vault' && f.c === ready[rand(ready.length)]);
        this.push(); await sleep(400);
        await this.moveBy(p, shortestPath(me.pos, target));
        await this.resolve(p, me.pos); return;
      }
    }
    this.push(); await sleep(1200);
  }
}

/* ---------------- Client-Zustand ---------------- */
const C = { me: 0, s: null, stageId: null, t0: 0, isHost: false, host: null, net: null, toastId: 0, raf: 0, anim: {}, diceSpin: 0, myAns: null, screen: '', boardSig: '', keyOpen: false, tokenSig: [] };
const app = $('#app');
const NP = () => C.s ? C.s.players.length : 2;
const others = () => C.s.players.map((_, i) => i).filter(i => i !== C.me);

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
// iPhone-Fix: Nach der Bildschirmtastatur bleibt die Seite intern verschoben → Tippflächen liegen versetzt.
// Deshalb nach jedem Verlassen eines Eingabefeldes und bei Viewport-Änderungen zurück auf 0 scrollen.
const resetViewport = () => { if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return; window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; };
document.addEventListener('focusout', () => setTimeout(resetViewport, 60));
if (window.visualViewport) { visualViewport.addEventListener('resize', () => setTimeout(resetViewport, 60)); visualViewport.addEventListener('scroll', () => setTimeout(resetViewport, 60)); }
window.addEventListener('scroll', () => { if (window.scrollY) resetViewport(); });

function applyLook(st) {
  document.body.dataset.theme = (st && st.theme) || 'neon';
  document.body.dataset.dice = (st && st.dice) || 'classic';
}
function leaveGame() {
  try { if (!C.isHost && C.net) C.net.send({ t: 'leave' }); } catch (e) {}
  try { C.net && C.net.destroy(); } catch (e) {}
  if (C.host) C.host.runId++;
  Object.assign(C, { net: null, host: null, isHost: false, s: null, stageId: null, boardSig: '' });
  closeSheet(); closeDrawer(); banner(''); cancelAnimationFrame(C.raf);
  const fin = $('#finale'); if (fin) fin.remove();
  applyLook(null);
  showHome();
}

/* ---------------- Screens ---------------- */
function setScreen(name, html) { C.screen = name; app.innerHTML = `<section class="screen ${name}">${html}</section>`; return app.firstElementChild; }
const logoHTML = (cls = '') => `<div class="logo ${cls}">${'KOPFNUSS'.split('').map((l, i) => `<span style="animation-delay:${i * 60}ms">${l}</span>`).join('')}</div>`;

function showSplash() {
  const el = setScreen('splash', `<div class="rays"></div><div class="nut">🧠</div>${logoHTML()}<div><span class="tagline">Das Quiz-Duell für 2–4</span></div><div class="spacer" style="flex:0 0 30px"></div><div class="tap">👆 Tippen zum Starten</div>`);
  el.addEventListener('click', () => { Sound.init(); Sound.whoosh(); const code = (PARAMS.get('join') || '').toUpperCase(); code && P.name ? showJoin(code) : showHome(); }, { once: true });
}

function statsHTML() {
  const st = loadStats();
  if (!st.games) return `<div class="card col center"><div class="label">📊 Deine Bilanz</div><div style="font-size:40px">🏁</div><div style="font-weight:800">Noch keine Spiele – leg los!</div><div class="muted" style="font-size:13px;font-weight:700">Hier erscheinen danach Siege, Trefferquote, Lieblingskategorie & mehr.</div></div>`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const cats = Object.entries(st.cat).filter(([c, v]) => CATS[c] && v[1] >= 3).map(([c, v]) => [c, pct(v[0], v[1]), v[1]]).sort((a, b) => b[1] - a[1]);
  const tile = (i, v, l) => `<div class="stile"><b>${i}</b><span>${v}</span><small>${l}</small></div>`;
  const vs = Object.entries(st.vs).sort((a, b) => (b[1].w + b[1].l + b[1].d) - (a[1].w + a[1].l + a[1].d)).slice(0, 4);
  const RES = { w: '🏆', l: '😤', d: '🤝' };
  return `<div class="card col">
    <div class="label">📊 Deine Bilanz</div>
    <div class="stiles">${tile('🎮', st.games, 'Spiele')}${tile('🏆', st.wins, `Siege · ${pct(st.wins, st.games)} %`)}${tile('🎯', pct(st.right, st.ans) + ' %', 'Trefferquote')}
      ${tile('⭐', st.best, 'Rekord')}${tile('👑', st.crowns, 'Kronen')}${tile('😂', st.bruller, 'Brüller')}</div>
    ${cats.length ? `<div class="srow"><span>💪 Stärkste Kategorie</span><b>${CATS[cats[0][0]].i} ${CATS[cats[0][0]].s} · ${cats[0][1]} %</b></div>` : ''}
    ${cats.length > 1 ? `<div class="srow"><span>🙈 Ausbaufähig</span><b>${CATS[cats[cats.length - 1][0]].i} ${CATS[cats[cats.length - 1][0]].s} · ${cats[cats.length - 1][1]} %</b></div>` : ''}
    ${cats.length ? `<div class="catbars">${cats.map(([c, p]) => `<div class="cbar" title="${esc(CATS[c].n)}"><i style="height:${Math.max(6, p)}%;background:${CATS[c].c}"></i><span>${CATS[c].i}</span></div>`).join('')}</div>` : ''}
    ${vs.map(([n, v]) => `<div class="srow"><span>⚔️ gegen ${esc(n)}</span><b>${v.w} : ${v.l}${v.d ? ` · ${v.d} Remis` : ''}</b></div>`).join('')}
    ${st.recent.length ? `<div class="label" style="margin-top:4px">Letzte Spiele</div>${st.recent.map(r => `<div class="srow"><span>${RES[r.res]} ${r.n > 2 ? `Platz ${r.place}/${r.n} · ` : ''}vs ${esc(r.oph || '')} ${esc(r.opn)}</span><b>${r.me} : ${r.op}</b></div>`).join('')}` : ''}
  </div>`;
}

function showHome() {
  const el = setScreen('home', `
    <div class="topbar"><button class="iconbtn" id="snd">${Sound.on ? '🔊' : '🔇'}</button><button class="iconbtn" id="prefs">⚙️</button><div class="spacer"></div><button class="iconbtn" id="rules">❓</button></div>
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
      <button class="btn" id="host">🎮 Spiel erstellen <small class="bsub">2–4 Spieler</small></button>
      <button class="btn cyan" id="join">🔑 Mit Code beitreten</button>
      <button class="btn ghost" id="bot">🤖 Übungsspiel gegen den Computer</button>
    </div>
    ${statsHTML()}
    <div style="height:10px;flex:none"></div>`);
  $('#snd', el).onclick = e => { Sound.on = !Sound.on; store.set('kn_sound', Sound.on); e.currentTarget.textContent = Sound.on ? '🔊' : '🔇'; Sound.click(); };
  $('#prefs', el).onclick = showPrefs;
  $('#rules', el).onclick = showRules;
  $('#edit', el).onclick = () => { Sound.click(); showCreator(); };
  const need = () => { if (!P.name) { showCreator(true); return false; } return true; };
  $('#host', el).onclick = () => { Sound.click(); if (need()) startHost(); };
  $('#join', el).onclick = () => { Sound.click(); if (need()) showJoin(''); };
  $('#bot', el).onclick = () => { Sound.click(); if (need()) startBot(); };
}
function showPrefs() {
  Sound.click();
  const row = (k, l, d) => `<div class="prefrow"><div><b>${l}</b><small>${d}</small></div><button class="toggle ${PREFS[k] ? 'on' : ''}" data-k="${k}"><i></i></button></div>`;
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:var(--cyan)">⚙️ Einstellungen</span><div class="spacer"></div><button class="iconbtn" id="closeP">✕</button></div>
    ${row('names', 'Namen unter den Emojis', 'Bei der Auflösung steht klein der Name unter jedem Spieler-Emoji')}
    <button class="btn" id="okP" style="margin-top:16px">Fertig</button>`, '#22d3ff');
  $$('.toggle', panel).forEach(b => b.onclick = () => { const k = b.dataset.k; PREFS[k] = !PREFS[k]; store.set('kn_prefs', PREFS); b.classList.toggle('on', PREFS[k]); Sound.click(); });
  $('#closeP').onclick = $('#okP').onclick = () => { Sound.click(); closeSheet(); };
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
      ${[['hat', '🎩 Hüte & Kopfschmuck'], ['glasses', '👓 Brillen'], ['aura', '✨ Effekte']].map(([k, l]) => `<div class="label">${l} <span class="muted" style="letter-spacing:0">– durch Spiele & Siege freischalten</span></div>
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
    Sound.click(); setHead(g); own.value = ''; own.blur();
  };
  $('#ownok', el).onclick = takeOwn; own.addEventListener('keydown', e => { if (e.key === 'Enter') takeOwn(); });
  $$('.color', el).forEach(b => b.onclick = () => { Sound.click(); P.color = b.dataset.c; saveProfile(); $$('.color', el).forEach(x => x.classList.toggle('sel', x === b)); redraw(); });
  $$('.acc', el).forEach(b => b.onclick = () => { Sound.click(); const k = b.dataset.k; P[k] = b.dataset.v; saveProfile(); $$(`.acc[data-k="${k}"]`, el).forEach(x => x.classList.toggle('sel', x === b)); redraw(); });
  const done = () => { if (!P.name) { name.focus(); name.style.boxShadow = '0 0 0 4px var(--pink)'; vibrate(80); return; } name.blur(); Sound.ok(); showHome(); };
  $('#done', el).onclick = done; $('#back', el).onclick = () => { Sound.click(); name.blur(); showHome(); };
}

function showRules() {
  const panel = openSheet(`<div class="rules">
    <div class="qhead"><span class="pill" style="--cc:var(--yellow)">❓ So geht's</span><div class="spacer"></div><button class="iconbtn" id="closeR">✕</button></div>
    <h3>👥 2 bis 4 Spieler</h3><p>Einer erstellt das Spiel, die anderen treten mit dem Code bei. Bei jeder Frage antworten <b>alle gleichzeitig</b> – richtig & schnell = bis zu 200 Punkte.</p>
    <h3>🗺️ Das Brett</h3><p>Außen läuft ein großer Ring, vier Wege führen nach innen in den <b>Tresorraum</b>. Du würfelst mit <b>zwei Würfeln</b>, wählst einen und läufst genau so viele Felder – an Kreuzungen entscheidest du die Richtung. Tipp auf ein Feld, um zu sehen, was dort wartet.</p>
    <h3>🔑 Schlüssel sammeln</h3><p>Kategorie-Felder sind <b>Schlüssel-Fragen</b>: richtig = 1 Schlüssel. Pro Kategorie brauchst du <b>${KEYS_NEEDED}</b>. Oben in der Leiste siehst du, wer was hat – antippen für Details.</p>
    <h3>🏛️ Tresorraum</h3><p>Erst mit ${KEYS_NEEDED}🔑 einer Kategorie darfst du hinein. Am passenden Tresor gibt es 3 Fragen: <b>2 richtig</b> (im Tresor-Rennen: <b>alle 3</b>) = 👑 Krone + 300 Punkte.</p>
    <h3>🎉 Sonderfelder</h3><p><b>⚡ Blitzrunde</b> · <b>🎯 Schätz-Duell</b> · <b>💘 Wer würde eher?</b> · <b>🧠 Gedankenleser</b> · <b>🃏 Bluffmeister</b> · <b>😜 Emoji-Übersetzer</b> · <b>✏️ Kritzel-Kopf</b> · <b>🤪 Quatsch-Runde</b> · <b>🎰 Glücksrad</b> · <b>❓ Überraschung</b>.</p>
    <h3>🔥 Serie, Handicap & Comeback</h3><p>3 Übereinstimmungen in Folge bringen Bonuspunkte. Wer deutlich führt, hat bei Wissensfragen weniger Zeit. Wer 400+ Punkte hinten liegt, kann eine <b>Comeback-Risikorunde</b> wagen.</p>
    <h3>🏆 Sieg</h3><p><b>Punkte-Sieg:</b> Nach 6 bis 50 Runden gewinnt, wer die meisten Punkte hat – die letzte Runde zählt doppelt. <b>Tresor-Rennen:</b> Wer zuerst <b>${VAULT_GOAL} Tresore knackt</b>, gewinnt sofort.</p>
    <button class="btn" id="okR" style="margin-top:16px">Alles klar!</button></div>`, '#ffd60a');
  $('#closeR', panel).onclick = $('#okR', panel).onclick = () => { Sound.click(); closeSheet(); };
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
    },
    onMsg: m => g.onMsg(m),
    onLeave: pid => g.onLeave(pid),
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
  $('#back', el).onclick = () => { Sound.click(); inp.blur(); showHome(); };
  const doJoin = () => {
    const code = inp.value.trim().toUpperCase();
    if (code.length !== 4) { msg.textContent = 'Der Code hat 4 Zeichen.'; vibrate(80); return; }
    inp.blur(); Sound.click(); go.disabled = true; msg.innerHTML = '<span class="waiting-dots">Verbinde</span>';
    joinGame(code, err => { go.disabled = false; msg.textContent = err; vibrate([60, 40, 60]); Sound.bad(); });
  };
  go.onclick = doJoin;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  if (prefill && prefill.length === 4) setTimeout(doJoin, 400);
}
function joinGame(code, onFail) {
  C.isHost = false; C.me = 1;
  let welcomed = false; C.rev = 0;
  const failT = setTimeout(() => { if (!welcomed) { t.destroy(); C.net = null; onFail('Keine Antwort vom Spiel. Code richtig? Ist das andere Handy noch in der Lobby?'); } }, 15000);
  const t = new GuestTransport(code, {
    onOpen: () => {
      banner('');
      const hello = () => t.send({ t: 'hello', profile: profileOf() });
      hello(); clearInterval(t.helloIv); let n = 0;
      t.helloIv = setInterval(() => { if (welcomed || ++n > 8 || t.destroyed) { clearInterval(t.helloIv); return; } hello(); }, 1500);
    },
    onMsg: m => {
      if (m.t === 'welcome') { if (m.pid && m.pid !== P.pid) return; welcomed = true; clearTimeout(failT); C.me = m.you; }
      else if (m.t === 'state') { if (welcomed && !(C.rev && m.s.rev && m.s.rev < C.rev && m.s.rev > C.rev - 1e6 && m.s.code === (C.s && C.s.code))) { C.rev = m.s.rev; const i = m.s.players.findIndex(p => p.pid === P.pid); if (i >= 0) C.me = i; onState(m.s); } }
      else if (m.t === 'full') { if (m.pid && m.pid !== P.pid) return; clearTimeout(failT); t.destroy(); C.net = null; if (welcomed) { errorScreen('Du wurdest aus der Lobby entfernt oder das Spiel ist voll.'); return; } onFail('Dieses Spiel ist schon voll (max. 4 Spieler) oder läuft bereits.'); }
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
  applyLook(s.settings);
  if (s.toast && s.toast.id !== C.toastId) { C.toastId = s.toast.id; if (C.screen === 'game' || C.screen === 'lobby') toast(s.toast.text); }
  if (s.phase === 'lobby') renderLobby(s);
  else renderGame(s);
}

function renderLobby(s) {
  const isHost = C.isHost, pl = s.players, ready = pl.length >= 2, st = s.settings, catsOk = s.cats.length >= 3, bot = s.code === 'BOT';
  const slot = (p, i) => p ? `<div class="pslot filled">${isHost && i > 0 && !bot ? `<button class="kick" data-kick="${i}">✕</button>` : ''}<div class="slotfig">${figureHTML(p, 'idle')}</div><div class="name">${esc(p.name)}${i === C.me ? ' (du)' : ''}</div></div>`
    : `<div class="pslot"><div style="font-size:30px;opacity:.5">❔</div><div class="muted waiting-dots" style="font-weight:800;font-size:13px">frei</div></div>`;
  const nSlots = bot ? 2 : Math.max(2, Math.min(MAX_PLAYERS, pl.length + 1));
  const codeHTML = s.online || !isHost ? `<div class="codebox">${s.code.split('').map((c, i) => `<span style="animation-delay:${i * 80}ms">${c}</span>`).join('')}</div>`
    : `<div class="center muted waiting-dots" style="font-weight:800;padding:26px">Code wird erstellt</div>`;
  const dis = isHost ? '' : 'disabled';
  const chips = CAT_KEYS.map(c => `<button class="chip ${s.cats.includes(c) ? 'on' : ''}" data-cat="${c}" style="--cc:${CATS[c].c}" ${isHost && st.mode === 'custom' ? '' : 'disabled'}>${CATS[c].i} ${CATS[c].s}</button>`).join('');
  const html = `
    <div class="topbar"><button class="iconbtn" id="leave">←</button><div class="spacer"></div><span class="label">Lobby</span><div class="spacer"></div><button class="iconbtn" id="rules">❓</button></div>
    ${bot ? `<div class="card col center"><div class="label">Übungsspiel</div><div style="font-size:44px">🤖</div><div style="font-weight:800">Du spielst gegen Robo, den Computer. Perfekt zum Reinschnuppern!</div></div>` : `<div class="card col center">
      <div class="label">Spiel-Code</div>
      ${codeHTML}
      ${isHost ? `<p class="muted" style="margin:4px 0 0;font-weight:700;font-size:14px">Bis zu 3 Mitspieler geben diesen Code ein</p>${navigator.share ? '<button class="btn ghost small" id="share" style="align-self:center">📤 Einladung teilen</button>' : ''}` : ''}
    </div>`}
    <div class="slots n${nSlots}">${Array.from({ length: nSlots }, (_, i) => slot(pl[i], i)).join('')}</div>
    <div class="card col">
      <div class="label">Wer spielt?</div>
      <div class="seg two">${[['love', '💘 Verliebt', 'Mit Pärchen- & heißen Fragen'], ['friends', '🤝 Freunde', 'Ohne Romantik-Fragen']].map(([k, n, d]) => `<button data-rel="${k}" class="${(st.relation || 'love') === k ? 'sel' : ''}" ${dis}>${n}<small>${d}</small></button>`).join('')}</div>
      <div class="label">Kategorien</div>
      <div class="seg">${Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}" class="${st.mode === k ? 'sel' : ''}" ${dis}>${m.i} ${m.n}<small>${m.d}</small></button>`).join('')}</div>
      <div class="chips">${chips}</div>
      ${catsOk ? '' : '<div class="center" style="color:var(--pink);font-weight:900">Mindestens 3 Kategorien wählen!</div>'}
      <div class="label">Spiellänge</div>
      <div class="seg">${[[6, 'Quickie', '~10 Min'], [10, 'Normal', '~20 Min'], [15, 'Lang', '~30 Min'], [25, 'Marathon', '~50 Min'], [50, 'Mega', '~1,5 Std']].map(([v, n, d]) => `<button data-t="${v}" class="${st.turns === v ? 'sel' : ''}" ${dis}>${n}<small>${v} Runden · ${d}</small></button>`).join('')}</div>
      <div class="label">Wer gewinnt?</div>
      <div class="seg two">${[['points', '🏆 Punkte-Sieg', 'Meiste Punkte nach allen Runden'], ['vault', '🔐 Tresor-Rennen', `Wer zuerst ${VAULT_GOAL} Tresore knackt (je 3/3 richtig), gewinnt sofort`]].map(([k, n, d]) => `<button data-win="${k}" class="${(st.win || 'points') === k ? 'sel' : ''}" ${dis}>${n}<small>${d}</small></button>`).join('')}</div>
      <div class="label">Würfel-Design</div>
      <div class="chips">${Object.entries(DICE).map(([k, n]) => `<button class="chip look ${(st.dice || 'classic') === k ? 'on' : ''}" data-dice="${k}" ${dis}>${n}</button>`).join('')}</div>
      <div class="label">Hintergrund & Spielfeld</div>
      <div class="chips">${Object.entries(THEMES).map(([k, n]) => `<button class="chip look ${(st.theme || 'neon') === k ? 'on' : ''}" data-theme="${k}" ${dis}>${n}</button>`).join('')}</div>
    </div>
    <div class="spacer" style="min-height:14px"></div>
    ${isHost ? `<button class="btn ${ready && catsOk ? 'pink' : ''}" id="start" ${ready && catsOk ? '' : 'disabled'}>${ready ? `🚀 Los geht's! (${pl.length} Spieler)` : 'Warte auf Mitspieler …'}</button>`
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
    const set = patch => { Sound.click(); act({ type: 'settings', patch }); };
    $$('[data-t]', el).forEach(b => b.onclick = () => set({ turns: +b.dataset.t }));
    $$('[data-mode]', el).forEach(b => b.onclick = () => set({ mode: b.dataset.mode }));
    $$('[data-rel]', el).forEach(b => b.onclick = () => set({ relation: b.dataset.rel }));
    $$('[data-win]', el).forEach(b => b.onclick = () => set({ win: b.dataset.win }));
    $$('[data-dice]', el).forEach(b => b.onclick = () => set({ dice: b.dataset.dice }));
    $$('[data-theme]', el).forEach(b => b.onclick = () => set({ theme: b.dataset.theme }));
    $$('[data-kick]', el).forEach(b => b.onclick = () => { if (confirm('Spieler aus der Lobby entfernen?')) act({ type: 'kick', i: +b.dataset.kick }); });
    $$('.chip[data-cat]', el).forEach(b => b.onclick = () => { const c = b.dataset.cat, cur = st.custom.slice(); set({ custom: cur.includes(c) ? cur.filter(x => x !== c) : cur.concat(c) }); });
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
function fieldInfo(f) {
  if (f.t === 'cat') return [`${CATS[f.c].i} ${CATS[f.c].n}`, `Schlüssel-Frage · ${CATS[f.c].d}`];
  if (f.t === 'vault') return [`🔐 Tresor: ${CATS[f.c].s}`, `Mit ${KEYS_NEEDED}🔑 ${CATS[f.c].s} knacken – 3 Fragen, dann gibt's die 👑`];
  if (f.t === 'start') return ['🚀 Start', FT.start.d];
  return [`${FT[f.t].i} ${FT[f.t].n}`, FT[f.t].d];
}
function buildGame(s) {
  const el = setScreen('game', `
    <header class="hud" id="hud"></header>
    <div class="keybar" id="keybar"></div>
    <div class="boardwrap" id="bw"><div class="sparkles">${Array.from({ length: 12 }, () => `<i style="left:${rand(100)}%;animation-delay:${-rand(8000)}ms;animation-duration:${6 + rand(6)}s"></i>`).join('')}</div><div class="board" id="board"></div></div>
    <div class="statusline" id="status"></div>
    <footer class="actionbar" id="ab"></footer>`);
  buildBoardDOM(s);
  $('#keybar', el).onclick = () => { C.keyOpen = !C.keyOpen; Sound.click(); updateHud(C.s); };
  C.stageId = null; C.anim = {};
  keepAwake();
}
function buildBoardDOM(s) {
  const board = $('#board'); if (!board) return;
  C.boardSig = JSON.stringify(s.fields);
  board.innerHTML = s.fields.map((f, i) => {
    const [c, r] = gridPos(i), m = fieldMeta(f);
    const cls = 'field ' + (f.t === 'vault' ? 'vault' : f.t === 'cat' ? 'catf' : f.t === 'start' ? 'start' : 'special') + ' z-' + NODES[i].zone;
    return `<div class="${cls}" id="f${i}" data-i="${i}" style="grid-column:${c};grid-row:${r};--fc:${m.color};--d:${(i * 0.17).toFixed(2)}s"><span class="fi">${m.icon}</span>${f.t === 'vault' ? '<span class="dial"></span><span class="owners"></span>' : ''}</div>`;
  }).join('') + `<div class="vaultroom"><div class="vr-glow"></div><div class="vr-frame"></div></div><div class="vrcore"><span class="vr-door"><b>🔐</b></span><b class="vr-label">TRESOR</b></div>
    <div class="dicearea" id="dicearea"><div class="arena"></div></div>
    <div class="logoarea"><div class="centerlogo">KOPF<br>NUSS</div></div>
    ${[0, 1].map(i => `<div class="dthrow" id="dt${i}"><div class="dshadow"></div><div class="dicebox"><div class="dice" id="dice${i}">${diceFaces()}</div></div></div>`).join('')}
    ${s.players.map((_, i) => `<div class="token" id="tk${i}"><div class="tshadow"></div><div class="stand"><div class="hopper"></div></div></div>`).join('')}
    <div class="finfo" id="finfo"><b></b><small></small></div>`;
  board.onclick = e => {
    const f = e.target.closest('.field'); if (!f || !C.s) return;
    const st = C.s.stage, i = +f.dataset.i;
    if (f.classList.contains('target') && st.type === 'choose' && st.p === C.me && !C.chose) { const k = st.opts.findIndex(o => o.to === i); if (k >= 0) { choose(k); return; } }
    showFieldInfo(i);
  };
  C.tokenSig = [];
  sizeBoard();
  placeDice(s.lastDice);
}
function showFieldInfo(i) {
  const f = C.s.fields[i], el = $('#f' + i), box = $('#finfo'); if (!f || !el || !box) return;
  $$('.field.peek').forEach(x => x.classList.remove('peek'));
  const [t, d] = fieldInfo(f);
  box.querySelector('b').textContent = t; box.querySelector('small').textContent = d;
  el.classList.add('peek');
  const bw = $('#board').offsetWidth, w = Math.min(bw * .8, 240);
  let x = el.offsetLeft + el.offsetWidth / 2 - w / 2; x = Math.max(0, Math.min(bw - w, x));
  box.style.width = w + 'px';
  box.style.transform = `translate3d(${x}px,${el.offsetTop - 6}px,30px) rotateX(calc(var(--tilt) * -1)) translateY(-100%)`;
  box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
  Sound.pop();
  clearTimeout(C.infoT); C.infoT = setTimeout(() => { box.classList.remove('show'); el.classList.remove('peek'); }, 2600);
}
function diceFaces() { return [1, 2, 3, 4, 5, 6].map(n => `<div class="dface f${n}">${pips(n)}</div>`).join(''); }
function pips(n) {
  const on = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n];
  return Array.from({ length: 9 }, (_, i) => on.includes(i) ? '<i></i>' : '<b></b>').join('');
}
const DICE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
function setDice(vals, spin) {
  if (spin) C.diceSpin += 3;
  [0, 1].forEach(i => {
    const d = $('#dice' + i); if (!d) return;
    const r = DICE_ROT[vals[i]] || [0, 0], k = C.diceSpin * 360 + (i ? 360 : 0);
    d.style.transition = spin ? 'transform 1.35s cubic-bezier(.15,.75,.25,1)' : 'none';
    d.style.transform = `rotateX(${r[0] + k}deg) rotateY(${r[1] + k + (i ? 12 : -10)}deg)`;
  });
}
function diceHome(i) {
  const a = $('#dicearea'), dt = $('#dt' + i); if (!a || !dt) return [0, 0];
  const w = dt.offsetWidth || 40;
  return [a.offsetLeft + a.offsetWidth / 2 - w / 2 + (i ? w * .7 : -w * .7), a.offsetTop + a.offsetHeight / 2 - w / 2];
}
function placeDice(vals) {
  [0, 1].forEach(i => { const dt = $('#dt' + i); if (!dt) return; const [x, y] = diceHome(i); dt.style.transform = `translate3d(${x}px,${y}px,0)`; });
  setDice(vals || [3, 5], false);
}
// Würfel kommen von der Seite, springen über das Brett und landen im Würfelfeld
function throwDice(vals) {
  const board = $('#board'); if (!board) return;
  const W = board.offsetWidth, H = board.offsetHeight;
  [0, 1].forEach(i => {
    const dt = $('#dt' + i); if (!dt) return;
    const [ex, ey] = diceHome(i), sx = i ? W * .95 : -W * .1, sy = H * (.55 + i * .15);
    const mx = (sx + ex) / 2 + (i ? -20 : 20), my = (sy + ey) / 2;
    dt.getAnimations().forEach(a => a.cancel());
    dt.animate([
      { transform: `translate3d(${sx}px,${sy}px,120px)` },
      { transform: `translate3d(${mx}px,${my}px,0px)`, offset: .35 },
      { transform: `translate3d(${(mx + ex) / 2}px,${(my + ey) / 2}px,55px)`, offset: .55 },
      { transform: `translate3d(${ex}px,${ey}px,0px)`, offset: .78 },
      { transform: `translate3d(${ex}px,${ey}px,14px)`, offset: .88 },
      { transform: `translate3d(${ex}px,${ey}px,0px)` },
    ], { duration: 1350, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }).onfinish = () => { dt.style.transform = `translate3d(${ex}px,${ey}px,0)`; };
  });
  setDice(vals, true);
}
function sizeBoard() {
  const bw = $('#bw'), board = $('#board'); if (!bw || !board) return;
  const W = bw.clientWidth, H = bw.clientHeight;
  const cos = Math.cos(TILT * Math.PI / 180);
  const cell = Math.max(24, Math.floor(Math.min((W - 6) / (COLS + .35), (H - 22) / (ROWS * cos + .9))));
  board.style.setProperty('--cell', cell + 'px');
  document.documentElement.style.setProperty('--cell', cell + 'px');
  placeTokens(true);
  if (C.s) placeDice(C.s.lastDice);
}
window.addEventListener('resize', () => { if (C.screen === 'game') setTimeout(sizeBoard, 50); });

function tokenXY(p, pos) {
  const f = $('#f' + pos), tk = $('#tk' + p); if (!f || !tk) return [0, 0];
  const here = C.s.players.map((pl, i) => ({ i, pos: C.anim[i] ? C.anim[i].cur : pl.pos })).filter(x => x.pos === pos).map(x => x.i);
  let x = f.offsetLeft + f.offsetWidth / 2, y = f.offsetTop + f.offsetHeight * .62;
  if (here.length > 1) { const k = here.indexOf(p), off = f.offsetWidth * (here.length > 2 ? .26 : .22); x += (k - (here.length - 1) / 2) * off * (here.length > 2 ? .9 : 2); y += (k % 2 ? 1 : -1) * off * .15; }
  return [x - tk.offsetWidth / 2, y - tk.offsetHeight];
}
function placeTokens(force) {
  const s = C.s; if (!s || C.screen !== 'game') return;
  s.players.forEach((pl, p) => {
    const tk = $('#tk' + p); if (!tk) return;
    const sig = pl.head + pl.body + pl.color + (pl.hat || '') + (pl.glasses || '') + (pl.aura || '');
    if (C.tokenSig[p] !== sig) { C.tokenSig[p] = sig; $('.hopper', tk).innerHTML = figureHTML(pl); }
    tk.classList.toggle('me', p === C.me); tk.classList.toggle('off', !pl.connected);
    tk.style.setProperty('--pc', pl.color);
    if (C.anim[p] && !force) return;
    const [x, y] = tokenXY(p, C.anim[p] ? C.anim[p].cur : pl.pos);
    tk.style.transform = `translate3d(${x}px,${y}px,2px)`;
  });
}
async function animateMove(st) {
  const p = st.p, tk = $('#tk' + p);
  C.anim[p] = { cur: st.from };
  for (let k = 1; k <= st.steps; k++) {
    if (!C.anim[p] || !tk) return;
    const pos = st.path[k]; C.anim[p].cur = pos;
    const [x, y] = tokenXY(p, pos);
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

function updateHud(s) {
  const race = s.settings && s.settings.win === 'vault';
  const order = [C.me].concat(s.players.map((_, i) => i).filter(i => i !== C.me));
  const hud = $('#hud'); if (!hud) return;
  const old = {}; $$('.pchip', hud).forEach(c => old[c.dataset.i] = +c.dataset.score);
  hud.className = 'hud n' + s.players.length;
  hud.innerHTML = order.map(i => {
    const pl = s.players[i], cr = crownCount(pl);
    return `<div class="pchip ${s.turn === i && s.stage.type !== 'end' ? 'active' : ''} ${pl.connected ? '' : 'offline'}" data-i="${i}" data-score="${pl.score}" style="--pc:${pl.color}">
      <span class="pa">${esc(pl.head)}</span><span class="pinfo"><span class="pn">${esc(pl.name)}${i === C.me ? ' ·du' : ''}</span><span class="ps">${pl.score}</span></span>
      ${race ? `<span class="pcr">🏆${cr}/${VAULT_GOAL}</span>` : cr ? `<span class="pcr">👑${cr}</span>` : ''}</div>`;
  }).join('') + `<div class="round" id="round"><small>Runde</small><b>${Math.min(Math.floor(s.turnNo / s.players.length) + 1, s.totalTurns / s.players.length)}/${s.totalTurns / s.players.length}</b>${s.final ? '<span class="fin">x2</span>' : ''}</div>`;
  $$('.pchip', hud).forEach(c => { const o = old[c.dataset.i], v = +c.dataset.score; if (o != null && o !== v) countUp(c.querySelector('.ps'), o, v); });
  $('#round', hud).onclick = () => { if (confirm('Spiel wirklich verlassen?')) leaveGame(); };
  // Schlüssel-Leiste (antippen = Details)
  const kb = $('#keybar'), cats = s.cats;
  const cell = (p, c) => { const k = keyCount(p, c); return p.crowns[c] ? '<span class="ks crown">👑</span>' : k >= KEYS_NEEDED ? '<span class="ks key">🔑3</span>' : k ? `<span class="ks part">🔑${k}</span>` : '<span class="ks none"></span>'; };
  kb.classList.toggle('open', C.keyOpen);
  kb.style.setProperty('--k', cats.length); kb.style.setProperty('--np', order.length);
  if (!C.keyOpen) {
    kb.innerHTML = `<span class="kh">▾</span>${cats.map(c => `<span class="kc" style="--cc:${CATS[c].c}">${CATS[c].i}</span>`).join('')}`
      + order.map(i => `<span class="kh">${esc(s.players[i].head)}</span>${cats.map(c => cell(s.players[i], c)).join('')}`).join('');
  } else {
    kb.innerHTML = `<div class="kdet"><div class="kdh"><span>Kategorie</span>${order.map(i => `<span>${esc(s.players[i].head)}</span>`).join('')}</div>`
      + cats.map(c => `<div class="kdr"><span class="kdn"><i style="background:${CATS[c].c}">${CATS[c].i}</i>${esc(CATS[c].n)}</span>${order.map(i => cell(s.players[i], c)).join('')}</div>`).join('')
      + `<div class="kdhint">▴ antippen zum Schließen</div></div>`;
  }
  // Felder: Tresor-Besitzer & Zugang zum Tresorraum
  const L = s.players[C.me];
  s.fields.forEach((f, i) => {
    const el = $('#f' + i); if (!el) return;
    if (f.t === 'vault') {
      el.querySelector('.owners').innerHTML = s.players.filter(p => p.crowns[f.c]).map(p => `<span style="--pc:${p.color}">${esc(p.head)}</span>`).join('');
      el.classList.toggle('cracked', !!L.crowns[f.c]);
      el.classList.toggle('haskey', keyCount(L, f.c) >= KEYS_NEEDED && !L.crowns[f.c]);
    }
    if (NODES[i].zone === 'hub') el.classList.toggle('gated', !canEnterVaults(L) && NODES[L.pos] && NODES[L.pos].zone !== 'hub');
  });
}
function countUp(el, from, to) {
  if (!el) return;
  const t0 = performance.now(), d = 700;
  const step = t => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  el.animate([{ transform: 'scale(1.4)', color: '#a3ff3c' }, { transform: 'scale(1)' }], { duration: 600 });
}

function renderGame(s) {
  if (C.screen !== 'game') buildGame(s);
  else if (C.boardSig !== JSON.stringify(s.fields) || $$('.token').length !== s.players.length) buildBoardDOM(s);
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
function clearTargets() { $$('.field.target').forEach(f => { f.classList.remove('target'); const m = f.querySelector('.marker'); if (m) m.remove(); }); closeDrawer(); }

function optLabel(o, s, me) {
  const f = s.fields[o.to], pl = s.players[me];
  let what, sub = '';
  const k = f.c ? keyCount(pl, f.c) : 0;
  if (f.t === 'vault') { what = `🔐 ${CATS[f.c].s}-Tresor`; sub = pl.crowns[f.c] ? '👑 schon deiner' : k >= KEYS_NEEDED ? '🔑🔑🔑 bereit!' : `<i class="warn">${k}/${KEYS_NEEDED} 🔑 – zu wenig</i>`; }
  else if (f.t === 'cat') { what = `${CATS[f.c].i} ${CATS[f.c].s}`; sub = k >= KEYS_NEEDED || pl.crowns[f.c] ? 'Punkte-Duell' : `🔑 ${k}/${KEYS_NEEDED} → ${k + 1}`; }
  else if (f.t === 'start') { what = '🚀 Start'; sub = '+150 Punkte'; }
  else { what = `${FT[f.t].i} ${FT[f.t].n}`; }
  return `<span class="dir">${o.steps}</span><span class="what"><b>${what}</b>${sub ? `<em>${sub}</em>` : ''}</span>`;
}
function openDrawer(html) {
  let d = $('#drawer');
  if (!d) { d = document.createElement('div'); d.id = 'drawer'; document.body.appendChild(d); }
  d.innerHTML = html; requestAnimationFrame(() => d.classList.add('open')); return d;
}
function closeDrawer() { const d = $('#drawer'); if (d) d.classList.remove('open'); }
function choose(i) {
  if (C.chose) return;
  C.chose = true; Sound.click(); vibrate(20);
  $$('.tbtn').forEach((b, j) => { b.disabled = true; b.classList.toggle('sel', j === i); });
  act({ type: 'choose', i });
  setTimeout(closeDrawer, 350);
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
        const ab = setAction(st.comeback ? `<div class="tgrid2"><button class="btn pink rollbtn" id="roll" style="font-size:18px">🎲🎲 Würfeln</button><button class="btn" id="cb" style="font-size:15px;background:var(--red);color:#fff">🔥 Comeback-Risiko</button></div>` : `<button class="btn pink rollbtn" id="roll">🎲🎲 Würfeln!</button>`);
        $('#roll', ab).onclick = () => { $$('#ab button').forEach(b => b.disabled = true); Sound.click(); vibrate(30); act({ type: 'roll' }); };
        const cb = $('#cb', ab); if (cb) cb.onclick = () => { $$('#ab button').forEach(b => b.disabled = true); Sound.whoosh(); act({ type: 'comeback' }); };
        if (st.comeback) setStatus(`🔥 Du liegst ${st.gap} Punkte hinten – wagst du das Comeback?`);
        vibrate([40, 60, 40]);
      } else setAction(`<div class="waitbar">⏳ ${nameOf(st.p)} würfelt gleich …</div>`);
      break;
    }
    case 'choose': {
      closeSheet();
      Sound.dice(); throwDice(st.dice);
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
          const n = st.opts.length, cols = n > 8 ? 3 : 2;
          const d = openDrawer(`<div class="dhead">🎲 ${st.dice[0]} & ${st.dice[1]}${pasch ? ' · PASCH!' : ''} – wohin?</div><div class="tgrid c${cols}">${st.opts.map((o, i) => `<button class="tbtn" data-i="${i}">${optLabel(o, C.s, C.me)}</button>`).join('')}</div><div class="dhint">…oder tippe direkt auf ein leuchtendes Feld</div>`);
          $$('.tbtn', d).forEach(b => b.onclick = () => choose(+b.dataset.i));
          setAction(`<div class="waitbar">👇 Ziel wählen</div>`);
          vibrate(30);
        } else setAction(`<div class="waitbar">🤔 ${nameOf(st.p)} überlegt, wohin …</div>`);
      }, 1400);
      break;
    }
    case 'move':
      closeSheet(); closeDrawer();
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
    const el = $('#opp'); if (!el) return;
    const before = el.dataset.n || '';
    el.outerHTML = oppLine(st);
    const after = $('#opp'); if (after && after.dataset.n !== before && +after.dataset.n > +before) { Sound.tick(); vibrate(15); }
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
  resetViewport();
  panel.style.setProperty('--cc', color || '#b06cff');
  panel.innerHTML = html; panel.scrollTop = 0;
  sh.classList.add('open'); document.body.classList.add('sheet-open');
  return panel;
}
function closeSheet() { const sh = $('#sheet'); if (sh) sh.classList.remove('open'); document.body.classList.remove('sheet-open'); }

function stageColor(st) { return st.cat ? CATS[st.cat].c : st.ft ? FT[st.ft].c : '#b06cff'; }
function stagePill(st) {
  if (st.cat) return `<span class="pill" style="--cc:${CATS[st.cat].c}">${CATS[st.cat].i} ${CATS[st.cat].s}</span>`;
  if (st.ft) return `<span class="pill" style="--cc:${FT[st.ft].c}">${FT[st.ft].i} ${FT[st.ft].n}</span>`;
  return '';
}
function headHTML(st) {
  const key = st.keyFor != null ? `<span class="pill keypill">🔑 ${st.keyNo || ''}/${KEYS_NEEDED} ${st.keyFor === C.me ? 'für dich' : 'für ' + nameOf(st.keyFor)}</span>` : '';
  const mn = st.durs ? Math.min(...st.durs) : 0, hcI = st.durs && st.durs.some(d => d !== st.durs[0]) ? st.durs.indexOf(mn) : -1;
  const hc = hcI >= 0 ? `<span class="pill dark">⏱️ ${hcI === C.me ? 'Handicap: du!' : 'Handicap: ' + nameOf(hcI)}</span>` : '';
  return `<div class="qhead">${stagePill(st)}${key}${hc}<div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}${st.title ? `<span class="pill dark">${esc(st.title)}</span>` : ''}</div>`;
}
function vaultPips(v, marks) {
  if (!v) return '';
  const m = marks || v.marks;
  return `<div class="pips">${[0, 1, 2].map(i => `<i class="${m[i] === 1 ? 'ok' : m[i] === 0 ? 'no' : ''}"></i>`).join('')}</div><div class="center muted" style="font-weight:800;font-size:13px">${nameOf(v.p)} braucht ${v.need === 3 ? 'alle 3' : v.need + ' von 3'}</div>`;
}

function highlightField(i) { if (i == null) return; const f = $('#f' + i); if (f) { f.classList.remove('hl'); void f.offsetWidth; f.classList.add('hl'); } }
function renderIntro(st) {
  const color = stageColor(st);
  highlightField(st.field);
  setAction(`<div class="waitbar">👀 Macht euch bereit …</div>`);
  if (st.catIntro) {
    openSheet(`<div class="intro catintro">
      ${st.keyNo ? `<div class="keybadge">🔑 Schlüssel-Frage ${st.keyNo}/${KEYS_NEEDED}</div>` : ''}
      <div class="catanim a-${st.cat} v${st.anim || 0}"><span>${st.icon}</span></div>
      <h2 style="--cc:${color}">${esc(st.title)}</h2>
      <p>${esc(st.sub || '')}</p></div>`, color);
    Sound.whoosh(); vibrate(25);
    return;
  }
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
  openSheet(`<div class="intro keygot"><div class="kg-cat" style="--cc:${c.c}">${c.i}</div><h2 style="--cc:${c.c}">${esc(c.n)}</h2>
    <div class="keyrow">${Array.from({ length: KEYS_NEEDED }, (_, i) => `<span class="${i < st.n ? 'on' : ''}" style="animation-delay:${i * 80}ms">🔑</span>`).join('')}</div>
    <div class="kg-count"><b>${st.n}/${KEYS_NEEDED}</b> Schlüssel${mine ? '' : ' für ' + nameOf(st.p)}</div>
    ${st.n >= KEYS_NEEDED ? '<p>🏛️ Der Tresorraum ist offen!</p>' : ''}</div>`, c.c);
  st.n >= KEYS_NEEDED ? Sound.jackpot() : Sound.key(); if (mine) burst(st.n >= KEYS_NEEDED ? 100 : 40); vibrate([30, 30, 60]);
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
  const os = others(), done = os.filter(i => st.answered[i]);
  if (NP() === 2) { const o = os[0]; return st.answered[o] ? `<div class="opp done" id="opp" data-n="1">⚡ ${nameOf(o)} hat schon geantwortet!</div>` : `<div class="opp" id="opp" data-n="0">⏳ ${nameOf(o)} überlegt …</div>`; }
  return `<div class="opp ${done.length === os.length ? 'done' : ''}" id="opp" data-n="${done.length}">${os.map(i => `<span class="oc ${st.answered[i] ? 'ok' : ''}" style="--pc:${C.s.players[i].color}">${esc(C.s.players[i].head)}${st.answered[i] ? '✓' : '…'}</span>`).join('')}<span>${done.length}/${os.length} fertig</span></div>`;
}
function questionText(st) {
  const q = st.q;
  if (q.kind === 'mind') {
    const subj = q.subject === C.me, other = C.s.players[q.subject];
    return subj ? `<div class="mindtag self">🔒 Du antwortest ehrlich – ${NP() > 2 ? 'die anderen versuchen' : nameOf(others()[0]) + ' versucht'} deine Gedanken zu lesen!</div><div class="qtext">${esc(q.self)}</div>`
      : `<div class="mindtag">🧠 Du bist Gedankenleser*in! ${esc(other.name)} antwortet gerade ehrlich.</div><div class="qtext">${esc(q.text.replace(/\{X\}/g, other.name))}</div>`;
  }
  return `<div class="qtext">${esc(q.text)}</div>`;
}
function optsHTML(st) {
  const q = st.q;
  if (q.kind === 'who') return `<div class="opts who2 n${NP()}" id="opts">${C.s.players.map((p, i) => `<button class="opt" data-v="${i}" style="--pc:${p.color}"><span class="whofig">${figureHTML(p)}</span><span class="wname">${esc(p.name)}</span><span class="who"></span></button>`).join('')}</div>`;
  const keys = ['A', 'B', 'C', 'D'];
  return `<div class="opts ${q.kind === 'tf' ? 'tf' : ''}" id="opts">${q.options.map((o, i) => `<button class="opt" data-v="${i}"><span class="k">${keys[i]}</span><span class="ot">${q.kind === 'tf' ? (i === 0 ? '✅<br>' : '❌<br>') : ''}${esc(o)}</span><span class="who"></span></button>`).join('')}</div>`;
}
// Emoji-Marke eines Spielers auf einer Antwort (Name klein darunter, abschaltbar)
const whoMark = p => `<span class="wb" style="--pc:${p.color}"><i>${esc(p.head)}</i>${PREFS.names ? `<small>${esc(p.name)}</small>` : ''}</span>`;

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
  const order = [C.me].concat(others());
  return `<div class="result n${order.length}">${order.map(i => {
    const p = C.s.players[i], pts = st.pts[i], win = pts > 0;
    return `<div class="rbox ${win ? 'win' : ''}" style="--pc:${p.color}">${st.correct && st.correct[i] ? '<span class="badge">✅</span>' : ''}<div class="ra">${esc(p.head)}</div><div class="rn">${esc(p.name)}</div><div class="rp" style="color:${win ? 'var(--lime)' : pts < 0 ? 'var(--red)' : 'var(--muted)'}">${pts < 0 ? '−' + Math.abs(pts) : '+' + pts}</div>${extra ? extra(i) : ''}</div>`;
  }).join('')}</div>`;
}
const nextBtn = () => `<button class="btn ghost next" id="next">Weiter ▶</button>`;
function wireNext(panel, st) {
  const b = $('#next', panel); if (!b) return;
  b.onclick = () => { b.disabled = true; b.textContent = 'Warte auf die anderen …'; Sound.click(); act({ type: 'next', sid: st.id }); };
}

function renderReveal(st, s) {
  const q = st.q, color = stageColor(st), me = C.me;
  setAction(`<div class="waitbar">📊 Auflösung</div>`);
  let body = '', extra = null;
  if (q.kind === 'mc' || q.kind === 'tf' || q.kind === 'who' || q.kind === 'mind') {
    body = questionText(st) + optsHTML(st);
    extra = i => `<div class="rt">${st.picks[i] == null ? (st.only != null && st.only !== i ? '' : 'keine Antwort') : (q.kind === 'mc' || q.kind === 'tf') ? msTxt(st.ms[i]) : ''}</div>`;
  } else if (q.kind === 'est') {
    body = `<div class="qtext">${esc(q.text)}</div><div class="numdisp" style="background:var(--lime);color:var(--ink)">${fmtNum(st.answer)}<small style="color:var(--ink)">${esc(q.unit)}</small></div>`;
    extra = i => st.only != null && st.only !== i ? '' : `<div class="rv">${st.picks[i] == null ? '—' : fmtNum(st.picks[i])} ${esc(q.unit)}</div><div class="rt">${st.diffs && st.diffs[i] != null ? 'Abstand ' + fmtNum(st.diffs[i]) : 'keine Antwort'}</div>`;
  }
  const keyNote = st.keyFor != null ? `<div class="center keynote">${st.correct[st.keyFor] ? `🔑 ${st.keyFor === me ? 'Du bekommst' : nameOf(st.keyFor) + ' bekommt'} den Schlüssel!` : `🔒 Kein Schlüssel für ${st.keyFor === me ? 'dich' : nameOf(st.keyFor)}.`}</div>` : '';
  const panel = openSheet(`${headHTML(st)}${st.vault ? vaultPips(st.vault, st.vault.marks.concat([st.correct[st.vault.p] ? 1 : 0])) : ''}${body}
    ${st.note ? `<div class="center notel">${esc(st.note)}</div>` : ''}${keyNote}
    ${st.streak >= 2 ? `<div class="streak">${'🔥'.repeat(Math.min(st.streak, 6))} ${st.streak}er-Übereinstimmungsserie!</div>` : ''}
    ${st.talk ? `<div class="talk">💬 <b>Redet kurz drüber:</b> ${esc(st.talk)}</div>` : ''}
    ${resultBoxes(st, extra)}${nextBtn()}`, color);
  const opts = $('#opts', panel);
  if (opts) {
    opts.classList.add('locked');
    $$('.opt', opts).forEach(b => {
      const v = +b.dataset.v;
      if ((q.kind === 'mc' || q.kind === 'tf') && v === st.answer) b.classList.add('right');
      if (q.kind === 'mind' && st.picks[q.subject] === v) b.classList.add('right');
      s.players.forEach((p, i) => {
        if (st.picks[i] === v) {
          b.querySelector('.who').insertAdjacentHTML('beforeend', whoMark(p));
          if ((q.kind === 'mc' || q.kind === 'tf') && v !== st.answer) b.classList.add('wrong');
          if (q.kind === 'who') b.classList.add(st.agree ? 'right' : 'picked');
          if (q.kind === 'mind' && st.picks[q.subject] !== v) b.classList.add('picked');
        }
      });
    });
  }
  if (q.kind === 'who' || q.kind === 'mind') { if (st.correct[me]) { st.streak >= 3 ? Sound.jackpot() : Sound.hit(); burst(st.agree ? 60 : 30); } else Sound.sad(); }
  else if (st.only != null) { if (st.pts[st.only] >= 500) { Sound.jackpot(); burst(120); } else if (st.pts[st.only] > 0) Sound.hit(); else Sound.bad(); }
  else if (st.correct[me]) { st.note && st.note.includes('VOLLTREFFER') ? Sound.jackpot() : Sound.hit(); vibrate(30); if (st.pts[me] >= 180) burst(25); }
  else { Sound.bad(); vibrate([80, 40, 80]); }
  wireNext(panel, st);
}

const partnerOf = i => (i + 1) % NP();
function renderFree(st, s) {
  setAction(`<div class="waitbar">✍️ Schreibt!</div>`);
  const prompt = st.text.replace(/\{P\}/g, C.s.players[partnerOf(C.me)].name);
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${FT.free.c}">🤪 Quatsch-Runde</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="timer" id="timer"><i id="tbar"></i></div>
    <div class="qtext">${esc(prompt)}</div>
    <textarea class="input" id="ftxt" maxlength="90" placeholder="Schnell & lustig – nicht nachdenken!"></textarea>
    <button class="btn lime" id="send" style="margin-top:10px">Abschicken 😂</button>${oppLine(st)}`, FT.free.c);
  const ta = $('#ftxt', panel), send = $('#send', panel);
  setTimeout(() => ta.focus(), 400);
  const submit = () => { const v = ta.value.trim(); if (answer(st, v)) { ta.disabled = true; send.disabled = true; send.textContent = v ? 'Abgeschickt ✓' : 'Leer abgeschickt 🙈'; ta.blur(); setTimeout(resetViewport, 120); } };
  send.onclick = () => { if (!ta.value.trim()) { vibrate(60); ta.focus(); return; } submit(); };
  startTimer(st, () => { if (C.myAns == null) submit(); });
}
function renderRate(st, s) {
  const other = partnerOf(C.me), txt = st.texts[other], mine = st.texts[C.me];
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
  const E = ['😐', '😄', '😂'], n = NP();
  setAction(`<div class="waitbar">😂 Auswertung</div>`);
  const order = [C.me].concat(others());
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${FT.free.c}">🤪 Quatsch-Auswertung</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="qsub" style="margin:0 0 10px">${esc(st.text.replace(/\{P\}/g, '…'))}</div>
    ${order.map((i, k) => { const p = s.players[i], rater = (i - 1 + n) % n, r = st.rates[rater]; return `<div class="row" style="gap:8px;margin:12px 0 8px"><span style="font-size:24px">${esc(p.head)}</span><b>${esc(p.name)}</b><div class="spacer"></div><span style="font-size:26px">${r == null ? '🤷' : E[r]}</span><b style="font-family:Bungee;color:var(--lime)">+${st.pts[i]}</b></div><div class="quote" style="font-size:17px;transform:rotate(${k % 2 ? 1.5 : -1.5}deg)">${st.texts[i] ? esc(st.texts[i]) : '<span style="opacity:.5">😴 keine Antwort</span>'}</div>`; }).join('')}
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
    ${s.settings.win === 'vault' ? `<p class="muted">🏆 Tresor-Rennen: ${esc(p.name)} hat ${crownCount(p)}/${VAULT_GOAL} Tresore</p>` : ''}
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
  setAction(`<div class="waitbar">🎰 Das Rad dreht …</div>`);
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
  setAction(`<div class="waitbar">${FT[mode].i} Alle gleichzeitig!</div>`);
  let body;
  if (mode === 'bluff') body = `<div class="qtext">${esc(it.q)}</div><div class="truth">✅ Echte Antwort: <b>${esc(it.real)}</b></div>
      <div class="label" style="margin:12px 0 6px">Erfinde eine falsche Antwort, die echt klingt:</div>
      <textarea class="input" id="dtxt" maxlength="90" placeholder="Dein Bluff …"></textarea><button class="btn lime" id="dsend" style="margin-top:10px">Bluff abschicken 🃏</button>`;
  else if (mode === 'emoji') body = `<div class="qsub" style="margin:0 0 4px">Stelle diesen ${esc(it.type === 'Film' ? 'Film' : it.type === 'Redewendung' ? 'Spruch' : 'Moment')} nur mit Emojis dar:</div><div class="qtext">„${esc(it.term)}“</div>
      <input class="input emoji-in" id="dtxt" maxlength="40" placeholder="😜🎬🦁 …" autocomplete="off" inputmode="text"><div class="muted center" style="font-size:12px;font-weight:700;margin-top:6px">Buchstaben & Zahlen werden automatisch gelöscht 😉</div>
      <button class="btn lime" id="dsend" style="margin-top:10px">Abschicken 😜</button>`;
  else body = `<div class="qsub" style="margin:0 0 4px">Zeichne in ${st.dur} Sekunden:</div><div class="qtext">„${esc(it.term)}“</div>
      <div class="canvaswrap"><canvas id="cv" width="260" height="260"></canvas></div>
      <div class="tgrid2" style="margin-top:10px"><button class="btn ghost small" id="clr" style="width:100%">🧽 Löschen</button><button class="btn lime small" id="dsend" style="width:100%">Fertig ✓</button></div>`;
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
    if (answer(st, v)) { send.disabled = true; send.textContent = 'Abgeschickt ✓'; const i = $('#dtxt', panel); if (i) { i.disabled = true; i.blur(); setTimeout(resetViewport, 120); } }
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
  const mode = st.mode, other = partnerOf(C.me), color = FT[mode].c, opts = st.opts[C.me];
  setAction(`<div class="waitbar">🤔 Rätselt!</div>`);
  const title = mode === 'bluff' ? `Welche Antwort ist echt? Eine davon hat ${nameOf(other)} erfunden!` : mode === 'emoji' ? `${nameOf(other)} hat gemeint (${esc(st.prompt[C.me])}) …` : `Was hat ${nameOf(other)} gezeichnet?`;
  const panel = openSheet(`<div class="qhead"><span class="pill" style="--cc:${color}">${FT[mode].i} ${FT[mode].n}</span><div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}</div>
    <div class="timer" id="timer"><i id="tbar"></i></div><div class="qsub" style="margin:0 0 8px">${title}</div>
    ${dShow(mode, st.made[other], st.prompt[C.me], true)}
    <div class="opts" id="opts" style="margin-top:12px">${opts.map((o, i) => `<button class="opt" data-v="${i}"><span class="k">${'ABCD'[i]}</span><span class="ot">${esc(o)}</span><span class="who"></span></button>`).join('')}</div>${oppLine(st)}`, color);
  const lock = () => $('#opts', panel).classList.add('locked');
  $$('#opts .opt', panel).forEach(b => b.onclick = () => { if (answer(st, +b.dataset.v)) { b.classList.add('picked'); lock(); } });
  startTimer(st, () => { if (C.myAns == null) { lock(); Sound.bad(); } });
}
function renderDReveal(st, s) {
  const mode = st.mode, color = FT[mode].c, n = NP();
  setAction(`<div class="waitbar">📊 Auflösung</div>`);
  const card = c => {
    const g = (c - 1 + n) % n, p = s.players[c], q = s.players[g], it = st.items[c], pick = st.picks[g], o = st.opts[g];
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
    ${[C.me].concat(others()).map(card).join('')}${nextBtn()}`, color);
  const g = C.me, mine = partnerOf(g), fooled = s.players.some((_, x) => partnerOf(x) === g && st.picks[x] === st.fake[x] && mode === 'bluff');
  if (st.picks[g] === st.real[g]) { Sound.hit(); burst(40); } else if (fooled) { Sound.jackpot(); burst(50); } else Sound.bad();
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
  const pl = s.players, rk = ranking(s), W = winnerOf(s), tie = W === -1, win = tie ? rk[0] : W, second = rk.find(i => i !== win);
  const max = Math.max(1, ...pl.map(p => p.score));
  const others3 = pl.length > 2 ? ' & Co.' : '';
  const [head, sub] = tie ? ['UNENTSCHIEDEN!', 'Gleichstand an der Spitze – ihr seid einfach gleich gut 💞']
    : s.winBy === 'vault' ? [`${pl[win].name.toUpperCase()} GEWINNT DAS TRESOR-RENNEN!`, `${VAULT_GOAL} Tresore geknackt – ${pl[second].name}${others3} schaut in die leere Schatzkammer. 🔐`]
    : verdictLine(pl[win].name, pl[second].name + others3, pl[win].score - pl[second].score);
  const el = document.createElement('div'); el.id = 'finale';
  el.innerHTML = `<div class="fin-rays"></div><div class="fin-title">Und der Sieg geht an …</div>
    <div class="fin-race">${rk.map(i => `<div class="lane" style="--pc:${pl[i].color}"><div class="lfig">${figureHTML(pl[i], 'idle')}</div><div class="lbar"><i data-w="${Math.round(Math.max(0, pl[i].score) / max * 100)}"></i><b class="lsc" data-to="${pl[i].score}">0</b></div></div>`).join('')}</div>
    <div class="fin-win ${tie ? 'tie' : ''}"><div class="fin-crown">${tie ? '🤝' : '👑'}</div><div class="fin-fig">${tie ? rk.filter(i => pl[i].score === pl[rk[0]].score).map(i => figureHTML(pl[i], 'idle')).join('') : figureHTML(pl[win], 'idle')}</div><div class="fin-head">${esc(head)}</div><div class="fin-sub">${esc(sub)}</div><div class="fin-tap">👆 Tippen für Details</div></div>`;
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
  u.g++; if (winnerOf(s) === C.me) u.w++;
  u.done = u.done.concat(s.gameId).slice(-30); store.set('kn_unlock', u);
  const neu = Object.values(ACC).flat().filter(isUnlocked).map(i => i.v).filter(v => !before.includes(v));
  if (neu.length) setTimeout(() => { toast(`🎁 Neu freigeschaltet: ${neu.join(' ')} – ab in den Figuren-Baukasten!`); Sound.key(); }, 4200);
}
function renderEnd(s) {
  cancelAnimationFrame(C.raf);
  recordGame(s, C.me); trackUnlocks(s);
  closeSheet(); closeDrawer(); setAction(''); setStatus('');
  showFinale(s, () => { if (C.s && C.s.stage.type === 'end') renderEndDetails(s); });
}
function renderEndDetails(s) {
  const pl = s.players, rk = ranking(s), W = winnerOf(s), tie = W === -1, win = tie ? rk[0] : W;
  const avg = p => p.stats.right ? p.stats.ms / p.stats.right : Infinity;
  const awards = [];
  const best = (fn, hi = true) => { const v = pl.map(fn), m = hi ? Math.max(...v) : Math.min(...v); const w = v.map((x, i) => x === m ? i : -1).filter(i => i >= 0); return w.length === 1 ? w[0] : null; };
  let w;
  if ((w = best(p => p.stats.right)) != null) awards.push(['🧠', 'Besserwisser*in', `${esc(pl[w].name)} – ${pl[w].stats.right} richtige Antworten`]);
  if ((w = best(avg, false)) != null && isFinite(avg(pl[w]))) awards.push(['⚡', 'Blitzmerker*in', `${esc(pl[w].name)} – Ø ${msTxt(avg(pl[w]))} pro richtiger Antwort`]);
  if ((w = best(p => p.stats.laughs)) != null) awards.push(['😂', 'Quatschkopf', `${esc(pl[w].name)} – ${pl[w].stats.laughs} Lach-Punkte`]);
  if ((w = best(p => crownCount(p))) != null) awards.push(['👑', 'Tresorknacker*in', `${esc(pl[w].name)} – ${crownCount(pl[w])} Kronen`]);
  const pod = (i, cls, place) => { const p = pl[i]; return `<div class="pod ${cls}" style="--pc:${p.color}">${place === 1 && !tie ? '<div class="crown">👑</div>' : ''}<div class="podfig">${figureHTML(p, 'idle')}</div><b>${esc(p.name)}</b><div class="block">${place}.<span>${p.score}</span><small>Punkte${s.winBy === 'vault' || s.settings.win === 'vault' ? ` · 🏆${crownCount(p)}` : ''}</small></div></div>`; };
  const podOrder = rk.length >= 3 ? [[rk[1], 'second', 2], [rk[0], 'first', 1], [rk[2], 'third', 3]] : [[rk[1], 'second', 2], [rk[0], 'first', 1]];
  setAction(''); setStatus('');
  const meWon = !tie && win === C.me;
  const panel = openSheet(`<div class="intro" style="padding-top:6px"><h2 style="--cc:var(--yellow)">${tie ? 'UNENTSCHIEDEN!' : meWon ? 'DU GEWINNST!' : esc(pl[win].name).toUpperCase() + ' GEWINNT!'}</h2>
    <p>${tie ? 'Gleichstand an der Spitze 💞' : meWon ? 'Kopfnuss verteilt! 🥜💥' : 'Revanche? Das lässt du nicht auf dir sitzen! 😤'}</p></div>
    <div class="podium">${podOrder.map(([i, c, p]) => pod(i, c, p)).join('')}</div>
    ${rk.length > 3 ? `<div class="srow" style="margin:6px 0"><span>4. ${esc(pl[rk[3]].head)} ${esc(pl[rk[3]].name)}</span><b>${pl[rk[3]].score} Punkte</b></div>` : ''}
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
applyLook(null);
showSplash();
window.__KN = { C, startHost, joinGame, showHome, P, PREFS, saveProfile, buildBoard };
})();
