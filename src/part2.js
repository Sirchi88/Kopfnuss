
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
    if (q.kind === 'sort') return Math.random() < .45 ? q.answer.slice() : shuffle(q.answer.slice());
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
  sortQ(cat) { const r = this.draw('sort_' + cat, Q.sort[cat]); const opts = shuffle(r[1]); return { kind: 'sort', text: r[0], options: opts, answer: r[1].map(x => opts.indexOf(x)), top: r[2] || null, cat }; }
  mcQ(cat) { this.sinceSort = (this.sinceSort ?? 3) + 1; if (this.sinceSort >= 8 && Q.sort && Q.sort[cat] && Q.sort[cat].length && Math.random() < .4) { this.sinceSort = 0; return this.sortQ(cat); } const r = this.draw('mc_' + cat, Q.mc[cat]); const opts = shuffle(r.slice(1)); return { kind: 'mc', text: r[0], options: opts, answer: opts.indexOf(r[1]), cat }; }
  tfQ() { const r = this.draw('tf', Q.tf); return { kind: 'tf', text: r[0], options: ['Wahr', 'Falsch'], answer: r[1] ? 0 : 1 }; }
  async ask(q, o = {}) {
    const dur = (o.dur || 15) + (q.kind === 'sort' ? 10 : 0), mult = this.mult(), n = this.np, pl = this.s.players;
    const pub = { kind: q.kind, text: q.text, self: q.self, options: q.options, unit: q.unit, subject: q.subject, top: q.top };
    // Handicap: Wer mit 300+ Punkten führt, hat bei Wissensfragen weniger Zeit
    const durs = new Array(n).fill(dur), sc = pl.map(p => p.score), top = Math.max(...sc), second = sc.slice().sort((a, b) => b - a)[1] ?? top;
    if (['mc', 'tf', 'est', 'sort'].includes(q.kind) && top - second >= 300) durs[sc.indexOf(top)] = Math.max(3, Math.round(dur * .7));
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
    if (q.kind === 'sort') {
      A.forEach((a, i) => {
        const st = pl[i].stats; st.ans++;
        if (q.cat) { const c = st.cat[q.cat] || [0, 0]; c[1]++; st.cat[q.cat] = c; }
        const v = a && Array.isArray(a.v) ? a.v : [], hits = q.answer.filter((x, k) => v[k] === x).length;
        if (hits === q.answer.length) {
          correct[i] = true; st.right++; st.ms += a.ms; if (q.cat) st.cat[q.cat][0]++;
          pts[i] = Math.round((100 + 100 * Math.max(0, 1 - a.ms / (durs[i] * 1000))) * mult);
        } else pts[i] = 20 * hits * mult;
      });
      const right = correct.map((c, i) => c ? i : -1).filter(i => i >= 0);
      if (right.length > 1) { const f = right.sort((a, b) => A[a].ms - A[b].ms)[0]; note = `⚡ ${pl[f].name} hat am schnellsten sortiert!`; }
      else if (!right.length) note = 'Keine perfekte Reihenfolge 🙈 – pro richtigem Platz gibt\'s +20.';
    } else if (q.kind === 'mc' || q.kind === 'tf') {
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
    await this.intro({ p, field: idx, cat, catIntro: true, anim: rand(4), icon: CATS[cat].i, title: CATS[cat].n, keyNo: full ? null : k + 1, sub: intro || (full ? (pl.crowns[cat] ? 'Tresor schon geknackt – Punkte-Duell!' : 'Schlüsselbund voll – ab in den Tresorraum! Jetzt: Punkte-Duell.') : `Richtig = Schlüssel ${k + 1}/${KEYS_NEEDED} für ${pl.name}`) }, intro ? 2800 : 1900);
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
