/* ============================================================
   FantaVolley — db.js
   Livello dati. Due implementazioni con la stessa interfaccia:
   - createDemoStore()   : dati finti in localStorage (DEMO_MODE=true)
   - createSupaStore()   : database Supabase (DEMO_MODE=false)
   NOTA: la variabile client Supabase si chiama "sb" apposta,
   per non fare conflitto con l'oggetto globale "supabase".
   ============================================================ */

/* ---------------- STORE DEMO (localStorage) ---------------- */
function createDemoStore() {
  const KEY = 'fantavolley_demo_v1';

  function seed() {
    // Se esiste js/players-seed.js, la demo parte già con i tuoi giocatori reali
    const seedList = (typeof PLAYERS_SEED !== 'undefined' && PLAYERS_SEED.length)
      ? PLAYERS_SEED : null;
    const players = seedList
      ? seedList.map((s, i) => ({ id: i + 1, name: s.name, photo_url: s.photo || '' }))
      : Array.from({ length: 18 }, (_, i) => ({
          id: i + 1, name: 'Giocatore ' + (i + 1), photo_url: ''
        }));

    // eventi di esempio: giornate 1 e 2 per i primi 8 giocatori
    const events = [];
    let eid = 1;
    const acts = Object.entries(SCORING);
    for (let g = 1; g <= 2; g++) {
      for (let pid = 1; pid <= 8; pid++) {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) {
          const [action, sc] = acts[Math.floor(Math.random() * acts.length)];
          events.push({
            id: eid++, player_id: pid, action, points: sc.pts,
            match_label: 'Giornata ' + g,
            created_at: new Date(2026, 8, 19 + g, 10, 30 + k).toISOString()
          });
        }
      }
    }
    return {
      seq: 100,
      users: [
        { id: 1, username: 'admin',  password: 'admin123', team_name: 'I Maestri del Muro', is_admin: true,  player_id: 1 },
        { id: 2, username: 'mattiz', password: 'test1234', team_name: 'Schiaccia & Vai',    is_admin: false, player_id: 2 },
      ],
      players, events,
      members: [
        { id: 1, profile_id: 2, player_id: 2 },
        { id: 2, profile_id: 2, player_id: 3 },
        { id: 3, profile_id: 2, player_id: 4 },
        { id: 4, profile_id: 1, player_id: 5 },
        { id: 5, profile_id: 1, player_id: 6 },
        { id: 6, profile_id: 1, player_id: 7 },
      ],
      session: null
    };
  }

  let db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const pub = u => ({ id: u.id, username: u.username, team_name: u.team_name, is_admin: !!u.is_admin, player_id: u.player_id });

  return {
    async signUp(username, password, teamName) {
      if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase()))
        throw new Error('Username già in uso');
      const u = { id: ++db.seq, username, password, team_name: teamName, is_admin: false, player_id: null };
      db.users.push(u); db.session = u.id; save();
      return pub(u);
    },
    async signIn(username, password) {
      const u = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!u || u.password !== password) throw new Error('Username o password errati');
      db.session = u.id; save();
      return pub(u);
    },
    async signOut() { db.session = null; save(); },
    async currentUser() {
      const u = db.users.find(u => u.id === db.session);
      return u ? pub(u) : null;
    },
    async listPlayers() {
      return [...db.players].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    },
    async addPlayer(name) {
      if (db.players.some(p => p.name.toLowerCase() === name.toLowerCase()))
        throw new Error('Giocatore già esistente');
      const p = { id: ++db.seq, name, photo_url: '' };
      db.players.push(p); save(); return p;
    },
    async deletePlayer(id) {
      db.players = db.players.filter(p => p.id !== Number(id));
      db.members = db.members.filter(m => m.player_id !== Number(id));
      db.events  = db.events.filter(e => e.player_id !== Number(id));
      db.users.forEach(u => { if (u.player_id === Number(id)) u.player_id = null; });
      save();
    },
    /* Sincronizza i giocatori dal file js/players-seed.js:
       - aggiunge quelli mancanti (match per nome, case-insensitive)
       - aggiorna la foto_url di quelli già presenti se diversa
       - non elimina mai nulla */
    async syncPlayers(seed) {
      if (!seed || !seed.length) return;
      for (const s of seed) {
        const found = db.players.find(p => p.name.toLowerCase() === s.name.toLowerCase());
        if (!found) {
          db.players.push({ id: ++db.seq, name: s.name, photo_url: s.photo || '' });
        } else if (s.photo && found.photo_url !== s.photo) {
          found.photo_url = s.photo;
        }
      }
      save();
    },
    async listProfiles() { return db.users.map(pub); },
    async updateProfile(id, fields) {
      const u = db.users.find(u => u.id === Number(id));
      if (u) { Object.assign(u, fields); save(); }
    },
    async deleteProfile(id) {
      db.users   = db.users.filter(u => u.id !== Number(id));
      db.members = db.members.filter(m => m.profile_id !== Number(id));
      if (db.session === Number(id)) db.session = null;
      save();
    },
    async listMembers() { return [...db.members]; },
    async assignPlayer(profileId, playerId) {
      profileId = Number(profileId); playerId = Number(playerId);
      if (db.members.some(m => m.profile_id === profileId && m.player_id === playerId))
        throw new Error('Giocatore già presente nella squadra');
      db.members.push({ id: ++db.seq, profile_id: profileId, player_id: playerId });
      save();
    },
    async removeMember(memberId) {
      db.members = db.members.filter(m => m.id !== Number(memberId));
      save();
    },
    async listEvents() {
      return [...db.events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    async addEvent(playerId, action, points, matchLabel) {
      const e = {
        id: ++db.seq, player_id: Number(playerId), action,
        points: Number(points), match_label: matchLabel,
        created_at: new Date().toISOString()
      };
      db.events.push(e); save(); return e;
    },
    async deleteEvent(id) {
      db.events = db.events.filter(e => e.id !== Number(id));
      save();
    },
    async resetDemo() { localStorage.removeItem(KEY); location.reload(); }
  };
}

/* ---------------- STORE SUPABASE ---------------- */
function createSupaStore() {
  // NOTA: "sb" e NON "supabase" (altrimenti va in conflitto col CDN)
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // Email tecnica finta: la registrazione usa solo username+password,
  // ma Supabase Auth internamente richiede un'email, quindi la deriviamo.
  const fakeEmail = u => u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@fantavolley.app';

  return {
    client: sb,

    async signUp(username, password, teamName) {
      const { data: ex } = await sb.from('profiles').select('id').ilike('username', username).maybeSingle();
      if (ex) throw new Error('Username già in uso');

      const { data, error } = await sb.auth.signUp({
        email: fakeEmail(username),
        password,
        options: { data: { username, team_name: teamName } }
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sessione non creata: disabilita "Confirm email" in Supabase');

      // Il trigger crea già il profilo con i dati passati sopra.
      // Usiamo upsert così funziona sia se il trigger esiste, sia se no.
      const { error: e2 } = await sb.from('profiles').upsert(
        { id: data.user.id, username, team_name: teamName },
        { onConflict: 'id' }
      );
      if (e2) throw new Error(e2.message);

      return { id: data.user.id, username, team_name: teamName, is_admin: false, player_id: null };
    },

    async signIn(username, password) {
      // .ilike per accettare anche "Mattiz" al posto di "mattiz"
      const { data: p } = await sb.from('profiles').select('*').ilike('username', username).maybeSingle();
      if (!p) throw new Error('Utente non trovato');
      const { error } = await sb.auth.signInWithPassword({ email: fakeEmail(p.username), password });
      if (error) throw new Error('Password errata');
      return p;
    },

    async signOut() { await sb.auth.signOut(); },

    async currentUser() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      return data;
    },

    async listPlayers() {
      const { data, error } = await sb.from('players').select('*').order('name');
      if (error) throw new Error(error.message);
      return data || [];
    },
    async addPlayer(name) {
      const { error } = await sb.from('players').insert({ name });
      if (error) throw new Error(error.message.includes('duplicate') ? 'Giocatore già esistente' : error.message);
    },
    async deletePlayer(id) {
      const { error } = await sb.from('players').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    /* Sincronizza i giocatori dal file js/players-seed.js con Supabase:
       - aggiunge i nuovi (match per nome, case-insensitive)
       - aggiorna photo_url di quelli già presenti, se diversa
       - non elimina mai nulla (per togliere un giocatore usa l'Admin) */
    async syncPlayers(seed) {
      if (!seed || !seed.length) return;
      const { data: existing, error } = await sb.from('players').select('id, name, photo_url');
      if (error) throw new Error(error.message);
      const byName = new Map((existing || []).map(p => [p.name.toLowerCase(), p]));
      const toInsert = [];
      const toUpdate = [];
      for (const s of seed) {
        const found = byName.get(s.name.toLowerCase());
        if (!found) {
          toInsert.push({ name: s.name, photo_url: s.photo || '' });
        } else if (s.photo && found.photo_url !== s.photo) {
          toUpdate.push({ id: found.id, photo_url: s.photo });
        }
      }
      if (toInsert.length) {
        const { error: e1 } = await sb.from('players').insert(toInsert);
        if (e1) throw new Error(e1.message);
      }
      for (const u of toUpdate) {
        const { error: e2 } = await sb.from('players').update({ photo_url: u.photo_url }).eq('id', u.id);
        if (e2) throw new Error(e2.message);
      }
    },
    async listProfiles() {
      const { data, error } = await sb.from('profiles').select('id, username, team_name, is_admin, player_id');
      if (error) throw new Error(error.message);
      return data || [];
    },
    async updateProfile(id, fields) {
      const { error } = await sb.from('profiles').update(fields).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async deleteProfile(id) {
      // cancella rosa + profilo; l'account auth resta orfano ma non
      // potrà più accedere (il login cerca prima il profilo per username)
      await sb.from('team_members').delete().eq('profile_id', id);
      const { error } = await sb.from('profiles').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    async listMembers() {
      const { data, error } = await sb.from('team_members').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
    async assignPlayer(profileId, playerId) {
      const { error } = await sb.from('team_members').insert({ profile_id: profileId, player_id: playerId });
      if (error) throw new Error(error.message.includes('duplicate') ? 'Giocatore già presente nella squadra' : error.message);
    },
    async removeMember(memberId) {
      const { error } = await sb.from('team_members').delete().eq('id', memberId);
      if (error) throw new Error(error.message);
    },
    async listEvents() {
      const { data, error } = await sb.from('match_events').select('*').order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    async addEvent(playerId, action, points, matchLabel) {
      const { error } = await sb.from('match_events').insert({
        player_id: playerId, action, points, match_label: matchLabel
      });
      if (error) throw new Error(error.message);
    },
    async deleteEvent(id) {
      const { error } = await sb.from('match_events').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    async resetDemo() {}
  };
}
