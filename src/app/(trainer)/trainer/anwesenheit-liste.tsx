"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Teilnehmende } from "@/lib/queries/trainer-bereich";
import { anwesenheitAktion, type AnwesenheitStatus } from "@/lib/trainer-tag";
import { cn } from "@/lib/utils";

import { anwesenheitSpeichern } from "./actions";

// Anwesenheit je Lernende:r (SR-81): zwei große Knöpfe für das Handy. Erste
// Wahl speichert sofort; eine Änderung nach der Bestätigung legt nach
// Rückfrage einen Storno-Eintrag an (E4, SR-07 -- kein Ändern).

const WAHL: { status: AnwesenheitStatus; text: string; Icon: typeof Check }[] = [
  { status: "anwesend", text: "anwesend", Icon: Check },
  { status: "nicht anwesend", text: "nicht anwesend", Icon: X },
];

type Rueckfrage = { personId: string; name: string; von: AnwesenheitStatus; nach: AnwesenheitStatus };

export function AnwesenheitListe({ liveSessionId, teilnehmende }: { liveSessionId: string; teilnehmende: Teilnehmende[] }) {
  const [laeuft, startTransition] = useTransition();
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [fehler, setFehler] = useState<{ personId: string; text: string } | null>(null);
  const [rueckfrage, setRueckfrage] = useState<Rueckfrage | null>(null);

  function speichern(personId: string, status: AnwesenheitStatus) {
    setFehler(null);
    setAktiv(personId);
    startTransition(async () => {
      const ergebnis = await anwesenheitSpeichern(liveSessionId, personId, status);
      if (!ergebnis.ok) setFehler({ personId, text: ergebnis.meldung });
      setAktiv(null);
    });
  }

  function waehlen(t: Teilnehmende, status: AnwesenheitStatus) {
    const aktion = anwesenheitAktion(t.anwesenheit, status);
    if (aktion.art === "unveraendert") return;
    if (aktion.art === "storno" && t.anwesenheit) {
      setRueckfrage({ personId: t.personId, name: t.name, von: t.anwesenheit.status, nach: status });
      return;
    }
    speichern(t.personId, status);
  }

  if (teilnehmende.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">Keine Lernenden eingeschrieben.</p>;
  }

  return (
    <>
      <ul className="mt-2 divide-y divide-line rounded-zeile bg-white">
        {teilnehmende.map((t) => {
          const status = t.anwesenheit?.status ?? null;
          const beschaeftigt = laeuft && aktiv === t.personId;
          return (
            <li key={t.personId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-ink-muted" aria-live="polite">
                  {beschaeftigt ? "Wird gespeichert …" : status ? `bestätigt: ${status}` : "noch nicht bestätigt"}
                </p>
                {fehler?.personId === t.personId && (
                  <p role="alert" className="text-xs text-destructive">
                    {fehler.text}
                  </p>
                )}
              </div>
              <div role="group" aria-label={`Anwesenheit ${t.name}`} className="grid shrink-0 grid-cols-2 gap-2">
                {WAHL.map(({ status: s, text, Icon }) => {
                  const gewaehlt = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={laeuft}
                      aria-pressed={gewaehlt}
                      onClick={() => waehlen(t, s)}
                      className={cn(
                        "flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60 motion-reduce:transition-none",
                        gewaehlt
                          ? s === "anwesend"
                            ? "border-brand bg-brand text-white"
                            : "border-ink bg-ink text-white"
                          : "border-line bg-white text-ink hover:bg-subtle"
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {text}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={rueckfrage !== null} onOpenChange={(offen) => !offen && setRueckfrage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-ink">Bestätigung korrigieren?</DialogTitle>
            <DialogDescription>
              {rueckfrage &&
                `${rueckfrage.name} ist als „${rueckfrage.von}“ bestätigt. Die Korrektur auf „${rueckfrage.nach}“ wird als neuer Eintrag gespeichert; der alte bleibt im Verlauf.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setRueckfrage(null)}>
              Abbrechen
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                if (rueckfrage) speichern(rueckfrage.personId, rueckfrage.nach);
                setRueckfrage(null);
              }}
            >
              Korrigieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
