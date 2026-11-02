# Fachsprache-Einheiten: Betriebsanleitung

Eine Fachsprache-Einheit gehört zu genau einer Lektion und besteht aus Wortkarten, Quizfragen und Sätzen für die Arbeit, auf Wunsch mit Bildern. Sie ist reiner Lesestoff: Die Plattform speichert keinen Lernstand und erzeugt keine Kompetenznachweise (CLAUDE.md, Regel 6). Die Entscheidungen dazu stehen in `decisions.md` unter den Einträgen zur Fachsprache-Einheit, das Datenmodell in `data-model.md`, das Format der Excel-Vorlage und die Fehlermeldungen des Imports in `import-plan.md`. Dieses Dokument beschreibt den Weg vom Inhalt bis zur Sichtbarkeit und was zu prüfen ist, wenn eine Einheit nicht erscheint. Es sagt nichts darüber, welche Einheiten in welcher Umgebung gerade veröffentlicht sind; das steht in der Datenbank der jeweiligen Umgebung.

## Vom Inhalt zur Sichtbarkeit

Die Learning Designer füllen die Excel-Vorlage `fachsprache-import-vorlage.xlsx`. Sie liegt wie alle Importdateien unter `~/Projects/import-daten/` und nie im Repository. Je Einheit steht dort die Kennung des Termins aus dem Tab Stundenplan der Plan-Excel, die Dauer in Minuten, die Wörter, die Fragen und die Sätze. Eine Einheit gehört zu einem Kurs und hängt an dessen erster Live-Lektion; Begleitkurse ohne Lektion sind nicht möglich. Das Richtmaß ist sechs Wörter, drei Fragen mit genau einer richtigen Antwort und drei Sätze. Die Datenbank verlangt mindestens ein Wort und eine Frage, bei Fragen zwei bis vier verschiedene Antworten.

Bilder sind optional. Je Wortkarte oder Frage ist eine Datei erlaubt (PNG, JPEG oder WebP, höchstens 2 MB, kein SVG), und sobald ein Bild gesetzt ist, ist eine Bildbeschreibung Pflicht. Die Dateien liegen im privaten Bucket `fachsprache-bilder` unter `<lesson_id>/<dateiname>`; den Ordnernamen nennt der Probelauf je Einheit. In der Excel steht nur der Dateiname. Bilder werden vor dem Import hochgeladen, weil der Import sie nur prüft und nichts hochlädt. Fehlt noch ein Bild, importiert man mit `--bilder-spaeter`.

Der Import läuft mit `scripts/import-plan.mjs --fachsprache-datei <Datei> --nur-fachsprache` zuerst gegen Staging. Ohne weiteres Flag ist das ein Probelauf, der am Ende zurückgerollt wird. Erst nach einer getippten Freigabe folgt der echte Lauf mit `--ausfuehren`, und ein zweiter Probelauf danach darf nichts mehr ändern. Production braucht zusätzlich `--ziel production --production-freigabe` und läuft aus dem Release-Ordner (`release.md`). Der Import legt Einheiten immer als `entwurf` an und veröffentlicht nie; er schreibt über `lesson_id` fort (neu, geändert oder unverändert).

Die Prüfung ist ein Teamprozess außerhalb der Datenbank. Seit Migration 0053 gibt es keine Prüfspalten und keinen Zwang mehr: Die Datenbank verhindert das Veröffentlichen ohne Prüfung nicht. Weil falsche Aussagen im Elektrohandwerk sicherheitsrelevant sein können, prüft eine Fachperson den Inhalt, und eine zweite Person prüft die Sprache (einfache Sprache, Artikel, Plural, Aussprache beim Vorlesen mit der Browser-Stimme). Wer das übernimmt, regelt das Team, nicht dieses Dokument.

Veröffentlicht wird von Hand durch eine Person mit Admin-Rechten: In der Tabelle `fachsprache_einheit` der jeweiligen Umgebung wird die Spalte `status` von `entwurf` auf `veroeffentlicht` gesetzt. Der Wert muss exakt so geschrieben sein, deutsch mit „oe“ und kleingeschrieben; die Datenbank lehnt jeden anderen Wert per Check-Constraint ab. Staging und Production sind getrennte Datenbanken, jede wird für sich veröffentlicht. Ändert ein erneuter Import den Inhalt oder den Titel einer veröffentlichten Einheit, setzt ein Trigger (`fachsprache_inhalt_geaendert`) sie auf `entwurf` zurück und zählt `inhalt_version` hoch. Dann sind Prüfung und Veröffentlichen zu wiederholen. Vor dem Veröffentlichen ist zu prüfen, dass alle Bilder im Bucket liegen und nach der Prüfung nicht ausgetauscht wurden; der Import vergleicht den Inhalt einer Datei nicht.

## Der Schalter FACHSPRACHE_EINHEIT

Ob die Fachsprache in einer Umgebung überhaupt erscheint, entscheidet die serverseitige Umgebungsvariable `FACHSPRACHE_EINHEIT`. Sie ist eine Variable je Vercel-Umgebung (Production, Preview, Development) und hat bewusst kein `NEXT_PUBLIC_`-Präfix, damit der Wert nicht ins Browser-Bundle gelangt. Die Logik steht in `src/lib/schalter.ts` mit Test in `src/lib/schalter.test.ts`. Die Funktion ist nur dann an, wenn der Wert `an` lautet, wobei Groß- und Kleinschreibung und Leerzeichen keine Rolle spielen; `true`, `1`, `ja` oder `on` zählen als aus, ebenso eine fehlende Variable. Eine Änderung wirkt erst nach einem neuen Deployment (Redeploy).

Ist der Schalter aus, liefert die Seite `/fachsprache/<einheitId>` für alle Personen einen 404, auch für Admins, und die Einstiege auf Home und im Stundenplan fehlen. Welchen Wert eine Umgebung gerade hat, steht nicht in diesem Dokument und nicht im Repository. Es steht in Vercel unter Projekt, Settings, Environment Variables, und dort ist es vor jeder Veröffentlichung zu prüfen.

## Sichtbarkeitsregeln

Lernende sehen nur Einheiten mit Status `veroeffentlicht`, und nur wenn sie die Lektion lesen dürfen (Policy `fachsprache_einheit_lesen`, die `fn_kann_lektion_lesen` aus Migration 0023 nutzt). Admins sehen Entwürfe über die direkte Adresse mit einem Entwurfs-Banner. Dafür brauchen sie eine aktive Einschreibung, denn jeder Zugang zum Lernenden-Bereich ohne aktive Einschreibung wird umgeleitet (`requireCurrentLearner` in `src/lib/queries/session.ts`); das gilt auch für Admins. Bilder liest eine lernende Person nur, wenn die Einheit veröffentlicht ist und der Dateiname im Inhalt vorkommt; verwaiste Dateien im Ordner bleiben unsichtbar (Policy `fachsprache_bilder_lesen`). Fehlt eine Datei, zeigt die Karte ohne Hinweis kein Bild.

Der Einstieg erscheint als Kästchen auf Home, wenn an einer Live-Lektion des Tages eine veröffentlichte Einheit hängt, und als Chip je Tag im Stundenplan. Beide sind leer, wenn der Schalter aus ist, die Einheit nicht lesbar oder ein Entwurf ist. Das Vorlesen nutzt die Sprachausgabe des Browsers; die datenschutzrechtliche Bewertung steht in `datenschutz-offene-punkte.md`.

## Wenn eine Einheit nicht sichtbar ist

Drei Dinge müssen zugleich stimmen: Der Schalter ist in der Umgebung an, die Einheit ist importiert, und ihr Status ist `veroeffentlicht`. Fehlt eines, sieht die Seite meist wie „nicht gefunden“ aus.

| Beobachtung | Wahrscheinliche Ursache | Prüfen |
|---|---|---|
| 404 für alle, auch für Admins | Schalter aus, falscher Wert oder kein Redeploy nach der Änderung | Variable in Vercel, Wert exakt `an`, Redeploy |
| 404 bei Lernenden, Admin mit Einschreibung sieht den Entwurfs-Banner | Einheit ist ein Entwurf | `status` in `fachsprache_einheit` |
| 404 auch für Admins | Einheit nicht importiert, falsche Kennung, Admin-Konto ohne aktive Einschreibung | Probelauf des Imports, Zeile mit `lesson_id`, Konto mit Einschreibung nutzen |
| Einheit sichtbar, Bild fehlt | Datei nicht im Bucket, falscher Ordner oder abweichender Dateiname | Bucket, Ordner `<lesson_id>/`, Zahl im Entwurfs-Banner |
| Einheit sichtbar, aber kein Einstieg auf Home oder im Stundenplan | Die Einheit hängt nicht an der Live-Lektion dieses Tages, oder die Lektion ist nicht lesbar | direkte Adresse nutzen, Kennung und Lektion im Import prüfen |
| Einheit war veröffentlicht und ist nun ein Entwurf | Ein erneuter Import hat Inhalt oder Titel geändert (Meldung „Status fällt auf entwurf“) | Prüfung und Veröffentlichen wiederholen |
| Status lässt sich nicht setzen | Wert falsch geschrieben (zum Beispiel `published` oder `veröffentlicht`) | exakt `veroeffentlicht` eintragen |

## Grenzen

Die Einheit speichert keinen Lernstand, keine Antworten und keine Sprachaktivität; ein verpflichtendes Quiz als Leistungsnachweis bräuchte gespeicherten Fortschritt und wäre eine eigene Produktentscheidung mit neuer SR. Klickbare Fachbegriffe (Vokabelklick, „Stufe 1“) gibt es nicht. Eine Einheit je Lektion ist im Schema festgelegt (`lesson_id` ist eindeutig); sitzen mehrere Termine eines Kurses an derselben Lektion, erscheint dieselbe Einheit vermutlich an allen (aus Schema und Einstiegslogik geschlossen, im Browser nicht geprüft). Was darüber hinaus ansteht, steht als Aufgabe in Asana.
