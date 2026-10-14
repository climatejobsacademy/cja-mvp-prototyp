import { PersonAvatar } from "@/components/person-avatar";
import type { TrainerAnzeige } from "@/lib/queries/trainer";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.4 rechts; SR-14,
// SR-78): "Deine Kohorte" und "Deine Ansprechpersonen".
//
// Kohorte: nur der Name. Andere Lernende (Anzahl, Initialen, Fotos) zeigt
// dev nicht -- Lernende dürfen andere Personen laut Zugriffsmatrix nicht
// lesen (Datenlücke Nr. 6, Kohortensicht folgt). Ansprechpersonen: die
// Trainer:innen im eigenen Plan aus fn_meine_trainer() (0030) mit Foto,
// statt fester Beispielpersonen. Nachricht und Kohorten-Chat gibt es noch
// nicht, deshalb keine Knöpfe dafür.

const KARTE = "flex flex-col gap-4 rounded-karte bg-card p-5 shadow-card md:p-7";

export function KohorteKarten({ kohortenName, trainer }: { kohortenName: string; trainer: TrainerAnzeige[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="kohorte-titel" className={KARTE}>
        <h2 id="kohorte-titel" className="text-xl font-bold">
          Deine Kohorte
        </h2>
        <p className="text-[15px]">{kohortenName}</p>
      </section>

      <section aria-labelledby="kontakte-titel" className={KARTE}>
        <h2 id="kontakte-titel" className="text-xl font-bold">
          Deine Ansprechpersonen
        </h2>
        {trainer.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {trainer.map((p) => (
              <li key={p.personId} className="flex items-start gap-3">
                <PersonAvatar name={p.name} fotoUrl={p.fotoUrl} className="size-10" fallbackClassName="bg-subtle text-sm" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  <span className="text-[13px] text-ink-muted">Trainer:in</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Sobald deine Trainer:innen eingetragen sind, siehst du sie hier.</p>
        )}
      </section>
    </div>
  );
}
