export const metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  // Offen vor Veröffentlichung:
  // (1) DPF-Zertifizierung von Vercel auf dataprivacyframework.gov gegenprüfen,
  //     Text bei Wechsel oder Pro-Upgrade anpassen.
  // (2) Microsoft-Teams-Formulierung bei Live-Sessions von Vera bestätigen lassen.
  // (3) Brevo-Vertragspartner laut Auftragsverarbeitungsvertrag prüfen und bei
  //     Bedarf im Text ergänzen.
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

      <h2>Live-Sessions</h2>
      <p>
        Live-Sessions finden über externe Videokonferenzdienste statt (derzeit
        Microsoft Teams). Auf der Plattform speichern wir den Termin, den
        Zugangslink und Ihre Anwesenheit. Für die Verarbeitung im jeweiligen
        Videokonferenzdienst gelten dessen Datenschutzhinweise.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2>E-Mail-Versand</h2>
      <p>
        Für den Versand von Einmallinks und Einladungen nutzen wir Brevo. Dabei
        wird Ihre E-Mail-Adresse an Brevo übermittelt. Brevo hat seinen Sitz in
        der EU; Details regelt der mit Brevo geschlossene
        Auftragsverarbeitungsvertrag. Rechtsgrundlage: Art. 6 Abs. 1 lit. b
        DSGVO.
      </p>

      <h2>Hosting</h2>
      <p>
        Die Plattform wird über Vercel (Vercel Inc., USA) bereitgestellt.
        Serverseitige Funktionen laufen in der EU (Frankfurt). Beim Aufruf der
        Plattform verarbeitet Vercel technische Verbindungsdaten wie Ihre
        IP-Adresse; einzelne Anfragen können dabei über das weltweit verteilte
        Netzwerk von Vercel laufen. Die Übermittlung in die USA stützt sich auf
        den Angemessenheitsbeschluss der EU-Kommission zum EU-US Data Privacy
        Framework (Art. 45 DSGVO), unter dem Vercel zertifiziert ist.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer und effizienter
        Betrieb der Plattform).
      </p>

      <h2>Datenbankdienst</h2>
      <p>
        Alle Nutzerdaten, Lernfortschritte und Nachweise werden in Supabase
        (Supabase Inc., USA) gespeichert. Der Datenbankserver befindet sich in
        der EU (Irland). Mit Supabase besteht ein Auftragsverarbeitungsvertrag.
        Da der Anbieter seinen Konzernsitz in den USA hat, sichern wir mögliche
        Zugriffe zusätzlich durch Standardvertragsklauseln nach Art. 46 Abs. 2
        lit. c DSGVO ab.
      </p>

      <p>Stand: 30.09.2026</p>
    </main>
  );
}
