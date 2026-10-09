// Feste Demo-Daten und Texte für den Praxisflow-Demo (Investor-Demo
// 15.10.2026, Branch demo). Keine Datenbank, kein Upload: alles hier ist
// Platzhalter. Keine Herstellerinhalte, keine Auszüge aus Normen.

export type PhaseId = "analyse" | "planen" | "entscheiden" | "durchfuehren" | "kontrolle" | "bewerten";

export const PHASEN: { id: PhaseId; name: string }[] = [
  { id: "analyse", name: "Analyse" },
  { id: "planen", name: "Planen" },
  { id: "entscheiden", name: "Entscheiden" },
  { id: "durchfuehren", name: "Durchführen" },
  { id: "kontrolle", name: "Kontrolle" },
  { id: "bewerten", name: "Bewerten" },
];

// Nur für das Demo, clientseitig, nicht für den Piloten. Im Piloten prüft der Server das Codewort.
export const DEMO_CODEWORT = "werkstatt";

/** Feste Punkteskala der Bewertung (keine Schulnoten). */
export const PUNKTE_SKALA = [10, 9, 7, 5, 3, 0] as const;

/** Präfix aller Browser-Schlüssel dieses Demos; "Demo zurücksetzen" löscht nur diese. */
export const SPEICHER_PRAEFIX = "cja-praxisflow-demo:";

export type DemoSchritt = { id: string; text: string; kontrollierbar: boolean; hinweis?: string };

export const DEMO_AUFTRAG = {
  kennzeichnung: "Demo",
  titel: "Demo-Auftrag: Übungsaufbau in der Werkstatt",
  banner:
    "Dies ist ein Demo mit Beispieldaten. Texte sind Platzhalter, nichts wird an den Server übertragen. Der Stand bleibt nur in diesem Browser.",
  ort: "Werkstatt (Demo)",
};

export const TEXTE = {
  analyse: {
    instruktion:
      "Lies den Arbeitsauftrag und das Material in Ruhe durch. Kläre für dich, was am Ende fertig sein muss, bevor du planst.",
    definitionOfDone: [
      "Du kannst den Auftrag in eigenen Worten wiedergeben.",
      "Du weißt, welches Material und welches Werkzeug du brauchst.",
      "Offene Fragen hast du notiert.",
    ],
    arbeitsauftrag:
      "Baue den Übungsaufbau auf dem Werkstattbrett nach der Vorlage auf. Arbeite sauber und so, dass eine zweite Person jeden Schritt nachvollziehen kann. (Platzhaltertext für das Demo.)",
    material: [
      { titel: "Vorlage Übungsaufbau (Demo)", beschreibung: "Skizze mit Maßen, Platzhalter." },
      { titel: "Arbeitsblatt Ablauf (Demo)", beschreibung: "Kurze Beschreibung der Arbeitsweise, Platzhalter." },
    ],
    zusatzinfos: [
      {
        titel: "Warum zuerst analysieren?",
        text: "Wer den Auftrag vorher versteht, plant weniger Umwege. Diese Phase hat bewusst keine Eingabe.",
      },
      {
        titel: "Wie lange dauert der Auftrag?",
        text: "Für das Demo etwa 90 Minuten. Die Zeitangabe ist ein Platzhalter.",
      },
    ],
  },
  planen: {
    instruktion:
      "Lege fest, in welchen Schritten du vorgehst. Bringe die Schritte in die richtige Reihenfolge und markiere, welche die Trainer:in später kontrollieren soll.",
    definitionOfDone: [
      "Alle Schritte vom Start bis zum aufgeräumten Arbeitsplatz stehen in der Liste.",
      "Die Reihenfolge ist so, wie du arbeiten wirst.",
      "Mindestens ein Schritt ist als kontrollierbar markiert.",
    ],
    material: ["Werkstattbrett (Demo)", "Befestigungsmaterial (Demo)", "Bauteile laut Vorlage (Demo)"],
    werkzeug: ["Maßband", "Bleistift", "Akkuschrauber", "Seitenschneider"],
  },
  entscheiden: {
    instruktion:
      "Besprich deinen Plan mit der Trainer:in. Wenn der Plan passt, gibt sie ihn mit dem Codewort frei.",
    hinweisAbnahme: "Die Trainer:in nimmt deinen Plan ab und gibt das Codewort ein.",
  },
  durchfuehren: {
    instruktion: "Arbeite deine geplanten Schritte der Reihe nach ab und hake jeden Schritt ab, wenn er fertig ist.",
    hinweisGate: "Wenn alle Schritte abgehakt sind, gibt die Trainer:in die Durchführung mit dem Codewort frei.",
    nichtWeiterStandard:
      "Halte kurz an und lies den Schritt noch einmal in deinem Plan nach. Hilft das nicht, frag die Trainer:in. (Platzhalter)",
  },
  kontrolle: {
    instruktion: "Dokumentiere kurz dein Ergebnis und mache ein Foto vom fertigen Aufbau.",
    dokumentation:
      "Der Aufbau ist nach Vorlage fertig. Die Trainer:in geht mit dir das Prüfprotokoll durch. (Platzhalter)",
    hinweisProtokoll: "Das Prüfprotokoll wird auf Papier gemeinsam mit der Trainer:in durchgegangen.",
    hinweisFoto: "Das Foto wird nur hier im Browser angezeigt. Es wird nicht hochgeladen und nicht gespeichert.",
  },
  bewerten: {
    instruktion:
      "Die Trainer:in bewertet die als kontrollierbar markierten Schritte mit der festen Punkteskala.",
    ohneKontrollierbare: "Es ist kein Schritt als kontrollierbar markiert. Es gibt nichts zu bewerten.",
    status: "Verifizierung durch AfCJ läuft",
    statusText: "Die Bewertung ist abgeschlossen. Im Demo passiert danach nichts weiter.",
  },
  codewort: {
    label: "Codewort der Trainer:in",
    falsch: "Das Codewort stimmt nicht.",
    gesperrt: "Erst alle Schritte abhaken.",
  },
};

/** Vorbefüllte Arbeitsschritte für die Phase Planen. */
export const DEMO_SCHRITTE: DemoSchritt[] = [
  {
    id: "s1",
    text: "Arbeitsplatz einrichten und Material bereitlegen",
    kontrollierbar: false,
    hinweis: "Lege alles aus der Materialliste vor dich, bevor du anfängst. (Platzhalter)",
  },
  {
    id: "s2",
    text: "Positionen nach Vorlage auf dem Brett anzeichnen",
    kontrollierbar: true,
    hinweis: "Miss von derselben Kante aus, dann stimmen die Abstände. (Platzhalter)",
  },
  {
    id: "s3",
    text: "Bauteile befestigen",
    kontrollierbar: true,
    hinweis: "Prüfe nach jedem Bauteil, ob es fest sitzt. (Platzhalter)",
  },
  {
    id: "s4",
    text: "Verbindungen nach Vorlage herstellen",
    kontrollierbar: true,
    hinweis: "Vergleiche jede Verbindung mit der Skizze. (Platzhalter)",
  },
  {
    id: "s5",
    text: "Arbeitsplatz aufräumen",
    kontrollierbar: false,
  },
];
