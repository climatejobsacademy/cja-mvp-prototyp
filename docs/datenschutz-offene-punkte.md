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
   - *Trainerinnen und Trainer sehen die Beiträge technisch nicht.* Lesen dürfen laut `fn_kann_beitraege_lesen` nur Lernende der Kohorte (aktive oder abgeschlossene Einschreibung), Moderierende und AfCJ admin. Der neue Satz im Abschnitt „Fragen und Antworten“ nennt „Ihre Trainerinnen und Trainer“. Entweder den Zugriff schaffen oder die Nennung streichen.

5. **Fotos auf Production, die vor dieser Änderung hochgeladen wurden.** Stand 14.10.2026: Wer ein Foto unter dem alten Text („nicht für andere Teilnehmende“) hochgeladen hat, hat der neuen Sichtbarkeit für die Kohorte nicht zugestimmt. Das Verfahren (Hinweis beim nächsten Öffnen oder Zurücksetzen) ist vor Release 2 festzulegen; die Zählung auf Production erfolgt nur mit Veras getippter Freigabe. Auf Staging gibt es keine echten Personen, dort ist nichts nötig.

6. **Fachbegriff-Funktion der Demo (Vorlesen, Bilder).** Stand 14.10.2026: Bei einer Übernahme prüfen, ob externe Dienste genutzt werden; sonst stimmt „keine KI-Dienste“ nicht mehr. Stand der Demo: Das Vorlesen nutzt die Sprachausgabe des Browsers (`speechSynthesis`, Sprache de-DE, `components/sprachtraining/vorlesen.tsx`); manche Browser nutzen dafür Online-Stimmen des Browser-Anbieters. Die Bilder sind selbst gezeichnet (`wort-bilder.tsx`). Die Inhalte schrieb Claude (`lib/sprachtraining-daten.ts`): fachliche Prüfung und Hinweis in der Erklärung vor einer Übernahme.

7. **Vercel: Pro-Plan vorhanden (Stand 14.10.2026, laut Vera).** Der Abschnitt „Hosting“ und das zugehörige Hosting-Dokument sind zu aktualisieren (Vertragsgrundlage, Region, Auftragsverarbeitung).

8. **Standort der Daten.** Die Erklärung nennt Frankfurt. Production liegt in Frankfurt, Staging in Irland; der Text beschreibt **Production**. Staging enthält keine echten Personen. Vorschlag: Hinweis im internen Betriebsdokument, nicht in der Erklärung.

9. **Datum „Stand dieser Erklärung“.** Wird beim Merge gesetzt (zuletzt 13.10.2026) und erst dann, wenn die Prüfinstanz (Punkt 1) den Text gesehen hat.

## Ergänzung beim Erstellen (nicht beauftragt, bei Nichtbedarf streichen)

Beim Abgleich von Text und Code sind weitere Abweichungen aufgefallen:

- **Fotos für Trainerinnen und Trainer.** Der Satz zur Sichtbarkeit nennt „Ihre Trainerinnen und Trainer“. Technisch sehen Trainer:innen die Fotos der Lernenden nicht (`fn_darf_foto_sehen` kennt nur eigenes Foto, Fotos der eigenen Trainer:innen und AfCJ admin; 0032 hat daran bewusst nichts geändert). Auch dieser Satz stand schon vor der Änderung so in der Erklärung.
- **Praxisberichte für Trainerinnen und Trainer.** Migration 0032 gibt Trainer:innen Lesezugriff auf Praxisberichte der eigenen Kohorten (SR-82). Der neue Satz im Abschnitt „Lernfortschritt und Nachweise“ nennt nur die Anwesenheit.
- **Kohortenansicht: gleicher Betrieb.** Die Kohortenansicht (PR #113) zeigt nur Teilnehmende derselben Kohorte **und** desselben Betriebs mit aktiver Einschreibung. Der Text sagt „Teilnehmende Ihrer Kohorte“, das ist weiter gefasst als die Technik.
- **Kohortenansicht: Anzeigename.** Angezeigt wird der Rufname plus Initial des Nachnamens (`fn_meine_kohorte`, Migration 0034), nicht ein frei wählbarer „Anzeigename“. Der Text ist entsprechend formuliert.
- **Reihenfolge der Veröffentlichung.** Der neue Abschnitt „Kohortenansicht“ beschreibt Funktionen, die erst mit PR #113 auf `dev` kommen. Vor einem Release auf Production müssen #113 und diese Erklärung gemeinsam gehen.
