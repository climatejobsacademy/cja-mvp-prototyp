# Was tun, wenn etwas bricht

Für Teammitglieder ohne Entwicklungshintergrund. Jeder Abschnitt beginnt mit
einem Symptom und führt in dieser Reihenfolge durch:
**Prüfen** (von einfach nach aufwendig) → **Selbst tun** (ohne Code) →
**Abbrechen und informieren**.

Wo ein Vorgehen noch nicht geklärt ist, steht **offen**.

---

## Bevor du anfängst: vier Regeln

1. **Production enthält echte Daten.** Seit 02.10.2026 nutzt die App
   (learn.climatejobsacademy.com) das Supabase-Projekt in **Frankfurt**.
   Vorschau-Versionen und lokale Entwicklung nutzen das Projekt in **Irland**
   (Staging). In beiden Projekten nur **ansehen**, nichts ändern, löschen oder
   per SQL ausführen, solange es nicht abgesprochen ist.
2. **Keine Schlüssel weitergeben.** Keine Keys, Passwörter oder Tokens aus
   Supabase, Vercel oder GitHub in Chats, Tickets oder Dokumente kopieren.
3. **Keine Personendaten in Fehlermeldungen.** E-Mail-Adressen oder Namen von
   Lernenden nicht in Slack-Kanäle, GitHub oder Asana schreiben. Stattdessen
   beschreiben („eine Lernende aus Kohorte X“) und die Details direkt der
   zuständigen Person geben.
4. **Uhrzeit notieren.** Die Logs in Vercel und Supabase lassen sich nach Zeit
   filtern. Wann ist der Fehler aufgetreten, auf welcher Seite, bei wem?

**Zusatz: Nachweise nicht anfassen.** Anwesenheit (`attendance`) und Verifizierung (`verification`) sind seit Migration 0032 per Trigger gegen Änderungen geschützt (Korrektur nur per Storno-Zeile); Löschen sperrt der Trigger nicht. `unit_progress`, `field_capture` und `field_capture_antwort` haben keinen solchen Schutz. Diese Daten werden von Hand weder geändert noch gelöscht, bis der Löschweg entschieden ist (`loeschweg.md`).

## Wo man nachsieht

| Was | Wo | Wofür |
|---|---|---|
| Die App | https://learn.climatejobsacademy.com | Selbst ausprobieren |
| Vercel | Vercel-Dashboard, Projekt `cja-mvp-prototyp`, Bereiche **Deployments** und **Logs** | Läuft die aktuelle Version? Fehler beim Laden von Seiten? Zurückrollen |
| Supabase | Supabase-Dashboard: Production = Projekt in Frankfurt (Ref `vqfnmkcfjsudsujiuoqm`), Staging = Projekt **Prototyp-MVP** in Irland (Ref `keijrwvegmwgpvprpoxa`) | Accounts (**Authentication → Users**), Daten (**Table Editor**), Protokolle (**Logs**) |
| GitHub Actions | https://github.com/climatejobsacademy/cja-mvp-prototyp/actions | Automatische Prüfungen (`lint-and-types`, `rls-tests`) bei jedem Pull Request |
| Statusseiten der Anbieter | https://status.supabase.com und https://www.vercel-status.com | Hat der Anbieter gerade selbst eine Störung? |

Zugänge: Wer welche Zugänge zu GitHub, Supabase, Vercel und Brevo hat, steht in Notion (Konten-Tabelle), nicht im Repository.

**Was nur im Supabase-Dashboard oder per Skript geht.** Die App hat keinen Admin-Bereich (`decisions.md`, Eintrag zum Design-Fundament); Admin-Arbeit läuft im Dashboard oder über die Skripte in `scripts/`. Auth-Konten für Lernende und Trainer:innen legt man im Dashboard an (Authentication → Users → Add user), die Skripte schreiben nie in `auth.users`. Profil, Mitgliedschaft, Rolle und Einschreibung der Lernenden legt `scripts/lernende-anlegen.mjs` an (`lernende-anlegen.md`), die Person mit Rolle `trainer` der Plan-Import (`import-plan.md`, Abschnitt Trainer-Konten). Inhalte und Termine kommen per Plan-Import, SCORM-Pakete und Teams-Links per eigenem Skript (`scorm-einspielen.md`, `live-links.md`). Status und Freigaben ändert man von Hand im Table Editor, zum Beispiel eine Fachsprache-Einheit auf `veroeffentlicht` (`fachsprache.md`); auch das Organisations-Logo lädt man im Dashboard hoch (`organisations-logo.md`). Das Schema ändert sich nie im Dashboard, sondern nur über eine Migration (`CLAUDE.md`, Regel 4).

## Wen informieren

| Thema | Person | Erreichbar über |
|---|---|---|
| Technik (App, Deployment, Datenbank) | Technik, Vertretung Geschäftsführung | Kontaktwege in Notion (nicht im Repo) |
| Freigabe von Releases | die jeweils andere Person mit Release-Recht (Geschäftsführung ↔ Technik); ist sie nicht erreichbar, merged die Person allein per Admin-Bypass und vermerkt „Ohne Zweitfreigabe“ im PR (`docs/release.md`) | Kontaktwege in Notion |
| Datenschutzvorfall (Meldung, Betroffene informieren) | Geschäftsführung | Kontaktwege in Notion |
| App im Notfall vom Netz nehmen | entscheidet die Geschäftsführung | Kontaktwege in Notion |

---

## 1. Login-Mail kommt nicht an

So funktioniert der Login: Die Person gibt ihre E-Mail-Adresse ein und bekommt
einen Einmal-Link. Ein Passwort gibt es nicht. Neue Konten legt nur das
AfCJ-Team an; unbekannte Adressen bekommen **keine** Mail.

**Wichtig:** Die Login-Seite zeigt nach dem Absenden **immer** „Prüfe dein
Postfach“, auch wenn die Adresse unbekannt ist oder der Versand scheitert. Das
ist Absicht (niemand soll herausfinden können, welche Adressen registriert
sind). Die Meldung beweist also nicht, dass eine Mail verschickt wurde.

**Prüfen**

1. Stimmt die Adresse? Auf Tippfehler achten, und darauf, ob die Person
   vielleicht mit einer anderen Adresse eingeladen wurde.
2. Spam- bzw. Junk-Ordner prüfen, ein paar Minuten warten.
3. Hat die Person ein Konto? Supabase → **Authentication → Users** → nach der
   Adresse suchen. Kein Treffer: Es wird nie eine Mail kommen, das Konto muss
   erst angelegt werden (siehe „Selbst tun“).
4. Mit der eigenen Adresse selbst einen Login-Link anfordern. Kommt auch bei
   dir nichts an, betrifft es vermutlich alle, dann direkt zu „Abbrechen und
   informieren“.
5. Supabase → **Logs** → Auth-Protokolle zur notierten Uhrzeit ansehen: Steht
   dort ein Fehler beim Versand?
6. Den E-Mail-Dienst prüfen. Die Mails verschickt nicht die App, sondern
   Supabase über einen externen Versanddienst (Brevo, seit 30.09.2026). Das
   Versandprotokoll steht in Brevo unter Transactional → Logs. Zugang: gemeinsames Team-Konto (Zugänge in Notion).
7. Hat die Person viele Links kurz hintereinander angefordert? Supabase begrenzt,
   wie viele Mails in einem Zeitraum verschickt werden: Supabase-Dashboard → Projekt → Authentication → Rate Limits. Production (Frankfurt): 30 E-Mails pro Stunde (Stand 18.10.2026), bei 9 Lernenden im Pilot ausreichend. Zusätzlich gilt je Adresse eine kurze Wartezeit zwischen zwei Links.

**Die Mail kommt an, der Login klappt trotzdem nicht.** Dann erscheint auf der
Login-Seite ein Hinweis:

| Hinweis | Bedeutung | Was hilft |
|---|---|---|
| „Der Login-Link war ungültig oder ist abgelaufen.“ | Link zu alt, schon benutzt, oder in einem anderen Browser geöffnet als dem, in dem er angefordert wurde | Neuen Link anfordern und ihn **auf demselben Gerät und im selben Browser** öffnen |
| „…es gibt noch kein Profil für dich.“ | Die Person hat ein Konto, aber es fehlt ihr Profil (Tabelle `person`) | Datenpflege durch das Team, siehe „Selbst tun“ |
| „Du hast noch keine aktive Einschreibung in ein Programm.“ | Die Person ist keiner Kohorte zugeordnet (Tabelle `enrolment`) | Datenpflege durch das Team, siehe „Selbst tun“ |

**Selbst tun**

- Der Person erklären: Spam-Ordner prüfen, neuen Link anfordern, im selben
  Browser öffnen.
- Konto anlegen oder erneut einladen, Profil oder Einschreibung anlegen: Das
  läuft heute über ein Skript bzw. direkt in der Datenbank und braucht
  jemanden aus der Technik. Dürfen: Personen mit Production-Zugang, Liste in Notion (Production nur aus dem Release-Ordner, `docs/release.md`).

**Abbrechen und informieren**, wenn

- auch dein eigener Test-Login keine Mail bekommt (dann betrifft es alle),
- mehrere Personen gleichzeitig betroffen sind,
- die Supabase-Protokolle einen Versandfehler zeigen.

---

## 2. Seite lädt nicht oder zeigt einen Fehler

**Prüfen**

1. Lädt die Seite bei dir? Anderen Browser oder anderes Gerät versuchen, ggf.
   mobiles Netz statt WLAN. Betrifft es eine Seite oder alle?
2. Statusseiten von Supabase und Vercel ansehen (Links oben). Meldet ein
   Anbieter eine Störung, kannst du nur abwarten, trotzdem informieren.
3. Vercel → **Deployments**: Ist das oberste Production-Deployment „Ready“?
   Wurde gerade eine neue Version veröffentlicht? Jeder Merge auf `main`
   veröffentlicht automatisch.
4. Vercel → **Logs**: Nach der notierten Uhrzeit filtern und auf rote
   Fehlereinträge achten. Screenshot machen, aber vorher prüfen, dass keine
   Personendaten darauf zu sehen sind.
5. Supabase-Dashboard öffnen: Zeigt das Projekt einen normalen Zustand oder
   eine Warnung?

**Selbst tun: auf die vorherige Version zurückrollen**

Wenn der Fehler **direkt nach einer neuen Version** auftritt, kann man in Vercel
auf das vorherige Production-Deployment zurückrollen: Vercel → **Deployments**
→ das letzte funktionierende Production-Deployment wählen → Menü „…“ →
**Instant Rollback** (bzw. „Promote to Production“).

Vorher unbedingt prüfen:

- **Zurückrollen betrifft nur die App, nicht die Datenbank.** Stand in der
  Beschreibung des letzten Release-PRs auf GitHub (Titel beginnt mit
  „Release:“), dass eine **Migration** dabei war, **nicht** zurückrollen. Die
  alte App-Version passt dann womöglich nicht mehr zur Datenbank.
  Stattdessen informieren.
- Nach einem Rollback immer informieren, damit der Fehler behoben wird.
- **Nach einem Rollback gehen neue Merges auf `main` nicht mehr automatisch live.** Vercel schaltet die automatische Zuweisung der Production-Domain ab. Ist der Fehler behoben: Vercel → Deployments → beim Production-Deployment „Undo Rollback“ (bzw. die richtige Version per „Promote“) wählen; danach laufen Releases wieder automatisch (Vercel-Doku „Instant Rollback“).

**Abbrechen und informieren**, wenn

- ein Anbieter eine Störung meldet,
- der Fehler nicht direkt nach einem Release auftritt (dann hilft ein Rollback
  nicht),
- ein Rollback nicht geholfen hat oder wegen einer Migration nicht infrage
  kommt.

---

## 3. Inhalte fehlen oder sind falsch

**Prüfen**

1. Betrifft es eine Person oder alle? Wenn möglich mit einem eigenen
   Lernenden-Konto ansehen. Für Production gibt es ein Test-Konto des Teams (wird mit dem Skript „Lernende anlegen“ angelegt; Zugang bei den Personen mit Production-Zugang).
2. **Ist der Inhalt veröffentlicht?** Lernende sehen nur Inhalte mit Status
   `published`. In Supabase → **Table Editor** in den Tabellen `programme`,
   `module`, `course`, `lesson` bzw. `field_job_type` die Spalte `status`
   ansehen. Kompetenzen haben keinen eigenen Status.
3. **Ist die Person eingeschrieben?** Tabelle `enrolment`: Gehört sie zu einer
   Kohorte dieses Programms?
4. **Fehlt ein Termin im Stundenplan?** Tabelle `schedule_entry`:
   Live-Termine müssen an der Kohorte hängen (Spalte `cohort_id` gesetzt). Hängen
   sie an einer einzelnen Person (`enrolment_id`), sieht die Person sie nicht.
   Praxistage hängen dagegen an der einzelnen Person.
5. Bekannte Eigenheiten, die kein Fehler sind:
   - Mehrere Selbstlernmodule zeigen dasselbe Paket „DEMO (temporär)“. Das ist
     eine Übergangslösung aus der Demo und wird zurückgenommen.
   - Eine Kompetenz ist erst erfüllt, wenn **alle** ihre Teilschritte erfüllt
     sind, und ein Teilschritt erst, wenn **alle** zugeordneten Lektionen bzw.
     Praxisaufgaben erledigt sind. Praxisaufgaben zählen erst, wenn das Team die
     Selbstauskunft bestätigt hat.
   - K1 und K2 lassen sich derzeit nicht vollständig erfüllen, weil zwei
     Teilschritte keine Lektion bzw. Praxisaufgabe haben.
   - Zwischen 0 und 2 Uhr nachts zeigen „Heute“ und der Stundenplan noch den
     Vortag.
6. Nach einer Änderung in der Datenbank: Seite in der App neu laden.

**Selbst tun**

- Nur ansehen und beschreiben: welcher Inhalt, welche Seite, bei wem, seit
  wann.
- Inhalte ändern (Status setzen, Texte korrigieren, Termine eintragen) nur nach
  Absprache, weil es die einzige Datenbank mit echten Daten ist. Dürfen: Personen mit Production-Zugang.
- **Niemals Kompetenzen löschen.** Das löscht derzeit Teilschritte mit, die
  auch an anderen Kompetenzen hängen.

**Abbrechen und informieren**, wenn

- Inhalte oder Fortschritte fehlen, die vorher da waren (möglicher
  Datenverlust): sofort, und nichts selbst ändern,
- die Prüfschritte keine Erklärung liefern.

---

## 4. Ein Deployment ist fehlgeschlagen

Zur Einordnung: Ein fehlgeschlagenes Deployment **ersetzt nicht** die laufende
Version. Die App läuft mit der letzten erfolgreichen Version weiter. Eilig ist
es meist nur, wenn eine Korrektur live gehen soll.

**Prüfen**

1. **Auf GitHub**, im Pull Request unter „Checks“: Welche Prüfung ist rot?
   - `lint-and-types` prüft Code-Stil und Typen. Ohne grünen Haken lässt sich
     nichts nach `main` übernehmen.
   - `rls-tests` prüft die Zugriffsregeln der Datenbank (wer darf welche Daten
     sehen).
   - „Details“ öffnet das Protokoll.
2. **In Vercel** → **Deployments**: Steht beim betroffenen Deployment „Error“?
   Die Build-Logs zeigen den Grund.
3. Steht im Protokoll von `rls-tests` das Wort `toomanyrequests`? Das ist ein
   bekanntes, vorübergehendes Problem beim Herunterladen der Testumgebung, kein
   Fehler im Code.

**Selbst tun**

- Bei `toomanyrequests` oder einem offensichtlich vorübergehenden Problem:
  GitHub Actions → den fehlgeschlagenen Lauf öffnen → **Re-run failed jobs**.
- Sonst nichts. Code-Fehler behebt die Person, die den Pull Request erstellt
  hat.

**Abbrechen und informieren**, wenn

- die Prüfung auch nach einem erneuten Lauf rot bleibt,
- ein Release-PR betroffen ist und eine Korrektur dringend live muss.

---

## 5. Eine Migration ist fehlgeschlagen

Zur Einordnung: Migrationen ändern die Struktur der Datenbank (neue Tabellen,
Spalten, Regeln). Sie laufen **nicht automatisch** mit einem Release. Jemand aus
der Technik spielt sie per Befehl ein, nach einem Probelauf. Meist bemerkt diese
Person den Fehler selbst. Andere merken es daran, dass nach einem Release Seiten
Fehler zeigen oder Daten fehlen.

**Prüfen**

1. In der Beschreibung des letzten Release-PRs auf GitHub nachsehen: War eine
   Migration dabei, und wurde sie eingespielt?
2. Die neueste Migration im Repo (Ordner `supabase/migrations`, höchste
   Nummer) mit dem Stand in Supabase vergleichen (Bereich **Database →
   Migrations**, sofern vorhanden).

**Selbst tun**

- Nichts in der Datenbank ändern, kein SQL ausführen.
- **Nicht** in Vercel zurückrollen, ohne Rücksprache. App und Datenbank passen
  sonst womöglich nicht mehr zusammen.

**Abbrechen und informieren:** sofort, sobald ein Migrationsfehler vermutet
wird.

**Gut zu wissen: nicht alles entsteht per Migration.** Die automatische
Zugriffsregel-Absicherung („Enable automatic RLS“: Event-Trigger `ensure_rls`
mit der Funktion `public.rls_auto_enable()`) ist in keiner Migration enthalten.
Sie entstand im Projekt in Irland über die Dashboard-Option und wurde am
01.10.2026 im Frankfurter Projekt per SQL nachgebaut (out-of-band). Ein
Vergleich der Migrationen zeigt sie deshalb nicht. Wer ein neues Projekt
aufsetzt, muss sie zusätzlich einrichten.

Am 02.10.2026 lesend abgeglichen: In Frankfurt und Irland sind RLS-Policies
(71), RLS-Status aller 31 Tabellen in `public` (überall aktiv), Event-Trigger
(7, darunter `ensure_rls`) und die Definition von `rls_auto_enable()`
identisch. Wie man so einen Abgleich lesend macht: siehe Anhang.

**Backups (Stand 18.10.2026, geprüft von der Geschäftsführung im Dashboard Frankfurt, Database → Backups):**

- Supabase sichert die Datenbank **täglich** gegen Mitternacht (Region Frankfurt; letzte Sicherung am 18.10. um 02:10). Aufbewahrt werden die Sicherungen der **letzten 7 Tage**.
- **Point in Time Recovery** (Wiederherstellung auf eine bestimmte Minute) ist nicht gebucht. Das ist für den Pilot ausreichend.
- **Nicht gesichert sind Dateien im Storage** (SCORM-Pakete und ausgepackte Medien, Lernmaterialien, Profilfotos, Fachsprache-Bilder); die Sicherung enthält nur ihre Einträge in der Datenbank. Gelöschte Dateien kommen mit einer Wiederherstellung nicht zurück. SCORM-Pakete und Fachsprache-Bilder liegen zusätzlich im Google-Drive-Ordner und lassen sich mit den Skripten neu einspielen; für Profilfotos und hochgeladene Materialien gibt es keine zweite Kopie.
- **Eine Wiederherstellung setzt die ganze Datenbank auf den Stand der Sicherung zurück.** Alles seitdem geht verloren: Anwesenheiten, Fortschritt, Chat-Nachrichten, neue Konten. Deshalb nur als letzter Ausweg, wenn Daten sonst nicht zu retten sind.
- **Wer entscheidet:** die Geschäftsführung. Ausgelöst wird im Dashboard (Database → Backups → Restore) von einer Person mit Production-Zugang, nach Absprache.
- Eine Probe-Wiederherstellung ist in Abschnitt 7 (Restore-Probe) beschrieben.
- Vor einem Release mit Migrationen: Die Sicherung der letzten Nacht ist der Rückweg. Wurde seitdem auf Production viel geändert, den Release lieber am nächsten Tag machen.

---

## 6. Lernende sehen Daten anderer Personen

Das ist der schwerwiegendste Fall: ein möglicher **Datenschutzvorfall**. Nach
DSGVO (Art. 33) muss eine Verletzung, die ein Risiko für die Betroffenen
darstellt, **innerhalb von 72 Stunden** nach Bekanntwerden der
Aufsichtsbehörde gemeldet werden. Die Uhr läuft ab dem Moment, in dem das Team
davon weiß.

**Sofort**

1. **Informieren**, ohne zu warten, bis alles geprüft ist.
2. **Festhalten:** Wer hat was gesehen, auf welcher Seite (Adresse aus der
   Browserzeile), um wie viel Uhr? Screenshot nur, wenn nötig, und nicht
   weiterleiten oder in Kanäle posten.
3. **Nichts in der Datenbank ändern oder löschen.** Die Spuren werden für die
   Aufklärung gebraucht.

**Prüfen** (nur zur Einordnung, nicht als Voraussetzung fürs Informieren)

- Handelt es sich wirklich um Daten einer anderen Person? Live-Termine und
  Stundenplan einer Kohorte sind für alle Mitglieder gleich; das ist kein
  Vorfall. Kompetenzen, Fortschritt, Praxis-Selbstauskünfte und Profildaten
  sind dagegen persönlich.
- Sieht die betroffene Person die fremden Daten nach Ab- und Anmelden immer
  noch?

**Selbst tun**

- **App vom Netz nehmen:** entscheidet die Geschäftsführung. Weg: Wartungsseite (Entscheidung Geschäftsführung 18.10.). Technisch noch offen: Die App braucht dafür einen Schalter, der statt aller Seiten eine Wartungsseite zeigt (Umsetzung folgt).
- **Meldung an die Aufsichtsbehörde** (Sächsische Datenschutz- und Transparenzbeauftragte) innerhalb von 72 Stunden und **Information der Betroffenen:** Geschäftsführung.

Technischer Hintergrund für die Technik: Die Zugriffsregeln liegen als
Row-Level-Security in `supabase/migrations`, die Tests in
`supabase/tests/database` laufen bei jedem Pull Request (`rls-tests`).

---

## 7. Variablen, Redirect-URLs, Storage und Restore-Probe

Dieser Abschnitt ergänzt das, was für den Betrieb außerhalb eines Fehlers gebraucht wird. Werte von Variablen, Schlüsseln und Projekt-Referenzen stehen hier nicht. Das Zurückrollen eines Deployments (Instant Rollback) steht in Abschnitt 2, die Sicherung in Abschnitt 5.

### Variablen und Schalter

Die App liest die folgenden Variablen. Sie werden in Vercel gesetzt (Projekt, Settings, Environment Variables, getrennt für Production, Preview und Development) und lokal in `.env.local`, die nie committet wird. Eine Änderung in Vercel wirkt erst nach einem neuen Deployment.

| Name | Bedeutung | Wo gesetzt | Umgebung |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Adresse und öffentlicher Schlüssel des Supabase-Projekts; ohne sie startet die App nicht, auch `/login` nicht (`.env.example`). Wegen des Präfixes im Browser sichtbar. | Vercel, lokal `.env.local` | Production zeigt auf das Projekt in Frankfurt, Preview und Development auf Staging (`CLAUDE.md`) |
| `NEXT_PUBLIC_SITE_URL` | Basis-Adresse für den Magic-Link-Redirect in Production; ohne Wert gilt die Production-Domain (`src/app/login/actions.ts`) | Vercel (Production), lokal `.env.local` | Production, lokal |
| `VERCEL_ENV`, `VERCEL_BRANCH_URL` | Systemvariablen von Vercel: Umgebung und Adresse der Vorschau-Version; nicht selbst setzen (`decisions.md`, Eintrag 2026-09-21) | Vercel, automatisch | alle |
| `FACHSPRACHE_EINHEIT`, `PRAXISAUFGABE_LINK` | Funktionsschalter: nur der Wert `an` schaltet ein, ohne Variable ist die Funktion aus (`src/lib/schalter.ts`, `fachsprache.md`) | Vercel | je Umgebung ein eigener Wert |
| `NATIVE_SELBSTLERNEN` | Schalter mit umgekehrtem Standard: ohne Variable ist die native Selbstlern-Ansicht an, nur der Wert `aus` schaltet sie ab (Notbremse) | Vercel | je Umgebung ein eigener Wert |
| `SUPABASE_SERVICE_ROLE_KEY` | nur für `scripts/invite-learner.mjs`, nie im App-Code; für Production liest das Skript den Schlüssel nur aus dem Schlüsselbund (`.env.example`) | lokal `.env.local` | lokal |
| `PGPASSWORD`, `PSQL` | für die Skripte: Datenbank-Passwort (sonst ein Schlüsselbund-Eintrag je Ziel) und Pfad zu `psql` (`import-plan.md`, `lernende-anlegen.md`) | eigene Shell | lokal |

### Redirect-URLs

Der Magic-Link führt zu `<Basis>/auth/callback`. Die Basis bestimmt `src/app/login/actions.ts`: In Production `NEXT_PUBLIC_SITE_URL` (sonst die Production-Domain), in Vorschau-Versionen `https://<VERCEL_BRANCH_URL>`, sonst `http://localhost:3000`. Supabase leitet nur auf Adressen aus der Liste unter Authentication, URL Configuration weiter; die Liste steht im Dashboard und nicht im Repository, und jedes Projekt hat seine eigene. Als Muster gilt: Das Production-Projekt erlaubt nur `https://<production-domain>/**`, das Staging-Projekt zusätzlich `http://localhost:3000/**` und das Muster der Vorschau-Adressen `https://*-<vercel-team>.vercel.app/**`. Das Muster stammt aus der Projektdoku und ist im Dashboard nicht geprüft. Landet ein Link auf der falschen Adresse, fehlt vermutlich der passende Eintrag in dieser Liste.

### Stolpersteine

- **Sensitive-Variablen in Vercel.** Eine als „Sensitive“ gespeicherte Variable lässt sich danach nicht mehr anzeigen, nur ersetzen (Verhalten des Anbieters, im Repository nicht geprüft). Wer einen Wert braucht, setzt ihn neu und deployt neu.
- **Magic-Link im selben Browser.** Der Rückkehrpunkt tauscht einen Code gegen die Sitzung (`exchangeCodeForSession` in `src/app/auth/callback/route.ts`); bei Misserfolg leitet er auf `/login?error=login-fehlgeschlagen`. Dieses Verfahren (PKCE) braucht vermutlich denselben Browser, in dem der Link angefordert wurde; ein Link, der in einem anderen Browser oder einer Mail-App geöffnet wird, schlägt dann fehl (im Browser nicht geprüft).
- **Einladungslinks von Supabase funktionieren nicht.** Der Rückkehrpunkt liest nur den Parameter `code`; ein Einladungslink trägt sein Token vermutlich hinter einem `#`, den der Server nicht sieht (abgeleitet aus dem Code). Konten werden deshalb im Dashboard mit „Create new user“ und „Auto Confirm“ angelegt, ohne Einladung (`lernende-anlegen.md`), und auch `scripts/invite-learner.mjs` wird nicht benutzt.
- **Schlüssel nie auf der Befehlszeile.** Passwörter und Schlüssel werden nie als Argument eines Befehls übergeben, weil sie sonst im Verlauf der Shell und in der Prozessliste stehen. Die Skripte lesen sie aus der Umgebung der eigenen Shell oder aus dem Schlüsselbund und geben sie nie aus (`import-plan.md`, `lernende-anlegen.md`).

### Storage

Buckets entstehen nur über Migrationen. Die Angaben stammen aus den Migrationen und den genannten Dokumenten.

| Bucket | Zugriff | Grenze je Datei | Formate | Pfad und Dateiname |
|---|---|---|---|---|
| `scorm-packages` | privat | keine am Bucket, nur die Upload-Grenze des Projekts (Dashboard, Storage, Settings; `scorm-einspielen.md`) | Zip und ausgepackte Medien | ausgepackt unter `<storage_pfad>.entpackt/`; eine neue Paketversion bekommt einen neuen Dateinamen, überschrieben wird nie (`scorm-einspielen.md`, `decisions.md`) |
| `lesson-resources` | privat | 50 MB | PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX | nur Kleinbuchstaben a bis z, Ziffern und Bindestriche, eine Endung, keine Umlaute, keine Leerzeichen, keine Ordner (`lernmaterialien-upload.md`) |
| `fachsprache-bilder` | privat | 2 MB | PNG, JPEG, WebP (kein SVG) | `<lesson_id>/<dateiname>`, Dateiname aus Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich, höchstens 100 Zeichen, mit Endung (`0051`, `fachsprache.md`) |
| `profilfotos` | privat | 1 MB | nur JPEG | Ordner `<person_id>/` (`loeschweg.md`) |
| `org-logos` | öffentlich | 512000 Byte | PNG, WebP, JPEG | direkt im Wurzelverzeichnis, Dateiname eine neue UUID in Kleinbuchstaben mit Endung, keine Ordner (`organisations-logo.md`) |

Storage ist nicht im Backup: Die Sicherung enthält nur die Einträge in der Datenbank, nicht die Dateien (Abschnitt 5). Eine gelöschte Datei kommt durch eine Wiederherstellung nicht zurück.

### Restore-Probe

Eine Restore-Probe am 07.10.2026 mit dem Backup vom selben Tag hat den Rückweg erprobt. Belegt ist:

- **Dauer:** Start und Ende lagen in derselben Minute. Bei der kleinen Testdatenmenge sagt das nichts über die Dauer mit echten Daten; sie ist nicht belegt (Vermutung).
- **Danach intakt:** Der vor dem Restore gesetzte Marker war weg, die Datenbank stand also auf dem Stand der Sicherung. Die Testzeilen, der Magic-Link-Login, eine SCORM-Lektion und die Dateien im Storage waren vorhanden, und das globale Upload-Limit stand weiter bei 200 MB.
- **Nach jedem Restore zu prüfen:** Konten und Daten, die nach dem Backup entstanden sind, fehlen und müssen neu angelegt werden (in der Probe betraf das ein Testkonto). Das Passwort der Datenbankverbindung, mit der das Terminal arbeitet, ist nicht Teil der Sicherung: Zuerst kam „password authentication failed“, nach Aktualisierung des Zugangs ging die Verbindung wieder. Alle Sitzungen sind danach ungültig, alle müssen sich neu anmelden.
- **Während des Restore:** Das Projekt ist nicht erreichbar, und alles seit dem Backup wird überschrieben. Ein Restore läuft nur nach Absprache (Abschnitt 5, wer entscheidet).

Ablauf für eine weitere Probe oder einen echten Restore:

- **Vorher:** Festlegen, wer entscheidet und wer im Dashboard auslöst (Abschnitt 5). Im Dashboard unter Database, Backups die Sicherung der letzten Nacht ansehen. Zählstände festhalten, nur Zahlen und keine Inhalte, zum Beispiel Zeilen in `person`, `enrolment`, `attendance` und `unit_progress` sowie die Zahl der Dateien je Bucket. Das Team informieren: Alles seit der Sicherung geht verloren, und das Projekt ist während der Wiederherstellung nicht erreichbar.
- **Danach prüfen:** Anmelden per Magic Link mit einem Testkonto und den Smoke-Test aus `release.md` durchgehen. Die Zählstände mit den festgehaltenen vergleichen; Unterschiede müssen sich aus den Änderungen seit der Sicherung erklären lassen. Den Migrationsstand mit `migration list` ansehen: Eine Migration, die erst nach der Sicherung eingespielt wurde, fehlt nach der Wiederherstellung und müsste neu eingespielt werden. Prüfen, dass Seiten mit Dateien (Lernmaterialien, Fachsprache-Bilder, Profilfotos) noch laden.
- **Nicht im Backup:** die Dateien im Storage (Tabelle oben). Die Einstellungen des Projekts (Auth, SMTP, Redirect-URLs) und die Variablen in Vercel sind keine Datenbankinhalte; ob sie eine Wiederherstellung unverändert überstehen, ist nicht belegt (Vermutung).

## Anhang für die Technik: lesend auf die Datenbank zugreifen

Gilt für beide Projekte. Jede Abfrage nennt das Ziel ausdrücklich (Ref bzw.
Pooler-Host), und gegen Production nur nach Absprache.

**Schlüssel und Passwörter liegen im macOS-Schlüsselbund**, nie in Dateien
oder Chats. Einträge (nur Namen):

| Eintrag | Inhalt |
|---|---|
| `cja-fra-anon` | anon key Frankfurt (Legacy API Keys → `anon` `public`) |
| `cja-db-fra` | Datenbank-Passwort Frankfurt |
| `cja-db-irl` | Datenbank-Passwort Irland |

**Schlüssel ablegen, ohne ihn in einen Chat zu kopieren:** Im Dashboard den
Copy-Button nutzen (nicht markieren), dann im eigenen Terminal:

```bash
security add-generic-password -U -s <eintrag> -a "$USER" -w "$(pbpaste | tr -d '[:space:]')"
```

Danach nur die Form prüfen, nie den Wert ausgeben. Ein JWT-Schlüssel hat drei
durch Punkte getrennte Teile:

```bash
security find-generic-password -s <eintrag> -w | awk -F. '{print "teile=" NF, "zeichen=" length($0)}'
```

**Lesend per `psql` über den Session-Pooler** (Port 5432, Benutzer
`postgres.<ref>`, Host im Dashboard unter „Connect“): Passwort nur über
`PGPASSWORD` aus dem Schlüsselbund übergeben. **`PGOPTIONS='-c
default_transaction_read_only=on'` greift über den Pooler nicht** (geprüft am
02.10.2026). Read-only deshalb als erste Anweisung in der Session setzen und
prüfen:

```sql
set session characteristics as transaction read only;
select current_setting('transaction_read_only');  -- muss 'on' sein
```

**`supabase db query --linked --project-ref <ref>` ist nicht ganz
nebenwirkungsfrei:** Die CLI legt dafür im Zielprojekt eine temporäre
Login-Rolle `cli_login_postgres` an bzw. erneuert sie (läuft nach kurzer Zeit
von selbst ab). Schema und Daten bleiben unverändert, für einen streng
lesenden Zugriff ist `psql` über den Pooler trotzdem die bessere Wahl.
