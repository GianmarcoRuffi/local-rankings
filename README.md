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
- Node.js 18.x o superiore
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
   npx tsx scripts/create-default-ranking.ts
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
