# Paket G – Plan für die Datenlücken Nr. 5–7 und 11

Stand: 13.10.2026. Analyse ohne Datenbankzugriff, Grundlage sind `supabase/migrations` (bis 0030 auf dev, 0031 in PR #105), `docs/data-model.md`, `docs/access-matrix.md`, `docs/requirements.md`, `docs/sr-registry.json` und der App-Code auf `origin/dev`. Kein Code, keine Migration angewendet. Migrationsentwürfe sind Text, Nummern ab 0032.

Rahmen: Bauzeit Mi 14.10. (ca. 8 h, davon ca. 2 h für den Import aus Paket C) und Do bis 16 Uhr (ca. 7 h). Alle Migrationen bis Do 16 Uhr auf Staging, Fr Release auf Production.

## Kurzfassung: was realistisch ist

| Punkt | Bis Do 16 Uhr | In die Übergabe |
|---|---|---|
| 1. Anwesenheit + Praxisberichte (Nr. 7) | Migration 0032 (Rechte für Trainer:innen, Unveränderlichkeit) mit Tests auf Staging; Trainer-Startseite „Heute“ mit Anwesenheit bestätigen | Prüfen der Praxisberichte in der Oberfläche (Liste, Detail, Entscheidung), wenn Do knapp wird |
| 2. Profilseite (Nr. 11) | Migration 0033 (Spalten-Grants für `person`, Sicherheitslücke) auf Staging; Profilseite, falls Zeit bleibt | Profilseite sonst als erster PR nach dem Release |
| 3. Kohortensicht (Nr. 6) | nur, wenn die Produktfragen Mi früh beantwortet sind: Funktion 0034 mit Test | Oberfläche |
| 4. Glocke (Nr. 11) | nein | Variante A (abgeleitet) ist ein guter erster PR nach dem Release |
| 5. Lernbegleitung, Kontaktweg (Nr. 5) | nein | nur Optionen, Entscheidung offen |

Ehrlich: Mi + Do reichen für **Nr. 7 in der Datenbank vollständig und in der Oberfläche zur Hälfte** plus die kleine Profil-Migration. Alles andere gehört in die Übergabe. Voraussetzung sind die Entscheidungen E1–E4 (unten) am Mi früh; ohne sie sollte keine der Migrationen am Fr nach Production.

## Entscheidungen (Vera, 13.10.2026)

- **E1:** Ja, Trainer:innen melden sich an (Magic Link wie Lernende).
- **E2:** Ja, Trainer:innen prüfen Praxisberichte ihrer Kohorte.
- **E3 (anders als vorgeschlagen):** Eine Trainer:in handelt für alle Termine und Praxisberichte einer Kohorte, in der sie mindestens einen Termin hat (`live_session.trainer_id` oder `field_job.instructor_id`), weil je Termin nur eine Person gespeichert ist.
- **E4:** Update auf Anwesenheit und Verifizierung für alle gesperrt, Korrektur per Storno-Eintrag. Delete nicht gesperrt: bleibt nur für AfCJ admin, bis der Löschweg (DSGVO-Löschrecht) entschieden ist.
- **Umfang bis Do 16 Uhr:** G1 (0032), G4 (0033), dann G2 (Trainer „Heute“, Anwesenheit bestätigen). Kohortensicht nur, wenn Do nach G2 Zeit ist. Glocke, Profilseite, Lernbegleitung: Übergabe.
- **SR:** SR-81 (Trainer:in bestätigt Anwesenheit), SR-82 (Trainer:in prüft Praxisbericht); 0033 unter SR-77.
- **Stand 13.10. abends:** G1 = PR #108 (0032, Probelauf Staging 31/31), G4 = PR #110 (0033, Probelauf Staging 11/11); beide nicht angewendet, nicht gemergt.

Die ursprünglichen Fragen dazu (zur Nachvollziehbarkeit):

- **E1 Trainer:innen melden sich an.** 0030 und `access-matrix.md` sagen ausdrücklich „Rolle `trainer` ohne Login-Nutzung“. Nr. 7 braucht die Anmeldung. Folge: Magic Link an echte Adressen der Trainer:innen (Production), eigener Bereich in der App, Datenschutzerklärung prüfen.
- **E2 Trainer:innen prüfen Praxisberichte.** In der Matrix steht für „AfCJ trainer“ bei Field capture und Verification „—“. Prüfen dürfen bisher nur AfCJ admin (Prototyp) und laut SR-03 „die zuständige Instructor-Rolle (ab MVP)“. Nr. 7 erweitert das auf Trainer:innen. Das ist eine Ausweitung der Zugriffe (CLAUDE.md, Regel 3) und braucht deine ausdrückliche Entscheidung.
- **E3 Was heißt „eigene“ Termine und Berichte?** Vorschlag: Live-Termine mit `live_session.trainer_id` = ich, Praxistage mit `field_job.instructor_id` = ich. Nicht die ganze Kohorte. Vertretung: AfCJ admin trägt um.
- **E4 Korrektur nach Bestätigung.** SR-07 verlangt Unveränderlichkeit. Fehler passieren trotzdem (falsche Person abgehakt). Vorschlag: keine Änderung, sondern ein Storno-Eintrag (neue Zeile mit Verweis), nur durch AfCJ admin.

---

## 1. Anwesenheit bestätigen und Praxisberichte prüfen (Nr. 7)

### Heute

- `attendance` (0006, 0011): `learner_id`, `live_session_id`, `status` (`anwesend` / `nicht anwesend`), `bestaetigt_von`, unique (learner, live_session). RLS: Lernende lesen eigene, AfCJ admin alles. Kein Zeitstempel der Bestätigung außer `created_at`/`updated_at`.
- `verification` (0006, 0009): Entscheidung `verified` / `rejected` zu einer `field_capture`, Trigger schreibt den Status auf `field_capture` zurück. RLS: Lernende lesen eigene, AfCJ admin alles.
- Unveränderlichkeit: **kein Trigger** (CLAUDE.md Regel 7). `attendance_admin_all` und `verification_admin_all` erlauben Update und Delete.
- Lücke nebenbei: `competency_evidence` (0006) enthält Lektionen und Verifizierungen, **aber keine Anwesenheit**, obwohl SR-09 und CLAUDE.md Regel 6 die Live-Teilnahme als Nachweis nennen. Nicht Teil von Paket G, aber vor dem Pilot zu klären.
- App: Die bestätigte Anwesenheit wird schon gelesen: Stundenplan-Häkchen (`src/lib/queries/stundenplan.ts`) und „Heute frei“ (SR-79, `src/lib/home-frei.ts`, „besucht = Anwesenheit bestätigt“). Solange niemand bestätigt, zählt der Rückblick keinen Live-Termin als besucht. Nr. 7 ist damit Voraussetzung dafür, dass SR-79 sinnvoll wirkt.
- Es gibt keine Oberfläche außer der für Lernende (`src/app/(learner)`). `requireCurrentLearner` verlangt eine Einschreibung, Trainer:innen landen dort ohne Zugang.

### Vorschlag Datenmodell (Entwurf 0032_trainer_anwesenheit_pruefung.sql)

```sql
-- Hilfsfunktionen (security definer, wie fn_is_afcj_admin)
create function fn_ist_trainer() returns boolean ...
  -- exists role_assignment (person_id = auth.uid(), rolle = 'trainer')
create function fn_ist_trainer_von_session(p_live_session_id uuid) returns boolean ...
  -- live_session.trainer_id = auth.uid() and fn_ist_trainer()
create function fn_ist_trainer_von_capture(p_field_capture_id uuid) returns boolean ...
  -- field_capture -> field_job.instructor_id = auth.uid() and fn_ist_trainer()

-- attendance: Zeitpunkt der Bestätigung
alter table attendance add column bestaetigt_am timestamptz;
-- Trainer:in: lesen und anlegen für eigene Live-Termine, nur für Lernende,
-- die über schedule_entry (Kohorte/Einschreibung) an diesem Termin teilnehmen.
create policy attendance_trainer_select on attendance for select to authenticated
  using (fn_ist_trainer_von_session(live_session_id));
create policy attendance_trainer_insert on attendance for insert to authenticated
  with check (fn_ist_trainer_von_session(live_session_id)
              and bestaetigt_von = auth.uid()
              and fn_lernende_im_termin(learner_id, live_session_id));
-- kein Update/Delete für Trainer:innen

-- Lesen, was zum Prüfen nötig ist
create policy field_capture_trainer_select on field_capture for select to authenticated
  using (fn_ist_trainer_von_capture(id));
-- ebenso field_capture_antwort, field_capture_step_mapping (select)
create policy verification_trainer_select ... using (fn_ist_trainer_von_capture(field_capture_id));
create policy verification_trainer_insert on verification for insert to authenticated
  with check (fn_ist_trainer_von_capture(field_capture_id) and verifiziert_von = auth.uid());

-- Lesen der Lernenden-Namen für die Liste: nicht über person öffnen, sondern
-- fn_meine_teilnehmenden(p_live_session_id) / fn_meine_praxisberichte()
-- (security definer, nur Rufname/Name, Foto-Pfad), analog fn_meine_trainer.

-- Unveränderlichkeit (SR-07): BEFORE UPDATE OR DELETE auf attendance und
-- verification -> raise exception, für alle Rollen inkl. AfCJ admin.
-- Korrektur nur als Storno (E4), z. B. verification.storniert_verification_id
-- bzw. attendance-Zeile mit status 'nicht anwesend' + korrigiert_id (Entwurf, erst nach E4).
```

Offen in der Technik: `attendance` ist unique (learner, live_session). Mit Storno-Zeilen muss der Unique-Index fallen oder auf „nicht storniert“ beschränkt werden. Das entscheidet sich mit E4. Bis dahin reicht für Do: Insert ja, Update/Delete für alle gesperrt, Korrektur im Notfall per Migration/Skript mit Protokoll.

Die Organisations-Spalte bleibt Pflicht (Regel 1): Beim Insert setzt die App `organisation_id` aus der Einschreibung. Die Policy prüft, dass sie zur Einschreibung der Lernenden passt.

### Zugriffsregeln (Zeilen für access-matrix.md)

| Entity | AfCJ trainer (neu) |
|---|---|
| Attendance | read Own (eigene Live-Termine); write Own (nur anlegen, kein Ändern/Löschen) |
| Field capture — Status/Ergebnis und Rohinhalt/Antworten | read Own (Praxistage mit `instructor_id` = ich); write — |
| Verification | read Own; write Own (nur anlegen) |
| Trainer:in je Termin | statt „— (keine Anmeldung)“: Anmeldung mit eigenem Bereich |
| Lernende im eigenen Termin (Name, Rufname, Foto über Funktion) | read Own (nur eigene Termine); write — |

Zusätzlich für alle Rollen inkl. AfCJ admin: Attendance und Verification nach dem Anlegen **unveränderlich** (SR-07).

### Betroffene Seiten

- Neu: Bereich für Trainer:innen, z. B. `src/app/(trainer)/heute` mit eigenem Layout und Rollen-Gate (`requireCurrentTrainer`). Liste „Heute“: eigene Live-Termine mit Teilnehmenden zum Abhaken, eigene Praxistage mit offenen Berichten.
- Neu: `src/app/(trainer)/bericht/[id]`: Bericht lesen (Text, Antworten), bestätigen oder zurückgeben mit Kommentar.
- Login/Weiterleitung: `/` und `/auth/callback` leiten je nach Rolle auf `/home` (Lernende) oder `/trainer/heute`.
- Lernende: keine neue Seite. Stundenplan-Häkchen und „Heute frei“ (SR-79) zeigen ab dann echte Werte. Kurzer Text, wenn ein Termin noch nicht bestätigt ist („wird noch bestätigt“), statt leer.

### SR

SR-07 (Unveränderlichkeit), SR-03 (wer verifiziert, ändert sich), SR-09, SR-79 (Wirkung). SR fehlt: „Trainer:innen bestätigen die Anwesenheit der Lernenden an ihren eigenen Live-Terminen; eine bestätigte Anwesenheit ist danach nicht mehr änderbar.“ und „Trainer:innen prüfen die Praxisberichte zu ihren eigenen Praxistagen und bestätigen oder geben sie mit Kommentar zurück.“

### Offene Produktfragen

1. E1–E4 (oben).
2. Darf eine Trainer:in „nicht anwesend“ eintragen, oder nur „anwesend“? (Vorschlag: beides, „nicht anwesend“ ist für AZAV auch ein Nachweis.)
3. Bis wann muss bestätigt sein (am selben Tag)? Erinnerung nötig?
4. Zählt Anwesenheit künftig als Kompetenz-Nachweis (siehe Lücke `competency_evidence`)?
5. Sehen Lernende, wer sie bestätigt hat?

### Aufwand

| Teil | h |
|---|---|
| 0032 Funktionen, Policies, Spalte, Trigger Unveränderlichkeit | 3 |
| pgTAP-Tests (Trainer eigener/fremder Termin, Lernende, Admin, Update/Delete gesperrt) | 2,5 |
| Rollen-Gate, Weiterleitung, Layout Trainer | 2 |
| Seite „Heute“ mit Anwesenheit | 3 |
| Praxisberichte prüfen (Liste, Detail, Entscheidung) | 4 |
| Doku (Matrix, decisions, traceability), Probelauf Staging | 1,5 |
| **Summe** | **16** |

### PR-Zuschnitt

1. PR G1: 0032 + Tests + Matrix/decisions (Do 12 Uhr auf Staging).
2. PR G2: Rollen-Gate + Trainer „Heute“ + Anwesenheit.
3. PR G3: Praxisberichte prüfen (wahrscheinlich Übergabe).

---

## 2. Profilseite (Nr. 11)

### Heute

`person` hat: `email`, `name`, `username`, `geburtsdatum`, `geschlecht` (Pflicht, Default „keine Angabe“), `vorerfahrung`, `sprache` (DE/UK), `rufname` (0029), `foto_pfad` (0030). Bearbeitbar in der App: Foto und Rufname im Konto-Menü (`src/components/nav/profil-dialog.tsx`).

**Sicherheitslücke:** `person_self_update` gibt die ganze eigene Zeile frei (0030 erwähnt das als Grund für den Foto-Pfad-Check). Eine Lernende kann über die API also auch `email`, `name`, `username`, `geburtsdatum` ändern. `person.email` weicht dann von `auth.users.email` ab. Das sollte unabhängig von der Profilseite vor dem Pilot geschlossen werden.

### Vorschlag Datenmodell (Entwurf 0033_person_spaltenrechte.sql)

Keine neuen Felder.

```sql
revoke update on person from authenticated;
grant update (rufname, foto_pfad, vorerfahrung, sprache) on person to authenticated;
-- AfCJ admin schreibt im Dashboard (postgres/service) und ist davon nicht betroffen;
-- falls AfCJ admin künftig in der App schreibt: eigene security-definer-Funktion.
```

Achtung: Spalten-Grants gelten für alle `authenticated`, also auch für AfCJ admin in der App. Heute schreibt AfCJ admin nur im Dashboard, deshalb unkritisch. Vorher prüfen, ob `sprache` bearbeitbar sein soll, solange SR-12 verschoben ist (Vorschlag: anzeigen, nicht bearbeiten).

### Zugriffsregeln (Zeile für access-matrix.md)

| Entity | Learner |
|---|---|
| Profil (`person`) | read Own; write Own nur `rufname`, `foto_pfad`, `vorerfahrung` (Name, E-Mail, Benutzername, Geburtsdatum, Geschlecht nur AfCJ admin) |

### Betroffene Seiten

`src/app/(learner)/profil` (neu): Name, E-Mail (nur lesen), Rufname, Foto, Vorerfahrung, Programm/Kohorte/Betrieb (nur lesen); der bestehende Profil-Dialog bleibt für schnelles Foto/Rufname oder verlinkt auf die Seite. Konto-Menü bekommt den Eintrag „Profil“.

### SR

SR-48 (Basisfelder), SR-77 (Foto), SR-12 (Sprache, verschoben). SR fehlt: „Lernende sehen ihr Profil auf einer eigenen Seite und können Rufname, Foto und Vorerfahrung selbst ändern; Name, E-Mail und Geburtsdatum ändert nur AfCJ admin.“

### Offene Produktfragen

1. Welche Felder sehen Lernende überhaupt (Geburtsdatum, Geschlecht)?
2. Vorerfahrung bearbeitbar oder nur bei Anlage durch AfCJ?
3. Wie beantragt eine Lernende eine Änderung von Name/E-Mail (Kontaktweg, siehe 5)?

### Aufwand und PR-Zuschnitt

0033 + Test 1,5 h (PR G4, sollte bis Do auf Staging), Profilseite 3 h (PR G5, Übergabe falls Do knapp). Summe 4,5 h.

---

## 3. Kohortensicht (Nr. 6)

### Heute

SR-30 („Learner können andere Mitglieder ihrer Kohorte mit Namen und Profilbild einsehen“) ist offen. `person` ist für Lernende auf die eigene Zeile beschränkt; 0030 gibt Fotos anderer Lernender ausdrücklich nicht frei („hängt an Nr. 6“). Kohorten können Lernende mehrerer Arbeitgeber enthalten (`decisions.md` 07.10., Ausnahme von SR-06 nur für den Fragen-Thread).

**Ergänzung Vera 13.10.:** Kohorten sind derzeit nie organisationsübergreifend gemischt. `fn_meine_kohorte()` trotzdem auf **gleiche Kohorte und gleiche `organisation_id`** beschränken (Schutz für später). Priorität: nach G1, G4, G2; nur bauen, wenn Do nach G2 Zeit ist.

### Vorschlag Datenmodell (Entwurf 0034_kohortensicht.sql)

```sql
-- optional, falls Einwilligung/Abwahl gewünscht (Produktfrage 1):
alter table person add column in_kohorte_sichtbar boolean not null default true;

create function fn_meine_kohorte()
returns table (person_id uuid, anzeigename text, foto_pfad text)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(p.rufname, split_part(p.name, ' ', 1)) || ' ' || left(split_part(p.name, ' ', 2), 1) || '.',
         case when p.in_kohorte_sichtbar then p.foto_pfad end
    from enrolment e
    join person p on p.id = e.learner_id
   where e.cohort_id in (select fn_current_cohort_ids())
     and e.organisation_id in (select om.organisation_id from org_membership om
                                where om.person_id = auth.uid())   -- gleiche Organisation (Ergänzung 13.10.)
     and e.status in ('aktiv', 'abgeschlossen')
     and p.id <> auth.uid()
     and p.in_kohorte_sichtbar;
$$;
-- fn_darf_foto_sehen um "Foto eines Mitglieds der eigenen Kohorte" erweitern.
```

Keine Lockerung der `person`-Policy: E-Mail, Geburtsdatum, Arbeitgeber bleiben verborgen. Anzeigename wie im Fragen-Thread (Rufname + Initial), damit es einheitlich ist.

### Zugriffsregeln (Zeile für access-matrix.md)

| Entity | Learner |
|---|---|
| Kohortenmitglieder (Anzeigename, Foto über `fn_meine_kohorte`) | read Cohort (nur aktive/abgeschlossene Einschreibungen der eigenen Kohorte, ohne E-Mail, Arbeitgeber, Geburtsdatum); write — |

### Datenschutz-Folgen

- Kohorten über Arbeitgeber hinweg: durch die Beschränkung auf die eigene Organisation ausgeschlossen (Ergänzung 13.10.), keine Ausnahme von SR-06 nötig.
- Fotos anderer Lernender sind neu sichtbar: Datenschutzerklärung (Abschnitt Profilfotos) anpassen; Einwilligung bzw. Abwahl (`in_kohorte_sichtbar`) ist sinnvoll, weil Fotos freiwillig sind.
- Abgebrochene Einschreibungen nicht anzeigen (Status `abgebrochen` ausgenommen).
- Löschpfad (Audit 30.09.): Beim Löschen eines Kontos verschwindet die Person aus der Sicht automatisch; Foto-Datei bleibt (bekannte Lücke).

### Betroffene Seiten

Programmseite (Kohorte heute nur mit Namen, `traceability.md` SR-14) oder eigener Bereich „Meine Kohorte“; Home optional (Anzahl).

### SR

SR-30.

### Offene Produktfragen

1. Anzahl allein, Namen, oder Namen und Fotos? Abwahl möglich?
2. Arbeitgeber anzeigen (nein, Vorschlag)?
3. Sehen Trainer:innen die Kohortensicht auch (dann über Punkt 1)?

### Aufwand und PR-Zuschnitt

0034 + Tests 2,5 h (PR G6), Oberfläche 2 h (PR G7). Summe 4,5 h. Nur bis Do, wenn Frage 1 und die Datenschutzfolgen Mi früh entschieden sind; sonst Übergabe.

---

## 4. Glocke (Nr. 11)

### Variante A: abgeleitete Hinweise, keine eigene Tabelle

Hinweise werden beim Öffnen der Seite aus vorhandenen Daten berechnet:

| Hinweis | Quelle |
|---|---|
| Neuer Termin morgen / Änderung am Plan | `schedule_entry` + `live_session` für morgen (Berliner Zeit über `src/lib/date.ts`) |
| Antwort auf meinen Beitrag im Fragen-Thread | `lektion_beitrag` mit `parent_id` auf eigenen Beitrag, `created_at` > zuletzt gesehen |
| Praxisbericht geprüft | `verification` zu eigener `field_capture`, `verifiziert_am` > zuletzt gesehen |

„Zuletzt gesehen“: entweder nur im Browser (`localStorage`, keine Migration, je Gerät) oder eine Spalte `person.glocke_gesehen_am timestamptz` (Mini-Migration 0035, über die Spalten-Grants aus 0033 freigeben). Vorschlag: Spalte, weil Lernende Handy und Rechner nutzen.

Keine Echtzeit; Aktualisierung beim Seitenwechsel. Kein E-Mail-Versand.

Aufwand: 5 h (Abfrage-Funktion 2 h, Glocke + Liste 2 h, Test 1 h), mit Spalte +1 h.

### Variante B: eigene Tabelle `benachrichtigung`

`benachrichtigung (id, organisation_id, person_id, art, bezug_tabelle, bezug_id, text, erstellt_am, gelesen_am)`, Einträge per Trigger (neue Antwort, Verifizierung, geänderter Termin), RLS read/update Own (nur `gelesen_am`). Vorteil: gelesen je Hinweis, Grundlage für späteren E-Mail-/Push-Versand. Nachteil: Trigger an mehreren Tabellen, Datenmenge, Löschpfad.

Aufwand: 10–12 h inkl. Tests.

### Zugriffsregeln

Variante A: keine neue Zeile (liest nur Eigenes über bestehende Policies; Antworten im Thread über Policy „Fragen-Thread“). Variante B: neue Zeile „Benachrichtigung: Learner read Own; write Own (nur gelesen_am); AfCJ admin read All“.

### SR

SR fehlt: „Lernende sehen in einer Glocke neue Hinweise zu ihrem Plan, Antworten im Fragen-Thread und geprüften Praxisberichten.“

### Offene Produktfragen

Welche Hinweise genau; „gelesen“ je Hinweis oder „alles gesehen“; später E-Mail?

### PR-Zuschnitt

Ein PR (G8), Variante A. Übergabe.

---

## 5. Lernbegleitung als zweite Rolle (Teil Nr. 5) und Kontaktweg

Nur Optionen, keine Empfehlung zum Bauen vor dem Release.

**Lernbegleitung**

- Option a: vorhandene Spalte `enrolment.instructor_id` (heute leer, „Prototyp: leer“) nutzen und Rolle `lernbegleitung` in `role_assignment` ergänzen. Klein, aber eine Person je Einschreibung.
- Option b: Tabelle `kohorte_begleitung (cohort_id, person_id)` analog `kohorte_moderation` (0024). Eine Begleitung je Kohorte, mehrere möglich.
- Option c: Rolle `trainer` wiederverwenden, Unterscheidung nur in der Anzeige. Einfach, vermischt aber Rechte (Punkt 1 gibt Trainer:innen Prüfrechte).
- Zugriffe: Spalte „Instructor / Team Lead“ der Matrix passt am ehesten (read Cohort). Erst nach Entscheidung festlegen.

**Kontaktweg zu Ansprechpersonen**

- Option a: E-Mail-Adresse der Ansprechperson über eine Funktion wie `fn_meine_trainer` zusätzlich ausgeben (Einwilligung nötig).
- Option b: zentrale Adresse/Telefon von AfCJ (keine Personendaten, sofort möglich, kein Code außer Text).
- Option c: Fragen-Thread oder privates Nachrichtenformat (neues Feature, groß).

SR fehlt: „Lernende sehen ihre Lernbegleitung und einen Kontaktweg zu ihren Ansprechpersonen.“ SR-44 (eigene Rollen) ist „Later“.

Aufwand je nach Option 2–12 h. Übergabe.

---

## Ablauf Mi/Do (Vorschlag)

| Wann | Was |
|---|---|
| Mi früh | Entscheidungen E1–E4, Profil-Felder, Kohortensicht ja/nein |
| Mi | Import Paket C (ca. 2 h); PR G1 (0032 + Tests); PR G4 (0033 + Test) |
| Do bis 12 Uhr | 0032 und 0033 Probelauf und Anwendung auf Staging (je mit Freigabe); PR G2 Trainer „Heute“ + Anwesenheit |
| Do bis 16 Uhr | Puffer; ggf. 0034 Kohortensicht, wenn entschieden |
| Übergabe | G3 Praxisberichte prüfen, G5 Profilseite, G6/G7 Kohortensicht (falls Do keine Zeit), G8 Glocke, Lernbegleitung/Kontakt |

## Übergabe: Prüfpunkte

- **Datenschutzerklärung (E1/E2):** Trainer:innen melden sich an und sehen Anwesenheit und Praxisberichte (Text, Antworten, Status) der Lernenden ihrer Kohorte, dazu Name und Rufname. Abschnitt zu Trainer:innen und Profilfotos entsprechend ergänzen, vor dem Production-Release von 0032.
- Trainer-Konten auf Production mit echten Adressen (siehe Paket C, `trainer-production.csv`).
- Fotos der Lernenden für Trainer:innen und „Unit progress read Cohort“ sind in 0032 bewusst nicht umgesetzt.
- Löschweg (DSGVO): Delete auf `attendance`/`verification` bleibt bis dahin AfCJ admin vorbehalten.
- **Praxisblock als Ganzes (Termin 13.11.2026, 4–6 h):** Migration `field_job.bis_datum` (Praxistag über einen Zeitraum), Block-Anzeige in Stundenplan, Home und `/trainer` („Praxisblock 16.–24.11.“ mit den offenen Aufträgen an jedem Tag des Zeitraums). Entscheidung Vera 14.10.: jetzt keine Migration; auf Staging bleibt die vorläufige Verteilung (2 Aufträge je Tag, als VORLÄUFIG gekennzeichnet), Production läuft mit `--ohne-praxis II`, bis Maltes Tagesplanung oder die Block-Anzeige da ist.
- **Bekannte Lücke G3 (SR-82): Neu-Einreichen nach Rückgabe.** Lernende können einen zurückgegebenen Praxisbericht nicht neu einreichen (`field_capture` eindeutig je Praxistag und Phase; App bietet kein Bearbeiten; Status ändert sich nur durch eine neue Verifizierung). AfCJ admin kann in der App nichts zurücksetzen (keine Oberfläche; Löschen einer Verifizierung setzt den Status nicht zurück, `field_capture` nicht schreibbar). Notlösung nur im Dashboard (Bericht löschen), widerspricht aber SR-07. Lösung gehört in den Praxisflow-Realbau (Phase „überarbeitet“ oder neue Einreichung als eigener Eintrag). PR #112.
- **Neu-Einreichen nach Rückgabe (Termin 13.11.2026, 12–17 h, Migration nötig).** Schließt die bekannte Lücke aus G3. „Zurückgeben“ bleibt bis dahin aktiv (Entscheidung Vera 14.10.); die Plattform wird erst ab Modul II genutzt (Theorie ab 02.11., Praxis ab 16.11.).
  - *Ansatz (empfohlen):* Neue Einreichung als **neue Zeile**, nicht als Änderung. `field_capture.ersetzt_id` zeigt auf den zurückgegebenen Bericht; die Eindeutigkeit „ein Abschluss je Praxistag“ wird zu „ein nicht ersetzter Abschluss je Praxistag“. Einreichen über eine RPC (security definer, eine Transaktion für Bericht und Antworten; behebt nebenbei die nicht-atomaren zwei Inserts aus `praxistag/actions.ts`), erlaubt nur der eigenen Person und nur, wenn die aktuelle Entscheidung „zurückgegeben“ ist.
  - *Historie (SR-07):* Alter Bericht, Antworten und Verifizierungen bleiben unverändert stehen; nichts wird geändert oder gelöscht. Nachweis zählt nur über die aktuelle Freigabe des neuesten Berichts (wie heute über `verification_aktuell`).
  - *Migration:* ja (nächste freie Nummer, mit dem Praxisblock abstimmen): Spalte `ersetzt_id`, Ersatz des Unique-Constraints, RPC, Policy/Grant, pgTAP-Test.
  - *Aufwand:* Migration, RPC, RLS, pgTAP 4–5 h; Lernenden-Seite „Überarbeiten und erneut einreichen“ (Kommentar sichtbar, Text und Antworten vorbelegt) 3–4 h; Trainer-Seite (neueste Fassung prüfen, frühere Fassungen im Verlauf) 2–3 h; Abfragen auf „neueste Fassung“ umstellen 1–2 h; Doku (Matrix, Datenmodell, decisions, Traceability, SR) 1 h; Tests und Preview 1–2 h. **Summe 12–17 h.**
  - *Betroffene Dateien:* neue Migration und `supabase/tests/database/024_…`, `src/app/(learner)/praxistag/[fieldJobId]/actions.ts` und `praxistag-flow.tsx`, `src/lib/queries/praxistag.ts`, `src/lib/praxistag-shared.ts`, `src/lib/queries/trainer-berichte.ts`, `src/app/(trainer)/trainer/berichte/page.tsx` und `[id]/page.tsx`, `src/lib/praxisbericht.ts` (+ Test), `src/lib/database.types.ts`, `docs/access-matrix.md`, `docs/data-model.md`, `docs/decisions.md`, `docs/traceability.md`.
  - *Nicht empfohlen:* Bericht in place bearbeiten und Status zurücksetzen – überschreibt, was zurückgegeben wurde (Konflikt mit SR-07) und braucht trotzdem eine Migration für den Status.
- **Trainer:innen im Team (Entscheidung 14.10.):** kein Team-Eintrag „Simon & Tom“, eine Trainer:in je Termin; die 22 Termine mit „Simon & Tom“ (Modul I Woche 4–5, Modul II Praxis und Coaching) bekommen Simon. Aufteilung legt Malte fest. Tom hat damit keinen eigenen Termin und sieht in `/trainer` keine Kohorte (Rechte nach E3).

Risiken: Ohne E1/E2 kein G1. Trainer-Login auf Production braucht echte Konten (Paket C) und Prüfung der Datenschutzerklärung vor Fr. Lokale pgTAP-Tests laufen nicht (kein Docker); Tests nur über Probelauf auf Staging.
