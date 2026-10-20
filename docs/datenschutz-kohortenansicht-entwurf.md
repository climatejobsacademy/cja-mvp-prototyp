# Datenschutzerklärung: Entwurf für die Kohortenansicht (SR-30)

Stand 14.10.2026. **Textvorschlag, nicht veröffentlicht.** Die Seite `/datenschutz` (`src/app/(rechtliches)/datenschutz/page.tsx`) ist mit diesem Entwurf **nicht** geändert. Die **Prüfinstanz** (Kanzlei bzw. verantwortliche Person für den Datenschutz) **ist noch offen**; der Text ist keine Rechtsberatung und muss vor der Veröffentlichung geprüft werden.

**Wann:** spätestens vor dem Release von Migration 0034 und der Kohortenansicht auf Production. Bis dahin sagt die Erklärung „nicht für andere Teilnehmende“; das passt nur zum Stand ohne Kohortenansicht (dev/Staging sind Testumgebungen).

Was die Funktion tut (Entscheidung Vera 14.10.2026, `docs/decisions.md`): Lernende sehen die anderen Lernenden ihrer Kohorte mit Rufname plus Initial des Nachnamens, der Anzahl und – wenn hochgeladen – dem Foto. Nur gleiche Kohorte und gleicher Betrieb, nur aktive Einschreibungen. Der Foto-Upload ist die Freigabe.

## 1. Abschnitt „Profilfotos“ – geänderter Satz

Bisher:

> Sichtbar ist Ihr Foto für Sie selbst, für Ihre Trainerinnen und Trainer und für das zuständige Personal der Akademie für Klimajobs, nicht für andere Teilnehmende.

Vorschlag:

> Sichtbar ist Ihr Foto für Sie selbst, für Ihre Trainerinnen und Trainer, für das zuständige Personal der Akademie für Klimajobs und für die anderen Teilnehmenden Ihrer Kohorte. Das sind nur Personen aus derselben Kohorte und demselben Betrieb, solange deren und Ihre Einschreibung aktiv ist. Mit dem Hochladen stimmen Sie dieser Sichtbarkeit ausdrücklich zu; einen getrennten Schalter dafür gibt es nicht. Entfernen Sie das Foto, ist es sofort für niemanden außer Ihnen mehr sichtbar.

Der Satz zur Rechtsgrundlage bleibt („Einwilligung, Art. 6 Abs. 1 lit. a DSGVO; Sie können sie jederzeit widerrufen, indem Sie das Foto entfernen“).

Der Dialog zum Foto-Upload nennt dasselbe in kurzer Form (umgesetzt in der App): „Mit dem Hochladen bist du einverstanden, dass dein Foto für Mitglieder deiner Kohorte sichtbar ist. Du kannst es jederzeit entfernen.“

## 2. Neuer Abschnitt „Kohortenansicht“

> **Kohortenansicht**
>
> Auf der Seite „Programm“ sehen Sie, wer außer Ihnen in Ihrer Kohorte lernt. Angezeigt werden die Anzahl der Teilnehmenden und für jede andere Person ihr Rufname mit dem Anfangsbuchstaben des Nachnamens (zum Beispiel „Lea M.“) und, wenn die Person eines hochgeladen hat, ihr Profilfoto. Andere Teilnehmende sehen von Ihnen dasselbe.
>
> Die Liste zeigt nur Teilnehmende aus derselben Kohorte und demselben Betrieb mit aktiver Einschreibung. Nicht angezeigt werden E-Mail-Adresse, Geburtsdatum, Geschlecht, Vorerfahrung und der Name des Betriebs. Weil die Liste auf Ihren Betrieb beschränkt ist, erkennen die anderen Teilnehmenden aber, dass Sie im selben Betrieb lernen. Trainerinnen und Trainer erhalten diese Liste nicht.
>
> Zweck ist das gemeinsame Lernen in der Kohorte. Rechtsgrundlage für Rufname und Initial ist die Durchführung der Qualifizierung, Art. 6 Abs. 1 lit. b DSGVO (alternativ: berechtigtes Interesse am gemeinsamen Lernen, Art. 6 Abs. 1 lit. f DSGVO, siehe offene Punkte); für das Foto Ihre Einwilligung, Art. 6 Abs. 1 lit. a DSGVO (siehe „Profilfotos“). Die Angaben verschwinden aus der Liste, sobald Ihre Einschreibung nicht mehr aktiv ist oder Ihr Konto gelöscht wird.

## 3. Weitere Stellen

- **„Account und Authentifizierung“:** Ergänzung bei Rufname: „Rufname und Initial des Nachnamens sind für die anderen Teilnehmenden Ihrer Kohorte sichtbar (siehe Kohortenansicht).“
- **„Speicherdauer“:** Satz zum Foto: „Das Foto ist für die Kohorte nur sichtbar, solange Ihre Einschreibung aktiv ist; die Datei selbst löschen wir beim Entfernen des Fotos (Sicherungskopien bis zu sieben Tage).“
- **„Fragen und Antworten zu Lektionen“:** keine Änderung (zeigt schon Vorname und Initial).
- **„Stand dieser Erklärung“:** neues Datum am Tag der Veröffentlichung.

## 4. Offene Punkte für die Prüfinstanz

1. **Prüfinstanz** ist offen (wer liest gegen, wer verantwortet die Veröffentlichung?).
2. **Rechtsgrundlage der Namensanzeige:** lit. b oder lit. f? Bei lit. f gibt es ein Widerspruchsrecht (Art. 21); dafür bräuchte es einen Weg, jemanden aus der Liste zu nehmen. Heute gibt es keinen Schalter und keinen manuellen Weg. Entscheidung offen.
3. **Bereits hochgeladene Fotos:** Wer ein Foto unter dem alten Text („nicht für andere Teilnehmende“) hochgeladen hat, hat der neuen Sichtbarkeit nicht zugestimmt. Vorschlag: vor dem Release Hinweis beim nächsten Öffnen des Profils oder die Fotos zurücksetzen. Auf Staging gibt es derzeit kein hochgeladenes Foto; Production habe ich nicht geprüft.
4. **Betrieb erkennbar:** Die Beschränkung auf denselben Betrieb ist Schutz und Hinweis zugleich (siehe Text oben); prüfen, ob das ausreicht.
5. **Löschweg:** Beim Löschen eines Kontos verschwindet die Person aus der Liste, die Foto-Datei bleibt (bekannte Lücke, Audit 30.09.2026).
6. **Fotos von Trainerinnen und Trainern** bleiben unverändert (nur mit deren Einwilligung).
