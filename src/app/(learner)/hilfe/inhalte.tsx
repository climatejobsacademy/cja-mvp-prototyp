import type { ReactNode } from "react";

// Hilfe-Seite (Anna 2026-11-01, SR folgt): dieselben Fragen und Antworten wie
// die Kurzanleitung (docs/ux/hilfe/). Bilder in public/hilfe, mit den
// Markierungen aus der Anleitung; die Zahl im Text zeigt auf die Markierung.

/** Nummer im Text, passend zur Markierung im Bild. */
function Nr({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex size-[18px] items-center justify-center rounded-full bg-lime align-[1px] text-[11px] font-bold text-on-lime">
      {children}
    </span>
  );
}

export type HilfeFrage = {
  id: string;
  titel: string;
  antwort: ReactNode;
  /** Bild in public/hilfe; breite = Anzeigebreite in px */
  bild?: { datei: string; breite: number; hoehe: number };
};

export type HilfeGruppe = { titel: string; fragen: HilfeFrage[] };

export const HILFE: HilfeGruppe[] = [
  {
    titel: "Loslegen",
    fragen: [
      {
        id: "anmelden",
        titel: "Wie melde ich mich an?",
        antwort: (
          <>
            <ol>
              <li>
                Öffne <b>learn.climatejobsacademy.com</b>.
              </li>
              <li>
                Gib deine E-Mail-Adresse ein und tippe auf <b>Anmeldelink anfordern</b> <Nr>1</Nr>.
              </li>
              <li>Öffne die E-Mail und tippe auf den Link. Fertig, du bist angemeldet.</li>
            </ol>
            <p>
              Du brauchst <b>kein Passwort</b>. Der Link gilt nur kurz und nur einmal. Kommt keine E-Mail an, schau im
              Spam-Ordner nach oder fordere einfach einen neuen Link an.
            </p>
          </>
        ),
        bild: { datei: "frage-01.jpg", breite: 418, hoehe: 279 },
      },
      {
        id: "home",
        titel: "Was zeigt mir „Home“?",
        antwort: (
          <>
            <p>
              Home zeigt dir, <b>was heute dran ist</b>.
            </p>
            <ul>
              <li>
                <Nr>1</Nr> Die große Karte: dein nächster Termin oder deine Aufgabe für heute, mit dem passenden Knopf,
                z. B. <b>Zum Live-Unterricht</b>. Ist heute frei, steht hier, wann es weitergeht.
              </li>
              <li>
                <Nr>2</Nr> Deine Kompetenzen im aktuellen Modul und wie weit du bist.
              </li>
            </ul>
            <p>
              Oben findest du die vier Bereiche <b>Home, Stundenplan, Kompetenzen, Programm</b>. Am Handy stehen sie
              unten am Bildschirmrand.
            </p>
          </>
        ),
        bild: { datei: "frage-02.jpg", breite: 608, hoehe: 532 },
      },
      {
        id: "handy",
        titel: "Kann ich die Plattform am Handy nutzen?",
        antwort: (
          <>
            <p>
              Ja. Öffne die Adresse einfach im Browser deines Handys. Die vier Bereiche findest du dort <b>unten</b>{" "}
              <Nr>1</Nr>.
            </p>
            <p>
              <b>Tipp:</b> Leg dir die Plattform auf den Startbildschirm.
            </p>
            <ul>
              <li>
                <b>iPhone (Safari):</b> Teilen-Symbol → „Zum Home-Bildschirm“
              </li>
              <li>
                <b>Android (Chrome):</b> Menü ⋮ → „Zum Startbildschirm hinzufügen“
              </li>
            </ul>
          </>
        ),
        bild: { datei: "frage-03.jpg", breite: 258, hoehe: 560 },
      },
    ],
  },
  {
    titel: "Lernen",
    fragen: [
      {
        id: "live",
        titel: "Wie trete ich dem Live-Unterricht bei?",
        antwort: (
          <>
            <p>Der Live-Unterricht findet online statt. So kommst du hinein:</p>
            <ul>
              <li>
                <b>Auf Home:</b> Am Tag des Unterrichts zeigt die große Karte <b>Zum Live-Unterricht</b>.
              </li>
              <li>
                <b>Im Stundenplan:</b> Ab 15 Minuten vor Beginn führt dich ein Klick auf den Termin direkt in den
                Live-Raum.
              </li>
              <li>
                <b>In der Lektion:</b> Tippe auf <b>Beitreten</b> <Nr>1</Nr>.
              </li>
            </ul>
            <p>Der Live-Raum öffnet sich in einem neuen Fenster. Am besten mit Kopfhörern und einige Minuten vor Beginn.</p>
          </>
        ),
        bild: { datei: "frage-04.jpg", breite: 547, hoehe: 173 },
      },
      {
        id: "stundenplan",
        titel: "Wie lese ich meinen Stundenplan?",
        antwort: (
          <>
            <ul>
              <li>
                <Nr>1</Nr> Wechsle zwischen <b>Tag, Woche und Monat</b>. Mit den Pfeilen blätterst du vor und zurück.
              </li>
              <li>
                <Nr>2</Nr> Ein Klick auf einen Termin öffnet die Lektion.
              </li>
              <li>
                <Nr>3</Nr> Unter <b>Flexibel</b> stehen Aufgaben ohne feste Uhrzeit: <b>Wissen festigen</b> und{" "}
                <b>Fachsprache</b>. Die machst du, wann es dir passt.
              </li>
            </ul>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Farbe klasse="bg-brand">Lila = Live-Unterricht (online)</Farbe>
              <Farbe klasse="bg-praxis">Orange = Praxis (vor Ort)</Farbe>
              <Farbe klasse="bg-self">Grün = Selbstlernen</Farbe>
            </p>
          </>
        ),
        bild: { datei: "frage-05.jpg", breite: 608, hoehe: 425 },
      },
      {
        id: "praxistag",
        titel: "Was ist an einem Praxistag?",
        antwort: (
          <>
            <p>
              An Praxistagen arbeitest du <b>vor Ort in der Werkstatt</b>. Sie sind im Stundenplan{" "}
              <b>orange</b>.
            </p>
            <p>
              Im Termin <Nr>1</Nr> stehen Uhrzeit, Ort, die Aufgabe und wer dich begleitet. Tippe auf den Tag, dann
              siehst du alles in der Tagesansicht. Was du in der Praxis gezeigt hast, bestätigt deine Trainer:in. Dann
              zählt es zu deinen Kompetenzen.
            </p>
          </>
        ),
        bild: { datei: "frage-06.jpg", breite: 547, hoehe: 326 },
      },
      {
        id: "wissen-festigen",
        titel: "Was bedeutet „Wissen festigen“?",
        antwort: (
          <>
            <p>
              Zu jedem Live-Unterricht gehört eine Selbstlern-Lektion <b>Wissen festigen</b>. Darin wiederholst du das
              Wichtigste, lernst die Begriffe und prüfst dich mit einem kurzen Quiz.
            </p>
            <ul>
              <li>
                Du findest sie im Stundenplan unter <b>Flexibel</b> und auf der Seite zum Live-Unterricht über den Knopf{" "}
                <b>Wissen festigen</b>.
              </li>
              <li>
                Oben siehst du, in welchem Kapitel du bist und wie weit <Nr>1</Nr>. Mit <b>Weiter</b> geht es zum
                nächsten Schritt.
              </li>
              <li>Du kannst jederzeit aufhören und später weitermachen.</li>
            </ul>
          </>
        ),
        bild: { datei: "frage-07.jpg", breite: 471, hoehe: 412 },
      },
      {
        id: "fachsprache",
        titel: "Was ist „Fachsprache“?",
        antwort: (
          <>
            <p>
              In <b>Fachsprache</b> lernst du in etwa 15 Minuten die wichtigsten Fachwörter zum Thema des Tages: mit
              Bild, Erklärung und Beispielsatz.
            </p>
            <ul>
              <li>
                Mit dem Lautsprecher-Symbol <Nr>1</Nr> hörst du, wie man das Wort ausspricht.
              </li>
              <li>Danach folgen ein kurzes Quiz und Übungen mit Sätzen.</li>
            </ul>
          </>
        ),
        bild: { datei: "frage-08.jpg", breite: 471, hoehe: 412 },
      },
      {
        id: "unterlagen",
        titel: "Wo finde ich die Unterlagen zur Lektion?",
        antwort: (
          <p>
            Öffne die Lektion, zum Beispiel aus dem Stundenplan. Unter <b>Zum Nachlesen</b> <Nr>1</Nr> findest du die
            Unterlagen zum Unterricht. Ein Tipp öffnet sie, du kannst sie ansehen und herunterladen.
          </p>
        ),
        bild: { datei: "frage-09.jpg", breite: 547, hoehe: 141 },
      },
      {
        id: "frage-stellen",
        titel: "Wie stelle ich eine Frage zur Lektion?",
        antwort: (
          <>
            <p>
              Unten auf jeder Seite zum Live-Unterricht gibt es <b>Fragen zur Lektion</b> <Nr>1</Nr>. Schreib deine Frage ins Feld und
              tippe auf den Pfeil. Deine Trainer:in und deine Kohorte sehen sie und können antworten.
            </p>
            <p>
              Mit dem Pfeil-Kreis oben rechts holst du neue Antworten. Bitte schreib keine sensiblen Daten und keine
              Daten anderer Personen.
            </p>
          </>
        ),
        bild: { datei: "frage-10.jpg", breite: 547, hoehe: 167 },
      },
    ],
  },
  {
    titel: "Fortschritt und Programm",
    fragen: [
      {
        id: "kompetenzen",
        titel: "Was sind Kompetenzen und wie wächst mein Fortschritt?",
        antwort: (
          <>
            <p>
              Eine <b>Kompetenz</b> ist etwas, das du am Ende sicher kannst, z. B. „Fünf Sicherheitsregeln anwenden“.
              Jede Kompetenz besteht aus mehreren <b>Kompetenzschritten</b>.
            </p>
            <p>
              Der Ring <Nr>1</Nr> zeigt, wie viele Kompetenzschritte du schon erreicht hast. Ein Kompetenzschritt zählt, wenn
            </p>
            <ul>
              <li>du eine Selbstlern-Lektion abgeschlossen hast,</li>
              <li>deine Teilnahme am Live-Unterricht bestätigt ist oder</li>
              <li>deine Trainer:in eine Praxisaufgabe bestätigt hat.</li>
            </ul>
            <p>
              Tippe auf eine Kompetenz: Unter <b>Hier lernst du das</b> <Nr>2</Nr> siehst du, in welchen Lektionen und
              Praxisaufgaben du sie übst.
            </p>
          </>
        ),
        bild: { datei: "frage-11.jpg", breite: 471, hoehe: 371 },
      },
      {
        id: "programm",
        titel: "Wo sehe ich mein Programm und meine Module?",
        antwort: (
          <>
            <p>
              Unter <b>Programm</b> siehst du deinen ganzen Weg durch die Ausbildung.
            </p>
            <ul>
              <li>
                <Nr>1</Nr> <b>Hier bist du</b> zeigt dein aktuelles Modul.
              </li>
              <li>
                <Nr>2</Nr> Darunter: wie viele Kompetenzschritte und Lerntage du im Modul schon geschafft hast.
              </li>
              <li>Ein Klick auf ein Modul öffnet seine Inhalte, Woche für Woche mit allen Lektionen.</li>
            </ul>
          </>
        ),
        bild: { datei: "frage-12.jpg", breite: 608, hoehe: 324 },
      },
      {
        id: "kohorte",
        titel: "Wer ist in meiner Kohorte und wer sind meine Ansprechpersonen?",
        antwort: (
          <p>
            Ganz unten auf der Seite <b>Programm</b> siehst du deine <b>Kohorte</b>, also die Gruppe, mit der du lernst{" "}
            <Nr>1</Nr>, und deine <b>Ansprechpersonen</b> <Nr>2</Nr>, zum Beispiel deine Trainer:innen.
          </p>
        ),
        bild: { datei: "frage-13.jpg", breite: 608, hoehe: 152 },
      },
    ],
  },
  {
    titel: "Austausch und Hilfe",
    fragen: [
      {
        id: "chat",
        titel: "Wie funktioniert der Chat?",
        antwort: (
          <>
            <p>
              Über den runden lila Knopf unten rechts öffnest du den <b>Chat deiner Kohorte</b>. Eine Zahl am Knopf zeigt
              neue Nachrichten.
            </p>
            <ul>
              <li>
                <b>Ankündigungen:</b> Hier schreiben deine Trainer:innen und die Academy for Climate Jobs. Du liest mit.
              </li>
              <li>
                <b>Treffpunkt:</b> Hier tauschst du dich mit deiner Kohorte aus.
              </li>
            </ul>
            <p>
              Bitte beachte die <b>Chat-Regeln</b> (Link unten im Chat-Fenster).
            </p>
          </>
        ),
        bild: { datei: "frage-14.jpg", breite: 350, hoehe: 242 },
      },
      {
        id: "profil",
        titel: "Wo ändere ich mein Profil oder melde mich ab?",
        antwort: (
          <p>
            Tippe oben rechts auf dein Bild oder deine Initialen. Dort siehst du dein Programm und deine Kohorte, kannst
            dein <b>Profil bearbeiten</b> <Nr>1</Nr> (z. B. ein Foto hochladen) und dich <b>abmelden</b> <Nr>2</Nr>.
            Hier findest du auch diese Hilfe.
          </p>
        ),
        bild: { datei: "frage-15.jpg", breite: 304, hoehe: 358 },
      },
      {
        id: "kontakt",
        titel: "Wer hilft mir, wenn etwas nicht klappt?",
        antwort: (
          <>
            <p>
              Melde dich bei <b>Malte</b>:{" "}
              <a href="mailto:m.schmiedinghoff@climatejobsacademy.com" className="font-semibold text-brand hover:underline">
                m.schmiedinghoff@climatejobsacademy.com
              </a>
            </p>
            <p>
              Bei Fragen zum Inhalt einer Lektion hilft dir <b>Fragen zur Lektion</b>. Bei allem anderen kannst du auch
              im <b>Chat</b> fragen.
            </p>
            <p>
              <b>Seite leer oder etwas fehlt?</b> Lade die Seite einmal neu. Hilft das nicht, melde dich ab und wieder an.
            </p>
          </>
        ),
      },
    ],
  },
];

function Farbe({ klasse, children }: { klasse: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i aria-hidden="true" className={`inline-block size-3 rounded-[4px] ${klasse}`} />
      {children}
    </span>
  );
}
