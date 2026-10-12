"use client";

import { useState } from "react";
import { CircleAlert, KeyRound, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import { EINGABE, PRIMAER } from "./stile";

/**
 * Freigabe durch die Trainer:in per Codewort. Der Hinweis zur Trainer:in
 * steht direkt über dem Eingabefeld, in derselben Box. Die Prüfung kommt als
 * Funktion über Props (im Demo clientseitig, siehe praxisflow-daten.ts).
 */
export function CodewortGate({
  id,
  hinweis,
  label,
  buttonText,
  aktiv = true,
  gesperrtText,
  fehlerText,
  pruefen,
  onFreigabe,
}: {
  id: string;
  hinweis: string;
  label: string;
  buttonText: string;
  aktiv?: boolean;
  gesperrtText?: string;
  fehlerText: string;
  pruefen: (eingabe: string) => boolean;
  onFreigabe: () => void;
}) {
  const [eingabe, setEingabe] = useState("");
  const [fehler, setFehler] = useState(false);

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!aktiv) return;
    if (pruefen(eingabe)) {
      setFehler(false);
      setEingabe("");
      onFreigabe();
    } else {
      setFehler(true);
    }
  }

  return (
    // Angleichung 2026-10-12: helle Fläche statt gestrichelter Rahmen.
    <form onSubmit={absenden} className="flex flex-col gap-3 rounded-zeile bg-subtle p-4">
      {/* Wichtiger Hinweis zur Trainer:in: gut sichtbar als hell-lila Kasten (Anna 2026-10-12). */}
      <p className="flex items-start gap-2.5 rounded-xl bg-brand-tint p-3 text-[15px] text-ink">
        <UserCheck className="mt-0.5 size-[18px] shrink-0 text-brand" aria-hidden="true" />
        <span>{hinweis}</span>
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
            setFehler(false);
          }}
          disabled={!aktiv}
          aria-invalid={fehler || undefined}
          aria-describedby={`${id}-info`}
          className={cn(EINGABE, "flex-1 disabled:cursor-not-allowed disabled:opacity-60")}
        />
        <button type="submit" disabled={!aktiv || !eingabe.trim()} className={PRIMAER}>
          {buttonText}
        </button>
      </div>
      <p id={`${id}-info`} className="text-sm" role={fehler ? "alert" : undefined}>
        {!aktiv && gesperrtText && <span className="text-ink-muted">{gesperrtText}</span>}
        {aktiv && fehler && (
          <span className="flex items-center gap-1.5 text-ink">
            <CircleAlert className="size-4 text-praxis-text" aria-hidden="true" />
            {fehlerText}
          </span>
        )}
      </p>
    </form>
  );
}
