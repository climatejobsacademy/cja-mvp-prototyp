# Datenschutzerklärung: offene Punkte

Stand 14.10.2026. Zur Fassung der Datenschutzerklärung mit Kohortenansicht (SR-30), Sichtbarkeit der Fotos und Beiträge und manuellem Löschweg (Branch `docs/dse-kohortensicht`). Das Datum bei „Stand dieser Erklärung“ ist **nicht** geändert; Vera setzt es beim Merge (Punkt 9).

## Die neun Punkte

1. **Keine Prüfinstanz, keine rechtliche Prüfung.** Stand 14.10.2026: Es ist nicht festgelegt, wer die Erklärung gegenliest und die Veröffentlichung verantwortet; der Text ist ohne rechtliche Prüfung. Die Rechtsgrundlage für die Namensanzeige in der Kohortenansicht (Art. 6 Abs. 1 lit. b DSGVO) ist nicht geprüft.

2. **Praxisflow: spätestens bis 16.11. ergänzen.** Stand 14.10.2026: Mit dem Praxisflow-Realbau ändern sich Uploads (der Satz „Außer dem Profilfoto können Lernende derzeit keine Dateien oder Medien … hochladen“ im Abschnitt „Uploads“ gilt dann nicht mehr), Praxisberichte, Fotos Dritter und möglicherweise externe Trainer:innen. Im Pilot sind Trainer:innen intern; im Praxisflow können sie extern sein, dann müssen Weitergabe und Vertrag geklärt werden. Siehe `docs/praxisflow-realbau.md`.

3. **Löschweg.** Stand 14.10.2026: Die Löschung ist derzeit manuell (Text im Abschnitt „Speicherdauer“). Zu prüfen ist, ob sie Konto, Fotos (die Datei im Speicher bleibt bisher, bekannte Lücke aus dem Audit vom 30.09.2026), Beiträge, Anwesenheit und Berichte vollständig abdeckt; Anwesenheit und Prüfungen sind laut SR-07 unveränderlich und nur durch AfCJ admin löschbar. Eine Automatisierung ist vor dem nächsten großen Schritt nötig; die Frist von einem Monat (Art. 12 Abs. 3 DSGVO) gilt schon jetzt.

4. **Fragen und Antworten (Prüfung im Code, Stand 14.10.2026, `origin/dev` fd3b279).**
   - *Eigenes Löschen: umgesetzt.* `fn_beitrag_loeschen` (Migration 0024) setzt einen Soft-Delete; Text, Person und Anzeigename werden geleert, Antworten anderer bleiben. Der Text im Abschnitt „Fragen und Antworten“ stimmt.
   - *Löschung nach Kohortenende: nicht umgesetzt.* Es gibt keinen Job, keinen Cron und keine Migration dafür (Suche im Repo ohne Treffer). Der Satz „löschen sie danach“ war deshalb unzutreffend; ich habe ihn geändert in „Eine automatische Löschung nach dem Ende der Kohorte ist derzeit nicht eingerichtet; auf Anfrage löschen wir sie wie oben beschrieben.“ Entscheidung offen: Job bauen oder Text so lassen.
   - *Rolle „Moderierende“: keine Rolle, aber vorhanden.* Moderation ist ein Eintrag in `kohorte_moderation` (Skript `scripts/sql/thread_aktivieren.sql`), AfCJ admin moderiert immer; es gibt keine Rolle in `role_assignment`. Der Text („Personen, die die Fragen Ihrer Kohorte moderieren“) trifft zu.
   - *Trainerinnen und Trainer sehen die Beiträge nur als Moderierende.* Lesen dürfen laut `fn_kann_beitraege_lesen` (0024) Moderierende der Kohorte, AfCJ admin (über `fn_moderiert_kohorte`) und Lernende mit aktiver oder abgeschlossener Einschreibung in dieser Kohorte, wenn die Lektion lesbar und der Thread freigeschaltet ist. *Erledigt 14.10.:* Der Text nennt Trainer:innen nur noch, wenn sie als Moderierende eingetragen sind.

5. **Fotos auf Production, die vor dieser Änderung hochgeladen wurden.** Stand 14.10.2026: Wer ein Foto unter dem alten Text („nicht für andere Teilnehmende“) hochgeladen hat, hat der neuen Sichtbarkeit für die Kohorte nicht zugestimmt. Das Verfahren (Hinweis beim nächsten Öffnen oder Zurücksetzen) ist vor Release 2 festzulegen; die Zählung auf Production erfolgt nur mit Veras getippter Freigabe. Auf Staging gibt es keine echten Personen, dort ist nichts nötig.

6. **Fachbegriff-Funktion der Demo (Vorlesen, Bilder).** Stand 14.10.2026: Bei einer Übernahme prüfen, ob externe Dienste genutzt werden; sonst stimmt „keine KI-Dienste“ nicht mehr. Stand der Demo: Das Vorlesen nutzt die Sprachausgabe des Browsers (`speechSynthesis`, Sprache de-DE, `components/sprachtraining/vorlesen.tsx`); manche Browser nutzen dafür Online-Stimmen des Browser-Anbieters. Die Bilder sind selbst gezeichnet (`wort-bilder.tsx`). Die Inhalte schrieb Claude (`lib/sprachtraining-daten.ts`): fachliche Prüfung und Hinweis in der Erklärung vor einer Übernahme.

7. **Vercel: Pro-Plan vorhanden (Stand 14.10.2026, laut Vera).** Der Abschnitt „Hosting“ und das zugehörige Hosting-Dokument sind zu aktualisieren (Vertragsgrundlage, Region, Auftragsverarbeitung).

8. **Standort der Daten.** Die Erklärung nennt Frankfurt. Production liegt in Frankfurt, Staging in Irland; der Text beschreibt **Production**. Staging enthält keine echten Personen. Vorschlag: Hinweis im internen Betriebsdokument, nicht in der Erklärung.

9. **Datum „Stand dieser Erklärung“.** Wird beim Merge auf das Datum des Merges gesetzt (zuletzt 13.10.2026). Die fehlende Prüfinstanz steht als eigener Punkt unter 1.

10. **Fotos der Lernenden: nicht für Trainer:innen.** `fn_darf_foto_sehen` (0030, seit 0034 mit Kohorte) gibt Trainer:innen keinen Zugriff auf Fotos von Lernenden: sichtbar für die Person selbst, die eigene Kohorte (gleicher Betrieb) und AfCJ admin; Lernende sehen zusätzlich die Fotos ihrer Trainer:innen. *Erledigt in der Erklärung (14.10.):* „Ihre Trainerinnen und Trainer“ ist aus der Sichtbarkeit der Lernenden-Fotos entfernt; der Absatz zu den Fotos der Trainer:innen bleibt. *Erledigt im Profildialog (15.10.):* Hinweis in PR #113 lautet jetzt „Dein Foto sehen du, die anderen Lernenden deiner Kohorte und das Team der Akademie.“ (Commit `f34211d` auf `feat/kohortensicht`, lokal, noch nicht gepusht). Der zweite Satz des Hinweises bleibt.

## Ergänzung beim Erstellen (nicht beauftragt, bei Nichtbedarf streichen)

Beim Abgleich von Text und Code sind weitere Abweichungen aufgefallen:

- **Praxisberichte für Trainerinnen und Trainer.** *Erledigt 14.10.:* Migration 0032 gibt Trainer:innen Lesezugriff auf Praxisberichte (Selbstauskunft mit Antworten und Schritten) und Prüfentscheidungen der Lernenden aus Kohorten, in denen sie mindestens einen Termin haben, in jedem Status (`submitted`, `verified`, `rejected`; keine Statusbeschränkung). Sie dürfen dort außerdem Anwesenheit eintragen und Praxisberichte prüfen (bestätigen oder mit Kommentar zurückgeben; Korrektur nur als neuer Eintrag, SR-07). *Erledigt 15.10.:* Der Abschnitt „Lernfortschritt und Nachweise“ nennt jetzt Sehen, Eintragen und Prüfen. Die Oberfläche zum Prüfen (G3, SR-82) ist zurückgestellt; Anwesenheit eintragen gibt es in `/trainer` (SR-81).
- **Kohortenansicht: gleicher Betrieb.** Die Kohortenansicht (PR #113) zeigt nur Teilnehmende derselben Kohorte **und** desselben Betriebs mit aktiver Einschreibung. Der Text sagt „Teilnehmende Ihrer Kohorte“, das ist weiter gefasst als die Technik.
- **Kohortenansicht: Anzeigename.** Angezeigt wird der Rufname plus Initial des Nachnamens (`fn_meine_kohorte`, Migration 0034), nicht ein frei wählbarer „Anzeigename“. Der Text ist entsprechend formuliert.
- **Reihenfolge der Veröffentlichung.** Der neue Abschnitt „Kohortenansicht“ beschreibt Funktionen, die erst mit PR #113 auf `dev` kommen. Vor einem Release auf Production müssen #113 und diese Erklärung gemeinsam gehen.

## Ergänzungen für den Start 02.11. (Stand 18.10.2026)

In die Erklärung aufgenommen (Entwurf Anna mit Claude, keine rechtliche Prüfung): Kohorten-Chat genauer (Moderierende, Lesen nach Kohortenende, Löschvermerk, Meldungen), Fragen-Thread an Live-Lektionen in der Regel an mit Löschvermerk, neuer Abschnitt „Fachsprache-Übungen“ (Vorlesen über die Sprachausgabe des Browsers, ggf. Online-Dienst des Browser-Anbieters), Anwesenheit zählt für den Kompetenzfortschritt (0052), Trainer:innen sehen Namen, Termine, Anwesenheit und Praxisberichte, kein Foto und keine E-Mail, Anonymisieren beim Löschen eines Kontos. Chat und Fachsprache sind mit „wenn freigeschaltet“ formuliert, damit der Text unabhängig vom Go/No-Go stimmt.

Entscheidungen Anna 18.10.: Vorlesen bleibt mit allen Browser-Stimmen (O4, kein Umbau); Lernende lesen den Chat nach Kohortenende weiter; der Löschvermerk bei eigener Löschung nennt die Person (nur Admin-Team sieht ihn). Offen: Abschnitt „Hosting“ mit Vercel Pro (Punkt 7), Anna liest die Angaben nach; Datum „Stand“ im Release setzen (Punkt 9).
