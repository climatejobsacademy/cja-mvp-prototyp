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
  // Begriffe der vollständigen Handlung, wie im Unterricht (Partner-Feedback
  // 15.10., Anna 2026-10-20). Die ids bleiben, nur die Namen ändern sich.
  { id: "analyse", name: "Informieren" },
  { id: "planen", name: "Planen" },
  { id: "entscheiden", name: "Entscheiden" },
  { id: "durchfuehren", name: "Ausführen" },
  { id: "kontrolle", name: "Kontrollieren" },
  { id: "bewerten", name: "Bewerten" },
];

// Instruktionstext und Box "Hast du alles?" je Phase (PHASEN_TEXTE). Beide
// vorerst ausgeblendet; true blendet sie wieder ein. Kein Weiter hängt daran.
export const ZEIGE_INSTRUKTION = false;
export const ZEIGE_CHECKLISTE = false;

// Für das Investor-Demo aus, für Energiehelden auf true.
// (Box "Prüfprotokoll auf Papier" in der Phase Kontrolle, TEXTE.kontrolle.hinweisProtokoll)
export const ZEIGE_PRUEFPROTOKOLL_HINWEIS = false;

// Nur für das Demo, clientseitig, nicht für den Piloten. Im Piloten prüft der Server das Codewort.
export const DEMO_CODEWORT = "werkstatt";

/**
 * Uploads nur dort, wo die Partner sie im Feedback vom 15.10. genannt haben
 * (Anna 2026-10-20): unterschriebener Auftrag, Pläne und Zeichnungen,
 * Prüfprotokoll. Formate laut Simon; die Liste der Partner steht noch aus.
 */
export const UPLOAD_FORMATE = {
  auftrag: "image/*,application/pdf",
  plaene: "image/*,application/pdf,.dwg,.dxf,.glb",
  protokoll: "application/pdf,image/*",
};

/** Diktat in Planen: aus (zwölf Personen in einem Raum, Schreiben übt Fachdeutsch; Anna 2026-10-20). */
export const DIKTAT_AN = false;

/**
 * Prüflisten in Kontrollieren (Anna 2026-10-20): ein Standard für alle
 * Aufträge, ein Auftrag kann ihn später ersetzen oder ergänzen. Inhalte sind
 * Platzhalter, bis Simon und Slawa sie festlegen.
 * A: spannungsfrei, selbstständig. Danach Freigabe zur Inbetriebnahme (Codewort).
 * C: unter Aufsicht, unter Spannung.
 */
export const PRUEFLISTE_STANDARD: {
  spannungsfrei: { id: string; titel: string }[];
  unterSpannung: { id: string; titel: string }[];
} = {
  spannungsfrei: [
    { id: "a1", titel: "Sichtprüfung gemacht und dokumentiert" },
    { id: "a2", titel: "Schutzleiter durchgängig geprüft" },
    { id: "a3", titel: "Isolationswiderstand gemessen" },
    { id: "a4", titel: "Messwerte eingetragen" },
  ],
  unterSpannung: [
    { id: "c1", titel: "Funktion geprüft (Platzhalter)" },
    { id: "c2", titel: "Messungen unter Spannung gemacht (Platzhalter)" },
  ],
};

/** Feste Punkteskala der Bewertung (keine Schulnoten). */
export const PUNKTE_SKALA = [10, 9, 7, 5, 3, 0] as const;

/** Planen als geführte Abfolge: ein Editor je Unterschritt, in dieser Reihenfolge. */
export const PLANEN_UNTERSCHRITTE: { id: "werkzeuge" | "materialien" | "schritte"; titel: string }[] = [
  { id: "werkzeuge", titel: "Werkzeuge" },
  { id: "materialien", titel: "Materialien" },
  { id: "schritte", titel: "Arbeitsschritte" },
];

/** Präfix aller Browser-Schlüssel dieses Demos; "Demo zurücksetzen" löscht nur diese. */
export const SPEICHER_PRAEFIX = "cja-praxisflow-demo:";

export const DEMO_AUFTRAG = {
  kennzeichnung: "Demo",
  titel: "Demo-Auftrag: Übungsaufbau in der Werkstatt",
  /** Ausgabe und Abgabefrist des Papierauftrags (Partner: ein bis zwei Tage). */
  ausgabe: "Montag, 16.11.",
  frist: "Dienstag, 17.11., 16:00 Uhr",
  /** Frist als Berliner Zeitpunkt, zum Vergleich mit der Abgabe in der Auftragsakte. */
  fristZeitpunkt: "2026-11-17T16:00:00",
  /**
   * Wird der Aufbau unter Spannung in Betrieb genommen? Nur dann gibt es in
   * Kontrollieren die Freigabe zur Inbetriebnahme und die Prüfungen unter
   * Spannung (je Auftrag einstellbar, Anna 2026-10-20). In der Demo
   * umschaltbar mit ?spannung=aus.
   */
  unterSpannung: true,
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
    instruktion: "Prüfe deinen Plan selbst: Hast du alles? Dann entscheidest du, dass du anfangen kannst. (Platzhalter)",
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
// /praxisflow-demo/<dateiname>: ab md eingebettete Vorschau mit Umschalter,
// darunter "In neuem Tab öffnen" und "Herunterladen"; auf dem Handy je Datei
// eine Karte, die das PDF im nativen Viewer öffnet.
// Keine externen Links. Die Dateien sind nur mit Login erreichbar
// (middleware.ts), liegen aber im Repo -- nichts Vertrauliches ablegen.
// ---------------------------------------------------------------------------
export const DATEIEN_ORDNER = "/praxisflow-demo";

export const DATEIEN: { titel: string; dateiname: string }[] = [
  // Das Auftragsblatt (AA) entfällt: die Lernenden laden den unterschriebenen
  // Papierauftrag selbst hoch ("Auftrag erhalten", Anna 2026-10-20).
  { titel: "Arbeitsunterlage AU-E-02 – Leitungsverlängerung 230 V", dateiname: "au-e-02-leitungsverlaengerung-230v.pdf" },
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

// Beschreibung je Punktestufe, erscheint bei Hover, Antippen und
// Tastatur-Fokus (Selbst- und Fremdeinschätzung). Für jede Stufe aus
// PUNKTE_SKALA ein Text.
/**
 * Bewertungsbogen (Anna 2026-10-20, nach dem Plan und dem Beispielbogen der
 * Partner): ein Standard für alle Aufträge, ein Auftrag kann ihn ersetzen
 * oder ergänzen. Jedes Kriterium hat seine eigene Skala; K.-o.-Kriterien
 * (Funktion, Schutzmaßnahmen) entscheiden allein, ob der Auftrag zur
 * Nacharbeit zurückgeht. Texte sind Platzhalter, bis Simon und Slawa sie
 * festlegen.
 */
export type BogenKriterium = { id: string; titel: string; skala: readonly number[]; ko?: boolean };

const GESTUFT = [10, 9, 7, 5, 3, 0] as const;
const JA_NEIN = [10, 0] as const;

export const BEWERTUNGSBOGEN_STANDARD: BogenKriterium[] = [
  { id: "funktion", titel: "Funktion: Die Anlage funktioniert wie vorgesehen", skala: JA_NEIN, ko: true },
  { id: "ausfuehrung", titel: "Fachgerechte Ausführung: Bauteile richtig montiert und angeschlossen", skala: GESTUFT },
  { id: "schutz", titel: "Schutzmaßnahmen sind erfüllt", skala: JA_NEIN, ko: true },
  { id: "protokoll", titel: "Prüfprotokoll: Messungen dokumentiert, Werte plausibel", skala: GESTUFT },
  { id: "unterlagen", titel: "Unterlagen vollständig: Pläne, Protokolle, Materialliste", skala: GESTUFT },
];

/** Texte der Stufen bei Ja/Nein-Kriterien. */
export const JA_NEIN_BESCHREIBUNGEN: Record<number, string> = {
  10: "Erfüllt.",
  0: "Nicht erfüllt.",
};

export const NOTEN_BESCHREIBUNGEN: Record<number, string> = {
  10: "Vollständig und fehlerfrei, ohne Hilfe. (Platzhalter)",
  9: "Fast vollständig, kleine Ungenauigkeiten. (Platzhalter)",
  7: "Überwiegend richtig, einzelne Fehler. (Platzhalter)",
  5: "Teilweise richtig, mehrere Fehler oder Hilfe nötig. (Platzhalter)",
  3: "Nur in Ansätzen erfüllt. (Platzhalter)",
  0: "Nicht erfüllt. (Platzhalter)",
};

// ---------------------------------------------------------------------------
// 4. Übrige Texte
// ---------------------------------------------------------------------------
export const TEXTE = {
  hastDuAllesTitel: "Hast du alles?",
  analyse: {
    auftragTitel: "Auftrag erhalten",
    auftragText:
      "Du hast den Arbeitsauftrag auf Papier bekommen und unterschrieben. Mach ein Foto davon oder lade den Scan hoch.",
    ausgabe: "Ausgegeben",
    frist: "Abgabe bis",
    auftragWeiter: "Auftrag angenommen",
    arbeitsauftrag:
      "Baue den Übungsaufbau auf dem Werkstattbrett nach der Vorlage auf. Arbeite sauber und so, dass eine zweite Person jeden Schritt nachvollziehen kann. (Platzhalter)",
  },
  planen: {
    unterschritt: (nr: number, gesamt: number) => `Schritt ${nr} von ${gesamt}`,
    gesperrt: "Trage mindestens einen Arbeitsschritt ein, dann geht es weiter zu Entscheiden.",
    plaeneTitel: "Pläne und Zeichnungen (wenn du welche hast)",
    plaeneText: "Hast du auf Papier gezeichnet oder mit einem Programm geplant? Lade Fotos oder Dateien hier hoch.",
  },
  // Eingabezeile in Planen (Tippen oder Diktat)
  eingabe: {
    hinzufuegen: "Hinzufügen",
    diktieren: "Diktieren",
    stoppen: "Stopp",
    hoertZu: "Hört zu …",
    verweigert: "Mikrofon nicht freigegeben. Du kannst die Einträge weiter tippen.",
    fehler: "Diktat gerade nicht möglich. Du kannst die Einträge weiter tippen.",
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
    spannungsfreiTitel: "Prüfen ohne Spannung",
    spannungsfreiText: "Diese Prüfungen machst du allein. Hake jede ab, wenn sie erledigt ist.",
    freigabeTitel: "Freigabe zur Inbetriebnahme",
    freigabeText:
      "Jetzt kommt Spannung auf die Anlage. Das darfst du nur, wenn deine Trainer:in dabei ist und die Anlage geprüft hat.",
    freigabeGesperrt: "Erst alle Prüfungen ohne Spannung abhaken.",
    unterSpannungTitel: "Prüfen unter Spannung",
    unterSpannungText: "Deine Trainer:in ist dabei. Hake jede Prüfung ab und lade danach das Prüfprotokoll hoch.",
    protokollTitel: "Prüfprotokoll",
    protokollText: "Lade das Prüfprotokoll aus dem Prüfgerät als PDF hoch. Gibt es nur ein Papierprotokoll, mach ein Foto davon.",
    ohneSpannungHinweis: "Bei diesem Auftrag kommt keine Spannung auf die Anlage. Eine Freigabe durch die Trainer:in ist nicht nötig.",
    weiter: "Weiter zu Bewerten",
  },
  entscheiden: {
    bestaetigen: "Meine Planung ist vollständig. Ich bin bereit, mit der Ausführung zu beginnen.",
    button: "Ich fange an",
  },
  ausfuehren: {
    fertig: "Aufbau fertig – Kontrolle beginnen",
  },
  bewerten: {
    selbstTitel: "Deine Einschätzung",
    selbstText: "Prüfe dein Ergebnis und wähle je Kriterium die Punkte.",
    peerTitel: "Einschätzung durch eine:n Mitlernende:n",
    peerText: "Gib das Gerät einer Person aus deiner Gruppe. Sie prüft dein Ergebnis und wählt je Kriterium die Punkte.",
    peerWeiter: "Weiter zur Trainer:in",
    fremdTitel: "Einschätzung durch die Trainer:in",
    fremdText: "Die Trainer:in prüft dein Ergebnis und wählt je Kriterium die Punkte.",
    ko: "K.-o.-Kriterium",
    nacharbeitTitel: "Zurück zur Nacharbeit",
    nacharbeitText:
      "Bei einem K.-o.-Kriterium hat die Trainer:in 0 Punkte gegeben. Der Auftrag ist noch nicht abgeschlossen: Bessere nach und prüfe danach noch einmal.",
    nacharbeitButton: "Zur Nacharbeit",
    status: "Verifizierung durch AfCJ läuft",
  },
  // Hinweis direkt am jeweiligen Codewort-Feld
  gates: {
    entscheiden: "Die Trainer:in nimmt deinen Plan ab und gibt ihn mit dem Codewort frei.",
    durchfuehren: "Wenn alle Schritte abgehakt sind, gibt die Trainer:in die Durchführung mit dem Codewort frei.",
    kontrolle: "Die Trainer:in prüft die Anlage und gibt die Inbetriebnahme mit dem Codewort frei.",
    bewerten: "Die Trainer:in schaltet ihre Einschätzung mit dem Codewort frei.",
  },
  codewort: {
    label: "Codewort der Trainer:in",
    falsch: "Das Codewort stimmt nicht.",
    gesperrtDurchfuehren: "Erst alle Schritte abhaken.",
    gesperrtBewerten: "Erst die Selbsteinschätzung für alle Kriterien ausfüllen.",
  },
};

// ---------------------------------------------------------------------------
// 5. Spielerische Elemente (Vorschau Anna 2026-10-12): Beispiel-Kompetenz
// im Abschluss -- Platzhalter, Malte/Vera ersetzen ihn.
// ---------------------------------------------------------------------------
/** Beispiel: Kompetenzen, die die Demo-Aufgabe stärkt (Zuordnung fehlt in den Daten). */
export const ABSCHLUSS_KOMPETENZEN: { name: string; prozent: number }[] = [
  { name: "Bauelemente identifizieren (Beispiel)", prozent: 67 },
];

// "Etappe geschafft" je Phase mit eigenem Text statt immer gleich (Anna 2026-10-12).
export const ETAPPEN_TEXTE: Record<PhaseId, { titel: string; text: string }> = {
  analyse: { titel: "Auftrag verstanden!", text: "Du weißt, worum es geht. Jetzt planst du deine Arbeit." },
  planen: { titel: "Dein Plan steht!", text: "Jetzt prüfst du ihn und entscheidest, ob du anfangen kannst." },
  entscheiden: { titel: "Entschieden!", text: "Los geht’s – jetzt setzt du deinen Plan Schritt für Schritt um." },
  durchfuehren: { titel: "Stark gearbeitet!", text: "Alle Schritte sind erledigt. Jetzt prüfst du dein Ergebnis." },
  kontrolle: { titel: "Alles geprüft!", text: "Fast geschafft – zum Schluss bewertest du deine Arbeit." },
  bewerten: { titel: "Aufgabe geschafft!", text: "Alle sechs Phasen sind abgeschlossen." },
};
