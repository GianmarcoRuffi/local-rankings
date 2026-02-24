# Local Rankings

Gestionale per classifiche di tornei locali.

## Stack Tecnologico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: MySQL 8.0+
- **Auth**: NextAuth.js (JWT, credentials)
- **PDF Parsing**: pdf-parse

## Funzionalità

- 🔐 Login con username e password (salvati su DB)
- 🏆 Classifica Generale: tabella ordinabile con punti cumulativi e differenziale T1
- 🚩 Classifica Tappa: tabella temporanea di ogni tappa
- 📄 Upload PDF: carica e analizza automaticamente la classifica da un PDF
- 🔀 Merge: unisce la tappa alla classifica generale con un click
- 📊 T1 (Differenziale): tracciamento del differenziale punteggio per ogni giocatore
- 🔧 Operazioni Tabella: ordinamento, capitalizzazione nomi, ricalcolo posizioni

## Struttura Dati

La tabella classifica contiene le seguenti colonne:

| Colonna | Descrizione |
|---------|-------------|
| POSIZIONE | Posizione in classifica (ricalcolata automaticamente) |
| NOME GIOCATORE | Nome del giocatore (capitalizzato automaticamente) |
| PUNTEGGIO TOTALE | Punti cumulativi totali |
| T1 | Differenziale punteggio (positivo o negativo) |
| PRESENZE | Numero totale di presenze accumulate |
| TAPPE | Numero di tappe giocate |

## Setup

### 1. Database MySQL

```sql
-- Crea il database e le tabelle
source database/schema.sql

-- Se hai già il database, applica la migrazione per T1
source database/migration_t1.sql

-- Se hai già il database senza PRESENZE, applica la migrazione
source database/migration_presenze.sql

-- (Opzionale) Dati di esempio
source database/seed.sql
```

### 2. Variabili d'ambiente

Copia `.env.example` in `.env.local` e configura:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=local_rankings

NEXTAUTH_SECRET=cambia-questa-chiave-segreta
NEXTAUTH_URL=http://localhost:3000
```

### 3. Installa dipendenze

```bash
npm install
```

### 4. Crea utente admin

```bash
npm run db:create-user admin admin123 "Amministratore"
```

### 5. Avvia

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) e accedi con le credenziali create.

## Logica Punti Tappa

| Posizione | Punti |
|-----------|-------|
| 1°        | 25    |
| 2°        | 18    |
| 3°        | 15    |
| 4°        | 12    |
| 5°        | 10    |
| 6°        | 8     |
| 7°        | 6     |
| 8°        | 4     |
| 9°        | 2     |
| 10°       | 1     |
| 11°+      | 0     |

> ⚠️ La tabella punti è configurabile in `src/lib/ranking-logic.ts`

## Ordinamento Classifica

L'ordinamento della classifica segue questa logica (come negli script Google originali):

1. **Punti Totali** (decrescente): più punti = posizione migliore
2. **T1** (con comparatore personalizzato):
   - Valori positivi: ordinati per valore assoluto decrescente
   - Valori negativi: ordinati per valore (più negativo prima)
   - Zero: va alla fine

Esempio di ordinamento T1: +14, +8, +5, +4, 0, -2, -11

## API Endpoints

### GET /api/ranking/general
Restituisce la classifica generale ordinata per punti e T1.

### GET/POST /api/ranking/stages
Lista e creazione tappe.

### GET /api/ranking/stages/[id]
Giocatori di una specifica tappa.

### POST /api/ranking/upload
Carica e analizza un PDF con la classifica della tappa.

### POST /api/ranking/merge
Unisce una tappa alla classifica generale.

### POST /api/ranking/operations
Operazioni di gestione tabella:
- `sortByName`: Ordina alfabeticamente per nome
- `sortByPoints`: Ordina per punti (decrescente) e T1
- `capitalizeNames`: Capitalizza la prima lettera dei nomi
- `recalculatePositions`: Ricalcola le posizioni
- `multiplyScores`: Moltiplica i punteggi per 3 (solo tappa)

## Struttura Progetto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth
│   │   └── ranking/
│   │       ├── general/          # GET classifica generale
│   │       ├── stages/           # GET/POST tappe
│   │       ├── stages/[id]/      # GET giocatori tappa
│   │       ├── upload/           # POST carica PDF
│   │       ├── merge/            # POST unisci tappa
│   │       └── operations/       # POST operazioni tabella
│   ├── dashboard/                # Dashboard autenticata
│   │   ├── stage/                # Pagina tappa
│   │   └── upload/               # Pagina caricamento PDF
│   └── login/                    # Pagina login
├── components/
│   ├── ui/                       # Componenti shadcn-style
│   ├── general-ranking-table.tsx # Tabella classifica generale
│   ├── stage-ranking-view.tsx    # Vista tappa
│   ├── pdf-uploader.tsx          # Caricamento PDF
│   └── navbar.tsx                # Navigazione
├── lib/
│   ├── auth.ts                   # Configurazione NextAuth
│   ├── db.ts                     # Pool MySQL
│   ├── db/schema.ts              # Schema Drizzle ORM
│   ├── ranking-logic.ts          # Logica parsing PDF, calcolo punti, ordinamento
│   └── utils.ts                  # Utilità
└── types/
    └── ranking.ts                # TypeScript types
```

## Migrazione da Versione Precedente

Se hai già un database senza la colonna T1, esegui:

```sql
-- Aggiungi colonna T1 a stage_ranking
ALTER TABLE stage_ranking ADD COLUMN t1 INT DEFAULT 0;

-- Aggiungi colonna T1 a general_ranking
ALTER TABLE general_ranking ADD COLUMN t1 INT DEFAULT 0;

-- Aggiungi colonna position a general_ranking
ALTER TABLE general_ranking ADD COLUMN position INT DEFAULT 0;

-- Aggiorna le posizioni esistenti
SET @pos = 0;
UPDATE general_ranking SET position = (@pos := @pos + 1) ORDER BY total_points DESC;
```

Se hai già un database senza la colonna PRESENZE, esegui:

```sql
-- Aggiungi colonna presenze a stage_ranking (default 1)
ALTER TABLE stage_ranking ADD COLUMN presenze INT NOT NULL DEFAULT 1;

-- Aggiungi colonna presenze a general_ranking (default 0)
ALTER TABLE general_ranking ADD COLUMN presenze INT NOT NULL DEFAULT 0;
```