# Arbeitsweise mit Claude

Das Team baut die Plattform ohne eigene Entwickler:innen mit zwei Claude-Instanzen. Dieses Dokument soll jede Person und jede neue Sitzung ohne Rückfragen einsteigen lassen. Die Regeln für den Code stehen in `CLAUDE.md`, wo welche Information liegt, in `README.md`.

## Zwei Rollen

Der Chat liest Kontext, plant, wertet Berichte aus dem Terminal aus und schreibt die Aufträge für das Terminal. Er ändert keinen Code und hat keinen Zugriff auf GitHub. Das Terminal (Claude Code, gestartet mit `claude`) führt die Aufträge aus, ändert Code und Dokumente, führt Tests aus und committet; seine Ausgabe wird zurück in den Chat kopiert, wenn der Chat sie auswerten soll. Beide Rollen halten sich an dieselben Regeln, und keine von ihnen führt eigene Status- oder Übergabedokumente.

## Aufbau eines Auftrags

Ein Auftrag an das Terminal beginnt mit „Auftrag von mir:“ und steht in einem eigenen Codeblock; Begründungen und Risiken stehen außerhalb des Blocks. Er nennt den Rahmen (Branch oder Worktree, welche Dateien angefasst werden dürfen und welche nicht), die einzelnen Schritte, die Regeln für das Ergebnis und die Form des Berichts. Für Arbeit, die zuerst nur gelesen und bewertet werden soll, steht ausdrücklich im Auftrag, dass nichts geändert, committet oder gepusht wird. Ein Auftrag verlangt Belegtes (Code, Datenbank, Git-Verlauf) getrennt von Vermutungen und nennt, was nicht in die Ausgabe darf (Namen, E-Mail-Adressen, Schlüssel, Passwörter).

## Ablauf pro Aufgabe

Das Problem wird im Chat beschrieben, der Chat analysiert und schreibt den Auftrag, das Terminal setzt um, das Ergebnis geht zurück in den Chat, der Chat wertet aus und schreibt den nächsten Auftrag. Erst lesen und einen Plan zeigen lassen, dann bauen. Mehrere Themen laufen nacheinander und nicht gleichzeitig, weil sich sonst Änderungen in denselben Dateien überschneiden. Fehlt für eine Funktion die SR-Nummer, wird sie zuerst in der Notion-SR-Datenbank angelegt; im Repo heißt es bis dahin „SR folgt“.

## Git- und Freigaberegeln

Gearbeitet wird auf einem Feature-Branch; der Pull Request geht nach `dev`, ein Release-Pull-Request von `dev` nach `main`. Ein Pull Request betrifft eine SR oder eine zusammengehörige Änderung. Das Review übernimmt eine zweite Person, nicht die Autorin oder der Autor des Branches. Das Terminal pusht, mergt und schreibt auf Production nur nach ausdrücklicher Freigabe. Echte Schreibzugriffe auf eine Datenbank und Migrationen laufen immer zuerst als Probelauf, und der echte Lauf braucht eine von Hand getippte Freigabe; jede Aktion nennt das Ziel mit `--project-ref`. Der genaue Weg nach Production steht in `release.md`.

Vor jedem Push und jedem Merge wird geprüft, ob sich `dev` seit dem Start des Branches bewegt hat. Liegt eine `.git/*.lock`-Datei im Weg, wird sie im eigenen Terminal entfernt, danach läuft der Befehl erneut. Dateien werden namentlich gestaged, nie mit `git add .` oder `git add -A`, damit lokale Dateien ohne Bezug zum Auftrag nicht im Commit landen. Das Production-Passwort wird nur nach einer getippten Freigabe benutzt und kommt dann aus dem eigenen Schlüsselbund. Merges nach `dev` laufen nacheinander: Vor dem Merge wird `dev` in den eigenen Branch geholt, und der Merge wartet auf eine grüne CI für genau diesen Stand. Bei Konflikten in `decisions.md` und `traceability.md` bleiben beide Einträge erhalten, der von `dev` steht zuerst. GitHub-Abfragen laufen nicht in Schleifen, weil das Rate Limit sonst die Arbeit blockiert. Mehrere Fälle fragt man mit einer Abfrage oder einem Filter ab.

Namen, E-Mail-Adressen, Schlüssel und Passwörter gehören weder in Chats noch in Terminal-Ausgaben, Commits oder Pull-Request-Texte. Passwörter stehen nur im Team-Passwort-Manager. Importdaten (Excel-Dateien, Lernendenlisten, Link-Listen) liegen außerhalb des Repositorys und kommen nie hinein.

## Dokumentation

Aufgaben, Status, Prioritäten und Termine leben nur in Asana. Technischer Stand, Abläufe und technische Entscheidungen stehen nur im Repository unter `docs/`; Entscheidungen kommen mit Datum unten an `decisions.md`. In Notion stehen die SR-Datenbank, das Produkt-Handbuch, die Datenschutz-Dokumentation und alles mit Personenbezug, und Notion verweist für Abläufe auf das Repository, statt sie zu wiederholen. Skizzen in Miro tragen keinen Status. Dokumente im Claude-Projekt sind keine Quelle: Was dort noch gilt, wird ins Repository übernommen, der Rest wird als veraltet gekennzeichnet.

Ein Dokument in `docs/` enthält keinen Fortschritt („erledigt“, „offen“, „in Arbeit“) und keine Kalenderdaten für geplante Arbeit. Was ein Mensch noch tun muss, wird zu einer Aufgabe in Asana. Zeigt ein Dokument auf Aufgaben, nennt es höchstens den Titel der Karte und keinen Zustand.
