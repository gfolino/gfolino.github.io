# Unical Games 2026 - sito statico

Sito pronto per GitHub Pages con:

- tab principale **Tabelloni**;
- tab **Orari di gioco** con calendario placeholder/modificabile;
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

Gli orari inseriti nel tab **Orari di gioco** sono fittizi/placeholder. Per renderli ufficiali modifica l'array `schedule` nel file `data.js`, cambiando data, ora, disciplina, gara, squadre, luogo e `placeholder` da `true` a `false` quando l'orario è confermato.

## Privacy formazioni

Nel file delle formazioni sono pubblicati solo nome, cognome e categoria. Gli altri dati personali non sono inclusi nel sito.
