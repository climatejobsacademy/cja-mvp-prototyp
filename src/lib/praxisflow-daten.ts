// Feste Demo-Daten und Texte für den Praxisflow-Demo (Investor-Demo
// 15.10.2026, Branch demo). Keine Datenbank, kein Upload: alles hier ist
// Platzhalter. Keine Herstellerinhalte, keine Auszüge aus Normen.
//
// HIER SETZT DAS TEAM SEINE INHALTE EIN:
//   1. PHASEN_TEXTE: je Phase "instruktion" und "hastDuAlles" (Kriterien-Box)
//   2. DATEIEN: Dateien der Analyse (Datei nach public/praxisflow-demo/)
//   3. BEWERTUNGSKRITERIEN: Kriterien für Selbst- und Fremdeinschätzung
//   4. DEMO_AUFTRAG und TEXTE: Titel, Arbeitsauftrag und übrige Texte

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

export const DEMO_AUFTRAG = {
  kennzeichnung: "Demo",
  titel: "Demo-Auftrag: Übungsaufbau in der Werkstatt",
  banner:
    "Dies ist ein Demo mit Beispieldaten. Texte sind Platzhalter, nichts wird an den Server übertragen. Der Stand bleibt nur in diesem Browser.",
};

// ---------------------------------------------------------------------------
// 1. Instruktion und "Hast du alles?" je Phase
// "hastDuAlles" ist eine Liste kurzer Kriterien; eine leere Liste blendet die
// Box aus. Platzhalter sind mit "(Platzhalter)" gekennzeichnet.
// ---------------------------------------------------------------------------
export const PHASEN_TEXTE: Record<PhaseId, { instruktion: string; hastDuAlles: string[] }> = {
  analyse: {
    instruktion:
      "Lies den Arbeitsauftrag und die Dateien in Ruhe durch. Kläre für dich, was am Ende fertig sein muss, bevor du planst. (Platzhalter)",
    hastDuAlles: [
      "Du kannst den Auftrag in eigenen Worten wiedergeben. (Platzhalter)",
      "Du hast alle Dateien gelesen. (Platzhalter)",
      "Offene Fragen hast du notiert. (Platzhalter)",
    ],
  },
  planen: {
    instruktion:
      "Trage ein, welche Werkzeuge und Materialien du brauchst und in welchen Schritten du vorgehst. Bringe die Arbeitsschritte in die richtige Reihenfolge. (Platzhalter)",
    hastDuAlles: [
      "Alle Werkzeuge und Materialien stehen in den Listen. (Platzhalter)",
      "Alle Arbeitsschritte vom Start bis zum aufgeräumten Arbeitsplatz stehen in der Liste. (Platzhalter)",
      "Die Reihenfolge ist so, wie du arbeiten wirst. (Platzhalter)",
    ],
  },
  entscheiden: {
    instruktion: "Geh deinen Plan mit der Trainer:in durch. Wenn der Plan passt, gibt sie ihn frei. (Platzhalter)",
    hastDuAlles: ["Du kannst jeden Schritt deines Plans begründen. (Platzhalter)"],
  },
  durchfuehren: {
    instruktion: "Arbeite deine geplanten Schritte der Reihe nach ab und hake jeden Schritt ab, wenn er fertig ist. (Platzhalter)",
    hastDuAlles: ["Alle Schritte sind abgehakt. (Platzhalter)", "Der Arbeitsplatz ist aufgeräumt. (Platzhalter)"],
  },
  kontrolle: {
    instruktion: "Dokumentiere kurz dein Ergebnis und mache ein Foto vom fertigen Aufbau. (Platzhalter)",
    hastDuAlles: ["Das Foto zeigt den ganzen Aufbau. (Platzhalter)"],
  },
  bewerten: {
    instruktion:
      "Schätze zuerst selbst ein, wie gut dir der Auftrag gelungen ist. Danach schätzt die Trainer:in ein. (Platzhalter)",
    hastDuAlles: [],
  },
};

// ---------------------------------------------------------------------------
// 2. Dateien in der Analyse
// Neuer Eintrag: Datei nach public/praxisflow-demo/ legen und hier
// { titel: "Anzeigename", dateiname: "dateiname.pdf" } ergänzen. Dateiname
// nur mit a-z, 0-9 und Bindestrich, keine Leerzeichen. Die App verlinkt
// /praxisflow-demo/<dateiname> (Anzeigen im neuen Tab und Herunterladen).
// Keine externen Links. Die Dateien sind nur mit Login erreichbar
// (middleware.ts), liegen aber im Repo -- nichts Vertrauliches ablegen.
// ---------------------------------------------------------------------------
export const DATEIEN_ORDNER = "/praxisflow-demo";

export const DATEIEN: { titel: string; dateiname: string }[] = [
  { titel: "Vorlage Übungsaufbau (Platzhalter)", dateiname: "platzhalter-vorlage.pdf" },
  { titel: "Arbeitsblatt Ablauf (Platzhalter)", dateiname: "platzhalter-arbeitsblatt.pdf" },
];

// ---------------------------------------------------------------------------
// 3. Bewertungskriterien (Selbst- und Fremdeinschätzung)
// Jedes Kriterium wird mit PUNKTE_SKALA bewertet. "id" eindeutig und stabil
// lassen (Kleinbuchstaben), sie dient als Schlüssel im Browser-Speicher.
// ---------------------------------------------------------------------------
export const BEWERTUNGSKRITERIEN: { id: string; titel: string }[] = [
  { id: "k1", titel: "Kriterium 1 (Platzhalter): Arbeitsplanung" },
  { id: "k2", titel: "Kriterium 2 (Platzhalter): Sorgfalt in der Ausführung" },
  { id: "k3", titel: "Kriterium 3 (Platzhalter): Ergebnis entspricht der Vorlage" },
  { id: "k4", titel: "Kriterium 4 (Platzhalter): Ordnung am Arbeitsplatz" },
];

// ---------------------------------------------------------------------------
// 4. Übrige Texte
// ---------------------------------------------------------------------------
export const TEXTE = {
  hastDuAllesTitel: "Hast du alles?",
  analyse: {
    arbeitsauftrag:
      "Baue den Übungsaufbau auf dem Werkstattbrett nach der Vorlage auf. Arbeite sauber und so, dass eine zweite Person jeden Schritt nachvollziehen kann. (Platzhalter)",
  },
  planen: {
    gesperrt: "Trage mindestens einen Arbeitsschritt ein, dann geht es weiter zu Entscheiden.",
  },
  durchfuehren: {
    /** Hinweis an einem noch gesperrten Schritt; nr = Nummer des Vorgängers. */
    gesperrt: (nr: number) => `Zuerst Schritt ${nr} abschließen.`,
    // Wird gerade nicht angezeigt ("Ich komme nicht weiter" ist ausgeblendet,
    // siehe schritte-checkliste.tsx), bleibt für die spätere Wiederverwendung.
    nichtWeiterStandard:
      "Halte kurz an und lies den Schritt noch einmal in deinem Plan nach. Hilft das nicht, frag die Trainer:in. (Platzhalter)",
  },
  kontrolle: {
    dokumentation: "Der Aufbau ist nach Vorlage fertig. Die Trainer:in geht mit dir das Prüfprotokoll durch. (Platzhalter)",
    hinweisProtokoll: "Das Prüfprotokoll wird auf Papier gemeinsam mit der Trainer:in durchgegangen.",
  },
  bewerten: {
    selbstTitel: "Selbsteinschätzung",
    selbstText: "Wähle je Kriterium, wie viele Punkte du dir selbst gibst.",
    fremdTitel: "Fremdeinschätzung durch die Trainer:in",
    fremdText: "Die Trainer:in wählt je Kriterium die Punkte.",
    status: "Verifizierung durch AfCJ läuft",
    statusText: "Die Bewertung ist abgeschlossen. Im Demo passiert danach nichts weiter.",
  },
  // Hinweis direkt am jeweiligen Codewort-Feld
  gates: {
    entscheiden: "Die Trainer:in nimmt deinen Plan ab und gibt ihn mit dem Codewort frei.",
    durchfuehren: "Wenn alle Schritte abgehakt sind, gibt die Trainer:in die Durchführung mit dem Codewort frei.",
    kontrolle: "Die Trainer:in prüft mit dir das Ergebnis und gibt die Kontrolle mit dem Codewort frei.",
    bewerten: "Die Trainer:in schaltet ihre Einschätzung mit dem Codewort frei.",
  },
  codewort: {
    label: "Codewort der Trainer:in",
    falsch: "Das Codewort stimmt nicht.",
    gesperrtDurchfuehren: "Erst alle Schritte abhaken.",
    gesperrtBewerten: "Erst die Selbsteinschätzung für alle Kriterien ausfüllen.",
  },
};
