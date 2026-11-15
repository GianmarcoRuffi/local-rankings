# Autenticazione

La consultazione di classifiche e tappe è pubblica. Le scritture e le API del
cestino richiedono una sessione autenticata.

Il login verifica credenziali e Cloudflare Turnstile, crea una sessione nel
database e restituisce un JWT HS256 nel cookie `session_token` (HttpOnly,
SameSite=Lax, Secure in produzione). Il claim `jti` identifica la sessione
persistita. La durata è 20 minuti.

Il middleware effettua soltanto un controllo preliminare della firma. Le API
protette, la navbar server e l'endpoint sessione verificano anche il database.
Logout, nuovo login e cambio password revocano le sessioni precedenti.
I JWT emessi prima dell'introduzione del claim `jti` richiedono un nuovo login.

Il frontend condivide un solo provider di sessione, con controllo ogni minuto;
la lettura della sessione usa il limite delle letture, separato dal login.

Variabili necessarie: DATABASE_URL (o POSTGRES_URL), NEXTAUTH_SECRET,
TURNSTILE_SECRET_KEY e NEXT_PUBLIC_TURNSTILE_SITE_KEY. JWT_SECRET è opzionale
ed è prioritario per la firma quando presente. I segreti devono essere lunghi
almeno 32 caratteri e non vanno inseriti nel repository.

Eseguire `npm test` e `npm run test:integration` per le verifiche automatizzate.
