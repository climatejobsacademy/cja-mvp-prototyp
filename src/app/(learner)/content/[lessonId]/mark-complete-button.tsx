"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { markLessonComplete } from "./actions";

export function MarkCompleteButton({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (done) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() =>
          startTransition(async () => {
            const result = await markLessonComplete(lessonId);
            if (!result.ok) setError(result.error);
          })
        }
        disabled={pending}
        className="self-start"
      >
        <CheckCircle2 data-icon="inline-start" />
        {pending ? "Wird gespeichert …" : "Als abgeschlossen markieren"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
