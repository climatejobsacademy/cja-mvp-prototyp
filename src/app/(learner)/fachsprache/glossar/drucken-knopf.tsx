"use client";

import { Printer } from "lucide-react";

/** „Drucken / als PDF speichern“ über den Druckdialog des Browsers (SR-101), selbst nicht gedruckt. */
export function DruckenKnopf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-brand px-4 text-sm font-semibold text-white outline-none hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 print:hidden"
    >
      <Printer className="size-4" aria-hidden="true" />
      Drucken / als PDF speichern
    </button>
  );
}
