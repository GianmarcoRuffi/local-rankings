# Changelog - Sistema di Autenticazione con Session Token

## Data: 3 Aprile 2026

### Modifiche Principali

#### Sistema di Autenticazione

- ✅ Migrazione da NextAuth JWT a sistema di session token basato su database
- ✅ Durata sessione: 20 minuti
- ✅ Token crittograficamente sicuri (crypto.randomBytes)
- ✅ Cookie httpOnly, secure, sameSite=lax

#### Database

- ✅ Nuova tabella `sessions` con indici ottimizzati
- ✅ Migration generata: `0001_yummy_ultimates.sql`

#### Nuovi File Creati

- `/src/lib/session.ts` - Gestione sessioni (generate, validate, delete, cleanup)
- `/src/lib/require-auth.ts` - Helper per proteggere API routes
- `/src/app/api/auth/login/route.ts` - Nuova route di login
- `/src/app/api/auth/logout/route.ts` - Route di logout
- `/src/components/logout-button.tsx` - Componente UI per logout
- `/src/hooks/useSession.ts` - Hook compatibile per componenti client
- `/middleware.ts` - Middleware per protezione route
- `/AUTHENTICATION.md` - Documentazione completa del sistema

#### File Modificati

**Schema Database:**

- `/src/lib/db/schema.ts` - Aggiunta tabella sessions

**API Routes (aggiornate a requireAuth):**

- `/src/app/api/rankings/route.ts`
- `/src/app/api/rankings/[id]/route.ts`
- `/src/app/api/ranking/upload/route.ts`
- `/src/app/api/ranking/stages/route.ts`
- `/src/app/api/ranking/stages/[id]/route.ts`
- `/src/app/api/ranking/stages/[id]/players/[playerId]/route.ts`
- `/src/app/api/ranking/operations/route.ts`
- `/src/app/api/ranking/general/reset/route.ts`
- `/src/app/api/ranking/general/[id]/route.ts`
- `/src/app/api/ranking/merge/route.ts`
- `/src/app/api/ranking/merge/revert/route.ts`
- `/src/app/api/auth/change-password/route.ts`

**Componenti UI:**

- `/src/app/login/page.tsx` - Aggiornato per usare nuova API login
- `/src/components/navbar.tsx` - Aggiornato logout/login handlers
- `/src/components/providers.tsx` - Rimosso SessionProvider NextAuth
- `/src/components/general-ranking-table.tsx` - Aggiornato import useSession
- `/src/components/stage-ranking-view.tsx` - Aggiornato import useSession
- `/src/components/ranking-selector.tsx` - Aggiornato import useSession

**Layout:**

- `/src/app/dashboard/layout.tsx` - Rimosso check NextAuth (protetto da middleware)
- `/src/app/dashboard/upload/layout.tsx` - Rimosso check NextAuth (protetto da middleware)

### Breaking Changes

⚠️ **Richiesta Migrazione Database**

Eseguire:

```bash
npm run db:push
```

E confermare la creazione della tabella `sessions` quando richiesto.

### Comportamento Modificato

1. **Login**: Ora processa tramite `/api/auth/login` invece di NextAuth
2. **Logout**: Ora processa tramite `/api/auth/logout` invece di NextAuth
3. **Protezione Route**: Gestita da middleware invece di check individuali
4. **Sessioni**: Non più JWT, ma token in database con scadenza 20 minuti
5. **Limite Sessioni**: Un token per utente (nuovo login invalida il precedente)

### File Legacy (mantenuti ma non utilizzati)

I seguenti file sono stati mantenuti per compatibilità ma non sono più utilizzati:

- `/src/app/api/auth/[...nextauth]/route.ts`
- `/src/lib/auth.ts` (funzioni helper ancora utilizzabili)
- `/src/types/next-auth.d.ts`

Possono essere rimossi in futuro se non servono per altre funzionalità.

### Sicurezza

✅ **Miglioramenti di Sicurezza**

- Token crittograficamente sicuri (random 32 bytes)
- Cookie httpOnly (non accessibili da JavaScript)
- Cookie secure in produzione (solo HTTPS)
- SameSite lax (protezione CSRF)
- Scadenza automatica dopo 20 minuti
- Cleanup automatico sessioni scadute
- Un solo token attivo per utente
- Validazione token su ogni richiesta
- Middleware centralizzato per protezione route

### Note per gli Sviluppatori

1. Per proteggere nuove API route, usare `requireAuth`:

   ```typescript
   const auth = await requireAuth(request);
   if (!auth.authorized) {
     return auth.response;
   }
   ```

2. Le route dashboard sono automaticamente protette dal middleware

3. Per aggiungere route pubbliche, modificare `publicPaths` in `middleware.ts`

4. Per modificare la durata delle sessioni, cambiare `SESSION_DURATION_MS` in `/src/lib/session.ts`

### Testing

Verificare:

- [ ] Login funziona correttamente
- [ ] Logout invalida la sessione
- [ ] Sessioni scadono dopo 20 minuti
- [ ] Route protette reindirizzano a /login se non autenticato
- [ ] API protette ritornano 401 se non autenticato
- [ ] Nuovo login invalida sessione precedente
- [ ] Cookie viene impostato correttamente
- [ ] Navbar mostra pulsante logout quando autenticato
