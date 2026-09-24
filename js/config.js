/* ============================================================
   FantaVolley — config.js
   Qui sotto trovi TUTTE le impostazioni che puoi modificare.
   ============================================================ */

const CONFIG = {
  /* true  = dati finti salvati nel browser (prova subito il sito)
     false = usa Supabase (mettilo a false dopo il setup)          */
  DEMO_MODE: false,

  /* Credenziali Supabase (già inserite, non toccare) */
  SUPABASE_URL: 'https://lldlwgvuxvyerpemetdd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZGx3Z3Z1eHZ5ZXJwZW1ldGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDY0MjYsImV4cCI6MjEwNTgyMjQyNn0.ivttUT9807jzRSmHveK8LbhB9FYD-hVvkFOapt4tXm4',

  APP_NAME: 'FantaCazzo',
};

/* ============================================================
   PUNTEGGI — modifica i valori "pts" come preferisci.
   - pts positivo = azione che FA punti
   - pts negativo = azione che TOGLIE punti
   - puoi aggiungere o togliere azioni liberamente:
     chiave: { label: 'Nome azione', pts: numero }
   La chiave (es. "schiacciata") non serve in UI, serve solo
   a identificare l'azione nel database.
   ============================================================ */
const SCORING = {
  punto:           { label: 'Punto vinto',        pts: 1  },
  schiacciata:     { label: 'Schiacciata',        pts: 2  },
  muro:            { label: 'Muro',               pts: 2  },
  ace:             { label: 'Servizio ace',       pts: 2  },
  palleggio:       { label: 'Palleggio (assist)', pts: 1  },
  ricezione:       { label: 'Ricezione perfetta', pts: 1  },
  difesa:          { label: 'Difesa',             pts: 1  },
  fallo:           { label: 'Fallo',              pts: -1 },
  errore_servizio: { label: 'Errore al servizio', pts: -1 },
  errore_attacco:  { label: 'Errore in attacco',  pts: -1 },
};
