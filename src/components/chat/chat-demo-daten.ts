// VORLÄUFIG, nur Demo (Wunsch Anna 2026-10-11, SR folgt): Haupt-Chat mit
// Kanälen "Ankündigungen", je Modul und "Treffpunkt". Es gibt dafür kein
// Datenmodell -- Kanäle und Beispiel-Nachrichten stehen hier im Code, eigene
// Nachrichten bleiben im Browser (localStorage). Die Personen sind erfunden
// und dieselben wie auf der Programmseite (content/kohorte-karten.tsx).
// Vor dev ersetzen -- siehe Notion "Datenlücken-Analyse" (Nachrichten /
// Kohorten-Chat, Priorität 3). Veras Fragen-Thread je Lektion bleibt davon
// unberührt.

export type ChatPerson = { name: string; kuerzel: string; team?: string; flaeche: string };

export type DemoNachricht = {
  id: string;
  person: ChatPerson;
  text: string;
  /** Minuten vor "jetzt" -- so wirkt die Demo an jedem Tag aktuell */
  vorMinuten: number;
  /** Zählt als ungelesen, bis der Kanal einmal geöffnet wurde */
  neu?: boolean;
};

export type KanalArt = "ankuendigungen" | "modul" | "treffpunkt";

export type Kanal = {
  id: string;
  art: KanalArt;
  titel: string;
  /** z. B. "Modul 2 · aktuell" */
  zusatz: string | null;
  /** Lernende dürfen schreiben (Ankündigungen: nur das Team) */
  schreibbar: boolean;
  /** Nur Modul-Kanäle: Stand des Moduls (bestimmt die Beispiel-Nachrichten) */
  modulStatus: "abgeschlossen" | "aktuell" | "kommend" | null;
};

const JANA: ChatPerson = { name: "Jana Weber", kuerzel: "JW", team: "Trainer:in", flaeche: "bg-brand text-white" };
const TOM: ChatPerson = { name: "Tom Krüger", kuerzel: "TK", team: "Lernbegleitung", flaeche: "bg-brand text-white" };
const AYLIN: ChatPerson = { name: "Aylin K.", kuerzel: "AK", flaeche: "bg-self-tint text-ink" };
const MAREK: ChatPerson = { name: "Marek S.", kuerzel: "MS", flaeche: "bg-brand-tint text-ink" };
const KEMAL: ChatPerson = { name: "Kemal B.", kuerzel: "KB", flaeche: "bg-praxis-tint text-ink" };
const JONAS: ChatPerson = { name: "Jonas L.", kuerzel: "JL", flaeche: "bg-self-tint text-ink" };
const SARA: ChatPerson = { name: "Sara Y.", kuerzel: "SY", flaeche: "bg-self-tint text-ink" };

const STD = 60;
const TAG = 24 * STD;

/** Beispiel-Nachrichten je Kanal-Art; Modul-Kanäle nach Status (vorbei / aktuell / kommend). */
export const DEMO_NACHRICHTEN: Record<"ankuendigungen" | "treffpunkt" | "modul-vorbei" | "modul-aktuell", DemoNachricht[]> = {
  ankuendigungen: [
    { id: "a1", person: TOM, vorMinuten: 3 * TAG, text: "Herzlich willkommen im Chat! Hier findet ihr alle wichtigen Infos vom Team. Fragen zu einem Modul stellt ihr am besten im Kanal des Moduls." },
    { id: "a2", person: JANA, vorMinuten: TAG + 2 * STD, text: "Erinnerung: Bitte bringt zum nächsten Praxistag festes Schuhwerk und euren Prüfspannungsmesser mit." },
    { id: "a3", person: TOM, vorMinuten: 40, neu: true, text: "Neu im Programm: Die Unterlagen zur kommenden Praxiswoche sind online. Ihr findet sie unter „Programm“ im aktuellen Modul." },
  ],
  "modul-aktuell": [
    { id: "m1", person: MAREK, vorMinuten: 5 * STD, text: "Hat jemand die Übung zum Spannungsfall schon gemacht? Ich komme bei Aufgabe 3 nicht weiter." },
    { id: "m2", person: JANA, vorMinuten: 4 * STD, text: "Gute Frage! Schau dir die Formel noch einmal an: ΔU = 2 · I · L / (κ · A). Im nächsten Live-Unterricht rechnen wir die Aufgabe gemeinsam durch." },
    { id: "m3", person: AYLIN, vorMinuten: 3 * STD, neu: true, text: "Danke, das hilft mir auch 👍" },
    { id: "m4", person: JONAS, vorMinuten: 25, neu: true, text: "Weiß jemand, ob wir für den Praxistag das eigene Werkzeug mitbringen sollen?" },
  ],
  "modul-vorbei": [
    { id: "v1", person: JANA, vorMinuten: 12 * TAG, text: "Glückwunsch, ihr habt das Modul abgeschlossen! 🎉 Die Unterlagen bleiben im Programm für euch abrufbar." },
    { id: "v2", person: SARA, vorMinuten: 12 * TAG - 30, text: "Danke für die tolle Begleitung!" },
  ],
  treffpunkt: [
    { id: "t1", person: KEMAL, vorMinuten: 2 * TAG, text: "Hallo zusammen! Wer kommt aus der Nähe von Stuttgart? Wir könnten Fahrgemeinschaften zum Praxistag bilden 🚗" },
    { id: "t2", person: SARA, vorMinuten: 2 * TAG - 20, text: "Ich, aus Esslingen. Gerne!" },
    { id: "t3", person: KEMAL, vorMinuten: 2 * STD, text: "Wer kommt nach dem Praxistag noch mit auf einen Kaffee? ☕" },
    { id: "t4", person: JONAS, vorMinuten: 90, text: "Bin dabei, wenn ich rechtzeitig fertig bin 😄" },
  ],
};

/** Nachrichten eines Kanals (Modul-Kanäle: Inhalt nach Status, kommende Module leer). */
export function demoNachrichten(kanal: Kanal, modulStatus: "abgeschlossen" | "aktuell" | "kommend" | null): DemoNachricht[] {
  if (kanal.art === "ankuendigungen") return DEMO_NACHRICHTEN.ankuendigungen;
  if (kanal.art === "treffpunkt") return DEMO_NACHRICHTEN.treffpunkt;
  if (modulStatus === "aktuell") return DEMO_NACHRICHTEN["modul-aktuell"];
  if (modulStatus === "abgeschlossen") return DEMO_NACHRICHTEN["modul-vorbei"].map((n) => ({ ...n, id: `${kanal.id}-${n.id}` }));
  return [];
}
