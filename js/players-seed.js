/* ============================================================
   FantaVolley — players-seed.js
   Elenco dei giocatori (gli studenti che fanno i punti).

   - name:  nome e cognome come deve apparire nell'app
   - photo: percorso dell'immagine, relativo alla radice del sito
            (es. "images/players/mario-rossi.jpg")

   NOTE:
   - Se photo è vuoto o il file non si trova, l'app mostra
     automaticamente un cerchio colorato con le iniziali.
   - I nomi vanno scritti ESATTAMENTE come devono apparire.
   - Se aggiungi/togli/modifichi un giocatore qui e fai push,
     al prossimo login l'app sincronizza automaticamente:
     aggiunge i nuovi e aggiorna le foto dei giocatori già presenti.
   - L'app NON elimina mai giocatori dal DB: se vuoi toglierne uno,
     cancellalo dal pannello Admin o da Supabase.
   ============================================================ */

const PLAYERS_SEED = [
  { name: 'Iaio',     photo: 'images/players/iaio.jpg' },
  { name: 'Musso',    photo: 'images/players/musso.jpg' },
  { name: 'Ale',    photo: 'images/players/ale.jpg' },
  // ... aggiungi qui gli altri
];