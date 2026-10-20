import Link from "next/link";
import { Check, GraduationCap } from "lucide-react";

import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

import { AktuellSichtbar } from "./aktuell-sichtbar";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.3; SR-14):
// "Dein Weg" -- alle Module nebeneinander, verbunden durch eine Linie mit
// nummerierten Punkten. Klick wählt ein Modul (?modul=…), zeigt darunter
// dessen Tracking und öffnet direkt seine Inhalte im Seitenpanel
// (&inhalte=1, Wunsch Anna 2026-10-11). Module, Reihenfolge und Zeitraum aus
// der Modul-Ebene (0028, src/lib/queries/modul.ts).

export type PfadModul = {
  id: string;
  nummer: number;
  /** modul.ueberzeile, z. B. "Modul I", bei der Prüfungsvorbereitung "Abschluss" */
  ueberzeile: string;
  name: string;
  status: ModulStatus;
  /** "28.09. – 30.10.2026", eigene Zeile; null = noch keine Termine im Stundenplan */
  zeitraum: string | null;
  /** Ende der Reise (Prüfungsvorbereitung): Hut am Ende der Linie */
  ziel: boolean;
};

const STATUS_TEXT: Record<ModulStatus, string> = {
  abgeschlossen: "abgeschlossen",
  aktuell: "hier bist du",
  kommend: "kommt noch",
};

export function ModulPfad({
  module,
  gewaehltId,
  href,
}: {
  module: PfadModul[];
  gewaehltId: string | null;
  href: (modulId: string) => string;
}) {
  return (
    <section aria-labelledby="dein-weg" className="flex flex-col gap-4 text-ink">
      <h2 id="dein-weg" className="text-xl font-bold">
        Dein Weg
      </h2>
      {/* Viele Module: horizontal scrollbar (Brief 2.3). */}
      <ol className="grid auto-cols-[minmax(160px,1fr)] grid-flow-col overflow-x-auto p-1 pt-1.5 pb-3">
        {module.map((m, i) => {
          const gewaehlt = m.id === gewaehltId;
          const aktuell = m.status === "aktuell";
          // Wunsch Anna 2026-10-11: das Modul nach dem aktuellen als "Als Nächstes" kennzeichnen.
          const naechstes = m.status === "kommend" && module[i - 1]?.status === "aktuell";
          const letztes = i === module.length - 1;
          return (
            <li key={m.id} id={aktuell ? "modul-aktuell" : undefined} className="flex flex-col gap-4 pr-3">
              <div aria-hidden="true" className="flex items-center">
                <span
                  className={cn(
                    "flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold",
                    m.status === "abgeschlossen"
                      ? "border-progress bg-progress text-white"
                      : aktuell
                        ? "border-brand bg-brand text-white"
                        : "border-progress-track bg-white text-ink-muted"
                  )}
                >
                  {/* Entscheidung Anna 2026-10-12: auch der Abschluss hat seine
                      Nummer; der Hut steht als Ziel am Ende der Linie. */}
                  {m.status === "abgeschlossen" ? <Check className="size-3.5" strokeWidth={3} /> : m.nummer}
                </span>
                <span
                  className={cn(
                    "ml-2 h-0.5 flex-1",
                    letztes && !m.ziel
                      ? "bg-transparent"
                      : m.status === "abgeschlossen"
                        ? "bg-progress"
                        : "bg-progress-track"
                  )}
                />
                {letztes && m.ziel && (
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-lime bg-lime text-on-lime">
                    <GraduationCap className="size-4" strokeWidth={2.25} />
                  </span>
                )}
              </div>
              <Link
                href={href(m.id)}
                scroll={false}
                aria-current={gewaehlt ? "true" : undefined}
                aria-label={`${m.ueberzeile}: ${m.name}, ${m.zeitraum ?? "Termine folgen"}, ${naechstes ? "als Nächstes" : STATUS_TEXT[m.status]}, Inhalte öffnen`}
                className={cn(
                  "group/karte relative flex flex-1 flex-col items-start gap-1.5 rounded-zeile px-4 py-3.5 outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none",
                  // Anker der Seite: das aktuelle Modul (visuelles Update 2026-10-11).
                  aktuell ? "bg-anchor-brand text-white shadow-anchor-brand" : "bg-card text-ink shadow-card hover:bg-subtle",
                  m.status === "kommend" && "text-ink-muted",
                  gewaehlt && "ring-2 ring-brand ring-offset-2"
                )}
              >
                <span className={cn("text-xs font-semibold tracking-[0.08em] uppercase", aktuell ? "text-white/85" : "text-ink-subtle")}>
                  {m.ueberzeile}
                </span>
                {/* Wunsch Anna 2026-10-11: Zeitraum bei jedem Modul, direkt unter der
                    Überzeile -- so stehen alle Daten auf einer Linie. */}
                <span className={cn("block min-h-4 text-xs whitespace-nowrap tabular-nums", aktuell ? "text-white/85" : "text-ink-subtle")}>
                  {m.zeitraum ?? "Termine folgen"}
                </span>
                {/* Ruhiger (Anna 2026-10-12): etwas kleiner; lange Wörter trennen statt
                    über den Rahmen laufen (die Namen kommen aus der Datenbank, ohne
                    weiche Trennstellen -- darum hyphens-auto). */}
                <span className="w-full text-sm leading-snug font-bold hyphens-auto break-words">{m.name}</span>
                {/* Rückmeldung Anna 2026-10-11: "Hier bist du"/"Als Nächstes" als Label
                    auf dem oberen Rand -- braucht keinen Platz in der Karte, so bleibt
                    nirgends eine leere Zeile. */}
                {(aktuell || naechstes) && (
                  <span
                    className={cn(
                      "absolute -top-[11px] left-3.5 rounded-full px-[9px] py-[2px] text-xs font-bold",
                      aktuell ? "bg-lime text-on-lime" : "bg-lime font-semibold text-on-lime"
                    )}
                  >
                    {aktuell ? "Hier bist du" : "Als Nächstes"}
                  </span>
                )}
                {/* Unten, auf allen Karten auf einer Linie: "Details" als Hinweis, dass die
                    Karte die Inhalte öffnet -- als Wort statt Pfeil, ein Pfeil liest sich
                    im Pfad wie "zum nächsten Modul". */}
                <span
                  aria-hidden="true"
                  className={cn(
                    // Dezenter (Anna 2026-10-12): grau, erst beim Hover betont.
                    "mt-auto pt-1 text-xs font-medium",
                    aktuell ? "text-white/75" : "text-ink-subtle group-hover/karte:text-brand"
                  )}
                >
                  Details
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {module.some((m) => m.status === "aktuell") && <AktuellSichtbar zielId="modul-aktuell" />}
    </section>
  );
}
