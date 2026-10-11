import { cn } from "@/lib/utils";

// Programmseite v8 (docs/design_handoff_programm_v8, Brief 2.4 rechts, SR folgt):
// "Deine Kohorte" und "Deine Ansprechpersonen".
//
// VORLÄUFIG, nur Demo (Entscheidung Anna 2026-10-11): Lernende dürfen andere
// Personen ihrer Kohorte laut Zugriffsmatrix nicht lesen, und Trainer:in bzw.
// Lernbegleitung sind in der Datenbank nicht gepflegt. Bis Vera das klärt,
// stehen hier erfundene Beispiel-Personen (bewusst ohne Demo-Hinweis auf der
// Seite). Nur der Name der Kohorte ist echt. Vor dev ersetzen -- siehe
// Notion "Demo (→dev): To-dos". Nachricht und Kohorten-Chat gibt es noch
// nicht, deshalb keine Knöpfe dafür (Brief 4: ausblenden).
const BEISPIEL_MITGLIEDER = ["AK", "MS", "KB", "JL", "SY"];
const BEISPIEL_ANZAHL = 12;
const BEISPIEL_KONTAKTE = [
  { kuerzel: "JW", name: "Jana Weber", rolle: "Trainer:in · Live-Unterricht" },
  { kuerzel: "TK", name: "Tom Krüger", rolle: "Lernbegleitung · Fragen zum Programm" },
];
const AVATAR_FLAECHEN = ["bg-success", "bg-info", "bg-warning", "bg-flex-flaeche", "bg-success"];

const KARTE = "flex flex-col gap-4 rounded-[20px] border border-border p-5 md:p-7";

// Rückmeldung Anna 2026-10-11 ("zu uneben"): zwei Karten nebeneinander unter
// der Tracking-Karte, gleich hoch; Ansprechpersonen nebeneinander.
export function KohorteKarten({ kohortenName }: { kohortenName: string }) {
  const weitere = BEISPIEL_ANZAHL - BEISPIEL_MITGLIEDER.length;
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="kohorte-titel" className={KARTE}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="kohorte-titel" className="text-xl font-bold">
            Deine Kohorte
          </h2>
          <span className="text-[13px] text-muted-foreground">{kohortenName}</span>
        </div>
        <div className="flex items-center gap-3">
          <ul aria-hidden="true" className="flex">
            {BEISPIEL_MITGLIEDER.map((k, i) => (
              <li
                key={k}
                className={cn(
                  "-mr-2 flex size-10 items-center justify-center rounded-full border-2 border-white text-[13px] font-bold",
                  AVATAR_FLAECHEN[i]
                )}
              >
                {k}
              </li>
            ))}
            {weitere > 0 && (
              <li className="-mr-2 flex size-10 items-center justify-center rounded-full border-2 border-white bg-off-white text-[13px] font-bold">
                +{weitere}
              </li>
            )}
          </ul>
          <span className="ml-2.5 text-sm text-muted-foreground">{BEISPIEL_ANZAHL} Lernende</span>
        </div>
      </section>

      <section aria-labelledby="kontakte-titel" className={KARTE}>
        <h2 id="kontakte-titel" className="text-xl font-bold">
          Deine Ansprechpersonen
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BEISPIEL_KONTAKTE.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-eco-deep-green text-sm font-bold text-white"
              >
                {p.kuerzel}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{p.name}</span>
                <span className="text-[13px] text-muted-foreground">{p.rolle}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
