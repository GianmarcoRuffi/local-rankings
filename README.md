# Tournament Manager - Local Rankings 🏆

Sistema gestionale per l'organizzazione e il calcolo delle classifiche di tornei locali. Il software permette di gestire ranking generali e singole tappe, automatizzando il parsing dei risultati e il calcolo dei punteggi.

## Caratteristiche principali

- **Gestione Multi-Ranking**: Supporto per diverse classifiche indipendenti (es. diverse stagioni o categorie).
- **Automazione Risultati**: Upload e parsing automatico di file PDF per l'estrazione dei risultati dei tornei.
- **Calcolo Punteggi**: Logica integrata per il calcolo automatico di punti, presenze e differenziale T1 (Tie-break).
- **Dashboard Amministrativa**: Interfaccia protetta per la gestione di giocatori, tappe e operazioni di merge dei dati.
- **Export Dati**: Generazione di report in formato PDF e Excel per la condivisione delle classifiche.
- **Cestino Logico**: Sistema di cancellazione sicura (soft delete) con possibilità di ripristino dati.

## Setup e Configurazione

### Prerequisiti
- Node.js 22.x e npm 10.x
- PostgreSQL (istanza locale o cloud come Neon, Vercel Postgres, Supabase)

### Installazione
1. Clonare il repository:
   ```bash
   git clone https://github.com/GianmarcoRuffi/local-rankings.git
   cd local-rankings
   ```

2. Installare le dipendenze:
   ```bash
   npm install
   ```

3. Configurare l'ambiente:
   Creare un file `.env` nella root del progetto seguendo questo schema:
   ```env
   DATABASE_URL="postgres://user:password@host:port/dbname"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3080"
   ```

4. Inizializzare il database:
   ```bash
   # Applica lo schema al database
   npm run db:push

   # Crea il primo utente amministratore
   npm run db:create-user <username> <password> <displayName>

   # Inizializza la classifica di default
   npm run db:create-default-ranking
   ```

### Esecuzione
```bash
# Modalità sviluppo
npm run dev

# Build e avvio produzione
npm run build
npm start
```
L'applicazione sarà raggiungibile di default all'indirizzo `http://localhost:3080`.

## Troubleshooting

### Problemi di connessione al database
- Verificare che la stringa `DATABASE_URL` sia corretta e accessibile.
- Il progetto supporta automaticamente connessioni SSL in produzione e gestisce correttamente i certificati self-signed in ambiente di sviluppo.

### Errori nel parsing dei PDF
- Assicurarsi che il PDF caricato segua il formato standard previsto dal parser.
- Controllare i log del server per individuare eventuali campi non mappati correttamente durante l'estrazione dati.

### Reset della cache di build
In caso di errori persistenti durante la build di Next.js:
```bash
rm -rf .next node_modules
npm install
npm run build
```

---
**Sviluppato da Gianmarco Ruffi**

## Verifiche automatiche

```bash
npm ci
npm test
npx playwright install chromium
npm run test:integration
npm run lint
npm run build
```

La suite di integrazione avvia PostgreSQL temporaneo su porta 55439 e Next su
3181, applica tutte le migrazioni e usa solo dati sintetici. Richiede queste porte
libere; le credenziali del progetto non vengono usate per il database dei test.
Gli screenshot desktop/mobile sono salvati in `/tmp/local-rankings-screenshots`.

La migrazione `0004_deletion_groups` va applicata prima di avviare questa versione
sul database reale. Il ripristino conserva le eliminazioni antecedenti a quella
della classifica. Per i dati storici senza gruppo, recuperare i figli individualmente.
Le sessioni JWT precedenti a questa versione richiedono un nuovo login.

## Cestino: scadenze e pulizia

Applicare la migrazione `0005_trash_expiration` prima di distribuire il codice.
Aggiunge scadenze UTC persistite: 120 ore per le nuove eliminazioni e cinque giorni
aggiuntivi, dalla migrazione, per i dati già cestinati. La data originale resta
invariata. Verificare prima un backup e provare la migrazione su un database isolato.
Le anteprime attuali condividono il database reale e non sono ambienti di test.

Il recupero scade alla data indicata; la rimozione fisica avviene con la successiva
pulizia. Le eliminazioni definitive manuali richiedono dati già cestinati. Per
ripristinare un figlio bisogna prima recuperare il circuito; i dati eliminati prima
del circuito non sono ripristinati automaticamente con esso.

Il cron `GET /api/cron/trash` è configurato alle 03:00 UTC. Impostare un nuovo
`CRON_SECRET` nell'ambiente Production e mantenere inizialmente
`TRASH_CLEANUP_ENABLED=false`. L'endpoint richiede `Authorization: Bearer` con
il segreto; non usare segreti in URL o log. La pulizia è abilitabile soltanto con
`VERCEL_ENV=production` e `TRASH_CLEANUP_ENABLED=true`.

Prima di abilitarla, richiamare l'endpoint autenticato con `?dryRun=true`: restituisce
conteggi senza cancellare. Controllare anche che non esistano record cestinati senza
`trash_expires_at`; durante il passaggio dal vecchio codice questi vanno assegnati
al periodo di grazia prima di attivare il cron. Non modificare i gruppi storici per
inferenza: eventuali figli restanti si recuperano esplicitamente dopo il circuito.

Controllare nei log `trash-cleanup` la prima esecuzione e le successive. Vercel non
ritenta automaticamente gli errori: l'endpoint può essere richiamato nuovamente con
la stessa autenticazione. Le invocazioni ripetute sono sicure. Ogni invocazione
lavora su lotti di massimo 100 record per tabella, per circa 20 secondi; un arretrato
residuo richiede altre invocazioni. La modalità diagnostica riporta il lotto candidato. I circuiti
con figli attivi o non ancora scaduti non vengono rimossi automaticamente.
Per sospendere la pulizia impostare il flag a false e ridistribuire. Il rollback
del codice non recupera dati già eliminati definitivamente: serve il backup.

La lettura del cestino restituisce quattro sezioni paginate (20 elementi, massimo
100), senza i dettagli dei giocatori nei gruppi. Parametri: `limit`, `rankingsPage`,
`generalRankingGroupsPage`, `stagesPage`, `generalRankingUngroupedPage`. La risposta
aggiunge `pagination`, scadenze e informazioni sulla recuperabilità. Le azioni POST
restano invariate; gli errori hanno un `code` stabile e stato 400/401/404/409/500.
