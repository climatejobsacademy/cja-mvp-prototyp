# Prüfprotokolle importieren (SR-91)

Jede Praxisaufgabe hat eine Prüfprotokoll-Variante, zum Beispiel ortsveränderlich oder ortsfest, Neu- oder Wiederholungsprüfung. Die Variante legt die Prüfpunkte fest, die Lernende in Ausführen beim Messen abhaken, und die Stelle der Freigabe zum Zuschalten: zwischen dem letzten Punkt **ohne Spannung** und dem ersten **unter Spannung** (SR-65). Ohne Zuordnung gilt die Standard-Prüfliste der App. Tabellen und Regeln: Migration `0067`, `data-model.md`, `access-matrix.md`.

## Vorlagen

Die fachlichen Inhalte kommen von der fachlichen Leitung Praxis, je Variante eine Zeile pro Prüfpunkt:

- [`vorlagen/pruefprotokolle.csv`](vorlagen/pruefprotokolle.csv): Varianten und Prüfpunkte. Als Beispiel steht die heutige Standard-Prüfliste darin (Kennung `beispiel-standard`); echte Varianten bekommen eigene Kennungen.
- [`vorlagen/pruefprotokoll-zuordnung.csv`](vorlagen/pruefprotokoll-zuordnung.csv): welche Praxisaufgabe welche Variante nutzt.

Trennzeichen Semikolon, Text in Anführungszeichen, UTF-8. Spalten der Prüfpunkte:

| Spalte | Inhalt | Regel |
|---|---|---|
| `protokoll_kennung` | kurze Kennung der Variante, z. B. `ortsfest-neu` | Kleinbuchstaben, Ziffern, Bindestrich; je Variante gleich |
| `protokoll_titel` | Name der Variante, wie Lernende ihn sehen | bis 200 Zeichen |
| `punkt_nr` | Reihenfolge innerhalb der Variante | 1, 2, 3 …; erst alle „ohne Spannung“, dann „unter Spannung“ |
| `punkt_kennung` | kurze Kennung des Punkts, z. B. `a1`, `c2` | eindeutig je Variante; bleibt fest, weil Haken und Deutungen daran hängen |
| `teil` | `ohne Spannung` oder `unter Spannung` | genau einer der beiden Werte |
| `titel` | Überschrift der Karte | bis 200 Zeichen |
| `anweisung` | was zu tun ist | bis 2000 Zeichen |
| `unterpunkte` | Aufzählung auf der Karte, getrennt mit ` \| ` | optional |
| `hinweis` | Kasten unter der Anweisung, z. B. Grenzwert oder Sicherheitshinweis | optional |

Hat eine Variante keine Punkte „unter Spannung“, entfällt die Freigabe zum Zuschalten.

## Regeln beim Einspielen

- Erst Staging, dann Production, jeweils Probelauf vor dem echten Lauf (`arbeitsweise.md`).
- Eine neue Variante ist zunächst `unpublished`; erst nach Durchsicht auf `published` setzen. Lernende lesen nur veröffentlichte Varianten.
- Ein Praxisauftrag übernimmt die Variante seiner Aufgabe beim Anlegen und behält sie. Eine geänderte Zuordnung gilt deshalb nur für neu angelegte Aufträge; bereits angelegte Aufträge ohne Variante behalten die Standard-Prüfliste.
- Punktkennungen einer veröffentlichten Variante nicht umbenennen: Haken und Deutungen laufender Aufträge verweisen darauf.
