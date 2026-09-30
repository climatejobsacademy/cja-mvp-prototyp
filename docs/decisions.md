# Entscheidungslog

Chronologisch, älteste Entscheidung zuerst. Hier stehen Entscheidungen, die Code,
Datenmodell, Betrieb oder Datenschutz betreffen, damit der Kontext auch im Repo
liegt und nicht nur in Notion oder Asana.

- **Status:** `gültig` oder `ersetzt` (mit Verweis auf den ersetzenden Eintrag).
- **Belegt:** wo die Entscheidung im Repo nachzulesen ist (Migration, PR, Datei).
  Einträge mit dem Hinweis **aus Projektdoku übernommen** ließen sich im Repo
  nicht prüfen, sie stammen aus Notion, Asana oder Absprachen im Team.
- Die einzelnen Design-Entscheidungen (Farben, Schrift, Flows) stehen
  vollständig in `design-specifications.md`, Abschnitt 5. Hier sind nur die
  mit Folgen über das Design hinaus aufgeführt.

Neue Einträge unten anhängen. Wird eine Entscheidung geändert, bekommt sie
einen neuen Eintrag, und der alte wird auf `ersetzt` gesetzt, nicht gelöscht.

---

### 2026-09-04 – Kompetenzprofil wird ausschließlich aus `competency_evidence` berechnet
- **Entscheidung:** Abgeschlossene Lektionen und bestätigte Verifizierungen erzeugen Nachweise in `competency_evidence`; das Kompetenzprofil wird nur daraus berechnet, nie manuell bearbeitet.
- **Begründung:** Ein Knotenpunkt für theoretische und praktische Nachweise, keine Doppelhaltung, Profil nicht editierbar (SR-01).
- **Status:** ersetzt durch 2026-09-28 (SR-70). Der Grundsatz „nicht manuell bearbeitbar“ gilt weiter.
- **Belegt:** `data-model.md` Group 4; `0006_progress_and_evidence.sql`

### 2026-09-04 – Verifizierung durch AfCJ admin im Prototyp
- **Entscheidung:** Selbstauskünfte verifiziert im Prototyp AfCJ admin; ab MVP VEFK/Fachkraft als Instructor/Team Lead.
- **Begründung:** Der Prototyp soll den Verifizierungsaufwand selbst testen (kleine Kohorte).
- **Status:** gültig
- **Belegt:** `data-model.md`, Open decisions

### 2026-09-04 – Weitere Grundsatzentscheidungen zum Datenmodell
- **Entscheidung:** (a) Eine Person kann mehreren Organisationen angehören. (b) Manager sehen bei Praxis-Selbstauskünften nur Status und Ergebnis, keine Medien. (c) Accounts legt ein Admin händisch an, Login per Magic Link, keine Selbstregistrierung. (d) `file_asset` ist die allgemeine Dateiablage, `knowledge_source` ein eigener Verweis darauf.
- **Begründung:** (a) später teuer nachzurüsten; (b) Praxis-Ansicht darf nicht als Überwachung wirken, Zweckbindung DSGVO; (c) Einfachheit im Prototyp; (d) Trennung von Datei und Kurations-Metadaten.
- **Status:** gültig
- **Belegt:** `data-model.md`, Open decisions und Group 5; `src/app/login/actions.ts` (`shouldCreateUser: false`)

### 2026-09-07 – Praxisphase als nachgelagerte Selbstauskunft
- **Entscheidung:** Kein begleitetes Live-Erfassen; Lernende bestätigen nach dem Einsatz.
- **Begründung:** Kein Kamera-Live-Zugriff und keine Offline-Fähigkeit nötig, PWA reicht.
- **Status:** gültig (MVP-Gestaltung offen)
- **Belegt:** `data-model.md`, Open decisions

### 2026-09-09 – Stundenplan kohortenweit, Praxistage je Learner
- **Entscheidung:** `schedule_entry` hängt an der Kohorte (`cohort_id`) oder, für Praxistage, am einzelnen Learner (`enrolment_id`).
- **Begründung:** Live-Sessions und Deadlines sind für alle gleich, Praxiseinsätze nicht.
- **Status:** gültig. Ergänzung 2026-09-15: Einträge mit `art = 'live'` immer mit `cohort_id`, sonst sind sie unsichtbar (PR #9).
- **Belegt:** `data-model.md` Group 3; `0005_delivery.sql`

### 2026-09-09 – Design-Fundament und Admin-Oberfläche zurückgestellt
- **Entscheidung:** shadcn/ui + Tailwind, WCAG 2.1 AA von Anfang an, Status nie nur über Farbe. Keine Admin-Oberfläche im Prototyp; Admin-Arbeit läuft direkt in Supabase.
- **Begründung:** Kein Designer im Team, KI-gestütztes Bauen; Fokus auf die Learner-Flows.
- **Status:** gültig
- **Belegt:** `design-specifications.md` Abschnitte 1, 3 und 5

### 2026-09-11 – Team-Entscheidungen zu den neun offenen Fragen aus dem ersten Build
- **Entscheidung:** u. a. `status` published/unpublished für Programm, Modul, Kurs, Lektion und Praxisaufgabe (Kompetenzen ohne eigenen Status); `lesson_resource` für mehrere Verweise je Repository-Lektion; Praxistag mit Start- und Abschluss-Selbstauskunft (`field_capture.phase`) und Single-Choice-Fragen; `field_job.status` wird „durchgeführt“, sobald die Bestätigung gesetzt ist.
- **Begründung:** Lücken und Widersprüche zwischen `data-model.md` und `access-matrix.md` aus dem ersten Build-Task.
- **Status:** gültig
- **Belegt:** PR #1; Migrationen `0010`–`0012`; `open-questions.md`; `data-model.md` Group 3/4

### 2026-09-15 – Supabase-Region EU (Irland)
- **Entscheidung:** Das Supabase-Projekt „Prototyp-MVP“ liegt in `eu-west-1` (Irland); CLAUDE.md wurde von Frankfurt auf Irland korrigiert.
- **Begründung:** Korrektur der Dokumentation an den tatsächlichen Projektstand.
- **Status:** gültig. Am 30.09. per `supabase projects list` erneut bestätigt. Achtung: Der Entwurf der Datenschutzerklärung nennt noch Frankfurt.
- **Belegt:** PR #8; `CLAUDE.md`, Abschnitt Stack

### 2026-09-15 – SR-Triage: Admin-Anforderungen ohne eigene Oberfläche, Pilot deutschsprachig
- **Entscheidung:** Admin-Anforderungen, die sich über Supabase Table Editor, Storage oder SQL abbilden lassen (SR-19–23, 48, 55), bekommen im Prototyp keine eigene UI. SR-12 (Übersetzbarkeit) und SR-31 (Sprachlern-Einheit) sind verschoben, der Pilot startet deutschsprachig.
- **Begründung:** Zwei AfCJ-Admins und bis zu ca. 11 Lernende sind ohne UI zu betreuen.
- **Status:** gültig
- **Belegt:** PR #10; `design-specifications.md` Abschnitt 3; `requirements.md`

### 2026-09-16 – Praxisaufgaben hängen an Modul oder Programm (XOR)
- **Entscheidung:** `field_job_type` hat genau eines von `module_id` oder `programme_id`, analog zu `course`, plus `reihenfolge`.
- **Begründung:** Praxis-Anteile im Programm-Überblick und in der Content Library zeigen (SR-58, SR-59).
- **Status:** gültig
- **Belegt:** PR #16; Migrationen `0014`, `0015`

### 2026-09-16 – SCORM-Architektur
- **Entscheidung:** Eigene 1:1-Tabelle `scorm_package` je SCORM-Lektion, Verweis auf die rohe Zip-Datei im privaten Bucket `scorm-packages`; Entpacken clientseitig beim Abspielen. Upload und Zuordnung erfolgen im Pilot manuell (Storage + SQL), ohne Admin-UI.
- **Begründung:** Reicht für die Pilotgröße; späteres serverseitiges Entpacken ohne Schemaänderung möglich.
- **Status:** gültig
- **Belegt:** PR #17, #18, #19; Migrationen `0016`, `0017`; `requirements.md` SR-50

### 2026-09-18 – Selbstauskunft wird automatisch den Teilschritten zugeordnet
- **Entscheidung:** Neue Tabelle `field_job_type_competency_mapping`; beim Einreichen der Abschluss-Selbstauskunft leitet ein Trigger die Teilschritte aus der Praxisaufgabe ab, statt dass der Admin sie bei jeder Verifizierung auswählt.
- **Begründung:** SR-02 verlangt die Teilschritt-Referenz schon beim Einreichen.
- **Status:** gültig
- **Belegt:** PR #25; Migration `0018`

### 2026-09-18 – Werkstatt-Übung vs. echter Feld-Einsatz zurückgestellt
- **Entscheidung:** Keine eigene Unterscheidung im Datenmodell vor dem Pilot.
- **Begründung:** Erst auf Basis echter Nutzertests entscheiden, nicht spekulativ modellieren.
- **Status:** gültig (als Zurückstellung; Thema liegt im Asana-Eingang)
- **Belegt:** PR #24; `data-model.md` Group 3

### 2026-09-21 – Magic-Link-Redirect über Vercel-System-Variablen
- **Entscheidung:** Die Redirect-URL wird serverseitig aus `VERCEL_ENV` bzw. `VERCEL_BRANCH_URL` ermittelt statt aus einem je Umgebung gepflegten Wert. Einladungen per Skript zeigen immer auf Production.
- **Begründung:** Der manuell gepflegte Wert ist zweimal gebrochen (Production und Preview).
- **Status:** gültig
- **Belegt:** PR #31, #36; `src/app/login/actions.ts`; `scripts/invite-learner.mjs`

### 2026-09-22 – Einladungsmail per Skript statt Admin-UI (SR-49)
- **Entscheidung:** SR-49 wird vorgezogen, aber nur als Skript `scripts/invite-learner.mjs`; die `person`-Zeile legt der Admin weiter händisch an.
- **Begründung:** Kleinstmögliche Umsetzung, ohne die Zurückstellung der Admin-UI aufzuheben.
- **Status:** gültig
- **Belegt:** PR #35; `traceability.md` SR-49

### 2026-09-22 – Vercel Function Region Frankfurt (`fra1`)
- **Entscheidung:** Vercel Functions laufen in Frankfurt statt in Washington D.C. (`iad1`).
- **Begründung:** Latenz: rund 80–100 ms je Datenbankaufruf über den Atlantik zur Supabase-Datenbank in Irland. Datenschutz war laut PR nicht der Anlass, ist aber seit 28.09. Teil der Begründung (siehe dort).
- **Status:** gültig, siehe auch 2026-09-28 (Vercel bleibt vorerst)
- **Belegt:** PR #39; `vercel.json`

### 2026-09-23 – Release-Prozess über `dev`
- **Entscheidung:** Feature-PRs gehen nach `dev`, Releases als PR `dev` → `main`. `main` ist geschützt: 1 Freigabe, Pflicht-Check `lint-and-types`, gilt auch für Admins. Merge auf `main` deployt Production.
- **Begründung:** Definition of Done: jeder PR wird von der zweiten Person reviewt (`definition-of-done.md`).
- **Status:** gültig
- **Belegt:** erster Release-PR #40; Branch-Schutz per GitHub-API geprüft (30.09.); `.github/workflows/ci.yml`

### 2026-09-23 – Teilschritt ↔ Kompetenz ist N:M (SR-65)
- **Entscheidung:** Junction-Tabelle `competency_competency_step`; `competency_step.competency_id` bleibt vorerst stehen und wird nicht mehr gelesen, Drop-Column folgt in einer eigenen Migration.
- **Begründung:** Ein Teilschritt zahlt auf mehrere Kompetenzen ein.
- **Status:** gültig (Drop-Column steht aus; bis dahin keine Kompetenzen löschen)
- **Belegt:** PR #43; Migration `0019`; `data-model.md` Group 2

### 2026-09-23 – Kompetenz ↔ Programm ist N:M (SR-66)
- **Entscheidung:** Junction-Tabelle `competency_programme`; `competency.quelle` gilt nicht mehr als Programmzuordnung.
- **Begründung:** Kompetenzen gehören zu mehreren Programmen.
- **Status:** gültig (Drop-Column für `quelle` steht aus)
- **Belegt:** PR #45; Migration `0020`

### 2026-09-23 – Typ-Homogenität und AND-Logik auf Kompetenz-Ebene (SR-67, SR-68)
- **Entscheidung:** Lektionen nehmen nur theoretische, Praxisaufgaben nur praktische Teilschritte (Trigger). Eine Kompetenz ist erst erfüllt, wenn alle Teilschritte erfüllt sind (View `competency_fulfilment`).
- **Begründung:** Entscheidung der LD-Runde.
- **Status:** gültig. Bekannte Lücke: Änderung von `competency_step.typ` selbst wird nicht geprüft.
- **Belegt:** PR #46; Migration `0021`

### 2026-09-28 – AND-Logik auch auf Teilschritt-Ebene (SR-70)
- **Entscheidung:** Ein Teilschritt ist erst erfüllt, wenn alle zugeordneten Lektionen bzw. zu allen zugeordneten Praxisaufgaben verifizierte Selbstauskünfte vorliegen. `competency_fulfilment` rechnet dafür direkt aus `unit_progress` und `field_capture`.
- **Begründung:** Produktentscheidung; `competency_evidence` kennt die auslösende Lektion nicht und kann AND nicht abbilden.
- **Status:** gültig; ersetzt 2026-09-04 (Profil nur aus `competency_evidence`)
- **Belegt:** PR #49; Migration `0022`; `data-model.md` Group 4

### 2026-09-28 – Vercel bleibt vorerst als Hosting
- **Entscheidung:** Vercel bleibt für den Pilot, Function Region `fra1`, die Option „Improve models with this project's data“ ist deaktiviert. EU-Hosting wird zum MVP ab Januar 2027 geprüft.
- **Begründung:** TODO Vera: klären (in der Vorgabe nicht genannt).
- **Status:** gültig
- **Belegt:** `fra1` über PR #39 / `vercel.json`. Die übrigen Punkte **aus Projektdoku übernommen** (Vercel-Einstellungen nicht einsehbar).

### 2026-09-28 – Resend wird durch Brevo ersetzt
- **Entscheidung:** Der E-Mail-Versand (Magic Link, Einladungen) wechselt von Resend zu Brevo.
- **Begründung:** E-Mail-Adressen und Magic-Link-Token sollen nicht in ein Drittland übertragen werden.
- **Status:** gültig, umgesetzt am 30.09.2026. Der Versand ist nicht im Code eingebunden, sondern über die SMTP-Einstellungen von Supabase Auth: Host `smtp-relay.brevo.com`, Port 587, Absender `info@climatejobsacademy.com`. DNS-Einträge (DKIM, DMARC, Brevo-Code) sind gesetzt, der Testlogin auf learn.climatejobsacademy.com war erfolgreich. Resend-Domain, API-Keys und DNS-Einträge sind entfernt.
- **Belegt:** **aus Projektdoku übernommen**; Umsetzung laut Angabe von Vera vom 30.09.2026 (Supabase-Dashboard, DNS und Brevo nicht im Repo einsehbar)

### 2026-09-28 – Off-White als App-Hintergrund
- **Entscheidung:** `--background` wird Off-White `#F5F5F0`.
- **Status:** ersetzt durch 2026-09-29 (wieder Weiß)
- **Belegt:** PR #53; `design-specifications.md` Abschnitt 1

### 2026-09-29 – Redesign 2a ohne Schema-Änderungen
- **Entscheidung:** Das Design-Handoff „Richtung 2a Minimal“ wird ohne Migration umgesetzt; Elemente ohne Datenfeld (Uhrzeit bei Praxistagen, Themen-Label, gesperrtes Modul mit Freischaltdatum) werden weggelassen. Hintergrund wieder Weiß, Off-White nur als Fläche.
- **Begründung:** Vorgabe für die Demo am 30.09.: keine Schema-Änderungen, keine Migrationen.
- **Status:** gültig. Schritt f (übrige Screens) folgt.
- **Belegt:** PR #55, #56; `design-specifications.md` Abschnitt 1

### 2026-09-29 – Zähltext bleibt (K2), neutrale Login-Rückmeldung (K3)
- **Entscheidung:** K2: „x/y“ steht weiter neben den Segmentbalken. K3: Der Login gibt für alle Fälle dieselbe Rückmeldung, ohne Aussage, ob eine Adresse registriert ist.
- **Begründung:** SR-69 verlangt den Zähltext; keine Konto-Aufzählung (Datenschutz).
- **Status:** gültig
- **Belegt:** PR #55, #56; `src/app/login/actions.ts`

### 2026-09-29 – Nav-Reiter „Programm“, Vorbereitungstext nur im Praxis-Flow
- **Entscheidung:** „Lernmaterialien“ heißt „Programm“ (Route bleibt `/content`). Der Vorbereitungstext der Praxisaufgaben erscheint nur noch im Praxis-Flow.
- **Status:** gültig. Bekannte Doppelung mit dem Stundenplan-Tab „Programm“ (TODO im Code).
- **Belegt:** PR #58, #61; `requirements.md` SR-59

### 2026-09-29 – Kalender-Wochenansicht verschoben
- **Entscheidung:** Die Wochenansicht bleibt bei Tageskacheln; das Zeitraster kommt später.
- **Begründung:** Neue Datenabfrage und mobile Lösung nötig, für die Demo zu riskant.
- **Status:** gültig
- **Belegt:** PR #63

### 2026-09-29 – Demo-SCORM-Zuordnungen (temporär)
- **Entscheidung:** Für die Demo zeigen 9 Selbstlernmodule dasselbe Platzhalter-Paket „DEMO (temporär)“; die Zuordnung wird nach der Demo zurückgenommen.
- **Begründung:** Nur ein echtes SCORM-Paket vorhanden.
- **Status:** gültig bis zur Rücknahme (Asana-Task vorhanden)
- **Belegt:** **aus Projektdoku übernommen** (nur in der Produktionsdatenbank, nicht im Repo)

### 2026-09-30 – Plattform-Pilot mit Modul 2
- **Entscheidung:** Der Plattform-Pilot läuft mit Modul 2 (Start 02.11.2026) statt Modul 1. MS Teams bleibt für Live-Unterricht und Kommunikation.
- **Begründung:** Ergebnis des Treffens mit energiehelden am 30.09.
- **Status:** gültig
- **Belegt:** **aus Projektdoku übernommen**

### 2026-09-30 – Wo Stories, Entscheidungen und Betrieb dokumentiert werden
- **Entscheidung:** Stories, Priorität und Status leben nur in Asana (Projekt „Prototyp → Pilot Modul 2“). Notion beschreibt Scope, Entscheidungen und Betrieb und verlinkt nach Asana. Dieses Log hält die Entscheidungen zusätzlich im Repo fest.
- **Begründung:** Eine Quelle je Informationsart; Code-Kontext und Projektdoku sollen nicht auseinanderlaufen.
- **Status:** gültig
- **Belegt:** **aus Projektdoku übernommen**
