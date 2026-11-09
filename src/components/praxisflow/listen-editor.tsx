"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Pencil, Trash2, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { EingabeZeile, type EingabeTexte } from "./eingabe-zeile";
import { EINGABE, ICON_BUTTON } from "./stile";

type Eintrag = { id: string; text: string };

/**
 * Eine Liste in Planen (Werkzeuge, Materialien, Arbeitsschritte): hinzufügen,
 * bearbeiten, löschen; mit `onVerschieben` zusätzlich Hoch/Runter und
 * Nummerierung, mit `onAnordnen` zusätzlich Ziehen am Griff (Maus und Touch;
 * Hoch/Runter bleibt für Tastatur und Screenreader). Neue Einträge über die Eingabezeile (Tippen oder Diktat),
 * immer unten angehängt. Hält nur den Bearbeiten-Zustand selbst, die Liste
 * kommt über Props.
 */
export function ListenEditor({
  id,
  titel,
  icon: Icon,
  eintraege,
  einzahl,
  leerText,
  platzhalter,
  onHinzufuegen,
  onBearbeiten,
  onLoeschen,
  onVerschieben,
  onAnordnen,
  eingabeTexte,
}: {
  id: string;
  titel: string;
  icon: LucideIcon;
  eintraege: Eintrag[];
  /** z. B. "Werkzeug", für Beschriftungen der Buttons */
  einzahl: string;
  leerText: string;
  platzhalter: string;
  /** Ein oder mehrere neue Texte (Zeilen bzw. diktierte Sätze) */
  onHinzufuegen: (texte: string[]) => void;
  onBearbeiten: (id: string, text: string) => void;
  onLoeschen: (id: string) => void;
  onVerschieben?: (id: string, richtung: "hoch" | "runter") => void;
  /** Eintrag an den neuen Index ziehen */
  onAnordnen?: (id: string, ziel: number) => void;
  eingabeTexte: EingabeTexte;
}) {
  const [bearbeitet, setBearbeitet] = useState<{ id: string; text: string } | null>(null);
  const sortierbar = !!onVerschieben;
  const liste = useRef<HTMLOListElement>(null);
  const [gezogen, setGezogen] = useState<string | null>(null);

  // Index, über dem der Zeiger gerade steht: erste Zeile, deren Mitte unter ihm liegt.
  function zielIndex(y: number): number {
    const zeilen = Array.from(liste.current?.children ?? []);
    const i = zeilen.findIndex((z) => {
      const r = z.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return i < 0 ? zeilen.length - 1 : i;
  }

  function speichern() {
    if (bearbeitet && bearbeitet.text.trim()) onBearbeiten(bearbeitet.id, bearbeitet.text);
    setBearbeitet(null);
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${id}-titel`}>
      <h3 id={`${id}-titel`} className="flex items-center gap-2 text-base font-bold text-ink">
        <Icon className="size-[18px] text-ink-muted" aria-hidden="true" />
        {titel}
        <span className="text-sm font-medium text-ink-subtle tabular-nums">· {eintraege.length}</span>
      </h3>
      {eintraege.length === 0 && <p className="text-sm text-ink-subtle">{leerText}</p>}
      {eintraege.length > 0 && (
        <ol ref={liste} className="flex flex-col gap-2">
          {eintraege.map((e, i) => {
            const name = sortierbar ? `${einzahl} ${i + 1}` : `${einzahl} „${e.text}“`;
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-1 rounded-zeile bg-subtle py-1 pr-1 pl-3",
                  onAnordnen && "pl-1",
                  gezogen === e.id && "shadow-card ring-2 ring-praxis"
                )}
              >
                {onAnordnen && (
                  <span
                    aria-hidden="true"
                    title="Ziehen zum Verschieben"
                    className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center text-ink-subtle active:cursor-grabbing"
                    onPointerDown={(ev) => {
                      ev.currentTarget.setPointerCapture(ev.pointerId);
                      setGezogen(e.id);
                    }}
                    onPointerMove={(ev) => {
                      if (gezogen !== e.id) return;
                      const ziel = zielIndex(ev.clientY);
                      if (ziel !== i) onAnordnen(e.id, ziel);
                    }}
                    onPointerUp={() => setGezogen(null)}
                    onPointerCancel={() => setGezogen(null)}
                  >
                    <GripVertical className="size-5" />
                  </span>
                )}
                {sortierbar && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                    {i + 1}
                  </span>
                )}
                {bearbeitet?.id === e.id ? (
                  <input
                    aria-label={`${name} bearbeiten`}
                    value={bearbeitet.text}
                    onChange={(ev) => setBearbeitet({ id: e.id, text: ev.target.value })}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") speichern();
                      if (ev.key === "Escape") setBearbeitet(null);
                    }}
                    autoFocus
                    className={cn(EINGABE, "min-w-0 flex-1")}
                  />
                ) : (
                  <span className="min-w-0 flex-1 px-1 text-[15px] break-words text-ink">{e.text}</span>
                )}
                <span className="flex shrink-0 items-center">
                  {bearbeitet?.id === e.id ? (
                    <>
                      <button type="button" onClick={speichern} className={ICON_BUTTON} aria-label="Änderung speichern">
                        <Check aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setBearbeitet(null)} className={ICON_BUTTON} aria-label="Bearbeiten abbrechen">
                        <X aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBearbeitet({ id: e.id, text: e.text })}
                      className={ICON_BUTTON}
                      aria-label={`${name} bearbeiten`}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  )}
                  {onVerschieben && (
                    <>
                      <button
                        type="button"
                        onClick={() => onVerschieben(e.id, "hoch")}
                        disabled={i === 0}
                        className={ICON_BUTTON}
                        aria-label={`${name} nach oben`}
                      >
                        <ArrowUp aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onVerschieben(e.id, "runter")}
                        disabled={i === eintraege.length - 1}
                        className={ICON_BUTTON}
                        aria-label={`${name} nach unten`}
                      >
                        <ArrowDown aria-hidden="true" />
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => onLoeschen(e.id)} className={ICON_BUTTON} aria-label={`${name} löschen`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <EingabeZeile id={`${id}-neu`} label={`${einzahl} hinzufügen`} platzhalter={platzhalter} texte={eingabeTexte} onTexte={onHinzufuegen} />
    </section>
  );
}
