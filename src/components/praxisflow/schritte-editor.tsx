"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { EINGABE, ICON_BUTTON, SEKUNDAER } from "./stile";

type Schritt = { id: string; text: string; kontrollierbar: boolean };

/**
 * Liste der Arbeitsschritte (Planen): hinzufügen, bearbeiten, löschen,
 * mit Hoch/Runter umsortieren, als kontrollierbar markieren. Hält nur den
 * Eingabezustand selbst; die Liste kommt über Props.
 */
export function SchritteEditor({
  schritte,
  onHinzufuegen,
  onBearbeiten,
  onLoeschen,
  onVerschieben,
  onKontrollierbar,
}: {
  schritte: Schritt[];
  onHinzufuegen: (text: string) => void;
  onBearbeiten: (id: string, text: string) => void;
  onLoeschen: (id: string) => void;
  onVerschieben: (id: string, richtung: "hoch" | "runter") => void;
  onKontrollierbar: (id: string) => void;
}) {
  const [neu, setNeu] = useState("");
  const [bearbeitet, setBearbeitet] = useState<{ id: string; text: string } | null>(null);

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
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-eco-deep-green">Arbeitsschritte ({schritte.length})</h3>
      {schritte.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Schritte. Füge unten den ersten hinzu.</p>
      )}
      <ol className="flex flex-col gap-2">
        {schritte.map((s, i) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-lg border border-border p-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              {bearbeitet?.id === s.id ? (
                <input
                  aria-label={`Schritt ${i + 1} bearbeiten`}
                  value={bearbeitet.text}
                  onChange={(e) => setBearbeitet({ id: s.id, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") speichern();
                    if (e.key === "Escape") setBearbeitet(null);
                  }}
                  autoFocus
                  className={cn(EINGABE, "min-w-0 flex-1")}
                />
              ) : (
                <span className="min-w-0 flex-1 text-[15px] break-words text-eco-deep-green">{s.text}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <label className="mr-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-eco-deep-green hover:bg-eco-green/10">
                <input
                  type="checkbox"
                  checked={s.kontrollierbar}
                  onChange={() => onKontrollierbar(s.id)}
                  className="size-4 accent-eco-deep-green"
                />
                kontrollierbar
              </label>
              {bearbeitet?.id === s.id ? (
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
                  onClick={() => setBearbeitet({ id: s.id, text: s.text })}
                  className={ICON_BUTTON}
                  aria-label={`Schritt ${i + 1} bearbeiten`}
                >
                  <Pencil aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onVerschieben(s.id, "hoch")}
                disabled={i === 0}
                className={ICON_BUTTON}
                aria-label={`Schritt ${i + 1} nach oben`}
              >
                <ArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onVerschieben(s.id, "runter")}
                disabled={i === schritte.length - 1}
                className={ICON_BUTTON}
                aria-label={`Schritt ${i + 1} nach unten`}
              >
                <ArrowDown aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onLoeschen(s.id)} className={ICON_BUTTON} aria-label={`Schritt ${i + 1} löschen`}>
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={hinzufuegen} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="neuer-schritt" className="sr-only">
          Neuer Arbeitsschritt
        </label>
        <input
          id="neuer-schritt"
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder="Neuer Arbeitsschritt …"
          className={cn(EINGABE, "flex-1")}
        />
        <button type="submit" disabled={!neu.trim()} className={SEKUNDAER}>
          <Plus aria-hidden="true" />
          Hinzufügen
        </button>
      </form>
    </div>
  );
}
