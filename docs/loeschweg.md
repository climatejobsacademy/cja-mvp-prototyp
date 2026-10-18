# Löschweg: Daten einer Person löschen (manuell)

Stand 18.10.2026 · Ablauf für den Pilot, Entscheidungen Anna 18.10. (siehe unten); keine rechtliche Prüfung. Gilt für Lernende und Trainer:innen, bis die Löschung automatisiert ist (siehe `docs/datenschutz-offene-punkte.md`, Punkt 3, und Abschnitt „Speicherdauer“ in `src/app/(rechtliches)/datenschutz/page.tsx`).

**Grundregel für jeden Schritt:** Erst auf Staging (Irland, `keijrwvegmwgpvprpoxa`) mit einer Testperson üben. Auf Production (Frankfurt, `vqfnmkcfjsudsujiuoqm`) wird nur gelesen oder geändert, wenn es vorher ausdrücklich freigegeben wurde. **Production-Änderungen laufen nur nach ausdrücklicher Freigabe.**

## Entscheidungen für den Pilot (Anna, 18.10.2026)

- **Freigabe:** Anna gibt jede Löschung frei. Ausgeführt wird im Production-Ordner (`cja-mvp-prototyp-release`) mit Claude, mit Probelauf und STOPP. Login-Konto und Profilfoto löschen Anna, Malte oder Vera im Supabase-Dashboard.
- **Nachweise (E1): Fall für Fall.** Gibt es Anwesenheit, Praxisberichte oder Prüfungen, wird nicht sofort gelöscht. Anna klärt innerhalb der Monatsfrist, ob eine Aufbewahrungspflicht (AZAV) besteht, und entscheidet dann.
- **Chat und Fragen-Thread (E4):** Anonymisieren reicht (Text und Name weg, Hinweis „gelöscht“ bleibt).
- **Backups (E5):** bis zu sieben Tage, steht so in der Datenschutzerklärung.
- **Nach dem Start:** Trainer-Konten mit bestätigter Anwesenheit oder Prüfungen (E2, braucht eine Migration), Verweise auf Trainer:innen (E3), Automatisierung (E7).

## Kurz erklärt

- Fast alles hängt an der Tabelle `person`, und `person` hängt am Login-Konto (`auth.users`). Löscht man das Konto, löscht die Datenbank die meisten Daten der Person automatisch mit („Kaskade“).
- Drei Dinge passieren **nicht** automatisch: (1) Dateien im Speicher (Profilfoto) bleiben liegen. (2) Wo die Person als Trainer:in, Prüfer:in oder Hochladende eingetragen ist, **blockiert** die Datenbank das Löschen. (3) Ob Anwesenheit und Prüfungen gelöscht werden dürfen, ist nicht entschieden (Aufbewahrungspflicht).
- Chat-Nachrichten und Fragen im Fragen-Thread werden beim Löschen des Kontos **anonymisiert**: Text und Name werden geleert, die Zeile bleibt als „gelöscht“ stehen, Antworten anderer bleiben. Belegt durch Trigger in `0024_lektion_beitrag.sql` und `0050_kohorten_chat.sql`, getestet in `supabase/tests/database/013_lektion_beitrag.test.sql` und `024_kohorten_chat.test.sql`.

## Ablauf

1. **Anfrage annehmen und dokumentieren.** Eingang mit Datum notieren, Frist (ein Monat) ausrechnen und eine Vorgangsnummer vergeben. Name, E-Mail und Inhalt der Anfrage bleiben im Postfach bzw. an einem geschützten Ort; in Notion, GitHub, Slack, Claude oder Tickets steht nur die Vorgangsnummer. *Freigabe: keine nötig, nichts in der Datenbank.*

2. **Identität prüfen.** Antwort nur an die E-Mail-Adresse, die im Konto hinterlegt ist; im Zweifel kurz zurückfragen. Klären: Ist die Person Lernende, Trainer:in oder beides? Trainer:innen haben laut `0030_trainer_profilfotos.sql` ein **eigenes** Konto, getrennt von einem Lernenden-Konto derselben Person — also beide Konten suchen. *Freigabe: Nachschauen in Production ist schon ein Zugriff — nur nach ausdrücklicher Freigabe.*

3. **Lesender Bestandscheck.** Mit der `person_id` (= Konto-ID) zählen, welche Zeilen es gibt (SQL-Gerüst A unten, nur `select`). Ergebnis nur als Zahlen festhalten, ohne Inhalte. Wichtig ist vor allem: Gibt es Zeilen, die das Löschen blockieren (Tabelle unten, Spalte „blockiert“)? Gibt es Anwesenheit oder Prüfungen? *Probelauf auf Staging; auf Production nur nach ausdrücklicher Freigabe.*

4. **Entscheidung einholen.** Wenn Anwesenheit, Praxisberichte oder Prüfungen vorhanden sind, entscheidet Anna (nicht die Technik) innerhalb der Monatsfrist, ob gelöscht, anonymisiert oder für die Aufbewahrungsfrist gesperrt wird (E1, Fall für Fall). Ohne diese Entscheidung nicht weitermachen.

5. **Blockaden lösen (nur bei Trainer:innen, Team, Admins).** Einträge, die auf die Person zeigen und nicht automatisch geleert werden, vorher auf „leer“ setzen — z. B. Trainer:in am Termin (`live_session.trainer_id`). Bei `attendance.bestaetigt_von` und `verification.verifiziert_von` geht das **nicht**, weil diese Zeilen unveränderlich sind (Trigger `unveraenderlich`, `0032`). Dann stoppen und Punkt E2 entscheiden. *Probelauf auf Staging, auf Production nur nach ausdrücklicher Freigabe.*

6. **Dateien im Speicher löschen.** Im Bucket `profilfotos` den Ordner `<person_id>/` leeren (Supabase-Dashboard → Storage). Das Löschen der Zeile entfernt die Datei nicht (bekannte Lücke). Weitere Buckets mit Personendaten gibt es derzeit nicht (`field_capture.media` ist laut `0006` „inaktiv“, es gibt keinen Bucket für Praxisfotos). Mit dem Praxisflow (ab 16.11.) kommt ein Bucket hinzu — dann diesen Schritt ergänzen. *Erst auf Staging üben; auf Production nur nach ausdrücklicher Freigabe.*

7. **Auth-Konto löschen.** Im Dashboard unter Authentication → Users das Konto löschen. Das braucht Admin-Rechte (wie `service_role`). Danach löscht bzw. anonymisiert die Datenbank alles laut Tabelle unten. Schlägt das Löschen fehl, gibt es noch eine Blockade (zurück zu Schritt 5) — nichts erzwingen. *Probelauf auf Staging mit Testperson; Production nur nach ausdrücklicher Freigabe.*

8. **Prüfen.** Bestandscheck (Gerüst A) noch einmal laufen lassen: Alle Zahlen müssen 0 sein, außer Chat- und Thread-Zeilen, die jetzt ohne Person und ohne Text dastehen. Den Speicherordner noch einmal ansehen. Ergebnis als Zahlen zur Vorgangsnummer notieren. *Nur lesen; auf Production nur nach ausdrücklicher Freigabe.*

9. **Antwort an die Person.** Kurz bestätigen, was gelöscht wurde, was anonymisiert ist (Chat, Fragen) und was — falls entschieden — wegen Aufbewahrungspflicht bis wann gesperrt bleibt, mit Grund. Hinweis auf Backups (bis zu sieben Tage). *Freigabe des Antworttexts durch Anna.*

10. **Frist.** Spätestens einen Monat nach Eingang (Art. 12 Abs. 3 DSGVO). Verlängern geht nur mit Begründung und Mitteilung an die Person innerhalb des ersten Monats. Den Vorgang danach schließen; die Notiz enthält nur Vorgangsnummer, Daten und Zahlen.

## Tabellen mit Bezug zu einer Person

„Kaskade“ = wird automatisch mitgelöscht. „Leeren“ = Verweis wird automatisch auf leer gesetzt. „Blockiert“ = Löschen des Kontos schlägt fehl, solange hier ein Verweis steht (Regel NO ACTION oder RESTRICT).

| Tabelle | was drin ist | was beim Löschen passiert (Beleg) | Vorgehen |
|---|---|---|---|
| `auth.users` | Login-Konto, E-Mail | Ausgangspunkt; Supabase entfernt eigene Auth-Daten mit | Schritt 7 |
| `person` | Name, E-Mail, Benutzername, Geburtsdatum, Geschlecht, Vorerfahrung, Sprache, Rufname, Fotopfad | Kaskade von `auth.users` (`0002`, `0029`, `0030`) | automatisch |
| `org_membership`, `role_assignment` | Zugehörigkeit zum Betrieb, Rolle | Kaskade (`0002`) | automatisch |
| `enrolment` | Einschreibung in eine Kohorte | `learner_id`: Kaskade; `instructor_id`: **blockiert** (`0005`) | Lernende automatisch; als Begleitung vorher leeren |
| `schedule_entry` | persönliche Plan-Einträge (Praxistage) | Kaskade über `enrolment` bzw. `field_job` (`0005`) | automatisch |
| `unit_progress` | Lernfortschritt je Lektion | Kaskade (`0006`) | automatisch; fließt in Nachweise (E1) |
| `attendance` | Anwesenheit je Termin | `learner_id`: Kaskade; `bestaetigt_von`: **blockiert** und unveränderlich (`0006`, `0032`) | E1 und E2 entscheiden |
| `field_job` | Praxistage | `learner_id`: Kaskade; `instructor_id`: **blockiert** (`0005`); kein Verweis auf die Einschreibung | als Begleitung vorher leeren (E3) |
| `field_capture`, `field_capture_antwort`, `field_capture_step_mapping` | Praxisberichte, Antworten, Teilschritte | Kaskade über Person bzw. `field_job` (`0006`, `0011`) | automatisch; E1 |
| `verification` | Prüfentscheidung zum Praxisbericht | über den Bericht: Kaskade; `verifiziert_von`: **blockiert**, Pflichtfeld, unveränderlich (`0006`, `0032`) | E1 und E2 entscheiden |
| `competency_evidence`, `competency_fulfilment` | Kompetenzprofil (nur Ansichten, keine Tabellen) | verschwindet mit den Quellzeilen (`0006`, `0032`) | nichts zu tun |
| `live_session` | Termin mit Trainer:in | `trainer_id`: **blockiert** (`0005`) | vorher leeren (E3) |
| `kohorte_moderation` | wer eine Kohorte moderiert | `person_id`: Kaskade; `created_by`: leeren (`0024`) | automatisch |
| `lektion_beitrag` | Fragen und Antworten im Thread | `person_id`: leeren, Trigger leert Text und Anzeigename (`0024`) | automatisch anonymisiert; E4 |
| `moderationsprotokoll` | wer welchen Beitrag gelöscht hat (ohne Text) | leeren (`0024`) | automatisch |
| `chat_nachricht` | Kohorten-Chat | `person_id`: leeren, Trigger leert Text und Anzeigename (`0050`) | automatisch anonymisiert; E4 |
| `chat_gelesen` | Gelesen-Stand | Kaskade (`0050`) | automatisch |
| `chat_meldung` | Meldungen von Nachrichten | `person_id`, `erledigt_von`: leeren (`0050`) | automatisch |
| `chat_moderationsprotokoll` | wer welche Nachricht gelöscht hat | leeren (`0050`) | automatisch |
| `file_asset` | hochgeladene Dateien (Team) | `hochgeladen_von`: **blockiert** (`0003`) | nur Team/Admin: vorher leeren |
| `knowledge_source` | freigegebene Wissensquellen | `freigegeben_von`: **blockiert** (`0007`) | nur Team/Admin: vorher leeren |
| Storage `profilfotos` | Profilfoto, Ordner `<person_id>/` | bleibt liegen (Storage kaskadiert nicht, `0030`) | Schritt 6, von Hand |

Nicht personenbezogen: Buckets `scorm-packages`, `lesson-resources`, `fachsprache-bilder` und das Organisationslogo (`0016`, `0023`, `0051`, `0025`). Die Prüf-Spalten in `fachsprache_einheit` (`restrict`) sind mit `0053` entfernt.

## Hintergrund zu den Entscheidungen

- **E1 – Aufbewahrung vs. Löschung von Nachweisen.** Löscht man das Konto, löscht die Datenbank Anwesenheit, Fortschritt, Praxisberichte und Prüfungen der Lernenden sofort mit. CLAUDE.md Regel 7 und SR-07 verlangen, diese als unveränderlich zu behandeln; Storno hält den Verlauf „für AZAV-Prüfungen“ fest (`docs/decisions.md`, E4). Ob eine förderrechtliche Aufbewahrungspflicht (AZAV, Bildungsgutschein) die Löschung aufschiebt, ist rechtlich ungeklärt (`docs/open-questions.md`, „Löschprotokoll DSGVO vs. AZAV“). Mögliche Wege: sofort löschen · Konto sperren und Nachweise bis Fristende behalten · Anonymisieren statt Löschen. **Entscheidet die verantwortliche Person mit Beratung, nicht die Technik.**
- **E2 – Trainer:innen mit bestätigter Anwesenheit oder Prüfungen.** Ihr Konto lässt sich nicht löschen, solange sie in `attendance.bestaetigt_von` oder `verification.verifiziert_von` stehen; leeren geht wegen der Unveränderlichkeit nicht, und die Zeilen zu löschen würde Nachweise anderer Personen zerstören. Braucht eine Entscheidung und danach eine Migration (z. B. Platzhalter „ehemalige Trainer:in“ oder Anonymisierung).
- **E3 – Verweise auf Trainer:innen leeren.** Ist es in Ordnung, `live_session.trainer_id`, `field_job.instructor_id` und `enrolment.instructor_id` zu leeren (dann fehlt die Angabe, wer den Termin geleitet hat)? Dauerhafte Lösung wäre eine Migration auf „leeren beim Löschen“ — dafür braucht es eine SR-Nummer. Außerdem: Praxistage hängen nicht an der Einschreibung; wird nur die Einschreibung gelöscht, bleiben sie verwaist.
- **E4 – Anonymisierte Chat- und Thread-Zeilen.** Bleiben als leere „gelöscht“-Zeilen stehen, damit Antworten anderer erhalten bleiben. Reicht das, oder sollen sie hart gelöscht werden? Zu bedenken: Antworten anderer können die Person namentlich erwähnen; das erfasst die Anonymisierung nicht.
- **E5 – Backups und Protokolle.** Supabase-Backups und Anbieter-Protokolle (Auth, Hosting) enthalten die Daten noch eine Zeit lang. Wie lange, und was sagen wir der Person dazu?
- **E6 – Wer führt aus, wer gibt frei.** Name der Rolle, die löscht (braucht Admin-Rechte), und der Rolle, die freigibt; Vier-Augen-Prinzip ja/nein.
- **E7 – Automatisierung.** Eine Löschfunktion, die Speicher, Blockaden und Konto in einem Schritt erledigt, steht noch aus (Punkt 3 der offenen Punkte). SR folgt.

## SQL-Gerüst (Vorschlag, **ungetestet**, nicht ausführen ohne Freigabe)

`:pid` steht für die Konto-ID. Gerüst A liest nur. Gerüst B ändert Daten — nur auf Staging üben, auf Production nur nach ausdrücklicher Freigabe und nach Entscheidung E1–E3.

```sql
-- A) Bestandscheck, nur lesen (UNGETESTET)
select 'person' t, count(*) from person where id = :pid
union all select 'org_membership', count(*) from org_membership where person_id = :pid
union all select 'role_assignment', count(*) from role_assignment where person_id = :pid
union all select 'enrolment (lernend)', count(*) from enrolment where learner_id = :pid
union all select 'enrolment (begleitend) BLOCKIERT', count(*) from enrolment where instructor_id = :pid
union all select 'unit_progress', count(*) from unit_progress where learner_id = :pid
union all select 'attendance (lernend)', count(*) from attendance where learner_id = :pid
union all select 'attendance (bestaetigt) BLOCKIERT', count(*) from attendance where bestaetigt_von = :pid
union all select 'field_job (lernend)', count(*) from field_job where learner_id = :pid
union all select 'field_job (begleitend) BLOCKIERT', count(*) from field_job where instructor_id = :pid
union all select 'field_capture', count(*) from field_capture where learner_id = :pid
union all select 'verification (eigene Berichte)', count(*) from verification v join field_capture fc on fc.id = v.field_capture_id where fc.learner_id = :pid
union all select 'verification (geprueft) BLOCKIERT', count(*) from verification where verifiziert_von = :pid
union all select 'live_session BLOCKIERT', count(*) from live_session where trainer_id = :pid
union all select 'file_asset BLOCKIERT', count(*) from file_asset where hochgeladen_von = :pid
union all select 'knowledge_source BLOCKIERT', count(*) from knowledge_source where freigegeben_von = :pid
union all select 'kohorte_moderation', count(*) from kohorte_moderation where person_id = :pid
union all select 'lektion_beitrag', count(*) from lektion_beitrag where person_id = :pid
union all select 'chat_nachricht', count(*) from chat_nachricht where person_id = :pid
union all select 'chat_gelesen', count(*) from chat_gelesen where person_id = :pid
union all select 'chat_meldung', count(*) from chat_meldung where person_id = :pid or erledigt_von = :pid
union all select 'profilfotos (Dateien)', count(*) from storage.objects where bucket_id = 'profilfotos' and (storage.foldername(name))[1] = :pid::text;

-- B) Blockaden lösen, nur nach Entscheidung E3 (UNGETESTET)
begin;
update live_session set trainer_id = null where trainer_id = :pid;
update field_job   set instructor_id = null where instructor_id = :pid;
update enrolment   set instructor_id = null where instructor_id = :pid;
update file_asset  set hochgeladen_von = null where hochgeladen_von = :pid;
update knowledge_source set freigegeben_von = null where freigegeben_von = :pid;
-- attendance.bestaetigt_von / verification.verifiziert_von: NICHT änderbar (E2)
rollback;  -- erst nach Freigabe durch commit ersetzen
```

Profilfoto und Konto werden über das Dashboard gelöscht (Schritte 6 und 7), nicht per SQL.
