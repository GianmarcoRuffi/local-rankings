# Sistema di Autenticazione con Session Token

## Panoramica

Il progetto ora utilizza un sistema di session token basato su database con validità di 20 minuti. Questo sostituisce il precedente sistema NextAuth JWT.

## Architettura

### Database

È stata aggiunta la tabella `sessions` al database:

```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

Indici creati:

- `idx_session_token` sul token
- `idx_session_user_id` sul user_id
- `idx_session_expires_at` sulla scadenza

### Funzionamento

1. **Login**: L'utente fa login tramite `/api/auth/login` fornendo username, password e captcha token
2. **Generazione Token**: Al login valido, viene generato un token crittograficamente sicuro (64 caratteri hex)
3. **Salvataggio**: Il token viene salvato nel database con scadenza a 20 minuti
4. **Cookie**: Il token viene inviato al client come cookie httpOnly
5. **Validazione**: Ogni richiesta alle route protette verifica il token tramite middleware
6. **Rinnovo**: Ad ogni nuovo login, il vecchio token dell'utente viene invalidato e ne viene creato uno nuovo

## File Principali

### `/src/lib/session.ts`

Modulo per la gestione delle sessioni token:

- `generateSessionToken()`: Genera un token sicuro
- `createSession(userId)`: Crea una nuova sessione nel database
- `validateSession(token)`: Valida un token e restituisce i dati utente
- `deleteSession(token)`: Elimina una sessione
- `cleanupExpiredSessions()`: Rimuove le sessioni scadute

### `/src/lib/require-auth.ts`

Helper per proteggere le API route:

```typescript
const auth = await requireAuth(request);
if (!auth.authorized) {
  return auth.response;
}
// auth.userId, auth.username, auth.displayName disponibili
```

### `/src/app/api/auth/login/route.ts`

Route di login che gestisce:

- Validazione credenziali
- Verifica Cloudflare Turnstile
- Rate limiting sui tentativi falliti
- Generazione e salvataggio token
- Impostazione cookie

### `/src/app/api/auth/logout/route.ts`

Route di logout che invalida il token corrente

### `/middleware.ts`

Middleware Next.js che:

- Protegge tutte le route `/dashboard/*`
- Protegge tutte le API route eccetto `/api/auth/login`
- Reindirizza a `/login` se non autenticato
- Restituisce 401 per richieste API non autenticate

## Utilizzo

### Proteggere una API Route

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  // Route protetta - auth.userId, auth.username disponibili
  // ...
}
```

### Login dal Client

```typescript
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username,
    password,
    captchaToken,
  }),
});

if (response.ok) {
  // Login riuscito, cookie impostato automaticamente
  router.push("/dashboard");
}
```

### Logout dal Client

```typescript
await fetch("/api/auth/logout", {
  method: "POST",
});
router.push("/login");
```

## Sicurezza

- **Token crittograficamente sicuri**: Generati con `crypto.randomBytes(32)`
- **Cookie httpOnly**: Il token non è accessibile via JavaScript nel browser
- **Cookie secure**: In produzione, il cookie è inviato solo su HTTPS
- **SameSite**: Cookie con policy `lax` per protezione CSRF
- **Scadenza automatica**: Token validi solo 20 minuti
- **Pulizia automatica**: Le sessioni scadute vengono eliminate al login
- **Un token per utente**: Ogni nuovo login invalida il token precedente

## Migrazione Database

Per applicare le modifiche al database:

```bash
npm run db:push
```

Quando richiesto, confermare l'esecuzione delle migration per creare la tabella `sessions`.

## Componenti UI

### LogoutButton

Componente React per il logout:

```typescript
import { LogoutButton } from "@/components/logout-button";

<LogoutButton />
```

## Note Importanti

- La durata della sessione è di **20 minuti** (configurabile in `SESSION_DURATION_MS`)
- Ogni login **invalida** automaticamente le sessioni precedenti dello stesso utente
- Il middleware protegge automaticamente tutte le route `/dashboard/*` e `/api/*`
- Le route pubbliche sono: `/`, `/login`, `/api/auth/login`
