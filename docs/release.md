# Release: dev nach Production

Stand 18.10.2026 (Anna mit Claude). Ergänzt `docs/runbook.md` (was tun, wenn etwas bricht). Diese Seite beschreibt den **geplanten** Weg von `dev` nach Production: was vorher feststehen muss, in welcher Reihenfolge es läuft, wie man prüft und wie man zurückkommt.

## Kurz

1. **Vorher:** Umfang festlegen, Zugänge prüfen, Backup-Stand kennen, Schalter für Production prüfen.
2. **Release-PR** `dev` → `main` öffnen, die jeweils andere Person gibt frei (Anna ↔ Malte). Noch nicht mergen.
3. **Migrationen** auf Production: Probelauf, anhalten und erklären, dann mit getippter Freigabe einspielen.
4. **Merge** des Release-PRs. Vercel veröffentlicht automatisch.
5. **Smoke-Test** auf learn.climatejobsacademy.com.
6. **Inhalte** (Import, SCORM, Fachsprache, Teams-Links), je mit Probelauf und Freigabe.

Migrationen kommen **vor** dem Merge: Die neue App erwartet die neuen Tabellen. Alle Migrationen sind bisher additiv (neue Tabellen, Spalten, Funktionen), die alte App läuft mit ihnen weiter. Ist eine Migration **nicht additiv** (löscht oder benennt etwas um), wird die Reihenfolge für diesen Release eigens festgelegt.

## Regeln

- Production nur auf ausdrücklichen Auftrag, jede Aktion mit Ziel `--project-ref vqfnmkcfjsudsujiuoqm` bzw. `--ziel production --production-freigabe`.
- Vor jedem Schritt, der Production ändert: anhalten, in einfachen Worten erklären, was passiert und warum es riskant ist, auf ein klares Ja warten.
- Nie aus dem Staging-Ordner gegen Production. Releases laufen aus einem eigenen Ordner, der nur mit Production verlinkt ist (Einrichtung siehe unten).
- Passwörter und Schlüssel nur aus dem Schlüsselbund (`cja-db-fra`), nie in Chat, Datei oder Ausgabe.
- Keine Personendaten in PR-Beschreibungen, Asana oder Logs.

## 1. Vorher

- [ ] **Umfang:** Welche Commits und welche Migrationen gehen mit? Liste mit `git log origin/main..origin/dev` und `ls supabase/migrations`, Abgleich mit `supabase migration list` im Release-Ordner (nur lesend).
- [ ] **Jede fehlende Migration einmal lesen:** additiv oder nicht? Ändert sie Daten (z. B. 0054 schaltet den Fragen-Thread an allen Live-Lektionen ein)?
- [ ] **Schalter für Production in Vercel** (Settings → Environment Variables, Umgebung Production): `FACHSPRACHE_EINHEIT` und `PRAXISAUFGABE_LINK` nicht gesetzt oder nicht `an`, solange die Funktion aus sein soll. `NATIVE_SELBSTLERNEN` ist ohne Variable **an** (native Selbstlern-Ansicht); nur `aus` schaltet sie ab. Der Kohorten-Chat ist je Kohorte über `cohort.chat_aktiv` aus (Standard), der Fragen-Thread je Lektion über `lesson.chat_aktiv`.
- [ ] **Backup:** Im Supabase-Dashboard (Frankfurt) unter Database → Backups prüfen, dass die Sicherung der letzten Nacht da ist (tägliche Sicherung, 7 Tage, Storage-Dateien nicht enthalten; Details im Runbook Abschnitt 5). Wurde seit Mitternacht viel auf Production geändert, den Release lieber am nächsten Tag machen.
- [ ] **Zugänge:** eigenes Supabase-Konto mit Zugriff auf das Frankfurter Projekt, `cja-db-fra` (und für Staging `cja-db-irl`) im Schlüsselbund, `psql` (Postgres.app oder Homebrew) für die Skripte, Merge-Recht für `main` auf GitHub, Zugriff auf Vercel.
- [ ] **Datenschutzerklärung:** Stimmt sie für alles, was mit diesem Release sichtbar wird? Das Datum „Stand dieser Erklärung“ (`src/app/(rechtliches)/datenschutz/page.tsx`) wird im Release-PR gesetzt.

## 2. Release-PR

- Titel nach dem bisherigen Muster: `Release: <Inhalt in Stichworten> (Dev → Main, Stand TT.MM.JJJJ)`.
- In die Beschreibung: Liste der Migrationen, die mitgehen, und ob sie eingespielt sind; welche Schalter aus bleiben; Smoke-Test-Liste.
- Freigabe im Normalfall durch die jeweils andere Person (Anna ↔ Malte). Ist sie nicht erreichbar, darf die Person als Admin allein mergen (Bypass der Pflicht-Freigabe auf `main`); dann im PR „Ohne Zweitfreigabe, weil … nicht erreichbar“ vermerken und die andere Person danach informieren (Entscheidung Anna 2026-10-17). Gemergt wird erst nach Schritt 3.

## 3. Migrationen auf Production

Im Release-Ordner (nur mit Production verlinkt):

```bash
npx supabase@2.117.0 db push --dry-run
```

Der Probelauf listet, was eingespielt **würde**. Danach: anhalten, jede Migration erklären, Freigabe abwarten, dann ohne `--dry-run`. Anschließend `migration list` lesend prüfen und bei datenändernden Migrationen nachzählen (z. B. wie viele Lektionen den Thread haben).

Schlägt eine Migration fehl: nicht weitermachen, nicht mergen, Runbook Abschnitt 5.

## 4. Merge

Release-PR mergen (Merge-Commit). Vercel baut und veröffentlicht automatisch, in Vercel → Deployments prüfen, dass das neue Production-Deployment „Ready“ ist.

## 5. Smoke-Test

Mit einem eigenen Testkonto auf learn.climatejobsacademy.com, nicht mit Konten von Lernenden:

- [ ] Login per Magic Link kommt an und funktioniert.
- [ ] Home, Stundenplan (Woche und Tag), Kompetenzen, Programm laden ohne Fehler.
- [ ] Eine Live-Lektion öffnet sich, Materialien sind da. Eine Selbstlern-Lektion (falls schon eingespielt) erscheint in der nativen Ansicht.
- [ ] Was aus sein soll, ist nicht sichtbar (Fachsprache, Link zur Praxisaufgabe, Chat).
- [ ] Datenschutzerklärung, Impressum und Barrierefreiheit öffnen sich, „Zurück“ funktioniert.
- [ ] Trainer-Konto landet in `/trainer`.
- [ ] Vercel → Logs: keine roten Fehler seit dem Deployment.

## 6. Inhalte

Erst nach den Migrationen (der Import braucht mindestens 0030). Aus dem Release-Ordner mit `/production-inhalte`. Empfohlen ist erst Staging, direkt auf Production ist erlaubt, wenn man das ausdrücklich will. Je Schritt Probelauf, Freigabe, echter Lauf:

- Trainer-Konten und Plan: `scripts/import-plan.mjs --ziel production --production-freigabe …` (siehe `docs/import-plan.md`).
- SCORM (`scripts/scorm-einspielen.mjs`, veröffentlicht sofort), Fachsprache (`scripts/import-plan.mjs --fachsprache`), Teams-Links (`scripts/live-links.mjs`, ohne Begleitkurse): dieselben Skripte wie auf Staging, Ziel Production.
- Lernende: Login-Konten im Dashboard, dann `scripts/lernende-anlegen.mjs` mit `--plan-datei` (`docs/lernende-anlegen.md`). Es legt Profil, Mitgliedschaft, Rolle und Einschreibung an und startet den Plan-Import erneut, damit jede Lernende ihre Praxistage bekommt. Reihenfolge: erster Plan-Import (Kohorte) → Trainer:innen → Lernende. **Keine** Einladungsmail per `scripts/invite-learner.mjs`, deren Links in der App nicht funktionieren. Lernende melden sich selbst per Magic Link an.
- Danach veröffentlichen (Lektionen `published`, Fachsprache `veroeffentlicht`) und mit dem Testkonto prüfen.

## Zurück, wenn etwas schiefgeht

- **Nur die App ist kaputt, keine Migration im Release:** Vercel → Deployments → letztes funktionierendes Production-Deployment → „Instant Rollback“. **Danach gehen neue Merges nicht mehr automatisch live.** Ist der Fehler behoben: beim Production-Deployment „Undo Rollback“ (bzw. die richtige Version per „Promote“) wählen.
- **Release mit Migration:** Nicht in Vercel zurückrollen, die alte App passt womöglich nicht mehr zur Datenbank. Stattdessen den Fehler in `dev` beheben und einen kleinen Folge-Release machen. Ist die Datenbank selbst beschädigt: Backup (siehe „Vorher“), Wiederherstellung nur nach Absprache.
- Immer informieren (Runbook „Wen informieren“).

## Release-Ordner einrichten (einmal je Person)

Ein eigener Ordner verhindert, dass ein Befehl aus Versehen gegen die falsche Datenbank läuft. Die Arbeitsordner für `dev` bleiben mit Staging verlinkt.

1. Neuer Arbeitsbaum, z. B. `../cja-mvp-prototyp-release` auf `main` (`git worktree add`).
2. Production-Passwort selbst in den Schlüsselbund (`cja-db-fra`), dann im Ordner `SUPABASE_DB_PASSWORD="$(security find-generic-password -s cja-db-fra -w)" npx supabase@2.117.0 link --project-ref vqfnmkcfjsudsujiuoqm`. Claude sieht das Passwort nie.
3. Prüfen, dass `supabase/.temp/project-ref` die Frankfurter Ref enthält, und im Staging-Ordner weiterhin die Irland-Ref.
4. Die Befehle `/release` (Code und Migrationen) und `/production-inhalte` (Inhalte, Konten, Lernende) für Claude führen durch diese Seite, mit Anhalten vor jedem Production-Schritt. Einrichtung für weitere Personen: `ONBOARDING-PRODUCTION.md` (lokal, wird per Datei weitergegeben).
