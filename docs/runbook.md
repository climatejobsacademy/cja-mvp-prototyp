# Was tun, wenn etwas bricht

Für Teammitglieder ohne Entwicklungshintergrund. Jeder Abschnitt beginnt mit
einem Symptom und führt in dieser Reihenfolge durch:
**Prüfen** (von einfach nach aufwendig) → **Selbst tun** (ohne Code) →
**Abbrechen und informieren**.

Wo ein Vorgehen noch nicht geklärt ist, steht **TODO Vera: klären**.
Stand: 30.09.2026.

---

## Bevor du anfängst: vier Regeln

1. **Es gibt nur eine Datenbank, und die enthält echte Daten.** Die App, die
   Vorschau-Versionen und die lokale Entwicklung nutzen dasselbe
   Supabase-Projekt. In Supabase deshalb nur **ansehen**, nichts ändern,
   löschen oder per SQL ausführen, solange es nicht abgesprochen ist.
2. **Keine Schlüssel weitergeben.** Keine Keys, Passwörter oder Tokens aus
   Supabase, Vercel oder GitHub in Chats, Tickets oder Dokumente kopieren.
3. **Keine Personendaten in Fehlermeldungen.** E-Mail-Adressen oder Namen von
   Lernenden nicht in Slack-Kanäle, GitHub oder Asana schreiben. Stattdessen
   beschreiben („eine Lernende aus Kohorte X“) und die Details direkt der
   zuständigen Person geben.
4. **Uhrzeit notieren.** Die Logs in Vercel und Supabase lassen sich nach Zeit
   filtern. Wann ist der Fehler aufgetreten, auf welcher Seite, bei wem?

## Wo man nachsieht

| Was | Wo | Wofür |
|---|---|---|
| Die App | https://learn.climatejobsacademy.com | Selbst ausprobieren |
| Vercel | Vercel-Dashboard, Projekt `cja-mvp-prototyp`, Bereiche **Deployments** und **Logs** | Läuft die aktuelle Version? Fehler beim Laden von Seiten? Zurückrollen |
| Supabase | Supabase-Dashboard, Projekt **Prototyp-MVP** (Region EU/Irland) | Accounts (**Authentication → Users**), Daten (**Table Editor**), Protokolle (**Logs**) |
| GitHub Actions | https://github.com/climatejobsacademy/cja-mvp-prototyp/actions | Automatische Prüfungen (`lint-and-types`, `rls-tests`) bei jedem Pull Request |
| Statusseiten der Anbieter | https://status.supabase.com und https://www.vercel-status.com | Hat der Anbieter gerade selbst eine Störung? |

TODO Vera: klären, wer im Team Zugang zu Vercel, Supabase und GitHub hat und mit
welcher Rolle.

## Wen informieren

| Thema | Person | Erreichbar über |
|---|---|---|
| Technik (App, Deployment, Datenbank) | TODO Vera: klären | TODO Vera: klären |
| Freigabe von Releases | Malte (derzeit einziger Reviewer) | TODO Vera: klären |
| Datenschutzvorfall | TODO Vera: klären | TODO Vera: klären |
| Vertretung während Veras Urlaub (17.10.–01.11.) | TODO Vera: klären | TODO Vera: klären |

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
   Versandprotokoll steht in Brevo unter Transactional → Logs. TODO Vera:
   klären, wer Zugang hat.
7. Hat die Person viele Links kurz hintereinander angefordert? Supabase begrenzt,
   wie viele Mails in einem Zeitraum verschickt werden. TODO Vera: klären, welche
   Grenzen eingestellt sind und wo man sie einsieht.

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
  jemanden aus der Technik. TODO Vera: klären, wer das darf und wie es beauftragt
  wird.

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
- Nach einem Rollback immer informieren, damit der Fehler behoben wird. TODO
  Vera: klären, was nach einem Rollback nötig ist, damit spätere Releases wieder
  automatisch live gehen.

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
   Lernenden-Konto ansehen. TODO Vera: klären, ob es ein Test-Konto für das Team
   gibt.
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
  Absprache, weil es die einzige Datenbank mit echten Daten ist. TODO Vera: klären,
  wer Inhalte im Table Editor pflegen darf.
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

TODO Vera: klären, welche Backups der aktuelle Supabase-Tarif enthält, wer eine
Wiederherstellung auslösen darf und ob sie schon einmal geprobt wurde (Asana:
„Backup-Konzept für Supabase prüfen“).

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

- TODO Vera: klären, ob und wie die App im Notfall vom Netz genommen wird und wer
  das entscheidet.
- TODO Vera: klären, wer die Meldung an die Aufsichtsbehörde (Sächsische
  Datenschutz- und Transparenzbeauftragte) übernimmt und wer die Betroffenen
  informiert.

Technischer Hintergrund für die Technik: Die Zugriffsregeln liegen als
Row-Level-Security in `supabase/migrations`, die Tests in
`supabase/tests/database` laufen bei jedem Pull Request (`rls-tests`).
