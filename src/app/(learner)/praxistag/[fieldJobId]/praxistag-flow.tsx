"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CaptureStatusBadge } from "@/components/status-badge";
import { REFLEXIONS_FRAGEN, type FieldJobDetail } from "@/lib/praxistag-shared";

import { confirmFieldJob, submitReflection } from "./actions";

type Step = "vorbereitung" | "bestaetigung" | "reflexion" | "abschluss";

function initialStep(detail: FieldJobDetail): Step {
  if (detail.capture) return "abschluss";
  if (detail.status === "durchgeführt") return "reflexion";
  return "vorbereitung";
}

export function PraxistagFlow({
  detail,
  organisationId,
}: {
  detail: FieldJobDetail;
  organisationId: string;
}) {
  const [step, setStep] = useState<Step>(initialStep(detail));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [antworten, setAntworten] = useState<string[]>(
    Array(REFLEXIONS_FRAGEN.length).fill("")
  );

  function handleBestaetigen() {
    setError(null);
    startTransition(async () => {
      const result = await confirmFieldJob(detail.fieldJobId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("reflexion");
    });
  }

  function handleReflexionAbsenden() {
    if (antworten.some((a) => !a)) {
      setError("Bitte alle Fragen beantworten.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitReflection(detail.fieldJobId, organisationId, antworten);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("abschluss");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/schedule" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-eco-deep-green">
        <ArrowLeft className="size-4" /> Zurück zum Schedule
      </Link>

      <div>
        <h1 className="font-heading text-xl text-eco-deep-green">{detail.titel}</h1>
        {detail.beschreibung && <p className="text-sm text-muted-foreground">{detail.beschreibung}</p>}
      </div>

      {error && (
        <p className="rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground" role="alert">
          {error}
        </p>
      )}

      {step === "vorbereitung" && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="font-medium text-eco-deep-green">Vorbereitung</h2>
            {detail.vorbereitungText ? (
              <p className="whitespace-pre-line text-sm text-eco-deep-green">{detail.vorbereitungText}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Vorbereitungs-Instruktion hinterlegt.</p>
            )}
            <Button onClick={() => setStep("bestaetigung")} className="self-start">
              Vorbereitung abgeschlossen, Einsatz starten
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "bestaetigung" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Führe die Aufgabe jetzt vor Ort durch. Bestätige hier, sobald du fertig bist.
            </p>
            <Button onClick={handleBestaetigen} disabled={pending} size="lg">
              <CheckCircle2 data-icon="inline-start" />
              {pending ? "Wird bestätigt …" : "Einsatz erledigt"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "reflexion" && (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <h2 className="font-medium text-eco-deep-green">Reflexion</h2>
            {REFLEXIONS_FRAGEN.map((f, i) => (
              <fieldset key={f.frage} className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-eco-deep-green">{f.frage}</legend>
                {f.optionen.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`frage-${i}`}
                      value={option}
                      checked={antworten[i] === option}
                      onChange={() =>
                        setAntworten((prev) => prev.map((a, idx) => (idx === i ? option : a)))
                      }
                      className="accent-primary"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <Button onClick={handleReflexionAbsenden} disabled={pending} className="self-start">
              {pending ? "Wird gesendet …" : "Reflexion absenden"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "abschluss" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <CaptureStatusBadge status={detail.capture?.status ?? "pending"} />
            <p className="text-sm text-muted-foreground">
              Danke! Deine Selbstauskunft wird verifiziert.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
