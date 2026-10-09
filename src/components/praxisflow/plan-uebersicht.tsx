import { ListOrdered, Package, Wrench, type LucideIcon } from "lucide-react";

type Eintrag = { id: string; text: string };

function Kasten({ icon: Icon, titel, leerText, children }: { icon: LucideIcon; titel: string; leerText: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-eco-deep-green">
        <span className="flex size-7 items-center justify-center rounded-md bg-eco-green/10">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {titel}
      </h3>
      {children ?? <p className="text-sm text-muted-foreground">{leerText}</p>}
    </div>
  );
}

/** Entscheiden: der Plan als reine Lese-Ansicht für die Abnahme durch die Trainer:in. */
export function PlanUebersicht({
  werkzeuge,
  materialien,
  schritte,
}: {
  werkzeuge: Eintrag[];
  materialien: Eintrag[];
  schritte: Eintrag[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Kasten icon={Wrench} titel={`Werkzeuge (${werkzeuge.length})`} leerText="Keine Werkzeuge eingetragen.">
          {werkzeuge.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {werkzeuge.map((w) => (
                <li key={w.id} className="rounded-full border border-border px-2.5 py-1 text-sm text-eco-deep-green">
                  {w.text}
                </li>
              ))}
            </ul>
          )}
        </Kasten>
        <Kasten icon={Package} titel={`Materialien (${materialien.length})`} leerText="Keine Materialien eingetragen.">
          {materialien.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {materialien.map((m) => (
                <li key={m.id} className="rounded-full border border-border px-2.5 py-1 text-sm text-eco-deep-green">
                  {m.text}
                </li>
              ))}
            </ul>
          )}
        </Kasten>
      </div>
      <Kasten icon={ListOrdered} titel={`Arbeitsschritte (${schritte.length})`} leerText="Keine Arbeitsschritte eingetragen.">
        {schritte.length > 0 && (
          <ol className="flex flex-col">
            {schritte.map((s, i) => (
              <li key={s.id} className="flex gap-3 border-b border-border py-2 last:border-b-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-eco-deep-green text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5 text-[15px] break-words text-eco-deep-green">{s.text}</span>
              </li>
            ))}
          </ol>
        )}
      </Kasten>
    </div>
  );
}
