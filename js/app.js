/* ============================================================
   FantaVolley — app.js
   Logica dell'applicazione (vanilla JS, nessun framework)
   ============================================================ */
'use strict';

/* ================= UTILS ================= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const num = v => Number(v) || 0;
const sameId = (a, b) => String(a) === String(b);
const signed = v => (num(v) > 0 ? '+' : '') + num(v);

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* Avatar: foto se presente, altrimenti placeholder con iniziali */
function avatarHTML(entity, size = 44) {
  const name = (entity && (entity.name || entity.username)) || '?';
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const img = (entity && entity.photo_url)
    ? `<img src="${esc(entity.photo_url)}" alt="" onerror="this.remove()">` : '';
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:hsl(${h} 62% 42%)">${img}<i style="font-size:${Math.round(size * 0.36)}px">${esc(initials)}</i></span>`;
}

/* ================= STATE ================= */
let store = null;
let ME = null;
let TAB = 'classifica';
let PLAYERS = [], PROFILES = [], MEMBERS = [], EVENTS = [];
let ADMIN_TAB = 'azioni';
let ADM_SEL_PLAYER = '';   // giocatore selezionato nel pannello azioni
let ADM_MATCH_LABEL = '';  // etichetta partita selezionata nel pannello azioni

async function refreshData() {
  [PLAYERS, PROFILES, MEMBERS, EVENTS] = await Promise.all([
    store.listPlayers(), store.listProfiles(), store.listMembers(), store.listEvents()
  ]);
}

/* ---- calcoli punti / classifiche ---- */
const playerById    = id => PLAYERS.find(p => sameId(p.id, id));
const profileById   = id => PROFILES.find(p => sameId(p.id, id));
const playerPoints  = id => EVENTS.filter(e => sameId(e.player_id, id)).reduce((a, e) => a + num(e.points), 0);
function teamPoints(profileId) {
  const ids = MEMBERS.filter(m => sameId(m.profile_id, profileId)).map(m => m.player_id);
  return EVENTS.filter(e => ids.some(id => sameId(id, e.player_id))).reduce((a, e) => a + num(e.points), 0);
}
function ranked(list) {
  let r = 0, prev = null;
  return list.map((it, i) => { if (it.pts !== prev) { r = i + 1; prev = it.pts; } return { ...it, rank: r }; });
}
const teamBoard = () => ranked(
  PROFILES.map(p => ({ p, pts: teamPoints(p.id) }))
    .sort((a, b) => b.pts - a.pts || a.p.team_name.localeCompare(b.p.team_name, 'it')));
const playerBoard = () => ranked(
  PLAYERS.map(p => ({ p, pts: playerPoints(p.id) }))
    .sort((a, b) => b.pts - a.pts || a.p.name.localeCompare(b.p.name, 'it')));

/* eventi di un giocatore raggruppati per giornata (con dettaglio azioni) */
function eventsDetailByMatch(pid) {
  const evs = EVENTS.filter(e => sameId(e.player_id, pid))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const map = {}, order = [];
  evs.forEach(e => {
    const k = e.match_label || 'Partita';
    if (!map[k]) { map[k] = []; order.push(k); }
    map[k].push(e);
  });
  // giornate più recenti in alto (come nella foto), azioni in ordine cronologico
  return order.slice().reverse().map(k => ({
    label: k,
    events: map[k],
    pts: map[k].reduce((a, e) => a + num(e.points), 0)
  }));
}

/* ================= VISTA: CLASSIFICA ================= */
function viewClassifica() {
  const teams = teamBoard(), players = playerBoard();
  const teamRows = teams.map(t => `
    <div class="lb-row ${t.rank <= 3 ? 'top-' + t.rank : ''}">
      <span class="lb-rank">${t.rank}</span>
      <div class="lb-main">
        <span class="lb-name">${esc(t.p.team_name)}</span>
        <span class="lb-sub">${esc(t.p.username)}</span>
      </div>
      <span class="lb-pts">${t.pts}</span>
    </div>`).join('') || '<p class="muted small">Nessuna squadra iscritta.</p>';

  const playerRows = players.map(pl => `
    <div class="lb-row ${pl.rank <= 3 ? 'top-' + pl.rank : ''}">
      <span class="lb-rank">${pl.rank}</span>
      ${avatarHTML(pl.p, 38)}
      <div class="lb-main"><span class="lb-name">${esc(pl.p.name)}</span></div>
      <span class="lb-pts">${pl.pts}</span>
    </div>`).join('') || '<p class="muted small">Nessun giocatore in rosa.</p>';

  return `
    <div class="page-title">
      <h2>Classifica</h2>
      <p class="muted">Campionato di classe · Pallavolo 🏐</p>
    </div>
    <section class="card">
      <h3 class="card-title">🏆 Squadre</h3>
      <div>${teamRows}</div>
    </section>
    <section class="card">
      <h3 class="card-title">⭐ Classifica giocatori</h3>
      <div>${playerRows}</div>
    </section>`;
}

/* ================= VISTA: SQUADRA ================= */
function viewSquadra() {
  const members = MEMBERS.filter(m => sameId(m.profile_id, ME.id))
    .map(m => playerById(m.player_id)).filter(Boolean);
  let roster;
  if (!members.length) {
    roster = `<div class="empty">La tua rosa è vuota 🏐<br>
      <span class="muted small" style="font-weight:400">L'admin ti assegnerà i tuoi 3 giocatori dopo l'asta.</span></div>`;
  } else {
    // 1) Riga delle card giocatore (avatar + nome + totale)
    const cardsRow = `<div class="roster">${members.map(p => {
      const pts = playerPoints(p.id);
      return `
      <div class="player-col">
        <div class="player-card">
          ${avatarHTML(p, 62)}
          <div class="player-name">${esc(p.name)}</div>
          <div class="player-pts ${pts < 0 ? 'neg' : ''}">${signed(pts)} <span>pt</span></div>
        </div>
      </div>`;
    }).join('')}</div>`;

    // 2) Tutte le giornate in cui almeno un membro ha punti (ordine decrescente)
    const allLabels = new Set();
    members.forEach(p => {
      EVENTS.filter(e => sameId(e.player_id, p.id))
        .forEach(e => allLabels.add(e.match_label || 'Partita'));
    });
    const labels = [...allLabels].sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || [0])[0], 10);
      const nb = parseInt((b.match(/\d+/) || [0])[0], 10);
      if (na && nb && na !== nb) return nb - na;
      return b.localeCompare(a, 'it');
    });

    // 3) Per ogni giornata: intestazione + 3 colonne con le azioni di ciascun giocatore
    const daysHTML = labels.map(label => {
      const cols = members.map(p => {
        const evs = EVENTS
          .filter(e => sameId(e.player_id, p.id) && (e.match_label || 'Partita') === label)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (!evs.length) return `<div class="day-col day-col-empty"></div>`;
        return `<div class="day-col">${evs.map(e => {
          const lbl = SCORING[e.action] ? SCORING[e.action].label : e.action;
          const v = num(e.points);
          const cls = v < 0 ? 'neg' : 'pos';
          return `<div class="day-action ${cls}">
            <span class="day-action-name">${esc(lbl)}</span>
            <span class="day-action-pts">${signed(v)}</span>
          </div>`;
        }).join('')}</div>`;
      }).join('');
      return `
        <div class="day-group">
          <div class="day-group-label">${esc(label)}</div>
          <div class="day-cols">${cols}</div>
        </div>`;
    }).join('') || '<div class="muted small" style="font-size:11px">Nessun punto registrato.</div>';

    roster = cardsRow + `<div class="day-list">${daysHTML}</div>`;
  }
  const total = teamPoints(ME.id);
  return `
    <div class="page-title">
      <h2>${esc(ME.team_name)}</h2>
      <p class="muted">La tua squadra · <strong class="pts-inline">${signed(total)} pt</strong></p>
    </div>
    ${roster}`;
}

/* ================= VISTA: PROFILO ================= */
function viewProfilo() {
  const myTeam = teamBoard().find(t => sameId(t.p.id, ME.id));
  const corrPlayer = ME.player_id ? playerById(ME.player_id) : null;
  const myPlayer = (corrPlayer ? playerBoard().find(x => sameId(x.p.id, corrPlayer.id)) : null);
  return `
    <div class="page-title"><h2>Profilo</h2></div>
    <section class="card profile-card">
      ${avatarHTML(ME, 72)}
      <div class="profile-name">${esc(ME.username)}</div>
      <div class="profile-team">${esc(ME.team_name)}</div>
      ${ME.is_admin ? '<span class="badge-admin">ADMIN</span>' : ''}
    </section>
    <section class="card">
      <div class="stat-grid">
        <div class="stat">
          <span class="stat-label">Punti squadra</span>
          <span class="stat-value">${myTeam ? signed(myTeam.pts) : '0'}</span>
          <span class="stat-sub">Posizione #${myTeam ? myTeam.rank : '—'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Giocatore corr.</span>
          <span class="stat-value" style="font-size:14px">${corrPlayer ? esc(corrPlayer.name) : '—'}</span>
          <span class="stat-sub">${myPlayer ? signed(myPlayer.pts) + ' pt · Posizione #' + myPlayer.rank : 'Non assegnato'}</span>
        </div>
      </div>
    </section>
    ${ME.is_admin ? `<button class="btn primary big" onclick="openAdmin()">🛠️ Pannello Admin</button>` : ''}
    <button class="btn ghost big" onclick="doLogout()">Esci dall'account</button>
    ${CONFIG.DEMO_MODE ? `<button class="btn ghost big" onclick="store.resetDemo()">↺ Reset dati demo</button>` : ''}`;
}

/* ================= AUTH ================= */
let AUTH_MODE = 'login';
function showAuth(mode = 'login') {
  AUTH_MODE = mode;
  $('#app').classList.add('hidden');
  $('#admin').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  renderAuth();
}
function renderAuth() {
  const isLogin = AUTH_MODE === 'login';
  $('#auth').innerHTML = `
  <div class="auth-box">
    <div class="auth-logo">🏐</div>
    <h1>${esc(CONFIG.APP_NAME)}</h1>
    <p class="muted auth-sub">il  fantastocazzo della berneschi</p>
    <div class="auth-tabs">
      <button class="${isLogin ? 'active' : ''}" onclick="AUTH_MODE='login';renderAuth()">Accedi</button>
      <button class="${!isLogin ? 'active' : ''}" onclick="AUTH_MODE='register';renderAuth()">Registrati</button>
    </div>
    ${isLogin ? `
    <form onsubmit="return doLogin(event)" class="auth-form">
      <label>Username<input name="username" required autocomplete="username" placeholder="Il tuo username"></label>
      <label>Password<input name="password" type="password" required autocomplete="current-password" placeholder="••••••••"></label>
      <button class="btn primary big" type="submit">Accedi</button>
    </form>` : `
    <form onsubmit="return doRegister(event)" class="auth-form">
      <label>Username<input name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_.\\-]+" title="Solo lettere, numeri e . _ -" placeholder="Es. Mattiz"></label>
      <label>Nome squadra<input name="team" required maxlength="30" placeholder="Es. I Maestri del Muro"></label>
      <label>Password<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Minimo 6 caratteri"></label>
      <label>Conferma password<input name="confirm" type="password" required autocomplete="new-password" placeholder="Ripeti la password"></label>
      <button class="btn primary big" type="submit">Crea account</button>
    </form>`}
    <p class="muted small center" style="margin-top:14px">Dopo l'asta, l'admin ti assegnerà i tuoi 3 giocatori.</p>
    ${CONFIG.DEMO_MODE ? '<p class="muted small center" style="margin-top:6px">Demo → <b>admin / admin123</b> oppure <b>mattiz / test1234</b></p>' : ''}
  </div>`;
}
async function doLogin(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    ME = await store.signIn(f.username.value.trim(), f.password.value);
    await enterApp();
  } catch (e) { toast(e.message); }
  return false;
}
async function doRegister(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (f.password.value !== f.confirm.value) { toast('Le password non coincidono'); return false; }
  try {
    ME = await store.signUp(f.username.value.trim(), f.password.value, f.team.value.trim());
    await enterApp();
    toast('Account creato! 🎉');
  } catch (e) { toast(e.message); }
  return false;
}
async function doLogout() {
  await store.signOut();
  ME = null;
  showAuth('login');
}

/* ================= APP SHELL ================= */
async function enterApp() {
  $('#auth').classList.add('hidden');
  $('#admin').classList.add('hidden');
  $('#app').classList.remove('hidden');

  // Sincronizza i giocatori definiti in js/players-seed.js
  // (aggiunge i nuovi, aggiorna le foto di quelli già presenti)
  if (typeof PLAYERS_SEED !== 'undefined' && PLAYERS_SEED.length) {
    try { await store.syncPlayers(PLAYERS_SEED); }
    catch (e) { console.warn('syncPlayers:', e); }
  }

  await refreshData();
  renderApp();
}
function renderApp() {
  $('#topbar-user').innerHTML = `<span>${esc(ME.username)} · ${esc(ME.team_name)}</span>`;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === TAB));
  $('#page').innerHTML =
    TAB === 'classifica' ? viewClassifica() :
    TAB === 'squadra'    ? viewSquadra()    : viewProfilo();
}

/* ================= PANNELLO ADMIN ================= */
function openAdmin() {
  if (!ME || !ME.is_admin) return;
  ADMIN_TAB = 'azioni';
  $('#admin').classList.remove('hidden');
  renderAdmin();
}
function closeAdmin() {
  $('#admin').classList.add('hidden');
}
function renderAdmin() {
  const tabs = [['azioni', '🎯 Azioni'], ['squadre', '👥 Squadre'], ['giocatori', '🏐 Giocatori']];
  $('#admin').innerHTML = `
    <div class="admin-sheet" onclick="event.stopPropagation()">
      <div class="admin-head">
        <h2>Pannello Admin</h2>
        <button class="btn icon" onclick="closeAdmin()">✕</button>
      </div>
      <div class="admin-tabs">
        ${tabs.map(([k, l]) => `<button class="${ADMIN_TAB === k ? 'active' : ''}" onclick="ADMIN_TAB='${k}';renderAdmin()">${l}</button>`).join('')}
      </div>
      <div class="admin-body">
        ${ADMIN_TAB === 'azioni' ? adminActionsHTML() : ADMIN_TAB === 'squadre' ? adminSquadsHTML() : adminPlayersHTML()}
      </div>
    </div>`;
}
$('#admin') && $('#admin').addEventListener('click', e => { if (e.target.id === 'admin') closeAdmin(); });

/* ---- Admin: tabella azioni (punteggi partita) ---- */
function adminActionsHTML() {
  const labels = [...new Set(EVENTS.map(e => e.match_label))];
  const recent = [...EVENTS].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 25);
  const matchValue = ADM_MATCH_LABEL || labels[labels.length - 1] || 'Giornata 1';
  const actionBtns = Object.entries(SCORING).map(([key, sc]) => `
    <button class="act-btn ${sc.pts < 0 ? 'neg' : ''}" onclick="admAddEvent('${key}')">
      <span>${esc(sc.label)}</span><b>${signed(sc.pts)}</b>
    </button>`).join('');
  return `
    <div class="field">
      <label>Partita / Giornata</label>
      <input id="adm-match" list="match-labels" placeholder="Es. Giornata 1"
             value="${esc(matchValue)}">
      <datalist id="match-labels">${labels.map(l => `<option value="${esc(l)}">`).join('')}</datalist>
    </div>
    <div class="field">
      <label>Giocatore in campo</label>
      <select id="adm-player">
        <option value="">Seleziona…</option>
        ${PLAYERS.map(p => `<option value="${p.id}" ${sameId(p.id, ADM_SEL_PLAYER) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <div class="act-grid">${actionBtns}</div>
    <div class="custom-pts">
      <input id="adm-custom" type="number" step="0.5" placeholder="Punti manuali (es. -0.5)">
      <button class="btn" onclick="admAddCustom()">Aggiungi</button>
    </div>
    <h3 class="card-title" style="margin-top:18px">Ultimi eventi registrati</h3>
    <div class="event-list">
      ${recent.map(e => {
        const p = playerById(e.player_id);
        const lbl = SCORING[e.action] ? SCORING[e.action].label : e.action;
        return `<div class="event-row">
          <div class="ev-main">
            <b>${esc(p ? p.name : '?')}</b>
            <span class="muted small">${esc(lbl)} · ${esc(e.match_label)}</span>
          </div>
          <span class="ev-pts ${num(e.points) < 0 ? 'neg' : ''}">${signed(e.points)}</span>
          <button class="btn icon danger" onclick="admDeleteEvent('${e.id}')">🗑</button>
        </div>`;
      }).join('') || '<p class="muted small">Nessun evento registrato.</p>'}
    </div>`;
}
async function admAddEvent(key) {
  const pid = $('#adm-player').value;
  const label = ($('#adm-match').value || '').trim() || 'Giornata';
  if (!pid) return toast('Seleziona prima un giocatore');
  ADM_SEL_PLAYER = pid;       // memorizzo per non perderlo al re-render
  ADM_MATCH_LABEL = label;
  try {
    await store.addEvent(Number(pid), key, SCORING[key].pts, label);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admAddCustom() {
  const pid = $('#adm-player').value;
  const label = ($('#adm-match').value || '').trim() || 'Giornata';
  const v = $('#adm-custom').value;
  if (!pid) return toast('Seleziona prima un giocatore');
  if (v === '' || isNaN(Number(v))) return toast('Inserisci un valore valido');
  ADM_SEL_PLAYER = pid;
  ADM_MATCH_LABEL = label;
  try {
    await store.addEvent(Number(pid), 'Punti manuali', Number(v), label);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admDeleteEvent(id) {
  if (!confirm('Eliminare questo evento?')) return;
  try {
    await store.deleteEvent(id);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}

/* ---- Admin: gestione squadre e utenti ---- */
function adminSquadsHTML() {
  return `
    <p class="muted small" style="margin-bottom:10px">Gestisci utenti e rose: assegna qui i 3 giocatori comprati all'asta.</p>
    ${PROFILES.map(p => {
      const members = MEMBERS.filter(m => sameId(m.profile_id, p.id));
      const inTeam = members.map(m => m.player_id);
      const avail = PLAYERS.filter(pl => !inTeam.some(id => sameId(id, pl.id)));
      return `<div class="card admin-card">
        <div class="admin-card-head">
          <b>${esc(p.username)}</b>
          ${p.is_admin ? '<span class="badge-admin">ADMIN</span>' : ''}
          <span class="muted"> · ${esc(p.team_name)}</span>
        </div>
        <div class="chips">
          ${members.map(m => {
            const pl = playerById(m.player_id);
            return pl ? `<span class="chip">${esc(pl.name)}<button onclick="admRemoveMember('${m.id}')">✕</button></span>` : '';
          }).join('') || '<span class="muted small">Rosa vuota</span>'}
        </div>
        <div class="admin-controls">
          <select onchange="admAddMember('${p.id}', this)">
            <option value="">+ Aggiungi giocatore alla rosa…</option>
            ${avail.map(pl => `<option value="${pl.id}">${esc(pl.name)}</option>`).join('')}
          </select>
          <select onchange="admSetPlayer('${p.id}', this)">
            <option value="">Giocatore corrispondente…</option>
            ${PLAYERS.map(pl => `<option value="${pl.id}" ${p.player_id && sameId(p.player_id, pl.id) ? 'selected' : ''}>${esc(pl.name)}</option>`).join('')}
          </select>
          <button class="btn small" onclick="admRenameTeam('${p.id}')">✏️ Rinomina squadra</button>
          <button class="btn small" onclick="admToggleAdmin('${p.id}')">${p.is_admin ? 'Revoca privilegi admin' : 'Rendi admin'}</button>
          <button class="btn small danger" onclick="admDeleteProfile('${p.id}')">🗑 Elimina utente</button>
        </div>
      </div>`;
    }).join('') || '<p class="muted">Nessun utente registrato.</p>'}`;
}
async function admAddMember(profileId, sel) {
  if (!sel.value) return;
  try {
    await store.assignPlayer(profileId, Number(sel.value));
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); sel.value = ''; }
}
async function admRemoveMember(memberId) {
  try {
    await store.removeMember(memberId);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admRenameTeam(profileId) {
  const p = profileById(profileId);
  const name = prompt('Nuovo nome della squadra:', p ? p.team_name : '');
  if (!name || !name.trim()) return;
  try {
    await store.updateProfile(profileId, { team_name: name.trim() });
    if (ME && sameId(ME.id, profileId)) ME.team_name = name.trim();
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admSetPlayer(profileId, sel) {
  try {
    const v = sel.value ? Number(sel.value) : null;
    await store.updateProfile(profileId, { player_id: v });
    if (ME && sameId(ME.id, profileId)) ME.player_id = v;
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admToggleAdmin(profileId) {
  const p = profileById(profileId);
  if (!p) return;
  try {
    await store.updateProfile(profileId, { is_admin: !p.is_admin });
    if (ME && sameId(ME.id, profileId)) ME.is_admin = !p.is_admin;
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admDeleteProfile(profileId) {
  const p = profileById(profileId);
  if (!confirm(`Eliminare l'utente "${p ? p.username : ''}"? La sua squadra e la sua rosa verranno cancellate.`)) return;
  try {
    await store.deleteProfile(profileId);
    if (ME && sameId(ME.id, profileId)) {
      ME = null; showAuth('login'); return;
    }
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}

/* ---- Admin: gestione giocatori ---- */
function adminPlayersHTML() {
  return `
    <p class="muted small" style="margin-bottom:10px">Aggiungi gli 18 studenti come giocatori. Per le foto imposta <code>photo_url</code> (vedi SETUP.md).</p>
    <div class="custom-pts">
      <input id="adm-newplayer" placeholder="Nome e cognome del giocatore">
      <button class="btn" onclick="admAddPlayer()">Aggiungi</button>
    </div>
    <div class="event-list">
      ${PLAYERS.map(p => `<div class="event-row">
        ${avatarHTML(p, 36)}
        <div class="ev-main">
          <b>${esc(p.name)}</b>
          <span class="muted small">${signed(playerPoints(p.id))} pt totali</span>
        </div>
        <button class="btn icon danger" onclick="admDeletePlayer('${p.id}')">🗑</button>
      </div>`).join('') || '<p class="muted small">Nessun giocatore.</p>'}
    </div>`;
}
async function admAddPlayer() {
  const name = $('#adm-newplayer').value.trim();
  if (!name) return toast('Inserisci il nome del giocatore');
  try {
    await store.addPlayer(name);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}
async function admDeletePlayer(id) {
  const p = playerById(id);
  if (!confirm(`Eliminare ${p ? '"' + p.name + '"' : 'il giocatore'}? Verranno cancellati anche tutti i suoi punti.`)) return;
  try {
    await store.deletePlayer(id);
    await refreshData(); renderApp(); renderAdmin();
  } catch (e) { toast(e.message); }
}

/* ================= BOOT ================= */
window.addEventListener('DOMContentLoaded', boot);
async function boot() {
  store = CONFIG.DEMO_MODE ? createDemoStore() : createSupaStore();
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => {
    TAB = b.dataset.tab; renderApp(); window.scrollTo(0, 0);
  }));
  let me = null;
  try { me = await store.currentUser(); } catch (e) { console.error(e); }
  if (me) { ME = me; await enterApp(); }
  else showAuth('login');
}
