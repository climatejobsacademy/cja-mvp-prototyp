# Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO): Lernplattform

Stand 18.10.2026 · **Entwurf** (Anna mit Claude), keine rechtliche Prüfung. Abgeleitet aus `docs/data-model.md`, `docs/access-matrix.md`, der Datenschutzerklärung (`src/app/(rechtliches)/datenschutz/page.tsx`), `docs/loeschweg.md` und `docs/runbook.md`.

Gilt für die Lernplattform learn.climatejobsacademy.com (Production, Supabase Frankfurt). Staging enthält keine echten Personen und ist nicht Teil des Verzeichnisses. Werkzeuge rund um den Pilot (Microsoft Teams, Google Drive) stehen vorläufig unter 9 und 10. Andere Verarbeitungen der Akademie (z. B. Buchhaltung, Bewerbungen) gehören in ein Gesamtverzeichnis, siehe „Offen“.

## Allgemeine Angaben (gelten für jede der folgenden Tätigkeiten)

| Angabe | Inhalt |
|---|---|
| Verantwortliche Stelle | Akademie für Klimajobs UG (haftungsbeschränkt), Kochstraße 42, 04275 Leipzig, vertreten durch die Geschäftsführerin Anna Sauter-Getschmann, info@climatejobsacademy.com |
| Gemeinsam Verantwortliche | keine für die Plattform; für Microsoft Teams ggf. der Partner Energiehelden (Art. 26 DSGVO, zu klären, siehe Tätigkeit 9) |
| Datenschutzbeauftragte:r | keine:r benannt; nicht verpflichtend, weil weniger als 20 Personen ständig mit der Verarbeitung personenbezogener Daten beschäftigt sind (§ 38 BDSG, Bestätigung Anna 18.10.2026) |
| Auftragsverarbeiter (Art. 28 DSGVO) | Supabase (Datenbank, Login, Dateispeicher; Server in der EU, Frankfurt; Vertragspartei laut aktuellem DPA prüfen: Supabase, Inc., USA, bzw. Supabase Pte. Ltd.), Vercel Inc., USA (Hosting; Funktionen in Frankfurt, weltweites Netzwerk), Brevo GmbH, Berlin (Versand der Login-Mails; EU-Rechenzentren, Unterauftragsverarbeiter z. B. Cloudflare) |
| Drittlandübermittlung (Art. 30 Abs. 1 lit. e) | **Vercel Inc. (USA):** zertifiziert nach dem EU-US Data Privacy Framework, also Angemessenheitsbeschluss (Art. 45 DSGVO); zusätzlich Standardvertragsklauseln im DPA. **Supabase:** Daten auf Servern in Frankfurt; mögliche Zugriffe aus dem Drittland abgesichert über Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO, Durchführungsbeschluss (EU) 2021/914) im DPA; eine eigene Risikoanalyse (Transfer Impact Assessment) liegt nicht vor (offen). **Unterauftragsverarbeiter von Brevo:** Standardvertragsklauseln bzw. Data Privacy Framework laut Brevo. |
| Technische und organisatorische Maßnahmen | siehe Abschnitt „TOM“ am Ende |

## Tätigkeiten

### 1. Nutzerkonto und Anmeldung

- **Zweck:** Zugang zur Lernplattform, Zuordnung zu Betrieb, Rolle und Kohorte.
- **Betroffene:** Lernende, Trainer:innen, Team der Akademie.
- **Daten:** E-Mail-Adresse, Name, Rufname, Benutzername, Rolle, Organisation (Betrieb), Zeitpunkte der Anmeldung; soweit erfasst Geburtsdatum, Geschlecht, Vorerfahrung, Sprache.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Team der Akademie (Admin); Auftragsverarbeiter Supabase.
- **Löschfrist:** solange das Konto besteht und der Zweck der Qualifizierung es erfordert; Löschung auf Anfrage innerhalb eines Monats (`docs/loeschweg.md`), soweit keine Aufbewahrungspflicht entgegensteht.

### 2. Login-Mails

- **Zweck:** Versand des Anmeldelinks (Magic Link).
- **Betroffene:** alle Nutzer:innen.
- **Daten:** E-Mail-Adresse, Versanddaten (Zeitpunkt, Betreff, Zustellstatus); Öffnungen und Klicks nur anonymisiert.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Auftragsverarbeiter Brevo (über Supabase).
- **Löschfrist:** Versandprotokolle bei Brevo 1 Monat, keine Inhaltsvorschauen (Einstellung geprüft 18.10.2026).

### 3. Qualifizierung: Stundenplan, Lernfortschritt, Anwesenheit, Nachweise

- **Zweck:** Durchführung und Nachweis der Qualifizierung (Live-Lektionen, Selbstlernen, Praxistage, Kompetenzprofil).
- **Betroffene:** Lernende; Trainer:innen (als Leitende von Terminen und bei bestätigter Anwesenheit oder Prüfung).
- **Daten:** Einschreibung in Kohorte, persönliche Termine und Praxistage, abgeschlossene Lerneinheiten und SCORM-Pakete, Anwesenheit bei Live-Lektionen, Praxisberichte (Datum, Standort, Status, Freitext), Prüfentscheidungen mit Kommentar, daraus abgeleitete Kompetenznachweise.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; ggf. Art. 6 Abs. 1 lit. c DSGVO bei förderrechtlichen Nachweispflichten (AZAV, offen).
- **Empfänger:** die lernende Person selbst; Trainer:innen der Kohorte (Name, Termine, Anwesenheit, Praxisberichte, kein Foto, keine E-Mail); Team der Akademie. Arbeitgeber haben auf der Plattform keinen Zugriff auf Fortschritt oder Anwesenheit.
- **Löschfrist:** wie Tätigkeit 1. Anwesenheit und Prüfungen werden als unveränderlich behandelt; bei einer Löschanfrage Fall für Fall (Aufbewahrungspflicht klären, `docs/loeschweg.md`, E1).

### 4. Profilfoto und Kohortenansicht

- **Zweck:** Gruppe kennt sich, gemeinsames Lernen.
- **Betroffene:** Lernende, Trainer:innen.
- **Daten:** freiwilliges Profilfoto; Rufname mit Anfangsbuchstabe des Nachnamens.
- **Rechtsgrundlage:** Foto: Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO, jederzeit widerrufbar durch Entfernen des Fotos (so auch in der Datenschutzerklärung). Namensanzeige (Rufname und Anfangsbuchstabe des Nachnamens): Art. 6 Abs. 1 lit. b DSGVO, hilfsweise lit. f (berechtigtes Interesse an einer gemeinsamen Lernumgebung); nicht rechtlich geprüft.
- **Empfänger:** Lernende derselben Kohorte und desselben Betriebs; Fotos der Trainer:innen sehen ihre Lernenden; Team der Akademie.
- **Löschfrist:** Foto jederzeit selbst entfernbar; sonst wie Tätigkeit 1 (Datei im Speicher wird beim Löschen des Kontos von Hand entfernt).

### 5. Kohorten-Chat und Fragen-Thread (nur wenn eingeschaltet)

- **Zweck:** Austausch in der Kohorte, Fragen zu Lektionen, Ankündigungen.
- **Betroffene:** Lernende, Trainer:innen, Team der Akademie.
- **Daten:** Text der Nachricht oder des Beitrags, Zeitpunkt, Kanal bzw. Lektion, Kohorte, Arbeitgeber (nicht angezeigt), Anzeigename; Gelesen-Stand; Meldungen (wer welche Nachricht gemeldet hat); Löschvermerk ohne Text.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** alle Lernenden der Kohorte (über Arbeitgeber hinweg), Trainer:innen der Kohorte bzw. Moderierende, Team der Akademie; Löschvermerke nur das Team.
- **Löschfrist:** solange die Kohorte besteht; keine automatische Löschung nach Kohortenende. Beim Löschen eines Kontos werden Text **und** Name der Beiträge entfernt; es bleibt nur ein Platzhalter „gelöscht“, der Personenbezug ist damit aufgehoben.

### 6. Fachsprache-Übungen (nur wenn eingeschaltet)

- **Zweck:** Lernen der Fachsprache.
- **Betroffene:** Lernende.
- **Daten:** keine personenbezogenen Daten gespeichert (Quiz wird nicht gespeichert). Beim Vorlesen kann der Browser den Übungstext und Verbindungsdaten an den Browser-Anbieter senden (nicht durch die Akademie veranlasst).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Löschfrist:** entfällt.

### 7. Betrieb, Sicherheit und Backups

- **Zweck:** sicherer Betrieb der Plattform, Wiederherstellung nach Fehlern.
- **Betroffene:** alle Nutzer:innen.
- **Daten:** technische Protokolle der Anbieter (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser); vollständige Datenbank-Sicherungen.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Empfänger:** Auftragsverarbeiter Vercel und Supabase.
- **Löschfrist:** Protokolle nach Vorgaben der Anbieter; Backups täglich, 7 Tage aufbewahrt (Dateien im Speicher werden nicht gesichert).

### 8. Anfragen von Betroffenen

- **Zweck:** Bearbeitung von Auskunfts-, Lösch- und anderen Anfragen nach Art. 15–21 DSGVO.
- **Betroffene:** anfragende Personen.
- **Daten:** Anfrage, Kontaktdaten, Vorgangsnummer, Ergebnis (nur Zahlen, keine Inhalte).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. c DSGVO.
- **Empfänger:** Anna (Freigabe), ausführende Person im Team.
- **Löschfrist:** 3 Jahre nach Abschluss der Anfrage, als Nachweis der Bearbeitung (Entscheidung Anna 18.10.2026).

### 9. Live-Unterricht in Microsoft Teams (vorläufig, außerhalb der Plattform)

- **Zweck:** Durchführung der Live-Lektionen; die Plattform enthält nur den Link zum Termin.
- **Betroffene:** Lernende, Trainer:innen.
- **Daten:** Name bzw. Anzeigename, ggf. E-Mail-Adresse, Bild und Ton während des Termins (keine Aufzeichnung, Stand 18.10.2026), Teilnahme- bzw. Anwesenheitslisten (in Klassenräumen automatisch), Chat in Teams.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Verantwortlich:** Der Teams-Bereich gehört dem Partner (Energiehelden). Die Akademie stellt den Link bereit, ihre Trainer:innen leiten die Termine, und sie bestätigt die Anwesenheit auf der Plattform (ggf. anhand der Teams-Liste) für eigene Zwecke. Damit liegt wahrscheinlich eine gemeinsame Verantwortlichkeit (Art. 26 DSGVO) vor; zu klären.
- **Empfänger:** Microsoft (Auftragsverarbeiter des Partners).
- **Löschfrist:** nach den Vorgaben des Partners.
- **Offen:** Mit dem Partner klären (Termin 29.10.2026), wer wofür verantwortlich ist, und eine Vereinbarung nach Art. 26 DSGVO schließen bzw. die Rollen schriftlich festhalten.

### 10. Ablage in Google Drive (vorläufig, außerhalb der Plattform)

- **Zweck:** Ablage von Lernmaterial, SCORM-Paketen, Fachsprache-Bildern und Trainerfotos.
- **Betroffene:** Trainer:innen (Fotos); Lernende nur, falls Listen dort liegen (Lernendenlisten gehören nicht dorthin, sie liegen nur lokal).
- **Daten:** Fotos der Trainer:innen (mit Einwilligung); sonst keine Personendaten vorgesehen.
- **Rechtsgrundlage:** Einwilligung der Trainer:innen (Art. 6 Abs. 1 lit. a DSGVO) bzw. Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Google (Auftragsverarbeiter, Vertrag über Google Workspace prüfen).
- **Löschfrist:** solange die Person als Trainer:in tätig ist bzw. bis zum Widerruf.

## TOM (technische und organisatorische Maßnahmen, Kurzfassung)

- **Zugriff:** Rechte je Rolle und Kohorte in der Datenbank erzwungen (Row Level Security auf jeder Tabelle, getestet in `supabase/tests`); Zugriffsregeln in `docs/access-matrix.md`.
- **Anmeldung:** ohne Passwort per Einmallink; Konten legt nur das Team an.
- **Mandantentrennung:** jede Arbeitgeber-Tabelle mit `organisation_id`.
- **Unveränderlichkeit:** Anwesenheit und Prüfungen werden nicht geändert, Korrekturen als neuer Eintrag.
- **Speicherort:** Datenbank und Dateien in der EU (Frankfurt); Dateien nur über zeitlich begrenzte Links.
- **Protokolle:** keine personenbezogenen Daten und keine Nachrichteninhalte in App-Logs.
- **Verschlüsselung:** Übertragung per HTTPS; Verschlüsselung der gespeicherten Daten durch Supabase (Anbieterangabe, nicht geprüft).
- **Backups:** täglich, 7 Tage (`docs/runbook.md`).
- **Änderungen:** Datenbank nur über geprüfte Migrationen, Release mit Probelauf und Zweitfreigabe (`docs/release.md`).
- **Zugänge des Teams:** eigene Konten in Supabase und GitHub; Vercel und Brevo als geteilte Konten (Zwei-Faktor-Anmeldung für Brevo nach dem Start).

## Offen

- Auftragsverarbeitungsverträge: die aktuellen DPAs von Supabase, Vercel und Brevo als PDF herunterladen, wo nötig unterzeichnen (Supabase: im Dashboard bzw. laut DPA „signs or otherwise agrees“ prüfen) und mit Datum ablegen.
- Transfer Impact Assessment für Supabase (Standardvertragsklauseln): kurz dokumentieren oder auf die Unterlagen von Supabase verweisen.
- Gesamtverzeichnis der Akademie: ob es eins gibt, ist unklar. Wenn ja, die Abschnitte 9 und 10 dorthin übernehmen; wenn nein, dieses Verzeichnis nach dem Pilot um die übrigen Tätigkeiten der Akademie erweitern.
- Teams: gemeinsame Verantwortlichkeit mit dem Partner klären (Abschnitt 9).
- Aufbewahrungspflichten (AZAV) für Nachweise: rechtlich klären.
- Keine rechtliche Prüfinstanz.
