# Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO): Lernplattform

Stand 18.10.2026 · **Entwurf** (Anna mit Claude), keine rechtliche Prüfung. Abgeleitet aus `docs/data-model.md`, `docs/access-matrix.md`, der Datenschutzerklärung (`src/app/(rechtliches)/datenschutz/page.tsx`), `docs/loeschweg.md` und `docs/runbook.md`.

Gilt für die Lernplattform learn.climatejobsacademy.com (Production, Supabase Frankfurt). Staging enthält keine echten Personen und ist nicht Teil des Verzeichnisses. Werkzeuge rund um den Pilot (Microsoft Teams, Google Drive) stehen vorläufig unter 9 und 10. Andere Verarbeitungen der Akademie (z. B. Buchhaltung, Bewerbungen) gehören in ein Gesamtverzeichnis, siehe „Offen“.

## Allgemeine Angaben (gelten für alle Tätigkeiten)

| Angabe | Inhalt |
|---|---|
| Verantwortliche Stelle | Akademie für Klimajobs UG (haftungsbeschränkt), Kochstraße 42, 04275 Leipzig, vertreten durch die Geschäftsführerin Anna Sauter-Getschmann, info@climatejobsacademy.com |
| Datenschutzbeauftragte:r | keine:r benannt; nicht verpflichtend, weil weniger als 20 Personen ständig mit der Verarbeitung personenbezogener Daten beschäftigt sind (§ 38 BDSG, Bestätigung Anna 18.10.2026) |
| Auftragsverarbeiter | Supabase (Datenbank, Login, Dateispeicher; EU, Frankfurt), Vercel Inc. (Hosting; Funktionen in Frankfurt, weltweites Netzwerk; EU-Standardvertragsklauseln), Brevo GmbH Berlin (Versand der Login-Mails; EU-Rechenzentren, Unterauftragsverarbeiter z. B. Cloudflare) |
| Drittlandübermittlung | Vercel (USA) und Unterauftragsverarbeiter von Brevo: EU-Standardvertragsklauseln bzw. EU-US Data Privacy Framework |
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
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Namensanzeige; nicht rechtlich geprüft); Foto freiwillig, der Upload ist die Freigabe.
- **Empfänger:** Lernende derselben Kohorte und desselben Betriebs; Fotos der Trainer:innen sehen ihre Lernenden; Team der Akademie.
- **Löschfrist:** Foto jederzeit selbst entfernbar; sonst wie Tätigkeit 1 (Datei im Speicher wird beim Löschen des Kontos von Hand entfernt).

### 5. Kohorten-Chat und Fragen-Thread (nur wenn eingeschaltet)

- **Zweck:** Austausch in der Kohorte, Fragen zu Lektionen, Ankündigungen.
- **Betroffene:** Lernende, Trainer:innen, Team der Akademie.
- **Daten:** Text der Nachricht oder des Beitrags, Zeitpunkt, Kanal bzw. Lektion, Kohorte, Arbeitgeber (nicht angezeigt), Anzeigename; Gelesen-Stand; Meldungen (wer welche Nachricht gemeldet hat); Löschvermerk ohne Text.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** alle Lernenden der Kohorte (über Arbeitgeber hinweg), Trainer:innen der Kohorte bzw. Moderierende, Team der Akademie; Löschvermerke nur das Team.
- **Löschfrist:** solange die Kohorte besteht; keine automatische Löschung nach Kohortenende; beim Löschen eines Kontos werden Text und Name anonymisiert.

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
- **Daten:** Name bzw. Anzeigename, ggf. E-Mail-Adresse, Bild und Ton während des Termins, Teilnahme- bzw. Anwesenheitslisten (in Klassenräumen automatisch), Chat in Teams.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Microsoft (Auftragsverarbeiter, falls der Teams-Bereich der Akademie gehört).
- **Löschfrist:** offen.
- **Offen:** Wem gehört der Teams-Bereich (Akademie, Partner oder Trainer:in)? Davon hängt ab, wer verantwortlich ist und ob ein Vertrag mit Microsoft oder dem Partner nötig ist. Werden Termine aufgezeichnet?

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

- Auftragsverarbeitungsverträge: Supabase, Vercel und Brevo binden ihren Vertrag über die Nutzungsbedingungen ein; ablegen bzw. Link festhalten.
- Gesamtverzeichnis der Akademie: ob es eins gibt, ist unklar. Wenn ja, die Abschnitte 9 und 10 dorthin übernehmen; wenn nein, dieses Verzeichnis nach dem Pilot um die übrigen Tätigkeiten der Akademie erweitern.
- Teams: wem der Bereich gehört und ob aufgezeichnet wird (Abschnitt 9).
- Aufbewahrungspflichten (AZAV) für Nachweise: rechtlich klären.
- Keine rechtliche Prüfinstanz.
