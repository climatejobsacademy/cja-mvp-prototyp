import { Avatar } from "@/components/avatar";
import { TRAINER_DEMO, TRAINER_PRAXIS_DEMO } from "@/lib/demo-personen";
import { cn } from "@/lib/utils";

// Programmseite v8 (docs/design_handoff_programm_v8, Brief 2.4 rechts, SR folgt):
// "Mit dir im Programm" (bis 2026-10-12 "Deine Kohorte", ohne Kohortennamen --
// Entscheidung Anna) und "Deine Ansprechpersonen".
//
// VORLÄUFIG, nur Demo (Entscheidung Anna 2026-10-11): Lernende dürfen andere
// Personen ihrer Kohorte laut Zugriffsmatrix nicht lesen, und Trainer:in bzw.
// Lernbegleitung sind in der Datenbank nicht gepflegt. Bis Vera das klärt,
// stehen hier erfundene Beispiel-Personen (bewusst ohne Demo-Hinweis auf der
// Seite). Vor dev ersetzen -- siehe
// Notion "Demo (→dev): To-dos". Nachricht und Kohorten-Chat gibt es noch
// nicht, deshalb keine Knöpfe dafür (Brief 4: ausblenden).
const BEISPIEL_MITGLIEDER = ["AK", "MS", "KB", "JL", "SY"];
const BEISPIEL_ANZAHL = 12;
const BEISPIEL_KONTAKTE = [
  { name: TRAINER_DEMO.name, foto: TRAINER_DEMO.foto, rolle: "Trainer · Live-Unterricht" },
  { name: TRAINER_PRAXIS_DEMO.name, foto: TRAINER_PRAXIS_DEMO.foto, rolle: "Trainer · Praxistage" },
];
const AVATAR_FLAECHEN = ["bg-brand-tint", "bg-self-tint", "bg-praxis-tint", "bg-subtle", "bg-brand-tint"];

const KARTE = "flex flex-col gap-4 rounded-karte bg-card p-5 shadow-card md:p-7";

// Rückmeldung Anna 2026-10-11 ("zu uneben"): zwei Karten nebeneinander unter
// der Tracking-Karte, gleich hoch; Ansprechpersonen nebeneinander.
export function KohorteKarten() {
  const weitere = BEISPIEL_ANZAHL - BEISPIEL_MITGLIEDER.length;
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="kohorte-titel" className={KARTE}>
        <h2 id="kohorte-titel" className="text-xl font-bold">
          Mit dir im Programm
        </h2>
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
              <li className="-mr-2 flex size-10 items-center justify-center rounded-full border-2 border-white bg-subtle text-[13px] font-bold">
                +{weitere}
              </li>
            )}
          </ul>
          <span className="ml-2.5 text-sm text-ink-muted">{BEISPIEL_ANZAHL} Lernende</span>
        </div>
      </section>

      <section aria-labelledby="kontakte-titel" className={KARTE}>
        <h2 id="kontakte-titel" className="text-xl font-bold">
          Deine Ansprechpersonen
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BEISPIEL_KONTAKTE.map((p) => (
            // Namen oben bündig, auch wenn eine Rolle zweizeilig ist (Anna 2026-10-12).
            <li key={p.name} className="flex items-start gap-3">
              {/* Foto, sonst Initialen (Anna 2026-10-12) */}
              <Avatar name={p.name} foto={p.foto} groesse="md" className="size-10" flaeche="bg-subtle text-ink" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{p.name}</span>
                <span className="text-[13px] text-ink-muted">{p.rolle}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
