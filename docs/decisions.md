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
- **Status:** ersetzt durch 2026-09-28 (SR-63). Der Grundsatz „nicht manuell bearbeitbar“ gilt weiter.
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
- **Status:** ersetzt durch 2026-10-02 (Umzug nach Frankfurt). Das Projekt in Irland bleibt als Staging bestehen.
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

### 2026-09-23 – Teilschritt ↔ Kompetenz ist N:M (SR-69)
- **Entscheidung:** Junction-Tabelle `competency_competency_step`; `competency_step.competency_id` bleibt vorerst stehen und wird nicht mehr gelesen, Drop-Column folgt in einer eigenen Migration.
- **Begründung:** Ein Teilschritt zahlt auf mehrere Kompetenzen ein.
- **Status:** gültig (Drop-Column steht aus; bis dahin keine Kompetenzen löschen)
- **Belegt:** PR #43; Migration `0019`; `data-model.md` Group 2

### 2026-09-23 – Kompetenz ↔ Programm ist N:M (SR-70)
- **Entscheidung:** Junction-Tabelle `competency_programme`; `competency.quelle` gilt nicht mehr als Programmzuordnung.
- **Begründung:** Kompetenzen gehören zu mehreren Programmen.
- **Status:** gültig (Drop-Column für `quelle` steht aus)
- **Belegt:** PR #45; Migration `0020`

### 2026-09-23 – Typ-Homogenität und AND-Logik auf Kompetenz-Ebene (SR-71, SR-72)
- **Entscheidung:** Lektionen nehmen nur theoretische, Praxisaufgaben nur praktische Teilschritte (Trigger). Eine Kompetenz ist erst erfüllt, wenn alle Teilschritte erfüllt sind (View `competency_fulfilment`).
- **Begründung:** Entscheidung der LD-Runde.
- **Status:** gültig. Bekannte Lücke: Änderung von `competency_step.typ` selbst wird nicht geprüft.
- **Belegt:** PR #46; Migration `0021`

### 2026-09-28 – AND-Logik auch auf Teilschritt-Ebene (SR-63)
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
- **Begründung:** SR-62 verlangt den Zähltext; keine Konto-Aufzählung (Datenschutz).
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

### 2026-10-02 – Production zieht von Irland nach Frankfurt
- **Entscheidung:** Production läuft ab 02.10.2026 auf einem neuen Supabase-Projekt in Frankfurt (`eu-central-1`, Ref `vqfnmkcfjsudsujiuoqm`). Das bisherige Projekt in Irland (`keijrwvegmwgpvprpoxa`) wird Staging und bedient die Vercel-Preview-Deployments. Vercel läuft auf dem Pro-Tarif, Function Region weiterhin `fra1`. Gegen den Supabase Team-Plan wurde entschieden. Die Hosting-Aufstellung wird im Review im Januar 2027 (MVP) erneut geprüft.
- **Begründung:** Datenresidenz in Deutschland und Vertrauen; Datenbank und serverseitige Funktionen liegen damit in derselben Region. Gründe gegen den Team-Plan: TODO Vera: ergänzen.
- **Status:** gültig; ersetzt 2026-09-15 (Supabase-Region EU/Irland)
- **Belegt:** Region `eu-central-1` über den Pooler-Host des Frankfurter Projekts; Auto-RLS am 02.10.2026 lesend gegen Irland abgeglichen (`runbook.md`, Abschnitt 5); `CLAUDE.md`, Abschnitt Stack. Vercel Pro, die Umstellung der Production-Variablen und der Verzicht auf den Team-Plan **aus Projektdoku übernommen** (Vercel- und Supabase-Tarife nicht im Repo einsehbar).

### 2026-10-07 – Fragen-Thread gehört der Kohorte, Ausnahme von SR-06
- **Entscheidung:** Beiträge im Fragen-Thread lesen alle Lernenden der Kohorte, die Moderierenden und AfCJ admin. Da `cohort` keine `organisation_id` hat, hängt die Sichtbarkeit nicht am Arbeitgeber; das weicht von der Trennung nach Organisation (SR-06) ab. Die `organisation_id` am Beitrag kommt aus der Einschreibung der Autor:in und bleibt zur Nachvollziehbarkeit erhalten. Moderiert wird über `kohorte_moderation`; eingetragen werden können AfCJ admins und Lernende. Admin- und Lernendenkonten bleiben getrennt, weil ein Admin mit Einschreibung die Stundenplan- und Programmsicht anderer Kohorten sähe.
- **Begründung:** Der Austausch gehört zur Kohorte. Die Pilotkohorte besteht nur aus Mitarbeitenden von energiehelden, im Piloten sehen sich also nur Personen desselben Betriebs. Kohorten werden in der Regel je Betrieb angelegt.
- **Folgen:** Bei einer Kohorte mit mehreren Arbeitgebern gilt die Ausnahme weiter und wird dann neu bewertet. Alternative: Threads je Kohorte und Arbeitgeber trennen (PR #74).
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** PR #74; `0024_lektion_beitrag.sql`; `access-matrix.md`, Zeile „Fragen-Thread“; SR-74, SR-75

### 2026-10-13 – Echte Modul-Ebene über den Wochen
- **Entscheidung:** Neue Tabelle `modul` über den Wochen; `module` bleibt vorerst die Woche und bekommt `modul_id`, `wochentyp` und `lage` (Migration 0028, additiv). Die Umbenennung von `module` in `woche` folgt nach dem Pilotstart am 02.11.2026 zusammen mit der Code-Umstellung. Zeiträume der Module kommen aus dem Stundenplan der Kohorte (`fn_modul_zeitraum`), ohne Versatz ab Kohortenstart; Module ohne Termine haben keinen Zeitraum. Kompetenzen je Modul stehen explizit in `modul_competency` mit Kürzel und Reihenfolge. Die Nummer einer Woche im Modul wird abgeleitet, nicht gespeichert. Die Prüfungsvorbereitung ist ein Modul mit der Überzeile „Abschluss“.
- **Begründung:** Das Modul stand bisher nur im Code (`gliederungFuer`, Branch demo) und passte nicht zu verschobenen Kohorten oder Ferien. Modul II (Start 02.11.2026) soll direkt in diese Struktur importiert werden. Zwei Schritte, damit vor dem Pilotstart kein bestehender Code bricht.
- **Folgen:** Wochennamen ohne feste Daten anlegen, die Zeiträume kommen aus dem Stundenplan. Home, Programm, Kompetenz-Reiter und Chat-Kanäle lesen die Module künftig aus der Datenbank statt aus `gliederungFuer`.
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0028_modul_ebene.sql`; `017_modul_ebene.test.sql`; `data-model.md`, Group 2; SR-05

### 2026-10-13 – Thema, Selbstlernen ↔ Live, „begonnen“ und Rufname als eigene Felder
- **Entscheidung:** `lesson.thema` statt Klammer im Titel; `lesson.live_lektion_id` verknüpft eine Selbstlern-Lektion 1:1 mit ihrer Live-Lektion statt Abgleich über gleichen Titel am selben Tag; „in Bearbeitung“ wird beim ersten Öffnen einer Selbstlern-Lektion gesetzt (nur Code, nie Update); `person.rufname` als Pflichtfeld, das Lernende selbst ändern dürfen (Migration 0029). Migration 0029 ändert `lesson.name` nicht; die Klammer entfernt das Datenskript `scripts/sql/lektion_klammer_entfernen.sql` nach der Demo am 15.10.2026 auf Staging und im Release auf Production.
- **Begründung:** Titelvergleich und Klammer-Zerlegung im Code sind fehleranfällig (Datenlücken Nr. 4, 8, 9, 10). Die demo-Preview läuft gegen Staging und zerlegt den Titel dort noch selbst, darum vor der Demo keine Namensänderung.
- **Folgen:** Der Import schreibt das Thema direkt in `thema`. Mehrdeutige Paare Selbstlernen ↔ Live bleiben beim Backfill leer und werden von Hand zugeordnet.
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0029_felder_lektion_person.sql`; `018_felder_lektion_person.test.sql`; `data-model.md`, Groups 1 und 2; SR-13, SR-15, SR-48, SR-73

### 2026-10-13 – Trainer:innen als Personen und private Profilfotos
- **Entscheidung:** Neue Rolle `trainer` in `role_assignment`. Trainer:innen bekommen eigene Personen und Auth-Konten ohne Login-Nutzung, getrennt von evtl. vorhandenen Lernenden-Konten derselben Person, und werden über `live_session.trainer_id` und `field_job.instructor_id` zugeordnet. Profilfotos von Lernenden und Trainer:innen liegen im privaten Bucket `profilfotos` (`<person_id>/<uuid>.jpg`, JPEG bis 1 MB, Zuschnitt 512 px im Browser), Abruf über signierte Links. Lernende sehen ihr eigenes Foto und die Fotos ihrer Trainer:innen, nicht die anderer Lernender. Lernende ändern Foto und Rufname im Konto-Menü (Migration 0030).
- **Begründung:** Die Rolle verhindert, dass eine versehentlich als `trainer_id` eingetragene Person (etwa eine lernende) mit Name und Foto sichtbar wird. `fn_meine_trainer()` zeigt nur Name, Rufname und Foto, ohne E-Mail und Geburtsdatum aus `person` freizugeben. Fotos anderer Lernender hängen an der Kohortensicht (Datenlücke Nr. 6), die noch offen ist.
- **Folgen:** Ersetzt die fest eingetragenen Trainer:innen auf demo (`demo-personen.ts`, `public/demo-bilder`); `public/demo-bilder` bleibt nur auf demo. Fotos von Trainer:innen lädt AfCJ admin mit deren Einwilligung hoch. Beim Löschen eines Kontos bleibt eine Fotodatei im Speicher, weil Storage nicht kaskadiert; das gehört in den Löschpfad (Lücke aus dem Audit vom 30.09.2026). Home und Programm zeigen die Trainer:innen später.
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0030_trainer_profilfotos.sql`; `019_trainer_profilfotos.test.sql`; `access-matrix.md`, Zeilen „Profilfoto“ und „Trainer:in je Termin“; Datenschutzerklärung, Abschnitt „Profilfotos“; SR-77, SR-78, SR-60

### 2026-10-13 – Kann-Satz als eigenes Feld an der Kompetenz
- **Entscheidung:** `competency.kann_satz` (Text, optional) nimmt den ausformulierten Kann-Satz aus der Importvorlage auf; `name` bleibt der Kurztitel. Das Import-Skript (`scripts/import-plan.mjs`) füllt das Feld, sobald die Spalte existiert (Migration 0031).
- **Begründung:** Die Kann-Sätze von Content & Learning hatten kein Feld; im Namen wären sie für Listen und Ringe zu lang.
- **Folgen:** Anzeige in der Kompetenz-Detailansicht folgt in einem eigenen PR. Keine neuen Policies (bestehende Lese- und Schreibregeln für `competency` gelten).
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0031_kompetenz_kann_satz.sql`; `020_kompetenz_kann_satz.test.sql`; `data-model.md`, Zeile „competency“; SR-80

### 2026-10-13 – Trainer:innen bestätigen Anwesenheit und prüfen Praxisberichte; Storno statt Änderung
- **Entscheidung:** (E1) Trainer:innen melden sich an (Magic Link wie Lernende). (E2) Sie prüfen Praxisberichte (`verification`). (E3) Eine Trainer:in handelt für alle Termine und Praxisberichte einer Kohorte, in der sie mindestens einen Termin hat (`live_session.trainer_id` oder `field_job.instructor_id`). (E4) `attendance` und `verification` sind für alle Rollen unveränderlich; Korrektur per Storno-Eintrag (`korrigiert_id`). Löschen bleibt AfCJ admin vorbehalten, bis der Löschweg (DSGVO-Löschrecht) entschieden ist.
- **Begründung:** Ohne Bestätigung zählen Stundenplan-Häkchen und „Heute frei“ (SR-79) keinen Live-Termin. Je Termin ist nur eine Person gespeichert, Vertretungen kommen vor (E3). SR-07 verlangt unveränderliche Nachweise; Storno hält den Verlauf für AZAV-Prüfungen fest.
- **Folgen:** Überholt den Teil von 0030 „Trainer:innen ohne Login-Nutzung“. Trainer:innen lesen Kohorte, Plan, Einschreibungen, Praxistage und -berichte ihrer Kohorten; Namen der Lernenden nur über `fn_trainer_teilnehmende()`. Datenschutzerklärung ergänzen (Paket G, Übergabe). Oberfläche für Trainer:innen folgt (G2).
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0032_trainer_anwesenheit_pruefung.sql`; `021_trainer_anwesenheit_pruefung.test.sql`; `access-matrix.md`; SR-07, SR-81, SR-82

### 2026-10-13 – Eigene Personendaten: nur Rufname und Foto selbst änderbar
- **Entscheidung:** Spalten-Grant auf `person`: Angemeldete ändern nur `rufname` und `foto_pfad` (eigene Zeile über `person_self_update`). Alle anderen Felder pflegt AfCJ admin im Dashboard.
- **Begründung:** `person_self_update` gab die ganze eigene Zeile frei; über die API ließen sich E-Mail, Name und Geburtsdatum ändern, `person.email` konnte von `auth.users.email` abweichen (Paket-G-Analyse).
- **Folgen:** Auch AfCJ admin ändert in der App nur diese beiden Spalten (heute ohne Bedeutung, Pflege im Dashboard). Ob Lernende Vorerfahrung oder Sprache selbst ändern, entscheidet die Profilseite (Übergabe).
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0033_person_spaltenrechte.sql`; `022_person_spaltenrechte.test.sql`; `access-matrix.md`; SR-77

### 2026-10-14 – Kohortensicht: Anzeigename und Foto der Kohortenmitglieder

- **Entscheidung:** Lernende sehen die anderen Lernenden ihrer Kohorte mit Anzeigename (Rufname plus Initial des Nachnamens), der Anzahl und, wenn die Person ein Foto hochgeladen hat, mit dem Foto. Der Upload ist die Freigabe; der Upload-Dialog sagt das ausdrücklich („Mit dem Hochladen bist du einverstanden, dass dein Foto für Mitglieder deiner Kohorte sichtbar ist. Du kannst es jederzeit entfernen.“). Nur gleiche Kohorte und gleiche Organisation, nur aktive Einschreibungen. `fn_meine_kohorte()` liefert `person_id`, `anzeigename`, `foto_pfad`; `fn_darf_foto_sehen` bekommt die Kohortenregel. Keine neuen Spalten oder Schalter an `person`.
- **Begründung:** SR-30 (Build next) verlangt Namen und Profilbild; die Abgrenzung auf Kohorte und Organisation schützt auch dann, wenn Kohorten später organisationsübergreifend gemischt werden. Ein zusätzlicher Schalter wäre ein zweiter Ort für dieselbe Entscheidung: wer kein Foto hochlädt oder es entfernt, zeigt keins.
- **Folgen:** Die Datenschutzerklärung sagt heute, das Foto sei „nicht für andere Teilnehmende“ sichtbar. Vor der Veröffentlichung auf Production müssen Abschnitt „Profilfotos“ und ein neuer Abschnitt „Kohortenansicht“ geändert werden (Entwurf in `docs/datenschutz-kohortenansicht-entwurf.md`, Prüfinstanz offen). Wer ein Foto vor dieser Änderung hochgeladen hat, hat unter dem alten Text zugestimmt; der neue Dialogtext und die Datenschutzerklärung müssen vor dem Release dafür sorgen, dass diese Personen die neue Sichtbarkeit kennen (Entscheidung offen: Hinweis beim nächsten Öffnen oder Foto zurücksetzen). Der Name ist ohne Abwahl sichtbar; eine Abwahl gibt es nicht. Keine Trainer-Liste, keine Vorerfahrung, keine Profilseite.
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `0034_kohortensicht.sql`; `023_kohortensicht.test.sql`; `access-matrix.md`; SR-30

### 2026-10-16 – Kohorten-Chat gehört der Kohorte, Ausnahme von SR-06

- **Entscheidung:** Kohorten-Chat (Variante B1 der Bauanleitung „Fachsprache und Haupt-Chat vor dem 02.11.“) mit zwei Kanälen je Kohorte: „Ankündigungen“ schreiben nur Trainer:innen der Kohorte und das Team, „Treffpunkt“ alle mit aktiver Einschreibung, dazu Trainer:innen und Team. Lesen alle der Kohorte, über Arbeitgeber hinweg. Moderation durch Trainer:innen der Kohorte, `kohorte_moderation` und AfCJ admin, Melden durch Lernende. Neue Nachrichten holt die App alle 30 Sekunden, ein Zähler zeigt Ungelesenes. Die Rolle der Autor:in wird nicht angezeigt. Schalter `cohort.chat_aktiv`, auf Production aus.
- **Begründung:** Der Chat dient dem Austausch der ganzen Kohorte (z. B. Verabredungen), wie der Fragen-Thread (2026-10-07). Eine Trennung nach Betrieb wie bei der Kohortensicht (2026-10-14) würde gemischte Kohorten teilen. Echtzeit wäre aufwendiger und teurer als regelmäßiges Abfragen.
- **Folgen:** Ausnahme von SR-06 wie beim Fragen-Thread. Vor dem Einschalten auf Production: Datenschutzerklärung (Abschnitt Kohorten-Chat), Nutzungsregeln und eine verantwortliche Person für die Moderation. Ankündigungen setzen voraus, dass Trainer:innen einen Termin in der Kohorte haben (Import).
- **Status:** gültig (Entscheidung Anna)
- **Belegt:** `0050_kohorten_chat.sql`; `024_kohorten_chat.test.sql`; `access-matrix.md`; SR-83

### 2026-10-16 – Fachsprache-Einheit (Stufe 2): eigene Tabelle, Prüfpflicht, private Bilder

- **Entscheidung:** (Entwurf, wartet auf Freigabe) Eine Einheit je Lektion in `fachsprache_einheit`. Inhalt als JSON mit Datenbankprüfung (genau eine richtige Antwort je Quizfrage über den Index `richtig`). Veröffentlichung nur mit fachlicher und sprachlicher Prüfung (Person + Datum); bei geändertem Inhalt oder Titel fällt der Status auf `entwurf` und beide Prüfungen werden geleert, bei unverändertem Inhalt nicht. Bilder im privaten Bucket `fachsprache-bilder` (2 MB, PNG/JPEG/WebP, kein SVG), nur Dateiname im JSON, Alternativtext Pflicht. Lesen wie Lernmaterialien über `fn_kann_lektion_lesen`, Schreiben nur AfCJ admin.
- **Begründung:** Inhalte für Lernende müssen fachlich und sprachlich geprüft sein; SVG im Bucket wäre ausführbarer Inhalt; keine eigene Lernstand-Tabelle, damit kein Nachweis ohne Regel 6 entsteht.
- **Folgen:** Einstiege (Stundenplan-Chip, Home-Kästchen), Import-Tab und Seite folgen in eigenen Schritten. Offen: ob Prüfende zwei verschiedene Personen sein müssen, Trainer:innen-Lesezugriff, echter Fortschritt. Datenschutz: Vorlesen über die Sprachausgabe des Browsers vor Livegang in der Erklärung nennen.
- **Status:** Entwurf, nicht auf Staging angewendet
- **Belegt:** `0051_fachsprache_einheit.sql`; `025_fachsprache_einheit.test.sql`

### 2026-10-16 – Fachsprache-Seite: Schalter, Lektion des Tages, Entwürfe, kein Ergebnis

- **Entscheidung:** Die Oberfläche der Fachsprache-Einheit (Seite `/fachsprache/[einheitId]`, Chip im Stundenplan, Kästchen auf Home) hängt am serverseitigen Schalter `FACHSPRACHE_EINHEIT` (`src/lib/schalter.ts`): an nur mit dem Wert `an`, ohne Variable aus; in Vercel für Preview und Development an, für Production aus. Lektion des Tages ist die Live-Lektion mit Termin an diesem Tag; Tage nur mit Selbstlernen bekommen keinen Einstieg (O2). Home und Stundenplan zeigen nur veröffentlichte Einheiten; AfCJ admin kann einen Entwurf über die direkte URL öffnen, mit dem Banner „Entwurf, für Lernende nicht sichtbar“ (O3). Bilder stehen direkt auf der Karte und lassen sich per Klick vergrößern (O5). Das Quiz ist freiwillig: wählen, „Weiter“ prüft, falsch neu wählen, richtig mit Erklärung, beliebig oft wiederholbar; es speichert nichts, zählt nichts und erzeugt keine competency_evidence (Regel 6), der Abschluss zeigt kein Ergebnis und keinen Ring.
- **Begründung:** Production soll die Funktion erst nach Prüfung der Inhalte und des Datenschutzes zeigen; ein Schalter ohne `NEXT_PUBLIC_`-Präfix kommt nicht ins Browser-Bundle. Die Fachsprache-Einheit hängt laut Import an der ersten Live-Lektion des Kurses. Prüfende brauchen eine Vorschau, Lernende dürfen keine ungeprüften Inhalte sehen.
- **Folgen:** Vorlesen nutzt die Stimmen des Browsers; auf Staging dürfen alle Stimmen vorlesen, ob auf Production nur lokale Stimmen erlaubt sind, wird vor dem Einschalten entschieden (O4, Datenschutz Punkt 6). Keine Bibliothek für Komponententests (O6): Regeln als reine Funktionen mit `node --test`, die Oberfläche über den Klicktest. Abfragen (`src/lib/queries/fachsprache.ts`) und Oberfläche folgen, sobald 0051 auf Staging liegt.
- **Status:** gültig (Entscheidung Vera)
- **Belegt:** `src/lib/schalter.ts`, `src/lib/fachsprache.ts`, `src/lib/fachsprache-quiz.ts` mit Tests; SR folgt
