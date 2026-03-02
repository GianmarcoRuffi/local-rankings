---
description: Repository Information Overview
alwaysApply: true
---

# local-rankings Information

## Summary
Gestionale per classifiche di tornei locali. Permette la gestione di una classifica generale e classifiche per singole tappe, con supporto per l'upload di PDF, parsing automatico dei risultati e merge dei dati nel ranking generale. Include logiche specifiche per il calcolo dei punti e del differenziale T1.

## Structure
- **src/app/**: Contiene l'applicazione Next.js (App Router), incluse le pagine (dashboard, login) e gli endpoint API (ranking, upload, merge).
- **src/components/**: Componenti React e UI (shadcn/ui), tabelle di ranking e gestore upload PDF.
- **src/lib/**: Logica core dell'applicazione (autenticazione, database pool, schema Drizzle e logica di ranking).
- **database/**: Schema SQL, migrazioni e script di seed per MySQL.
- **scripts/**: Script TypeScript di utilità per la gestione del database e test di parsing.

## Language & Runtime
**Language**: TypeScript  
**Version**: TypeScript 5.9.3, Node.js (via Next.js 16)  
**Build System**: Next.js  
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `next`: 16.1.6
- `react`: 19.2.3
- `next-auth`: 4.24.13
- `drizzle-orm`: 0.45.1
- `mysql2`: 3.18.0
- `pdf2json`: 4.0.2
- `xlsx`: 0.18.5
- `jspdf`: 4.2.0
- `@radix-ui/react-*`: Componenti UI accessibili
- `lucide-react`: Icone

**Development Dependencies**:
- `typescript`: 5.9.3
- `drizzle-kit`: 0.31.9
- `tailwindcss`: 4
- `tsx`: 4.21.0
- `eslint`: 9

## Build & Installation
```bash
# Installazione dipendenze
npm install

# Build dell'applicazione
npm run build

# Avvio in modalità sviluppo
npm run dev
```

## Database Operations
Il progetto utilizza Drizzle ORM per la gestione del database MySQL.
```bash
# Generazione migrazioni
npm run db:generate

# Esecuzione migrazioni
npm run db:migrate

# Push dello schema direttamente sul DB
npm run db:push

# Seed del database
npm run db:seed
```

## Testing & Validation
Non è presente un framework di test formale (come Jest). Sono presenti script di utilità per validare la logica:
**Test Scripts**:
- `scripts/test-pdf2json.ts`: Test per il parsing dei file PDF.

**Run Command**:
```bash
# Esempio di esecuzione script di test
npx tsx scripts/test-pdf2json.ts
```

## Main Files & Resources
- **Entry Point**: `src/app/page.tsx` (Dashboard principale)
- **API Entry**: `src/app/api/`
- **Schema DB**: `src/lib/db/schema.ts`
- **Ranking Logic**: `src/lib/ranking-logic.ts` (Logica di calcolo punti e ordinamento T1)
