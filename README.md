# Local Rankings 🏆

> Sistema di gestione classifiche per tornei locali con supporto PostgreSQL

## ✨ Caratteristiche

- 📊 Gestione classifiche multiple (generali e per singole tappe)
- 📄 Upload e parsing automatico PDF risultati tornei
- 🔄 Merge intelligente con calcolo automatico T1 e presenze
- 👤 Autenticazione NextAuth
- 🎨 UI moderna con shadcn/ui + Tailwind
- 🗃️ PostgreSQL con Drizzle ORM

## 🚀 Stack Tecnologico

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js
- **UI**: React 19, shadcn/ui, Tailwind CSS 4
- **PDF**: pdf2json, jsPDF

## 🚀 Quick Start

### Prerequisiti

- Node.js 18+ e npm
- Database PostgreSQL (consigliato: [Aiven](https://aiven.io))

### Installazione

```bash
# Clona il repository
git clone https://github.com/GianmarcoRuffi/local-rankings.git
cd local-rankings

# Installa dipendenze
npm install
```

### Configurazione Environment

Crea `.env` con:

```bash
# Database PostgreSQL
DATABASE_URL="postgres://user:password@host:port/dbname"
POSTGRES_URL="postgres://user:password@host:port/dbname"

# NextAuth
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3080"
```

### Setup Database

```bash
# Applica lo schema
npm run db:push

# Crea utente admin (user: admin, pass: admin123)
npm run db:create-user admin admin123 Amministratore

# Crea classifica default
npx tsx scripts/create-default-ranking.ts
```

### Avvia il Server

```bash
# Sviluppo (hot-reload)
npm run dev

# Produzione
npm run build
npm start
```

L'app sarà disponibile su **http://localhost:3080**

## 📚 Comandi Utili

```bash
# Database
npm run db:push          # Applica schema
npm run db:generate      # Genera migrazioni
npm run db:studio        # UI amministrazione DB (Drizzle Studio)

# Seed/Mock Data
npm run db:seed          # Popola con dati base
npm run db:mock          # Genera dati di esempio con 3 tappe
```

## 🎯 Uso

1. **Login**: Accedi con `admin` / `admin123`
2. **Crea Classifica**: Dashboard → Nuovo Ranking
3. **Aggiungi Tappa**:
   - Upload PDF risultati torneo
   - O creazione manuale
4. **Merge**: Unisci tappa alla classifica generale
5. **Esporta**: Download PDF/Excel risultati

## 📦 Deploy

### Vercel (Consigliato)

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables da configurare su Vercel:**

- `DATABASE_URL` - Connection string PostgreSQL
- `NEXTAUTH_SECRET` - Genera con `openssl rand -base64 32`
- `NEXTAUTH_URL` - Es: `https://tuo-dominio.vercel.app`

### Altri Hosting (Fly.io, Railway, etc.)

1. Builda l'app: `npm run build`
2. Configura le env vars
3. Esegui: `npm start` (porta 3080)

## 🔐 Sicurezza

⚠️ **Prima della produzione:**

- [ ] Cambia password admin di default
- [ ] Rigenera `NEXTAUTH_SECRET`
- [ ] Attiva SSL/TLS su database
- [ ] Configura CORS e CSP headers
- [ ] Abilita backup automatici DB

## 📖 Struttura Progetto

```
local-rankings/
├── src/
│   ├── app/              # Routes Next.js (App Router)
│   │   ├── api/          # API endpoints
│   │   ├── dashboard/    # Dashboard UI
│   │   └── login/        # Login page
│   ├── components/       # Componenti React + UI
│   ├── lib/              # Utilities (DB, auth, logica ranking)
│   └── types/            # Type definitions
├── database/
│   └── migrations/       # SQL migrations (Drizzle)
└── scripts/              # Utility scripts (seed, mock data)
```

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 🆘 Troubleshooting

### Errore SSL certificato Aiven

Se ottieni `SELF_SIGNED_CERT_IN_CHAIN`:

- Il codice è già configurato per accettare certificati in dev
- In produzione usa `sslmode=require` o scarica il CA certificate

### Database connection failed

- Verifica `DATABASE_URL` in `.env`
- Controlla firewall/IP whitelist su Aiven
- Testa connessione: `psql $DATABASE_URL`

### Build errors

```bash
# Pulisci cache
rm -rf .next node_modules
npm install
npm run build
```

## 📝 Documentazione Aggiuntiva

- [Migrazione a PostgreSQL](MIGRATION_POSTGRESQL.md) - Dettagli tecnici della migrazione
- [Drizzle ORM Docs](https://orm.drizzle.team/) - Documentazione ORM
- [Next.js 16 Docs](https://nextjs.org/docs) - Documentazione framework

---

**Made with ❤️ by Gianmarco Ruffi**
