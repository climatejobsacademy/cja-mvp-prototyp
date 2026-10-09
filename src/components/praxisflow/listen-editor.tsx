"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { EINGABE, ICON_BUTTON, SEKUNDAER } from "./stile";

type Eintrag = { id: string; text: string };

/**
 * Eine Liste in Planen (Werkzeuge, Materialien, Arbeitsschritte): hinzufügen,
 * bearbeiten, löschen; mit `onVerschieben` zusätzlich Hoch/Runter und
 * Nummerierung. Hält nur den Eingabezustand selbst, die Liste kommt über Props.
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
}: {
  id: string;
  titel: string;
  icon: LucideIcon;
  eintraege: Eintrag[];
  /** z. B. "Werkzeug", für Beschriftungen der Buttons */
  einzahl: string;
  leerText: string;
  platzhalter: string;
  onHinzufuegen: (text: string) => void;
  onBearbeiten: (id: string, text: string) => void;
  onLoeschen: (id: string) => void;
  onVerschieben?: (id: string, richtung: "hoch" | "runter") => void;
}) {
  const [neu, setNeu] = useState("");
  const [bearbeitet, setBearbeitet] = useState<{ id: string; text: string } | null>(null);
  const sortierbar = !!onVerschieben;

  function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    if (!neu.trim()) return;
    onHinzufuegen(neu);
    setNeu("");
  }

  function speichern() {
    if (bearbeitet && bearbeitet.text.trim()) onBearbeiten(bearbeitet.id, bearbeitet.text);
    setBearbeitet(null);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-3" aria-labelledby={`${id}-titel`}>
      <h3 id={`${id}-titel`} className="flex items-center gap-2 text-sm font-semibold text-eco-deep-green">
        <Icon className="size-4" aria-hidden="true" />
        {titel} ({eintraege.length})
      </h3>
      {eintraege.length === 0 && <p className="text-sm text-muted-foreground">{leerText}</p>}
      {eintraege.length > 0 && (
        <ol className="flex flex-col gap-2">
          {eintraege.map((e, i) => {
            const name = sortierbar ? `${einzahl} ${i + 1}` : `${einzahl} „${e.text}“`;
            return (
              <li key={e.id} className="flex items-center gap-1 rounded-lg border border-border bg-white p-1.5 pl-2">
                {sortierbar && <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">{i + 1}.</span>}
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
                  <span className="min-w-0 flex-1 text-[15px] break-words text-eco-deep-green">{e.text}</span>
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
      <form onSubmit={hinzufuegen} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-neu`} className="sr-only">
          {einzahl} hinzufügen
        </label>
        <input
          id={`${id}-neu`}
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder={platzhalter}
          className={cn(EINGABE, "flex-1")}
        />
        <button type="submit" disabled={!neu.trim()} className={SEKUNDAER}>
          <Plus aria-hidden="true" />
          Hinzufügen
        </button>
      </form>
    </section>
  );
}
