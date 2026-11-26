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
