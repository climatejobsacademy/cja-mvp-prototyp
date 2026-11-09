"use client";

import { useState } from "react";
import { CircleAlert, KeyRound } from "lucide-react";

import { PersonAvatar } from "@/components/person-avatar";
import { cn } from "@/lib/utils";

import { EINGABE, PRIMAER } from "./stile";

export type GateErgebnis = { ok: true } | { ok: false; fehler: string };

/**
 * Freigabe durch die Trainer:in per Codewort (SR-65). Die Prüfung läuft nur
 * auf dem Server; diese Komponente kennt kein Codewort. Der Hinweis zur
 * Trainer:in steht direkt über dem Eingabefeld, in derselben Box.
 */
export function CodewortGate({
  id,
  hinweis,
  label,
  buttonText,
  trainer,
  pruefen,
  onFreigabe,
}: {
  id: string;
  hinweis: string;
  label: string;
  buttonText: string;
  /** Trainer:in des Praxistags, wenn zugeordnet (SR-78). */
  trainer: { name: string; fotoUrl: string | null } | null;
  pruefen: (eingabe: string) => Promise<GateErgebnis>;
  onFreigabe: () => void;
}) {
  const [eingabe, setEingabe] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (laeuft || !eingabe.trim()) return;
    setLaeuft(true);
    const ergebnis = await pruefen(eingabe);
    setLaeuft(false);
    if (ergebnis.ok) {
      setFehler(null);
      setEingabe("");
      onFreigabe();
    } else {
      setFehler(ergebnis.fehler);
    }
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3 rounded-zeile bg-subtle p-4">
      <p className="flex items-start gap-3 rounded-xl bg-white p-3 text-[15px] text-ink">
        {trainer && <PersonAvatar name={trainer.name} fotoUrl={trainer.fotoUrl} className="size-10 shrink-0" />}
        <span className="flex flex-col gap-0.5">
          {trainer && <span className="text-[13px] font-semibold text-ink-muted">{trainer.name} · Trainer:in</span>}
          <span>{hinweis}</span>
        </span>
      </p>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound className="size-4 text-ink-muted" aria-hidden="true" />
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="password"
          autoComplete="off"
          value={eingabe}
          onChange={(e) => {
            setEingabe(e.target.value);
            setFehler(null);
          }}
          aria-invalid={fehler ? true : undefined}
          aria-describedby={`${id}-info`}
          className={cn(EINGABE, "flex-1")}
        />
        <button type="submit" disabled={laeuft || !eingabe.trim()} className={PRIMAER}>
          {buttonText}
        </button>
      </div>
      <p id={`${id}-info`} className="text-sm" role={fehler ? "alert" : undefined}>
        {fehler && (
          <span className="flex items-center gap-1.5 text-ink">
            <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
            {fehler}
          </span>
        )}
      </p>
    </form>
  );
}
