# Unical Games 2026 - sito statico

Sito pronto per GitHub Pages con:

- tab principale **Tabelloni**;
- tab **Orari di gioco** con calendario reale importato dagli Excel;
- tab **Formazioni**, con rose collegate alle squadre cliccabili nei tabelloni;
- tab **Gestione risultati**, con modifica locale ed esportazione di `data.js`.

## Pubblicazione in sottocartella

Carica questi file nella cartella `unical-games/` del repository `gfolino.github.io`:

- `index.html`
- `styles.css`
- `app.js`
- `data.js`
- `README.md`

Il sito sarà disponibile su:

```text
https://gfolino.github.io/unical-games/
```

## Aggiornare risultati

Apri il tab **Gestione risultati**, attiva la modifica, inserisci i risultati, poi usa **Esporta data.js**. Sostituisci il file `data.js` nel repository e fai commit.

## Aggiornare gli orari

Gli orari nel tab **Orari di gioco** sono stati importati dagli Excel dei calendari. Le voci senza squadre definite restano marcate con `placeholder: true` e sono mostrate come 'Da definire'.

## Privacy formazioni

Nel file delle formazioni sono pubblicati solo nome, cognome e categoria. Gli altri dati personali non sono inclusi nel sito.
