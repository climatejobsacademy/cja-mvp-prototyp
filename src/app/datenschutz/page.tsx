export const metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  // Optional, nach Veröffentlichung:
  // (1) DPF-Zertifizierung von Vercel optional prüfen und ergänzen.
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
        Bei Fragen zum Datenschutz erreichen Sie uns unter dieser Adresse.
      </p>

      <h2>Account und Authentifizierung</h2>
      <p>
        Für die Nutzung der Plattform wird ein Nutzerkonto benötigt. Konten
        werden ausschließlich durch das zuständige Personal der Akademie für
        Klimajobs angelegt, eine Selbstregistrierung ist nicht möglich. Zur
        Anmeldung versenden wir einen Einmallink (Magic Link) an Ihre
        hinterlegte E-Mail-Adresse. Es wird kein Passwort gespeichert.
        Verarbeitet werden E-Mail-Adresse, Name, Benutzername, zugeordnete Rolle
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
        mit Kommentar sowie daraus abgeleitete Kompetenznachweise. Einsehbar
        sind diese Daten für Sie selbst und für berechtigtes Personal der
        Akademie für Klimajobs. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>Uploads</h2>
      <p>
        Derzeit können Lernende keine Dateien oder Medien auf die Plattform
        hochladen. Sollte sich das ändern, ergänzen wir diese Erklärung vorab.
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
        ohne Zuordnung zu einzelnen Personen, erfasst.
        {/* TODO Vera: Aussage zu IP-Adresse beim anonymen Tracking prüfen (Brevo-Hilfeartikel nennt sie nicht), ggf. Brevo-Support fragen */}
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
        Netzwerk von Vercel laufen. Die Übermittlung in die USA stützt sich auf
        die EU-Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO, die in
        die Datenverarbeitungsvereinbarung (DPA) von Vercel eingebunden sind (
        <a href="https://vercel.com/legal/dpa">vercel.com/legal/dpa</a>).
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer und effizienter
        Betrieb der Plattform).
      </p>

      <h2>Datenbankdienst</h2>
      <p>
        Alle Nutzerdaten, Lernfortschritte und Nachweise werden in Supabase
        (Supabase Inc., USA) gespeichert. Der Datenbankserver befindet sich in
        der EU (Frankfurt). Mit Supabase besteht ein Auftragsverarbeitungsvertrag.
        Da der Anbieter seinen Konzernsitz in den USA hat, sichern wir mögliche
        Zugriffe zusätzlich durch Standardvertragsklauseln nach Art. 46 Abs. 2
        lit. c DSGVO ab.
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

      <h2>Keine automatisierte Entscheidung, keine KI-Verarbeitung</h2>
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
        per E-Mail an info@climatejobsacademy.com. Wir prüfen sie und
        beantworten sie innerhalb der gesetzlichen Frist von einem Monat (Art.
        12 Abs. 3 DSGVO).
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
        widersprechen (Art. 21 DSGVO). Zur Ausübung dieser Rechte:{" "}
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
        und wurde zuletzt am 02.10.2026 aktualisiert.
      </p>
    </main>
  );
}
