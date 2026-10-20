import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import type { EinstiegEintrag } from "@/lib/fachsprache-einstiege";
import { cn } from "@/lib/utils";

// Fachsprache-Einheit (Etappe 2, SR-84): Kästchen "Fachsprache" auf Home, wenn
// an einer Live-Lektion des Tages eine veröffentlichte Einheit hängt (wie in der
// Demo). Mehrere Einheiten am Tag erscheinen alle. Ohne Einheit (Schalter aus,
// Entwurf, nicht lesbar, Tag ohne Live-Lektion) entsteht nichts, auch keine
// Meldung. Nur Links, kein Lernstand, kein Ergebnis, kein Tracking (Regel 6).
// Bedienung: echte Links mit Focus-Ring, Ziel mindestens 44 px, beschriftet mit
// Text und Symbol (kein reines Farbsignal).

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export function FachspracheKaestchen({ einheiten }: { einheiten: EinstiegEintrag[] }) {
  if (einheiten.length === 0) return null;
  return (
    <section aria-labelledby="fachsprache-heute" className="flex flex-col gap-3">
      <h2 id="fachsprache-heute" className="text-lg font-bold text-ink">
        Fachsprache
      </h2>
      <ul className="flex flex-col gap-3">
        {einheiten.map((e) => (
          <li key={e.einheitId}>
            <Link
              href={e.href}
              className={cn(
                "group/fach flex min-h-11 items-center gap-3 rounded-karte bg-card p-4 text-ink shadow-card transition-[box-shadow] duration-150 hover:shadow-lg motion-reduce:transition-none",
                FOKUS
              )}
            >
              <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-self-tint text-self">
                <MessageCircle className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-ink-muted">Fachsprache zu heute</span>
                <span className="text-[17px] leading-snug font-semibold">{e.titel}</span>
              </span>
              <span className="inline-flex flex-none items-center gap-1 text-[15px] font-semibold text-brand">
                Öffnen <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
