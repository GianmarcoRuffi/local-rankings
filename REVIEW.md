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
