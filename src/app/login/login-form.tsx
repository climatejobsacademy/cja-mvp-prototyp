"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Mail, MailCheck } from "lucide-react";

import { sendMagicLink } from "./actions";

type State = { ok: boolean; error?: string } | null;

const FOKUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2";
// Button-Varianten laut Handoff 2a ("genau drei Varianten").
const PRIMAER = `inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-eco-deep-green px-4 text-[15px] font-medium text-white hover:bg-eco-deep-green/90 disabled:cursor-not-allowed disabled:opacity-50 ${FOKUS}`;
const SEKUNDAER = `inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-[15px] font-medium text-eco-deep-green hover:bg-eco-green/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOKUS}`;
const TERTIAER = `inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-medium text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green ${FOKUS}`;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => sendMagicLink(formData),
    null
  );
  // "Andere E-Mail-Adresse": diese Rückmeldung ausblenden, Formular wieder zeigen.
  const [ausgeblendet, setAusgeblendet] = useState<State>(null);

  if (state?.ok && state !== ausgeblendet) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border p-4" role="status">
        <span className="flex size-10 items-center justify-center rounded-[10px] bg-eco-green/10">
          <MailCheck className="size-5 text-eco-green" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold text-eco-deep-green">Prüfe dein Postfach</p>
          {/* K3: neutral, keine Aussage darüber, ob die Adresse registriert ist. */}
          <p className="text-sm text-muted-foreground">
            Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Einmallink
            geschickt. Bitte prüfe dein Postfach.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={formAction} className="contents">
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={pending} className={`${SEKUNDAER} w-full sm:w-auto`}>
              {pending ? "Wird verschickt …" : "Erneut senden"}
            </button>
          </form>
          <button type="button" onClick={() => setAusgeblendet(state)} className={TERTIAER}>
            Andere E-Mail-Adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-eco-deep-green">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@betrieb.de"
          aria-describedby={state?.error ? "email-fehler" : undefined}
          aria-invalid={state?.error ? true : undefined}
          className={`h-11 rounded-lg border border-border bg-white px-3 text-[15px] text-eco-deep-green placeholder:text-muted-foreground aria-invalid:border-2 aria-invalid:border-coral ${FOKUS}`}
        />
        {/* Nur noch die Pflichtfeld-Prüfung -- kein Fehler zur Adresse selbst (K3). */}
        {state?.error && (
          <p id="email-fehler" className="flex items-center gap-1.5 text-sm text-eco-deep-green" role="alert">
            <CircleAlert className="size-4 shrink-0 text-coral" aria-hidden="true" />
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className={PRIMAER}>
        <Mail className="size-[18px]" aria-hidden="true" />
        {pending ? "Wird verschickt …" : "Login-Link anfordern"}
      </button>
    </form>
  );
}
