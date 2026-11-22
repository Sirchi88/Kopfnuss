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
const PREFIX = 'kopfnuss-duell-v1-';
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
  pair:  { i: '💘', n: 'Pärchen-Runde', c: '#ff2e88', sub: "Jetzt wird's persönlich …" },
  free:  { i: '🤪', n: 'Quatsch-Runde', c: '#a3ff3c', sub: 'Schreibt die lustigste Antwort – der andere bewertet!' },
  est:   { i: '🎯', n: 'Schätz-Duell', c: '#22d3ff', sub: 'Wer näher dran ist, gewinnt. Volltreffer = Extrabonus!' },
  luck:  { i: '🎰', n: 'Glücksrad', c: '#ffd60a', sub: 'Alles kann passieren …' },
};
const N = 30;
function gridPos(i) { // 7 Spalten x 10 Zeilen, im Uhrzeigersinn ab unten links
  if (i <= 9) return [1, 10 - i];
  if (i <= 15) return [i - 8, 1];
  if (i <= 24) return [7, i - 14];
  return [31 - i, 10];
}
function buildBoard(cats) {
  const k = cats.length;
  const cap = k <= 3 ? 4 : k <= 4 ? 3 : 2;
  const catTotal = Math.max(k, Math.min(cap * k, 29 - 7 - k));
  const per = cats.map((c, i) => Math.floor(catTotal / k) + (i < catTotal % k ? 1 : 0));
  const nSpec = 29 - k - catTotal;
  const POOL = ['pair', 'est', 'free', 'blitz', 'pair', 'luck', 'est', 'free', 'pair', 'blitz', 'est', 'luck', 'free', 'pair', 'est', 'free', 'blitz', 'pair', 'luck', 'est', 'free'];
  const specs = shuffle(Array.from({ length: nSpec }, (_, j) => POOL[j % POOL.length]));
  const segs = cats.map((c, i) => Array.from({ length: per[i] }, () => ({ t: 'cat', c })));
  specs.forEach((s, j) => segs[j % k].push({ t: s }));
  const out = [{ t: 'start' }];
  segs.forEach((seg, i) => { out.push(...shuffle(seg)); out.push({ t: 'vault', c: cats[i] }); });
  return out;
}
const HEADS = ['🦊', '🐼', '🐸', '🦄', '🐯', '🐙', '👽', '🤖', '🐻', '🐵', '🐶', '🐱', '🐷', '🐰', '🐨', '🦁', '🐔', '🐧', '🦉', '🐢',
  '😎', '🤓', '😜', '🥸', '🤠', '😈', '👻', '💀', '🤡', '👑', '🎃', '🌝', '🍑', '🍆', '🌶️', '🍕', '🍩', '🥑', '🦖', '🧠', '👸', '🤴', '🧜‍♀️', '🧛', '🥷', '🧙'];
const COLORS = ['#ff2e88', '#22d3ff', '#a3ff3c', '#ffd60a', '#ff9f1c', '#b06cff', '#ff4d6d', '#1de9b6'];
const LUCK = [
  { id: 'plus', l: '+150 Punkte 🎁' }, { id: 'steal', l: 'Klau 100 Punkte 🦹' }, { id: 'swap', l: 'Platztausch 🔄' },
  { id: 'vault', l: 'Teleport zum Tresor 🌀' }, { id: 'key', l: 'Gratis-Schlüssel 🔑' }, { id: 'again', l: 'Nochmal würfeln 🎲' },
  { id: 'minus', l: 'Pech! −100 💩' }, { id: 'fwd', l: '3 Felder vor 🚀' },
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
function saveProfile() { store.set('kn_profile', { name: P.name, head: P.head, body: P.body, color: P.color }); }
const STATS0 = { games: 0, wins: 0, losses: 0, draws: 0, points: 0, best: 0, right: 0, ans: 0, crowns: 0, laughs: 0, bruller: 0, cat: {}, vs: {}, recent: [], done: [] };
function loadStats() { return Object.assign({}, STATS0, store.get('kn_stats', {})); }
function recordGame(s, me) {
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
  return `<div class="fig ${cls}" style="--pc:${p.color}"><svg class="fbody" viewBox="0 0 60 74">${body}</svg><div class="fhead">${esc(p.head)}</div></div>`;
}

/* ---------------- Sound ---------------- */
const Sound = {
  ctx: null, on: store.get('kn_sound', true) !== false,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
  tone(f, d = .12, type = 'square', v = .08, when = 0, slide) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + .02);
  },
  click() { this.tone(660, .05, 'triangle', .06); },
  tick() { this.tone(1200, .03, 'square', .04); },
  ok() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .14, 'square', .06, i * .07)); },
  bad() { this.tone(300, .35, 'sawtooth', .07, 0, 90); },
  dice() { for (let i = 0; i < 8; i++) this.tone(200 + rand(500), .03, 'square', .04, i * .08); },
  hop() { this.tone(420, .08, 'triangle', .05, 0, 900); },
  whoosh() { this.tone(200, .3, 'sawtooth', .04, 0, 1400); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, 'square', .06, i * .11)); },
  sad() { [392, 370, 349, 330].forEach((f, i) => this.tone(f, .25, 'triangle', .07, i * .2)); },
};

/* ---------------- Netzwerk ---------------- */
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from({ length: 4 }, () => A[rand(A.length)]).join(''); }

class HostTransport {
  constructor(code, h) { this.code = code; this.h = h; this.conn = null; LOCAL ? this.initLocal() : this.initPeer(); }
  initLocal() {
    this.bc = new BroadcastChannel('kn-' + this.code);
    this.bc.onmessage = e => { const d = e.data; if (d.to === 'host' && d.kind === 'msg') this.h.onMsg(d.msg); };
    setTimeout(() => this.h.onOpen(), 30);
  }
  initPeer() {
    if (!window.Peer) { setTimeout(() => this.h.onError('nolib'), 0); return; }
    this.peer = new Peer(PREFIX + this.code, { debug: 0 });
    this.peer.on('open', () => this.h.onOpen());
    this.peer.on('error', e => { if (e && e.type === 'peer-unavailable') return; this.h.onError(e && e.type || 'error'); });
    this.peer.on('disconnected', () => setTimeout(() => { try { if (!this.peer.destroyed && this.peer.disconnected) this.peer.reconnect(); } catch (e) {} }, 1500));
    this.peer.on('connection', c => {
      c.on('open', () => { if (this.conn && this.conn !== c) { try { this.conn.close(); } catch (e) {} } this.conn = c; this.lastSeen = Date.now(); });
      c.on('data', d => {
        if (c !== this.conn) return;
        this.lastSeen = Date.now();
        if (d && d.t === 'ping') { try { c.send({ t: 'pong' }); } catch (e) {} return; }
        this.h.onMsg(d);
      });
      c.on('close', () => { if (c === this.conn) { this.conn = null; this.h.onLeave(); } });
      c.on('error', () => {});
    });
    this.hb = setInterval(() => {
      if (this.conn && Date.now() - this.lastSeen > 12000) { const c = this.conn; this.conn = null; try { c.close(); } catch (e) {} this.h.onLeave(); }
    }, 3000);
  }
  send(msg) {
    if (LOCAL) { this.bc.postMessage({ to: 'guest', kind: 'msg', msg }); return; }
    if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) {} }
  }
  destroy() { this.destroyed = true; clearInterval(this.hb); try { this.bc && this.bc.close(); } catch (e) {} try { this.peer && this.peer.destroy(); } catch (e) {} }
}

class GuestTransport {
  constructor(code, h) { this.code = code; this.h = h; LOCAL ? this.initLocal() : this.initPeer(); }
  initLocal() {
    this.bc = new BroadcastChannel('kn-' + this.code);
    this.bc.onmessage = e => { const d = e.data; if (d.to === 'guest' && d.kind === 'msg') this.h.onMsg(d.msg); };
    setTimeout(() => { this.ever = true; this.h.onOpen(); }, 30);
  }
  initPeer() {
    if (!window.Peer) { setTimeout(() => this.h.onError('nolib'), 0); return; }
    this.peer = new Peer({ debug: 0 });
    this.peer.on('open', () => this.connect());
    this.peer.on('error', e => {
      const t = e && e.type;
      if (t === 'peer-unavailable') { if (!this.ever) this.h.onError('notfound'); return; }
      if (!this.ever) this.h.onError(t || 'error');
    });
    this.peer.on('disconnected', () => setTimeout(() => { try { if (!this.peer.destroyed && this.peer.disconnected) this.peer.reconnect(); } catch (e) {} }, 1500));
  }
  connect() {
    if (this.destroyed) return;
    const c = this.peer.connect(PREFIX + this.code, { reliable: true });
    this.conn = c;
    c.on('open', () => {
      if (c !== this.conn) return;
      this.ever = true; this.lastPong = Date.now();
      clearTimeout(this.retryTimer); this.retryTimer = null;
      clearInterval(this.hb);
      this.hb = setInterval(() => {
        if (c !== this.conn) return;
        try { c.send({ t: 'ping' }); } catch (e) {}
        if (Date.now() - this.lastPong > 12000) this.lost();
      }, 3000);
      this.h.onOpen();
    });
    c.on('data', d => { if (c !== this.conn) return; this.lastPong = Date.now(); if (d && d.t === 'pong') return; this.h.onMsg(d); });
    c.on('close', () => { if (c === this.conn) this.lost(); });
    c.on('error', () => {});
  }
  lost() {
    if (this.destroyed || this.retryTimer) return;
    clearInterval(this.hb);
    try { this.conn && this.conn.close(); } catch (e) {}
    this.conn = null;
    this.h.onClose();
    const attempt = () => {
      if (this.destroyed) return;
      if (this.conn && this.conn.open) { this.retryTimer = null; return; }
      try { if (this.peer.disconnected) this.peer.reconnect(); } catch (e) {}
      if (!this.peer.disconnected) this.connect();
      this.retryTimer = setTimeout(attempt, 4000);
    };
    this.retryTimer = setTimeout(attempt, 800);
  }
  isOpen() { return LOCAL ? true : !!(this.conn && this.conn.open); }
  send(msg) {
    if (LOCAL) { this.bc.postMessage({ to: 'host', kind: 'msg', msg }); return; }
    if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) {} }
  }
  destroy() { this.destroyed = true; clearInterval(this.hb); clearTimeout(this.retryTimer); try { this.bc && this.bc.close(); } catch (e) {} try { this.peer && this.peer.destroy(); } catch (e) {} }
}

/* ---------------- Host-Spiellogik ---------------- */
const freshStats = () => ({ ans: 0, right: 0, ms: 0, laughs: 0, bruller: 0, cat: {} });
function newPlayer(prof, idx) {
  return { name: (prof.name || (idx ? 'Spieler 2' : 'Spieler 1')).slice(0, 14), head: prof.head || '🙂', body: prof.body === 'f' ? 'f' : 'm', color: prof.color, pid: prof.pid, connected: true,
    pos: 0, score: 0, keys: {}, crowns: {}, stats: freshStats() };
}

class HostGame {
  constructor(code) {
    this.code = code; this.sid = 0; this.toastId = 0; this.waiters = []; this.decks = {};
    this.answers = [null, null]; this.nexts = [false, false]; this.rolled = false; this.choice = null; this.runId = 0;
    const saved = store.get('kn_settings', null);
    const settings = Object.assign({ turns: 10, mode: 'all', custom: CAT_KEYS.slice() }, saved || {});
    const cats = resolveCats(settings);
    this.s = { phase: 'lobby', code, players: [newPlayer(P, 0)], settings, cats, fields: buildBoard(cats), turn: 0, turnNo: 0, totalTurns: 20, final: false, lastDice: [3, 5], stage: { id: 0, type: 'lobby' }, toast: null, online: false, gameId: '' };
  }
  attach(transport) { this.t = transport; }
  push() { const s = JSON.parse(JSON.stringify(this.s)); s.stage.elapsed = Date.now() - (this.stageT0 || Date.now()); this.t && this.t.send({ t: 'state', s }); onState(s); }
  setStage(st) { this.s.stage = Object.assign({}, st, { id: ++this.sid }); this.stageT0 = Date.now(); this.answers = [null, null]; this.nexts = [false, false]; this.rolled = false; this.choice = null; this.push(); }
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
    if (!this.decks[key] || !this.decks[key].length) this.decks[key] = shuffle(arr.map((_, i) => i));
    return arr[this.decks[key].pop()];
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
        if (this.s.phase === 'lobby') Object.assign(pl[1], { name: (prof.name || pl[1].name).slice(0, 14), head: prof.head || pl[1].head, body: prof.body === 'f' ? 'f' : 'm' });
        this.toast(`${pl[1].name} ist wieder da!`);
      } else { this.t.send({ t: 'full' }); return; }
      this.t.send({ t: 'welcome', you: 1 });
      this.push(); this.check();
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
      case 'choose': if (st.type === 'choose' && st.p === i && this.choice == null && st.opts[a.i]) this.choice = a.i; break;
      case 'answer':
        if (a.sid === st.id && ['q', 'free', 'rate'].includes(st.type) && !this.answers[i]) {
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
    Object.assign(this.s, { phase: 'game', fields: buildBoard(this.s.cats), turn: rand(2), turnNo: 0, totalTurns: this.s.settings.turns * 2, final: false, gameId: Date.now().toString(36) + rand(1e6) });
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
      this.setStage({ type: 'roll', p });
      await this.waitFor(() => this.rolled);
      if (runId !== this.runId) return;
      const d = [1 + rand(6), 1 + rand(6)]; this.s.lastDice = d;
      const pos = pl[p].pos, opts = [];
      const addOpt = (steps, tag) => { for (const dir of [1, -1]) { const to = ((pos + dir * steps) % N + N) % N; if (!opts.some(o => o.to === to)) opts.push({ steps, dir, to, tag }); } };
      addOpt(d[0]); if (d[1] !== d[0]) addOpt(d[1]); else addOpt(d[0] * 2, 'pasch');
      this.setStage({ type: 'choose', p, dice: d, opts });
      await this.waitFor(() => this.choice != null, 45000);
      if (runId !== this.runId) return;
      const o = opts[this.choice ?? 0];
      if (o.tag === 'pasch') this.toast('🎲🎲 Pasch! Doppelt so weit!');
      await this.moveBy(p, o.steps * o.dir);
      await this.resolve(p, pl[p].pos);
      if (runId !== this.runId) return;
      if (!this.extraTurn) { this.s.turnNo++; this.s.turn = 1 - p; }
    }
    if (runId === this.runId) this.setStage({ type: 'end' });
  }
  async moveBy(p, steps) {
    const pl = this.s.players[p], from = pl.pos, to = ((from + steps) % N + N) % N, n = Math.abs(steps), dir = Math.sign(steps) || 1;
    pl.pos = to; // Ziel sofort setzen – der Client animiert ab "from"
    if (dir > 0 && from + n >= N && to !== 0) { pl.score += 100; this.toast(`🚀 ${pl.name} passiert den Start: +100`); }
    else if (to === 0) { pl.score += 150; this.toast(`🚀 ${pl.name} landet genau auf Start: +150`); }
    this.setStage({ type: 'move', p, from, to, steps: n, dir });
    await sleep(200 + n * 300 + 450);
  }
  async intro(o, ms) { this.setStage(Object.assign({ type: 'intro' }, o)); await sleep(ms); }
  async resolve(p, idx) {
    const f = this.s.fields[idx], pl = this.s.players[p];
    switch (f.t) {
      case 'start': this.push(); await sleep(900); break;
      case 'cat': {
        const has = pl.keys[f.c] || pl.crowns[f.c];
        await this.intro({ p, field: idx, cat: f.c, icon: has ? CATS[f.c].i : '🔑', title: has ? CATS[f.c].n : 'SCHLÜSSEL-FRAGE', sub: has ? 'Punkte-Duell – Schnelligkeit zählt!' : `${CATS[f.c].i} ${CATS[f.c].n}: Richtig = Schlüssel für ${pl.name}!` }, 2000);
        const r = await this.ask(this.mcQ(f.c), { dur: 15, mover: p, keyFor: has ? null : p });
        if (r.correct[p] && !pl.keys[f.c] && !pl.crowns[f.c]) { pl.keys[f.c] = true; this.setStage({ type: 'keyGot', p, cat: f.c }); await sleep(2200); }
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
      case 'pair':
        if (Math.random() < .55) {
          const t = this.draw('who', Q.who).replace(/^…\s*/, '');
          await this.intro({ p, field: idx, ft: 'pair', icon: '💘', title: 'WER VON EUCH?', sub: "Tippt beide, wen es trifft. Seid ihr euch einig, gibt's Punkte für beide!" }, 2200);
          await this.ask({ kind: 'who', text: 'Wer von euch beiden ' + t, options: [0, 1] }, { dur: 12, revealMs: 6000, ft: 'pair' });
        } else {
          const g = this.draw('guess', Q.guess);
          await this.intro({ p, field: idx, ft: 'pair', icon: '🔮', title: 'WAS SAGT DEIN SCHATZ?', sub: `${pl.name} antwortet ehrlich – ${this.s.players[1 - p].name} muss es erraten!` }, 2400);
          await this.ask({ kind: 'guess', text: g[0], options: g[1], subject: p }, { dur: 15, revealMs: 6000, ft: 'pair' });
        }
        break;
      case 'free': await this.quatsch(p, idx); break;
      case 'luck': await this.luck(p, idx); break;
    }
  }
  mcQ(cat) { const r = this.draw('mc_' + cat, Q.mc[cat]); const opts = shuffle(r.slice(1)); return { kind: 'mc', text: r[0], options: opts, answer: opts.indexOf(r[1]), cat }; }
  tfQ() { const r = this.draw('tf', Q.tf); return { kind: 'tf', text: r[0], options: ['Wahr', 'Falsch'], answer: r[1] ? 0 : 1 }; }
  async ask(q, o = {}) {
    const dur = o.dur || 15, mult = this.mult();
    const pub = { kind: q.kind, text: q.text, options: q.options, unit: q.unit, subject: q.subject };
    const base = { cat: q.cat || null, ft: o.ft || null, title: o.title || null, n: o.n || null, of: o.of || null, mover: o.mover ?? null, mult, vault: o.vault || null, keyFor: o.keyFor ?? null };
    this.setStage(Object.assign({ type: 'q', q: pub, dur, answered: [false, false] }, base));
    await this.waitFor(this.both(() => this.answers), dur * 1000 + 1500);
    const A = this.answers.slice();
    const res = this.score(q, A, dur, mult);
    this.setStage(Object.assign({ type: 'reveal', q: pub, answer: q.answer, picks: A.map(a => a ? a.v : null), ms: A.map(a => a ? a.ms : null), pts: res.pts, correct: res.correct, note: res.note, diffs: res.diffs || null }, base));
    await this.waitFor(this.both(() => this.nexts), o.revealMs || 6000);
    return res;
  }
  score(q, A, dur, mult) {
    const pl = this.s.players, pts = [0, 0], correct = [false, false];
    let note = '', diffs = null;
    if (q.kind === 'mc' || q.kind === 'tf') {
      A.forEach((a, i) => {
        const st = pl[i].stats; st.ans++;
        if (q.cat) { const c = st.cat[q.cat] || [0, 0]; c[1]++; st.cat[q.cat] = c; }
        if (a && a.v === q.answer) {
          correct[i] = true; st.right++; st.ms += a.ms;
          if (q.cat) st.cat[q.cat][0]++;
          pts[i] = Math.round((100 + 100 * Math.max(0, 1 - a.ms / (dur * 1000))) * mult);
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
    } else if (q.kind === 'who' || q.kind === 'guess') {
      const match = A[0] && A[1] && A[0].v === A[1].v;
      const val = (q.kind === 'who' ? 100 : 150) * mult;
      if (match) { pts[0] = pts[1] = val; correct[0] = correct[1] = true; note = q.kind === 'who' ? 'Einig! 💞 Punkte für beide' : 'Volltreffer! Ihr kennt euch 💞'; }
      else note = q.kind === 'who' ? 'Uneinig! 🙈 Das müsst ihr ausdiskutieren …' : "Daneben! 🙈 Da gibt's wohl Gesprächsbedarf …";
    }
    pts.forEach((p, i) => { pl[i].score += p; });
    return { pts, correct, note, diffs };
  }
  async vault(p, cat, idx) {
    const pl = this.s.players[p];
    if (pl.crowns[cat]) {
      await this.intro({ p, field: idx, cat, icon: '👑', title: 'SCHON GEKNACKT', sub: `Dieser Tresor gehört ${pl.name} schon. Bonusfrage!` }, 2000);
      await this.ask(this.mcQ(cat), { dur: 15, mover: p, title: 'Bonusfrage' });
      return;
    }
    const hasKey = !!pl.keys[cat], need = hasKey ? 2 : 3;
    await this.intro({ p, field: idx, cat, vaultIntro: true, hasKey, icon: CATS[cat].i, title: 'TRESOR!', sub: `${pl.name} knackt „${CATS[cat].n}“. ${hasKey ? 'Mit 🔑 Schlüssel: 2 von 3 richtig!' : 'Ohne Schlüssel: alle 3 richtig!'}` }, 3200);
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
    const prompt = this.draw('free', Q.free), mult = this.mult();
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
      case 'key': {
        const free = this.s.cats.filter(c => !me.keys[c] && !me.crowns[c]);
        if (free.length) { const c = free[rand(free.length)]; me.keys[c] = true; this.setStage({ type: 'keyGot', p, cat: c }); await sleep(2200); }
        else { me.score += 150 * mult; this.toast(`🎁 Alle Schlüssel schon da – +${150 * mult}`); }
        break;
      }
      case 'vault': {
        let k = 1; while (this.s.fields[(me.pos + k) % N].t !== 'vault') k++;
        this.push(); await sleep(400);
        await this.moveBy(p, k);
        await this.resolve(p, me.pos); return;
      }
      case 'fwd': {
        this.push(); await sleep(400);
        await this.moveBy(p, 3);
        if (this.s.fields[me.pos].t === 'luck') { me.score += 50; this.toast('Schon wieder Glück: +50'); this.push(); await sleep(1200); }
        else await this.resolve(p, me.pos);
        return;
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
    </div>
    ${statsHTML()}
    <div style="height:10px;flex:none"></div>`);
  $('#snd', el).onclick = e => { Sound.on = !Sound.on; store.set('kn_sound', Sound.on); e.currentTarget.textContent = Sound.on ? '🔊' : '🔇'; Sound.click(); };
  $('#rules', el).onclick = showRules;
  $('#edit', el).onclick = () => { Sound.click(); showCreator(); };
  const need = () => { if (!P.name) { showCreator(true); return false; } return true; };
  $('#host', el).onclick = () => { Sound.click(); if (need()) startHost(); };
  $('#join', el).onclick = () => { Sound.click(); if (need()) showJoin(''); };
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
  const done = () => { if (!P.name) { name.focus(); name.style.boxShadow = '0 0 0 4px var(--pink)'; vibrate(80); return; } Sound.ok(); showHome(); };
  $('#done', el).onclick = done; $('#back', el).onclick = () => { Sound.click(); showHome(); };
}

function showRules() {
  openSheet(`<div class="rules">
    <div class="qhead"><span class="pill" style="--cc:var(--yellow)">❓ So geht's</span><div class="spacer"></div><button class="iconbtn" id="closeR">✕</button></div>
    <h3>🎲🎲 Würfeln mit Taktik</h3><p>Du würfelst mit <b>zwei Würfeln</b> und suchst dir aus, welchen du nimmst – und ob du <b>vor- oder rückwärts</b> läufst. Bei einem Pasch darfst du auch die doppelte Strecke gehen. Die möglichen Ziele leuchten auf dem Brett.</p>
    <h3>🔑 Schlüssel sammeln</h3><p>Landest du auf einem Kategorie-Feld, ist es eine <b>Schlüssel-Frage</b>: Antwortest du richtig, gehört dir der Schlüssel dieser Kategorie.</p>
    <h3>🔐 Tresore knacken</h3><p>Hinter jedem Kategorie-Abschnitt wartet ein <b>Tresor</b> mit 3 Fragen. Mit Schlüssel reichen 2 richtige, ohne müssen alle 3 sitzen. Geknackt = 👑 Krone + 300 Punkte. Plane deinen Weg: erst Schlüssel holen, dann zum Tresor!</p>
    <h3>⚔️ Immer im Duell</h3><p>Bei jeder Frage antwortet ihr <b>beide gleichzeitig</b>. Richtig & schnell = bis zu 200 Punkte.</p>
    <h3>⚡ 🎯 💘 🤪 🎰 Sonderfelder</h3><p><b>Blitzrunde</b> (Wahr/Falsch), <b>Schätz-Duell</b>, <b>Pärchen-Runde</b>, <b>Quatsch-Runde</b> (freie Antwort, der andere bewertet 😂) und das <b>Glücksrad</b>.</p>
    <h3>🏆 Sieg</h3><p>Nach der gewählten Anzahl Züge gewinnt, wer die meisten Punkte hat. Die letzte Runde zählt doppelt! Wer alle Kronen holt, gewinnt sofort.</p>
    <button class="btn" id="okR" style="margin-top:16px">Alles klar!</button></div>`, '#ffd60a');
  $('#closeR').onclick = $('#okR').onclick = () => { Sound.click(); closeSheet(); };
}

/* ---------- Host / Beitreten ---------- */
function startHost(code) {
  code = code || genCode();
  C.isHost = true; C.me = 0;
  const g = new HostGame(code); C.host = g;
  const t = new HostTransport(code, {
    onOpen: () => { g.s.online = true; g.push(); },
    onError: type => {
      if (type === 'unavailable-id') { t.destroy(); C.host = null; startHost(); return; }
      if (type === 'nolib') { errorScreen('Die Verbindungs-Bibliothek konnte nicht geladen werden. Bist du online?'); return; }
      if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(type)) { banner('Verbindung zum Server wackelt …'); setTimeout(() => banner(''), 4000); return; }
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
  let welcomed = false;
  const failT = setTimeout(() => { if (!welcomed) { t.destroy(); C.net = null; onFail('Keine Verbindung möglich. Code richtig? Seid ihr beide online?'); } }, 15000);
  const t = new GuestTransport(code, {
    onOpen: () => { banner(''); t.send({ t: 'hello', profile: { name: P.name, head: P.head, body: P.body, color: P.color, pid: P.pid } }); },
    onMsg: m => {
      if (m.t === 'welcome') { welcomed = true; clearTimeout(failT); C.me = m.you; }
      else if (m.t === 'state') { if (welcomed) onState(m.s); }
      else if (m.t === 'full') { clearTimeout(failT); t.destroy(); C.net = null; onFail('Dieses Spiel ist schon voll.'); }
    },
    onClose: () => { if (welcomed) banner('📡 Verbindung weg – verbinde neu …'); },
    onError: type => {
      if (welcomed) return;
      clearTimeout(failT); t.destroy(); C.net = null;
      onFail(type === 'notfound' ? 'Code nicht gefunden 🤔' : type === 'nolib' ? 'Verbindungs-Bibliothek fehlt – bist du online?' : 'Verbindung fehlgeschlagen (' + type + ')');
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
    <div class="card col center">
      <div class="label">Spiel-Code</div>
      ${codeHTML}
      ${isHost ? `<p class="muted" style="margin:4px 0 0;font-weight:700;font-size:14px">Dein Schatz gibt diesen Code ein</p>${navigator.share ? '<button class="btn ghost small" id="share" style="align-self:center">📤 Einladung teilen</button>' : ''}` : ''}
    </div>
    <div class="vs" style="margin:14px 0">${slot(pl[0])}<div class="vsx">VS</div>${slot(pl[1])}</div>
    <div class="card col">
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
    const cls = 'field ' + (f.t === 'vault' ? 'vault' : f.t === 'cat' ? 'catf' : f.t === 'start' ? 'start' : 'special');
    return `<div class="${cls}" id="f${i}" data-i="${i}" style="grid-column:${c};grid-row:${r};--fc:${m.color};--d:${(i * 0.17).toFixed(2)}s"><span class="fi">${m.icon}</span>${f.t === 'vault' ? '<span class="lock">🔒</span><span class="owners"></span>' : ''}${f.t === 'cat' ? '<span class="kmark"></span>' : ''}</div>`;
  }).join('') + `<div class="boardcenter"><div class="arena"></div><div class="centerlogo">KOPFNUSS</div><div class="dicepair"><div class="dicebox"><div class="dice" id="dice0">${diceFaces()}</div></div><div class="dicebox"><div class="dice" id="dice1">${diceFaces()}</div></div></div></div>`
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
  const cell = Math.max(24, Math.floor(Math.min((W - 26) / 7.5, (H - 34) / (10.5 * cos + .8))));
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
    const sig = pl.head + pl.body + pl.color;
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
    const pos = ((st.from + st.dir * k) % N + N) % N; C.anim[p].cur = pos;
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
  const cell = (p, c) => p.crowns[c] ? '<span class="ks crown">👑</span>' : p.keys[c] ? '<span class="ks key">🔑</span>' : '<span class="ks none"></span>';
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
      el.classList.toggle('haskey', !!L.keys[f.c]);
    } else if (f.t === 'cat') {
      el.classList.toggle('needkey', !L.keys[f.c] && !L.crowns[f.c]);
    }
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
  if (f.t === 'vault') what = `🔐 ${CATS[f.c].s}-Tresor ${pl.crowns[f.c] ? '👑' : pl.keys[f.c] ? '<em>🔑 bereit!</em>' : '<em class="warn">ohne 🔑</em>'}`;
  else if (f.t === 'cat') what = `${CATS[f.c].i} ${CATS[f.c].s} ${pl.keys[f.c] || pl.crowns[f.c] ? '' : '<em>🔑 holen</em>'}`;
  else if (f.t === 'start') what = '🚀 Start';
  else what = `${FT[f.t].i} ${FT[f.t].n}`;
  return `<span class="dir">${o.dir > 0 ? '▶' : '◀'} ${o.steps}</span><span class="what">${what}</span>`;
}
function choose(i) {
  if (C.chose) return;
  C.chose = true; Sound.click(); vibrate(20);
  $$('.tbtn').forEach((b, j) => { b.disabled = true; b.classList.toggle('sel', j === i); });
  act({ type: 'choose', i });
}

function enterStage(st, s) {
  const mine = st.p === C.me;
  C.chose = false;
  switch (st.type) {
    case 'roll': {
      closeSheet();
      setStatus(mine ? '🎲🎲 Du bist dran – würfle!' : `${nameOf(st.p)} ist dran …`);
      if (mine) {
        const ab = setAction(`<button class="btn pink rollbtn" id="roll">🎲🎲 Würfeln!</button>`);
        $('#roll', ab).onclick = e => { e.currentTarget.disabled = true; Sound.click(); vibrate(30); act({ type: 'roll' }); };
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
          f.insertAdjacentHTML('beforeend', `<span class="marker"><b>${o.dir > 0 ? '▶' : '◀'}${o.steps}</b></span>`);
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
      setAction(`<div class="waitbar">${st.dir > 0 ? '🏃 Los geht\'s …' : '🔙 Rückwärts …'}</div>`);
      setStatus(`${mine ? 'Du läufst' : nameOf(st.p) + ' läuft'} ${st.steps} ${st.steps === 1 ? 'Feld' : 'Felder'} ${st.dir > 0 ? 'vor' : 'zurück'}`);
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
    case 'end': renderEnd(s); break;
  }
}
function updateStage(st, s) {
  if (['q', 'free', 'rate'].includes(st.type)) {
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
  const key = st.keyFor != null ? `<span class="pill keypill">🔑 ${st.keyFor === C.me ? 'Dein Schlüssel!' : 'Schlüssel für ' + nameOf(st.keyFor)}</span>` : '';
  return `<div class="qhead">${stagePill(st)}${key}<div class="spacer"></div>${st.mult > 1 ? '<span class="pill x2">🔥 x2</span>' : ''}${st.title ? `<span class="pill dark">${esc(st.title)}</span>` : ''}</div>`;
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
    <p>${mine ? 'Du hast' : nameOf(st.p) + ' hat'} den Schlüssel für <b>${c.i} ${esc(c.n)}</b>.<br>Jetzt reichen am Tresor 2 von 3 richtige!</p></div>`, '#ffd60a');
  Sound.fanfare(); if (mine) burst(50); vibrate([30, 30, 80]);
}

function startTimer(st, onEnd) {
  const bar = $('#tbar'), wrap = $('#timer');
  let lastSec = 99, ended = false;
  const loop = () => {
    if (C.stageId !== st.id) return;
    const el = (performance.now() - C.t0) / 1000, rem = Math.max(0, st.dur - el);
    if (bar) bar.style.transform = `scaleX(${rem / st.dur})`;
    if (wrap) wrap.classList.toggle('warn', rem < 4);
    const sec = Math.ceil(rem);
    if (sec !== lastSec && sec <= 3 && sec > 0 && C.myAns == null) Sound.tick();
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
  vibrate(20); Sound.click();
  return true;
}
function oppLine(st) {
  const opp = 1 - C.me;
  return st.answered[opp] ? `<div class="opp done" id="opp">⚡ ${nameOf(opp)} hat schon geantwortet!</div>` : `<div class="opp" id="opp">⏳ ${nameOf(opp)} überlegt …</div>`;
}
function questionText(st) {
  const q = st.q;
  if (q.kind === 'guess') {
    const subj = q.subject === C.me;
    return subj ? `<div class="qtext">${esc(q.text)}</div><div class="qsub">💬 Antworte ehrlich – ${nameOf(1 - C.me)} muss raten!</div>`
      : `<div class="qsub" style="margin:0 0 4px">🔮 Was antwortet ${nameOf(q.subject)}?</div><div class="qtext">„${esc(q.text)}“</div>`;
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
    return `<div class="rbox ${win ? 'win' : ''}" style="--pc:${p.color}">${st.correct && st.correct[i] ? '<span class="badge">✅</span>' : ''}<div class="ra">${esc(p.head)}</div><div style="font-weight:800;font-size:13px">${esc(p.name)}</div><div class="rp" style="color:${win ? 'var(--lime)' : 'var(--muted)'}">+${pts}</div>${extra ? extra(i) : ''}</div>`;
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
  if (q.kind === 'mc' || q.kind === 'tf' || q.kind === 'who' || q.kind === 'guess') {
    body = questionText(st) + optsHTML(st);
    extra = i => `<div class="rt">${st.picks[i] == null ? 'keine Antwort' : (q.kind === 'mc' || q.kind === 'tf') ? msTxt(st.ms[i]) : ''}</div>`;
  } else if (q.kind === 'est') {
    body = `<div class="qtext">${esc(q.text)}</div><div class="numdisp" style="background:var(--lime);color:var(--ink)">${fmtNum(st.answer)}<small style="color:var(--ink)">${esc(q.unit)}</small></div>`;
    extra = i => `<div class="rv">${st.picks[i] == null ? '—' : fmtNum(st.picks[i])} ${esc(q.unit)}</div><div class="rt">${st.diffs && st.diffs[i] != null ? 'Abstand ' + fmtNum(st.diffs[i]) : 'keine Antwort'}</div>`;
  }
  const keyNote = st.keyFor != null ? `<div class="center keynote">${st.correct[st.keyFor] ? `🔑 ${st.keyFor === me ? 'Du bekommst' : nameOf(st.keyFor) + ' bekommt'} den Schlüssel!` : `🔒 Kein Schlüssel für ${st.keyFor === me ? 'dich' : nameOf(st.keyFor)}.`}</div>` : '';
  const panel = openSheet(`${headHTML(st)}${st.vault ? vaultPips(st.vault, st.vault.marks.concat([st.correct[st.vault.p] ? 1 : 0])) : ''}${body}
    ${st.note ? `<div class="center" style="font-weight:900;font-size:17px;margin-top:14px">${esc(st.note)}</div>` : ''}${keyNote}
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
          if (q.kind === 'who' || q.kind === 'guess') b.classList.add(st.correct[0] ? 'right' : 'picked');
        }
      });
    });
  }
  if (q.kind === 'who' || q.kind === 'guess') { if (st.correct[0]) { Sound.ok(); burst(40); } else Sound.sad(); }
  else if (st.correct[me]) { Sound.ok(); vibrate(30); if (st.pts[me] >= 180) burst(25); }
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
    <p>${st.success ? `${esc(p.name)} holt sich die Krone „${esc(c.n)}“ und <b>+${st.bonus}</b> Punkte!` : `${esc(p.name)} hatte ${st.got} von ${st.need} nötigen richtigen Antworten.${p.keys[st.cat] ? ' Der Schlüssel bleibt erhalten 🔑' : ''}`}</p>
    </div>${nextBtn()}`, c.c);
  if (st.success) { Sound.fanfare(); burst(mine ? 120 : 60); vibrate([50, 50, 50, 50, 200]); } else { Sound.sad(); vibrate(200); }
  wireNext(panel, st);
}
function renderLuck(st, s) {
  const items = st.items, list = [];
  for (let r = 0; r < 4; r++) list.push(...items);
  list.push(...items.slice(0, st.pick + 1));
  const finalIdx = list.length - 1;
  highlightField(st.field);
  setAction(`<div class="waitbar">🎰 Glücksrad dreht …</div>`);
  const panel = openSheet(`<div class="intro"><div class="big-emoji">🎰</div><h2 style="--cc:var(--yellow)">GLÜCKSRAD</h2><p>${st.p === C.me ? 'Du drehst' : nameOf(st.p) + ' dreht'} am Rad …</p></div>
    <div class="reel"><div class="strip" id="strip">${list.map(l => `<div class="it">${esc(l)}</div>`).join('')}</div></div>`, FT.luck.c);
  const strip = $('#strip', panel);
  requestAnimationFrame(() => requestAnimationFrame(() => { strip.style.transform = `translateY(${-(finalIdx * 58) + 3}px)`; }));
  let n = 0; const iv = setInterval(() => { Sound.tick(); if (++n > 22) clearInterval(iv); }, 105);
  setTimeout(() => { if (C.stageId === st.id) { strip.children[finalIdx].style.background = 'var(--yellow)'; Sound.ok(); vibrate(60); } }, 2500);
}

/* ---------- Ende ---------- */
function renderEnd(s) {
  cancelAnimationFrame(C.raf);
  recordGame(s, C.me);
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
  if (meWon || tie) { Sound.fanfare(); confettiRain(); } else Sound.sad();
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
