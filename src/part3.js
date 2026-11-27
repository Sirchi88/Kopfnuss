
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

// Kurze Vorschau mitten am Bildschirm, wenn ein Würfel- oder Spielfeld-Design gewählt wird
function lookPreview(kind, val) {
  const old = $('#lookprev'); if (old) old.remove();
  clearTimeout(C.lookT);
  if (kind === 'dice') document.body.dataset.dice = val; else document.body.dataset.theme = val;
  const el = document.createElement('div'); el.id = 'lookprev'; el.className = 'lookprev';
  const cats = Object.values(CATS).slice(0, 8);
  el.innerHTML = kind === 'dice'
    ? `<div class="lp-dice"><div class="dicebox"><div class="dice">${diceFaces()}</div></div></div><b>${esc(DICE[val] || val)}</b>`
    : `<div class="lp-wrap"><div class="board lp-board">${cats.map((c, i) => `<div class="field" style="--fc:${c.c};--d:${i}"><span class="fi">${c.i}</span></div>`).join('')}<div class="field vault lp-v" style="--fc:#ffd60a"><span class="fi">🔐</span></div></div></div><b>${esc(THEMES[val] || val)}</b>`;
  document.body.appendChild(el);
  C.lookT = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 1500);
  el.onclick = () => el.remove();
}
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
      <div class="seg">${[[6, 'Quickie', '~5 Min'], [10, 'Normal', '~10 Min'], [15, 'Lang', '~15 Min'], [25, 'Marathon', '~25 Min'], [50, 'Mega', '~45 Min']].map(([v, n, d]) => `<button data-t="${v}" class="${st.turns === v ? 'sel' : ''}" ${dis}>${n}<small>${v} Runden · ${d}</small></button>`).join('')}</div>
      <div class="label">Wer gewinnt?</div>
      <div class="seg two">${[['points', '🏆 Punkte-Sieg', 'Meiste Punkte nach allen Runden'], ['vault', '🔐 Tresor-Rennen', `Zuerst ${VAULT_GOAL} Tresore knacken`]].map(([k, n, d]) => `<button data-win="${k}" class="${(st.win || 'points') === k ? 'sel' : ''}" ${dis}>${n}<small>${d}</small></button>`).join('')}</div>
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
    $$('[data-dice]', el).forEach(b => b.onclick = () => { lookPreview('dice', b.dataset.dice); set({ dice: b.dataset.dice }); });
    $$('[data-theme]', el).forEach(b => b.onclick = () => { lookPreview('theme', b.dataset.theme); set({ theme: b.dataset.theme }); });
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
    d.style.transform = `rotateX(${r[0] + k}deg) rotateY(${r[1] + k}deg)`;
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
// Figur hüpft weich von Feld zu Feld: Gleiten auf dem Brett + echter Sprung nach oben (WAAPI, GPU-freundlich)
async function animateMove(st) {
  const p = st.p, tk = $('#tk' + p); if (!tk) return;
  C.anim[p] = { cur: st.from };
  const hop = $('.hopper', tk), sh = $('.tshadow', tk);
  let [x0, y0] = tokenXY(p, st.from);
  tk.style.transition = 'none';
  for (let k = 1; k <= st.steps; k++) {
    if (!C.anim[p]) break;
    const pos = st.path[k]; C.anim[p].cur = pos;
    const [x, y] = tokenXY(p, pos);
    const a = tk.animate([{ transform: `translate3d(${x0}px,${y0}px,2px)` }, { transform: `translate3d(${x}px,${y}px,2px)` }], { duration: 300, easing: 'cubic-bezier(.45,0,.55,1)' });
    tk.style.transform = `translate3d(${x}px,${y}px,2px)`;
    if (hop) hop.animate([
      { transform: 'translateY(0) scale(1.05,.94)', easing: 'cubic-bezier(.2,.7,.4,1)' },
      { transform: 'translateY(-42%) scale(.97,1.04)', offset: .48, easing: 'cubic-bezier(.6,0,.8,.4)' },
      { transform: 'translateY(0) scale(1.06,.93)', offset: .9 },
      { transform: 'none' }], { duration: 300 });
    if (sh) sh.animate([{ transform: 'translateZ(1px)', opacity: 1 }, { transform: 'translateZ(1px) scale(.55)', opacity: .45, offset: .48 }, { transform: 'translateZ(1px)', opacity: 1 }], { duration: 300 });
    if (k === 1 || k === st.steps || k % 2) Sound.hop();
    if (k === st.steps) vibrate(10);
    await a.finished.catch(() => {});
    x0 = x; y0 = y;
  }
  tk.style.transition = '';
  delete C.anim[p];
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
  if (q.kind === 'sort') return `<div class="sorthint">👆 Tippe der Reihe nach – <b>1 = ${esc(q.top || 'ganz oben')}</b>. Nochmal tippen = zurücknehmen.</div><div class="opts sortopts" id="opts">${q.options.map((o, i) => `<button class="opt" data-v="${i}"><span class="k rk"></span><span class="ot">${esc(o)}</span></button>`).join('')}</div>`;
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
  if (q.kind === 'sort') {
    const order = [], btns = $$('#opts .opt', panel);
    panel.querySelector('#opts').insertAdjacentHTML('afterend', '<button class="btn lime" id="send" style="margin-top:10px" disabled>Reihenfolge einloggen ✅</button>');
    const send = $('#send', panel);
    const paint = () => { btns.forEach(b => { const k = order.indexOf(+b.dataset.v); b.classList.toggle('picked', k >= 0); b.querySelector('.rk').textContent = k >= 0 ? k + 1 : ''; }); send.disabled = order.length < btns.length; };
    paint();
    btns.forEach(b => b.onclick = () => {
      if (C.myAns != null) return;
      const v = +b.dataset.v, k = order.indexOf(v);
      if (k >= 0) order.splice(k, 1); else order.push(v);
      Sound.tone(500 + order.length * 120, .05, 'triangle', .05); vibrate(10); paint();
    });
    send.onclick = () => { if (order.length < btns.length) return; if (answer(st, order.slice())) { send.disabled = true; send.textContent = 'Eingeloggt ✓'; lock(); } };
    startTimer(st, () => { if (C.myAns == null) { if (order.length) answer(st, order.slice()); lock(); send.disabled = true; send.textContent = '⏰ Zeit um!'; Sound.bad(); vibrate(100); } });
  } else if (q.kind === 'est') {
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
  } else if (q.kind === 'sort') {
    body = `<div class="qtext">${esc(q.text)}</div><div class="sortres">${st.answer.map((oi, k) => `<div class="srow"><span class="k">${k + 1}</span><span class="ot">${esc(q.options[oi])}</span><span class="who">${s.players.map((p, i) => Array.isArray(st.picks[i]) && st.picks[i][k] === oi ? whoMark(p) : '').join('')}</span></div>`).join('')}</div>${q.top ? `<div class="center sorthint">1 = ${esc(q.top)}</div>` : ''}`;
    extra = i => { const v = Array.isArray(st.picks[i]) ? st.picks[i] : null; return `<div class="rt">${v ? st.answer.filter((x, k) => v[k] === x).length + '/4 Plätze' : 'keine Antwort'}</div>`; };
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
