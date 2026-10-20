import { PersonAvatar } from "@/components/person-avatar";
import { KOHORTE_AVATARE_MAX, avatarReiheLabel, kohortenAnzahlText } from "@/lib/kohorte";
import type { KohortenMitglied } from "@/lib/queries/kohorte";
import type { TrainerAnzeige } from "@/lib/queries/trainer";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.4 rechts; SR-14,
// SR-30, SR-78): "Deine Kohorte" und "Deine Ansprechpersonen".
//
// Kohorte (SR-30, 0034): Name der Kohorte, Anzahl der Lernenden und die
// anderen Mitglieder mit Rufname plus Initial; das Foto erscheint, wenn die
// Person eines hochgeladen hat (der Upload ist die Freigabe). Nur gleiche
// Kohorte und gleiche Organisation, nur aktive Einschreibungen -- die
// Filterung macht fn_meine_kohorte() in der Datenbank. Ansprechpersonen: die
// Trainer:innen im eigenen Plan aus fn_meine_trainer() (0030) mit Foto.
// Nachricht und Kohorten-Chat gibt es noch nicht, deshalb keine Knöpfe dafür.

const KARTE = "flex flex-col gap-4 rounded-karte bg-card p-5 shadow-card md:p-7";

export function KohorteKarten({
  kohortenName,
  mitglieder,
  trainer,
}: {
  kohortenName: string;
  /** Andere Lernende der eigenen Kohorte (ohne die eigene Person) */
  mitglieder: KohortenMitglied[];
  trainer: TrainerAnzeige[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-labelledby="kohorte-titel" className={KARTE}>
        <h2 id="kohorte-titel" className="text-xl font-bold">
          Deine Kohorte
        </h2>
        <p className="text-[15px]">{kohortenName}</p>
        <p className="text-sm text-ink-muted">{kohortenAnzahlText(mitglieder.length)}</p>
        {mitglieder.length > 0 && (
          <>
            <ul aria-label={avatarReiheLabel(mitglieder.map((m) => m.anzeigename))} className="flex">
              {mitglieder.slice(0, KOHORTE_AVATARE_MAX).map((m) => (
                <li key={m.personId} className="-mr-2">
                  <PersonAvatar
                    name={m.anzeigename}
                    fotoUrl={m.fotoUrl}
                    className="size-10 border-2 border-white"
                    fallbackClassName="bg-subtle text-sm"
                  />
                </li>
              ))}
              {mitglieder.length > KOHORTE_AVATARE_MAX && (
                <li
                  aria-hidden="true"
                  className="-mr-2 flex size-10 items-center justify-center rounded-full border-2 border-white bg-subtle text-[13px] font-bold"
                >
                  +{mitglieder.length - KOHORTE_AVATARE_MAX}
                </li>
              )}
            </ul>
            <details className="group/liste">
              <summary className="w-fit cursor-pointer rounded-sm text-sm font-semibold text-ink outline-none marker:content-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                Alle ansehen
              </summary>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {mitglieder.map((m) => (
                  <li key={m.personId} className="flex items-center gap-3">
                    <PersonAvatar name={m.anzeigename} fotoUrl={m.fotoUrl} className="size-9" fallbackClassName="bg-subtle text-sm" />
                    <span className="min-w-0 truncate text-[15px] font-medium">{m.anzeigename}</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
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
