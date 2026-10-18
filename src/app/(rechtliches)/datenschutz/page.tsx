export const metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  // SR-60 (Pflichtseite). Abschnitte „Fragen und Antworten zu Lektionen“
  // (SR-74, SR-75) und „Lernmaterialien und externe Links“ (SR-68) ergänzt
  // 2026-10-08; Abschnitt „Profilfotos“ (SR-77, SR-78) und Rufname ergänzt
  // 2026-10-13; Abschnitt „Kohortenansicht“ (SR-30), Sichtbarkeit der Fotos
  // und Beiträge, Löschweg 2026-10-14 (Entwurf, Datum „Stand“ setzt Vera beim
  // Merge). Abschnitt „Kohorten-Chat“ (SR-83) und Speicherdauer der
  // Chat-Nachrichten 2026-10-16 (Entwurf, Prüfung Anna auf Staging; Datum
  // „Stand“ beim Merge setzen). Eigene Formulierung, nicht rechtlich geprüft;
  // offene Punkte in docs/datenschutz-offene-punkte.md.
  // Ergänzungen für den Start 02.11. am 2026-10-18 (Anna mit Claude, SR folgt):
  // Chat genauer, Fragen-Thread an Live-Lektionen, Fachsprache-Übungen mit
  // Vorlesen, Anwesenheit und Kompetenzfortschritt, Trainer-Bereich,
  // Anonymisieren beim Löschen eines Kontos. Datum „Stand“ im Release setzen.
  return (
    <main className="prose mx-auto px-4 py-12">
      <h1>Datenschutzerklärung</h1>

      <h2>Allgemeine Hinweise</h2>
      <p>
        Diese Datenschutzerklärung erläutert, welche personenbezogenen Daten
        auf der Lernplattform{" "}
        <a href="https://learn.climatejobsacademy.com/">
          https://learn.climatejobsacademy.com/
        </a>{" "}
        verarbeitet werden, zu welchem Zweck und auf welcher Rechtsgrundlage.
        Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
        identifiziert werden können.
      </p>

      <h2>Verantwortliche Stelle</h2>
      <p>
        Akademie für Klimajobs UG (haftungsbeschränkt), Kochstraße 42, 04275
        Leipzig, vertreten durch die Geschäftsführerin Anna Sauter-Getschmann.
        E-Mail:{" "}
        <a href="mailto:info@climatejobsacademy.com">info@climatejobsacademy.com</a>.
        Bei Fragen zum Datenschutz erreichen Sie uns unter dieser Adresse. Eine
        oder ein Datenschutzbeauftragter ist nicht benannt, da die
        gesetzlichen Voraussetzungen dafür (§ 38 BDSG) nicht vorliegen.
      </p>

      <h2>Account und Authentifizierung</h2>
      <p>
        Für die Nutzung der Plattform wird ein Nutzerkonto benötigt. Konten
        werden ausschließlich durch das zuständige Personal der Akademie für
        Klimajobs angelegt, eine Selbstregistrierung ist nicht möglich. Zur
        Anmeldung versenden wir einen Einmallink (Magic Link) an Ihre
        hinterlegte E-Mail-Adresse. Es wird kein Passwort gespeichert.
        Verarbeitet werden E-Mail-Adresse, Name, Rufname, Benutzername, zugeordnete Rolle
        und Organisation, Zeitpunkte der Anmeldung sowie, soweit erfasst,
        Geburtsdatum, Geschlecht (die Angabe „keine Angabe“ ist möglich),
        Vorerfahrung und Sprache. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Lernfortschritt und Nachweise</h2>
      <p>
        Die Plattform erfasst abgeschlossene Lerneinheiten und
        SCORM-Lernpakete, bestätigte Teilnahmen und Anwesenheit bei
        Live-Sessions, Praxiseinsätze (Datum, Standort, Status, Ergebnis und
        Ihre Freitextangaben), die zugehörige Dokumentation, Prüfentscheidungen
        mit Kommentar sowie daraus abgeleitete Kompetenznachweise. Bestätigt
        Ihre Trainerin oder Ihr Trainer Ihre Anwesenheit bei einer
        Live-Lektion, gilt diese Lektion für Ihren Kompetenzfortschritt als
        erledigt; wird die Anwesenheit später berichtigt, passt sich der
        Fortschritt an. Einsehbar sind diese Daten für Sie selbst und für
        berechtigtes Personal der Akademie für Klimajobs. Trainerinnen und
        Trainer sehen Ihren Namen, Ihre Termine, Ihre Anwesenheit und Ihre
        Praxisberichte, wenn sie in Ihrer Kohorte mindestens einen Termin
        leiten; Ihr Foto, Ihre E-Mail-Adresse und weitere Profilangaben sehen
        sie nicht. Sie tragen dort die Anwesenheit ein und
        können Praxisberichte prüfen, also bestätigen oder mit Kommentar
        zurückgeben. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Fragen und Antworten zu Lektionen</h2>
      <p>
        Zu einzelnen Lektionen können Teilnehmende Fragen stellen und auf
        Fragen antworten, sofern diese Funktion für die Lektion freigeschaltet
        ist; bei Live-Lektionen ist sie in der Regel eingeschaltet. Möglich sind nur Text und Symbole, keine Anhänge. Bitte schreiben
        Sie keine sensiblen Angaben und keine Daten anderer Personen. Verarbeitet
        werden der Text Ihres Beitrags, der Zeitpunkt, die Lektion, Ihre
        Kohorte sowie Ihr Vorname mit dem Anfangsbuchstaben Ihres Nachnamens.
        Sichtbar sind Ihre Beiträge für die Teilnehmenden Ihrer Kohorte, für
        Personen, die die Fragen Ihrer Kohorte moderieren, und für das
        zuständige Personal der Akademie für Klimajobs. Trainerinnen und
        Trainer sehen die Beiträge nur, wenn sie als Moderierende Ihrer Kohorte
        eingetragen sind. Eigene Beiträge können Sie
        jederzeit löschen; der Text und Ihr Name werden dann entfernt.
        Moderierende und das Personal der Akademie für Klimajobs können
        Beiträge ebenfalls entfernen. Bei jeder Löschung vermerken wir ohne
        den Text, wer wann welchen Beitrag gelöscht hat; diesen Vermerk sieht
        nur das zuständige Personal der Akademie für Klimajobs. Beiträge, die Sie melden möchten, senden
        Sie bitte an{" "}
        <a href="mailto:info@climatejobsacademy.com">info@climatejobsacademy.com</a>.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Kohorten-Chat</h2>
      <p>
        Wenn der Chat für Ihre Kohorte freigeschaltet ist, können Sie sich mit
        den Teilnehmenden Ihrer Kohorte austauschen. Es gibt zwei Kanäle: Im
        Kanal „Ankündigungen“ schreiben nur die Trainerinnen und Trainer Ihrer
        Kohorte, Personen, die Ihre Kohorte moderieren, und das zuständige
        Personal der Akademie für Klimajobs; im Kanal „Treffpunkt“ schreiben
        zusätzlich alle Teilnehmenden Ihrer Kohorte. Möglich sind nur Text und
        Symbole, keine Anhänge; Nachrichten lassen sich nicht bearbeiten. Bitte
        schreiben Sie keine sensiblen Angaben und keine Daten anderer Personen.
        Verarbeitet werden der Text Ihrer Nachricht, der Zeitpunkt, der Kanal,
        Ihre Kohorte, Ihr Arbeitgeber (wird nicht angezeigt), Ihr Rufname mit
        dem Anfangsbuchstaben Ihres Nachnamens in der Form, die beim Schreiben
        galt, sowie, bis wann Sie einen Kanal gelesen haben (für die Anzeige
        ungelesener Nachrichten). Sichtbar sind Ihre Nachrichten für alle
        Teilnehmenden Ihrer Kohorte, auch wenn sie bei einem anderen
        Arbeitgeber beschäftigt sind, für die Trainerinnen und Trainer Ihrer
        Kohorte (alle, die dort mindestens einen Termin leiten), für Personen,
        die Ihre Kohorte moderieren, und für das zuständige Personal der
        Akademie für Klimajobs. Nach dem Ende Ihrer Kohorte können Sie und die
        anderen Teilnehmenden den Chat weiter lesen, aber nicht mehr schreiben.
      </p>
      <p>
        Eigene Nachrichten können Sie jederzeit löschen; der Text und Ihr Name
        werden dann entfernt. Die Trainerinnen und Trainer Ihrer Kohorte, die
        Moderierenden und das Personal der Akademie für Klimajobs können
        Nachrichten ebenfalls entfernen. Bei jeder Löschung vermerken wir ohne
        den Text, wer wann welche Nachricht gelöscht hat; diesen Vermerk sieht
        nur das zuständige Personal der Akademie für Klimajobs. Nachrichten
        anderer können Sie melden. Gespeichert wird dabei, wer welche Nachricht
        wann gemeldet hat; die Meldung sehen nur die Moderierenden, also die
        Trainerinnen und Trainer Ihrer Kohorte, die Moderierenden und das
        Personal der Akademie für Klimajobs. Die Person, deren Nachricht Sie
        melden, erfährt nicht, wer gemeldet hat. Rechtsgrundlage: Art. 6 Abs. 1
        lit. b DSGVO.
      </p>

      <h2>Lernmaterialien und externe Links</h2>
      <p>
        Zu Lektionen stellen wir Dateien zum Ansehen und Herunterladen bereit.
        Der Abruf erfolgt über zeitlich begrenzte Links aus unserem
        Datenbankdienst. Welche Dateien Sie in der laufenden Sitzung
        heruntergeladen haben, merkt sich nur Ihr Browser im sogenannten
        sessionStorage, um sie als „heruntergeladen“ zu kennzeichnen. Das ist
        kein Cookie, wird nicht an uns übermittelt und beim Schließen des Tabs
        gelöscht. Einige Lektionen enthalten Verweise auf externe Angebote, etwa
        Videos. Diese öffnen sich in einem neuen Tab; Inhalte Dritter werden
        nicht in die Plattform eingebettet. Für die verlinkten Seiten gelten die
        Datenschutzhinweise der jeweiligen Anbieter. Rechtsgrundlage: Art. 6
        Abs. 1 lit. b DSGVO.
      </p>

      <h2>Fachsprache-Übungen</h2>
      <p>
        Wenn diese Funktion freigeschaltet ist, bieten wir zu einzelnen
        Lektionen Übungen zur Fachsprache an (Wörter, Quiz, Beispielsätze).
        Ihre Antworten im Quiz werden nicht gespeichert und nicht ausgewertet;
        sie zählen nicht für Ihren Lernfortschritt. Bilder zu den Übungen rufen
        wir über zeitlich begrenzte Links aus unserem Datenbankdienst ab. Über
        das Lautsprecher-Symbol können Sie sich Wörter und Sätze vorlesen
        lassen. Dafür nutzt die Plattform die Sprachausgabe Ihres Browsers. Je
        nach Browser und Gerät erzeugt Ihr Gerät die Sprache selbst oder Ihr
        Browser nutzt dafür einen Online-Dienst seines Anbieters. In diesem
        Fall übermittelt Ihr Browser den vorzulesenden Text und technische
        Verbindungsdaten wie Ihre IP-Adresse an diesen Anbieter; es gelten
        dessen Datenschutzhinweise. Vorgelesen werden nur Inhalte der Übung,
        keine Angaben über Sie. Wenn Sie das nicht möchten, nutzen Sie die
        Vorlese-Funktion nicht; die Übungen funktionieren auch ohne.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Profilfotos</h2>
      <p>
        Sie können im Konto-Menü freiwillig ein Profilfoto hochladen, ändern
        und jederzeit selbst entfernen. Ihr Browser schneidet das Foto
        quadratisch zu und verkleinert es, bevor es übertragen wird.
        Gespeichert wird es in einem nicht öffentlichen Speicher unseres
        Datenbankdienstes Supabase in der EU (Frankfurt). Abgerufen wird es nur
        über zeitlich begrenzte Links (eine Stunde). Sichtbar ist Ihr Foto für
        Sie selbst, für die Teilnehmenden Ihrer Kohorte und für das zuständige
        Personal der Akademie für Klimajobs. Mit dem Hochladen entscheiden Sie
        also, dass Ihre Kohorte Ihr Foto sieht; darauf weisen wir Sie beim
        Hochladen hin. Sie können das Foto jederzeit selbst entfernen. Wenn Sie das Foto entfernen oder ein neues hochladen, löschen wir die
        bisherige Datei; sie kann noch bis zu sieben Tage in den täglichen
        Sicherungskopien (Backups) enthalten sein. Rechtsgrundlage: Ihre
        Einwilligung, Art. 6 Abs. 1 lit. a DSGVO; Sie können sie jederzeit
        widerrufen, indem Sie das Foto entfernen.
      </p>
      <p>
        An Live-Terminen und Praxistagen zeigen wir Namen und, soweit
        vorhanden, das Foto der Trainerin oder des Trainers. Diese Angaben sehen
        nur die Teilnehmenden, für die der Termin geplant ist. Fotos von
        Trainerinnen und Trainern stellen wir nur mit deren Einwilligung ein;
        sie liegen im selben nicht öffentlichen Speicher.
      </p>

      <h2>Kohortenansicht</h2>
      <p>
        Im Bereich „Programm“ zeigen wir die Teilnehmenden Ihrer Kohorte. Alle
        Teilnehmenden einer Kohorte sehen dort den Namen der anderen
        Teilnehmenden, und zwar den Rufnamen, den Sie in Ihrem Profil
        hinterlegt haben, mit dem Anfangsbuchstaben Ihres Nachnamens (zum
        Beispiel „Lea M.“). Den Rufnamen können Sie selbst ändern; der
        Nachname stammt aus Ihrem Nutzerkonto. Das dient dazu, dass die Gruppe
        sich kennt und gemeinsam lernt; eine Abwahl der Namensanzeige ist nicht
        vorgesehen. Haben Sie ein Profilfoto hochgeladen, sehen die
        Teilnehmenden Ihrer Kohorte auch dieses Foto (siehe „Profilfotos“).
        Rechtsgrundlage für die Anzeige des Namens: Art. 6 Abs. 1 lit. b
        DSGVO.
      </p>

      <h2>Uploads</h2>
      <p>
        Außer dem Profilfoto können Lernende derzeit keine Dateien oder Medien
        auf die Plattform hochladen. Sollte sich das ändern, ergänzen wir diese
        Erklärung vorab.
      </p>

      <h2>E-Mail-Versand</h2>
      <p>
        Für den Versand der Anmelde- und Einladungs-E-Mails (Einmallink bzw.
        Magic Link) nutzen wir Brevo, einen Dienst der Brevo GmbH, Köpenicker
        Str. 126, 10179 Berlin. Brevo verarbeitet die Daten in unserem Auftrag als
        Auftragsverarbeiter nach Art. 28 DSGVO; die Datenschutzvereinbarung ist
        Bestandteil der Nutzungsbedingungen von Brevo. Verarbeitet werden Ihre
        E-Mail-Adresse und technische Versanddaten (Zeitpunkt, Betreff,
        Zustellstatus). Öffnungs- und Klickstatistiken werden anonymisiert,
        ohne Zuordnung zu einzelnen Personen, erfasst. Beim Öffnen der E-Mail
        oder beim Klick auf den Link erhält Brevo technisch bedingt Ihre
        IP-Adresse; nach Angaben von Brevo werden E-Mail-Adresse und
        IP-Adresse bei der anonymisierten Erfassung anonymisiert und Ihnen
        nicht zugeordnet. Inhaltsvorschauen der E-Mails speichert Brevo für
        uns nicht.
        {/* Quelle IP: Brevo-Hilfe „Can I anonymize the tracking of opens and clicks for my emails?“ (help.brevo.com/hc/en-us/articles/11643306229906), geprüft 2026-10-18 */}
        {" "}Die Verarbeitung erfolgt in Rechenzentren innerhalb der EU
        (Frankreich, Deutschland, Belgien). Brevo setzt außerdem
        Unterauftragsverarbeiter ein, die auch in Drittländern sitzen können
        (zum Beispiel Cloudflare); Übermittlungen dorthin stützen sich auf
        EU-Standardvertragsklauseln bzw. das EU-US Data Privacy Framework.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Hosting</h2>
      <p>
        Die Anwendung wird bei der Vercel Inc., USA, gehostet.
        Serverseitige Funktionen laufen in der EU (Frankfurt). Beim Aufruf der
        Plattform verarbeitet Vercel technische Verbindungsdaten wie Ihre
        IP-Adresse; einzelne Anfragen können dabei über das weltweit verteilte
        Netzwerk von Vercel laufen. Vercel ist nach dem EU-US Data Privacy
        Framework zertifiziert; die Übermittlung in die USA stützt sich daher
        auf den Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO) und
        zusätzlich auf die EU-Standardvertragsklauseln nach Art. 46 Abs. 2
        lit. c DSGVO, die in
        die Datenverarbeitungsvereinbarung (DPA) von Vercel eingebunden sind (
        <a href="https://vercel.com/legal/dpa">vercel.com/legal/dpa</a>).
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer und effizienter
        Betrieb der Plattform).
      </p>

      <h2>Datenbankdienst</h2>
      <p>
        Alle Nutzerdaten, Lernfortschritte und Nachweise werden in Supabase
        (Supabase Pte. Ltd., Singapur) gespeichert. Der Datenbankserver befindet
        sich in der EU (Frankfurt). Mit Supabase besteht ein
        Auftragsverarbeitungsvertrag. Da der Anbieter seinen Sitz außerhalb der
        EU hat und zu einer Unternehmensgruppe mit Gesellschaften in den USA
        gehört, sichern wir mögliche Zugriffe zusätzlich durch
        Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO ab.
      </p>

      <h2>Cookies und Session-Management</h2>
      <p>
        Die Plattform verwendet ausschließlich technisch notwendige Cookies,
        die Ihre Anmeldung aufrechterhalten (Anmelde-Cookie mit einer Laufzeit
        von bis zu 400 Tagen sowie ein kurzlebiges Cookie während des
        Anmeldevorgangs). Es werden keine Tracking- oder Analyse-Cookies
        eingesetzt. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG sowie Art. 6 Abs.
        1 lit. b DSGVO.
      </p>

      <h2>Technische Protokolle</h2>
      <p>
        Beim Aufruf der Plattform verarbeiten der Hosting-Anbieter und der
        Authentifizierungsdienst technische Daten (IP-Adresse, Zeitpunkt,
        aufgerufene Seite, Browser und Betriebssystem), um Betrieb und
        Sicherheit zu gewährleisten. Die Speicherdauer richtet sich nach den
        Vorgaben dieser Anbieter. Eigene Zugriffsprotokolle führen wir nicht.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>Keine automatisierte Entscheidung, keine KI-Dienste</h2>
      <p>
        Es findet derzeit keine automatisierte Entscheidungsfindung statt, und
        wir setzen auf der Plattform keine KI-Dienste ein. Ändert sich das,
        aktualisieren wir diese Erklärung vorab.
      </p>

      <h2>Speicherdauer</h2>
      <p>
        Wir speichern Ihre Daten, solange Ihr Nutzerkonto besteht und der Zweck
        der Qualifizierung und ihres Nachweises es erfordert. Darüber hinaus
        speichern wir Daten nur, soweit gesetzliche oder förderrechtliche
        Aufbewahrungspflichten es verlangen. Löschanfragen richten Sie bitte
        per E-Mail an info@climatejobsacademy.com. Wir löschen Ihr Nutzerkonto
        und die damit verbundenen Daten innerhalb eines Monats nach Eingang
        Ihrer Anfrage (Art. 12 Abs. 3 DSGVO), soweit keine
        Aufbewahrungspflichten entgegenstehen. Die Löschung erfolgt derzeit
        manuell. Nach dem Ende Ihrer Qualifizierung bewahren wir Ihre
        Nachweise (Anwesenheit, Lernfortschritt, Praxisberichte,
        Kompetenznachweise) auf, um Ihre Qualifizierung Ihnen gegenüber und
        gegenüber Fördergebern belegen zu können (Art. 6 Abs. 1 lit. f DSGVO,
        soweit gesetzlich vorgeschrieben Art. 6 Abs. 1 lit. c DSGVO). Eine
        feste Frist und eine automatische Löschung danach legen wir derzeit
        fest; bis dahin löschen wir auf Anfrage wie oben beschrieben.
      </p>
      <p>
        Beiträge zu Fragen und Antworten sowie Nachrichten im Kohorten-Chat
        speichern wir, solange die jeweilige Kohorte besteht; nach ihrem Ende
        bleiben sie für die Teilnehmenden zum Nachlesen verfügbar (Art. 6 Abs.
        1 lit. f DSGVO). Wird Ihr
        Nutzerkonto gelöscht, entfernen wir Text und Namen Ihrer Beiträge und
        Nachrichten; an ihrer Stelle erscheint ein Hinweis, dass der Beitrag
        gelöscht wurde, damit Antworten anderer verständlich bleiben. Eine
        automatische Löschung nach dem Ende der Kohorte
        ist derzeit nicht eingerichtet; auf Anfrage löschen wir sie wie oben
        beschrieben. Gelöschte Daten und Beiträge können bis
        zu sieben Tage in den täglichen Sicherungskopien (Backups) unseres
        Datenbankdienstes enthalten sein.
      </p>

      <h2>Weitergabe an Dritte</h2>
      <p>
        Personenbezogene Daten werden nicht verkauft oder zu Werbezwecken
        weitergegeben. Eine Weitergabe erfolgt ausschließlich an die
        technischen Dienstleister Vercel (Hosting), Supabase (Datenbank) und
        Brevo (E-Mail-Versand) sowie, soweit gesetzlich vorgeschrieben, an
        Behörden.
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art.
        16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und
        Datenübertragbarkeit (Art. 20). Soweit wir Daten auf Grundlage
        berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO) verarbeiten, können
        Sie dem aus Gründen, die sich aus Ihrer besonderen Situation ergeben,
        widersprechen (Art. 21 DSGVO); der Widerspruch ist an keine Form
        gebunden. Eine Einwilligung (zum Beispiel für Ihr Profilfoto) können
        Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3
        DSGVO); die bis dahin erfolgte Verarbeitung bleibt rechtmäßig. Zur
        Ausübung dieser Rechte:{" "}
        <a href="mailto:info@climatejobsacademy.com">info@climatejobsacademy.com</a>
      </p>

      <h2>Beschwerderecht</h2>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu
        beschweren, zum Beispiel bei der Sächsischen Datenschutz- und
        Transparenzbeauftragten, Devrientstraße 5, 01067 Dresden,{" "}
        <a href="https://www.saechsdsb.de/">www.saechsdsb.de</a>
      </p>

      <h2>Stand dieser Erklärung</h2>
      <p>
        Diese Datenschutzerklärung gilt für{" "}
        <a href="https://learn.climatejobsacademy.com/">
          https://learn.climatejobsacademy.com/
        </a>{" "}
        und wurde zuletzt am 13.10.2026 aktualisiert.
      </p>
    </main>
  );
}
