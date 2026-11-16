# Revisione del 15 novembre 2026

Correzioni applicate: revoca persistente delle sessioni JWT, creazione atomica
sessioni, validazione rigorosa degli identificativi, filtro del cestino nelle
tappe, protezione del merge concorrente e dei dati eliminati, ripristino delle
sole eliminazioni a cascata appartenenti allo stesso gruppo, controllo iniziale
dei file PDF, rimozione dei dettagli interni dagli errori di upload e correzione
dell'idratazione del banner cookie.

Ottimizzazioni: un solo provider di sessione con polling ogni minuto, importazione
dinamica delle librerie PDF e rimozione della CLI Vercel inutilizzata. Disabilitata
la cache di processo delle classifiche mutabili per evitare letture obsolete su
istanze diverse. La cache non è sostituita da un servizio esterno.

Dipendenze aggiornate: Next/ESLint Next 16.4.6, React/React DOM 19.3.1,
jsPDF 4.2.1, AutoTable 5.0.9, Zod e dipendenze transitive compatibili.
Override limitati a tar 7.5.23 e js-yaml 4.3.2 per correggere vulnerabilità note.
Node rimane sulla serie 22, npm 10.9.9; nessun aggiornamento globale eseguito.

Verifiche: lint, TypeScript, build di produzione; tre test unitari; suite su
PostgreSQL temporaneo con migrazioni da zero, scritture senza autorizzazione,
merge concorrente senza doppio conteggio, filtro cestino, ripristino selettivo,
revoca dopo logout e rendering Chromium a 390/1440 pixel senza errori React.
La suite verifica anche lo scaricamento PDF. Screenshot in
`/tmp/local-rankings-screenshots`. Il server di test usa la build di produzione:
il server di sviluppo ha mostrato problemi del collegamento HMR durante le prove.

Audit dopo gli aggiornamenti: nessuna vulnerabilità di produzione, alta o critica;
restano 12 segnalazioni moderate negli strumenti di sviluppo. Non sono stati
applicati i downgrade incompatibili proposti automaticamente per Drizzle/ESLint.

## Limiti e interventi ancora da completare rispetto al piano iniziale

- Ordinamento e paginazione avvengono ancora in memoria; il merge conserva query
  per giocatore. Servono misure su un insieme dati rappresentativo prima di
  sostituirle con query aggregate e aggiornamenti in blocco.
- Non è stata effettuata una comparazione quantitativa delle prestazioni prima/dopo.
- La suite browser copre classifica ed esportazione PDF, non tutti i dialoghi,
  il login reale Turnstile, il cambio password, l'upload completo e ogni percorso
  amministrativo. Non costituisce una suite completa di regressione grafica.
- I controlli di data e payload non sono ancora uniformi su tutte le API.
- Applicare la migrazione 0004 prima del rilascio. Gli utenti dovranno accedere
  nuovamente. Nessuna migrazione sul database reale e nessun deploy eseguiti.

## Migrazione e deploy — 15 novembre 2026

Applicate sul database Neon configurato in produzione le migrazioni 0002, 0003
e 0004 in una transazione. Registrate 0000 e 0001 come baseline dopo la verifica
delle colonne e degli indici esistenti; il journal era vuoto. Verificati i campi
del cestino e cinque registrazioni nel journal. Conteggi invariati: 4 utenti,
1 classifica, 13 tappe, 52 voci generali e 313 risultati.

Aggiornata DATABASE_URL dell'ambiente Preview Vercel, sostituendo il riferimento
Aiven non più risolvibile con il database Neon configurato in produzione.
Preview e produzione condividono quindi questo database: le scritture
nell'anteprima agiscono sugli stessi dati.

Deploy di anteprima completato con build remota:
https://local-rankings-7tm9yd1en-gianmarcoruffis-projects.vercel.app
L'anteprima è protetta dall'autenticazione Vercel. Nessuna promozione del codice
in produzione effettuata. Verificati lo stato del deploy e le query SQL di
lettura; nessuna richiesta HTTP all'anteprima eseguita.

## Rilascio cestino — 16 novembre 2026

Applicata sul database di produzione la migrazione 0005_trash_expiration.
Verificati sei elementi nel journal, nessuna scadenza mancante e conteggi
applicativi invariati: 4 utenti, 1 circuito, 13 tappe, 52 voci e 313 risultati.
Al momento del rilascio il cestino era vuoto. La migrazione conserva la data
originale di eliminazione e assegna cinque giorni aggiuntivi ai dati preesistenti.

Backup logico locale con permessi riservati in
`~/.local/state/local-rankings/backups/before-0005-1794826645975.json`.
Verificato il ripristino di tutte e sette le tabelle applicative su PostgreSQL
isolato. Il backup contiene dati sensibili e deve rimanere protetto.

Configurati CRON_SECRET (Secret di produzione) e TRASH_CLEANUP_ENABLED=true.
Vercel allineato a Node 22.x, come richiesto dal package.json. Diagnostica della
pulizia eseguita sul database reale senza cancellazioni: zero candidati.
Cron registrato e abilitato per `/api/cron/trash`, ogni giorno alle 03:00 UTC
(04:00 in Italia durante l'ora solare, 05:00 durante l'ora legale).

Deploy di produzione READY: dpl_EmGSpXxq5Hp6c5w9pqxHqMihfYdV.
URL stabile: https://local-rankings-app.vercel.app
URL versione: https://local-rankings-13y30u3xg-gianmarcoruffis-projects.vercel.app
Confermati tramite API Vercel stato READY, destinazione production, alias e
registrazione cron. Nessuna richiesta HTTP di verifica al sito distribuito.
La prima esecuzione pianificata rimane da osservare nei log Vercel; la diagnostica
preventiva non certifica un'esecuzione futura.
