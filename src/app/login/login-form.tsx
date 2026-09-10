"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendMagicLink } from "./actions";

type State = { ok: boolean; error?: string } | null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => sendMagicLink(formData),
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-border bg-info p-4 text-info-foreground">
        <p className="font-medium">Link verschickt</p>
        <p className="text-sm">
          Check dein E-Mail-Postfach und klick auf den Login-Link.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="email">
        E-Mail-Adresse
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="name@betrieb.de"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1">
        <Mail data-icon="inline-start" />
        {pending ? "Wird verschickt …" : "Login-Link anfordern"}
      </Button>
    </form>
  );
}
