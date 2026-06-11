# Unical Games 2026 - sito tabelloni

Sito statico per pubblicare i tabelloni degli Unical Games 2026 su GitHub Pages.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub.
2. Carica questi file nella root del repository: `index.html`, `styles.css`, `app.js`, `data.js`.
3. Vai in **Settings > Pages**.
4. Seleziona **Deploy from a branch**, branch `main`, cartella `/root`.
5. Dopo il deploy il sito sara disponibile all'indirizzo indicato da GitHub.

## Come inserire i risultati

1. Apri il sito pubblicato, oppure apri `index.html` in locale.
2. Clicca **Modifica tabelloni**.
3. Clicca una casella del tabellone, anche vuota.
4. Inserisci il risultato nel formato consigliato, per esempio: `DESF (2-1)`.
5. Le modifiche vengono salvate nel browser con `localStorage`.
6. Quando vuoi pubblicarle per tutti, clicca **Esporta data.js**.
7. Sostituisci il file `data.js` nel repository GitHub con quello scaricato.
8. Fai commit: GitHub Pages aggiornera il sito.

## Backup e ripristino

- **Backup risultati** scarica solo le modifiche locali in JSON.
- **Importa backup** ricarica quel JSON nello stesso sito/browser.
- **Cancella locali** rimuove le modifiche salvate nel browser, senza toccare i file GitHub.

## Nota tecnica

Il sito non usa backend, database o login. Questo lo rende compatibile con GitHub Pages, ma significa che la pubblicazione definitiva richiede la sostituzione del file `data.js` nel repository.
