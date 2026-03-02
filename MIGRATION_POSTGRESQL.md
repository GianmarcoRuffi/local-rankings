# Migrazione a PostgreSQL (Aiven) - Completata ✅

## Modifiche Implementate

### 1. Database Layer

- **Driver**: Migrato da `mysql2` a `pg` (node-postgres)
- **ORM**: Drizzle ORM configurato per PostgreSQL
- **Schema**: Convertito tutte le tabelle da MySQL a PostgreSQL con tipi nativi
- **SSL**: Configurato per accettare certificati Aiven (rejectUnauthorized: false in dev)

### 2. File Modificati

- `src/lib/db.ts` - Pool PostgreSQL con gestione SSL intelligente
- `src/lib/auth.ts` - Query parametrizzate con `$1` placeholder
- Tutti i route API - Convertiti da SQL raw a query Drizzle
- `drizzle.config.ts` - Configurato per PostgreSQL

### 3. Environment Variables

**`.env`** (committabile, template per produzione):

```bash
DATABASE_URL="postgres://user:pass@host:port/db"
POSTGRES_URL="postgres://user:pass@host:port/db?sslmode=no-verify"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3080"
```

**`.env.local`** (ignorato da git, vuoto o con override locali)

### 4. Dipendenze Rimosse

- ❌ `@vercel/blob`
- ❌ `@vercel/postgres`
- ❌ `mysql2`
- ✅ `pg` + `@types/pg`

## Setup Completato

✅ Schema PostgreSQL applicato su Aiven  
✅ Utente admin creato (username: `admin`, password: `admin123`)  
✅ Classifica di default creata ("Classifica Generale")  
✅ Build Next.js verificata con successo  
✅ Environment pulito dalle variabili Vercel obsolete

## Comandi Utili

```bash
# Sviluppo locale
npm run dev

# Build produzione
npm run build
npm start

# Database operations
npm run db:push          # Applica schema al DB
npm run db:generate      # Genera migrazione da schema
npm run db:studio        # Drizzle Studio UI
npm run db:create-user admin pass123 "Nome"  # Crea/aggiorna utente

# Seed data
npx tsx scripts/create-default-ranking.ts
```

## Deployment su Vercel (o altri host)

### 1. Environment Variables da Configurare

```bash
# Database (Aiven)
DATABASE_URL=postgres://avnadmin:PASSWORD@host.aivencloud.com:27522/defaultdb

# NextAuth
NEXTAUTH_SECRET=<genera-con: openssl rand -base64 32>
NEXTAUTH_URL=https://tuo-dominio.vercel.app
```

### 2. Vercel Deploy

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# O push su GitHub per auto-deploy
git push origin main
```

### 3. Post-Deploy Checklist

1. ✅ Variabili d'ambiente configurate su Vercel
2. ✅ Database Aiven accessibile (whitelist IP se necessario)
3. ✅ Schema applicato: `POSTGRES_URL=<prod-url> npm run db:push`
4. ✅ Utente admin creato in prod
5. ✅ Classifica di default creata
6. ✅ Test login su dominio production

## Note Tecniche

### SSL Configuration

- **Development**: `rejectUnauthorized: false` (accetta certificati auto-firmati Aiven)
- **Production**: `rejectUnauthorized: true` (certificati validati)

### Pool Connection

Il pool PostgreSQL è cached globalmente in dev per evitare connessioni multiple durante hot-reload.

### Drizzle Migrations

Le migrazioni sono in `database/migrations/`. Per applicarle:

```bash
npm run db:push  # Push diretto dello schema
# oppure
npm run db:generate  # Genera SQL migration
npm run db:migrate   # Applica migrations
```

## Sicurezza in Produzione

⚠️ **Prima di andare in produzione:**

1. Cambia la password admin (default: `admin123`)
2. Rigenera `NEXTAUTH_SECRET` con `openssl rand -base64 32`
3. Verifica che Aiven abbia SSL/TLS enforced
4. Abilita IP whitelisting su Aiven se possibile
5. Configura backup automatici su Aiven
6. Monitora i log di connessione

## Costi Aiven

- **Piano Hobbyist**: Gratuito (1 CPU, 1GB RAM, 5GB storage)
- Ideale per sviluppo/staging
- Per produzione valuta piani Business con HA e backup

---

**Status**: ✅ Migrazione completata e testata  
**Data**: 2 Marzo 2026  
**DB Provider**: Aiven PostgreSQL  
**Framework**: Next.js 16.1.6 + Drizzle ORM 0.45.1
