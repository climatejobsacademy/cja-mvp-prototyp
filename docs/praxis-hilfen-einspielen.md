# Hilfsunterlagen je Praxisaufgabe einspielen (SR-68)

AfCJ hängt Dateien und Links an eine Praxisaufgabe. Sie gelten für alle Lernenden mit einem Praxisauftrag dieser Aufgabe gleich und erscheinen im Praxisflow in der Karte „Deine Hilfsunterlagen“ und in der Seitenleiste unter „Hilfen“. Die Unterlagen eines Labortags (SR-94) laufen über dieselbe Liste. Schema und Zugriff: Migration `0069`, `data-model.md`, `access-matrix.md`.

## Vorlage

[`vorlagen/praxis-hilfen.csv`](vorlagen/praxis-hilfen.csv), Trennzeichen Semikolon, Text in Anführungszeichen, UTF-8. Eine Zeile je Unterlage:

| Spalte | Inhalt | Regel |
|---|---|---|
| `aufgabe_titel` | Titel der Praxisaufgabe, genau wie in der Datenbank | muss genau eine Praxisaufgabe treffen |
| `reihenfolge` | Position innerhalb der Aufgabe | 1, 2, 3 …; je Aufgabe eindeutig |
| `titel` | Name, wie Lernende ihn sehen | bis 200 Zeichen |
| `datei` | Dateiname im Ordner mit den Dateien | PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX; höchstens 50 MB |
| `link` | Link statt Datei, z. B. ein Video | nur `https://` |

Je Zeile genau eins von `datei` und `link`. Die Dateien liegen alle in einem Ordner außerhalb des Repos; Importdaten gehören nicht ins Repo.

## Einspielen

Immer zuerst Staging (`keijrwvegmwgpvprpoxa`), dann Production (`vqfnmkcfjsudsujiuoqm`), jeweils Probelauf vor dem echten Lauf (`arbeitsweise.md`). Migration `0069` muss im Ziel angewendet sein.

```bash
node scripts/praxis-hilfen.mjs --datei <zuordnung.csv> --ordner <dateien> --ziel staging
node scripts/praxis-hilfen.mjs --datei <zuordnung.csv> --ordner <dateien> --ziel staging --ausfuehren
```

- Der Probelauf prüft die Liste, sucht die Praxisaufgaben, zeigt, welche Dateien hochgeladen würden, und rollt die Datenbank zurück.
- Der echte Lauf fragt die Projekt-Ref ab, lädt nur fehlende Dateien hoch (nie überschreiben) und trägt dann alles in einer Transaktion ein.
- Ein zweiter Lauf mit derselben Liste ändert nichts. Eine geänderte Zeile (Titel, Datei oder Link bei gleicher Aufgabe und Reihenfolge) wird aktualisiert; Zeilen, die in der Liste fehlen, bleiben bestehen.
- Speichername im Bucket: `praxis-hilfen/<dateiname>` in Kleinbuchstaben, ohne Umlaute und Leerzeichen. Zwei Dateien mit gleichem Speichernamen lehnt das Skript ab.
- Production nur mit `--production-freigabe` und nach Freigabe durch die Produkt-Lead.
